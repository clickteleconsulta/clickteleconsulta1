# Subir o site no domínio novo — passo a passo

Domínio canônico: **`avidoc.com.br`**.
`avidoc.online` e `avidoc.net` entram só como **redirecionamento 301** — três domínios
indexados dividem o mesmo SEO e nenhum fica forte.

> **A ordem importa.** Os passos 1 a 6 são feitos nos painéis externos e precisam estar
> prontos **antes** de publicar o código. O código já está preparado, mas se ele for ao ar
> antes do passo 2 o site passa a declarar `canonical` e `og:url` apontando para um domínio
> que ainda serve página de estacionamento — e o Google despriorizaria o site.

Estado de partida (verificado em 03/08/2026): os três domínios estão **estacionados na
Hostinger**; quem está na Vercel é o `clickteleconsulta.online`.

---

## 1. Vercel — adicionar os domínios

Painel da Vercel → projeto **click-teleconsulta** → **Settings → Domains**.

1. **Add** → `avidoc.com.br` → escolher **Production**.
2. **Add** → `www.avidoc.com.br` → a Vercel oferece redirecionar para o apex; aceite.
3. **Add** → `avidoc.online` e `avidoc.net` → em cada um, marcar
   **Redirect to → `avidoc.com.br`** com **301 (permanente)**.
4. Repetir para os subdomínios que você já usa hoje, se quiser mantê-los:
   `admin.avidoc.com.br`, `agendamentos.avidoc.com.br`, `parceiros.avidoc.com.br`.
5. **Não remova** `clickteleconsulta.online` ainda — ele vira o redirect de origem no passo 8.

A Vercel vai mostrar, para cada domínio, **exatamente quais registros criar**. Use os valores
que ela mostrar — o IP do apex é atribuído por projeto e não deve ser copiado daqui.

> Enquanto o DNS não apontar, a Vercel mantém o domínio como *Invalid Configuration*.
> É esperado até o passo 2 propagar.

---

## 2. Hostinger — apontar o DNS

Os três domínios usam a DNS da Hostinger (`*.dns-parking.com`).
hPanel → **Domínios** → o domínio → **DNS / Nameservers** → **Gerenciar registros DNS**.

Primeiro **apague os registros de estacionamento** (o A que aponta para `2.57.91.91`
e qualquer CNAME de parking). Depois crie:

### `avidoc.com.br` (principal)

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` | *o IP que a Vercel mostrou no passo 1* |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `admin` | `cname.vercel-dns.com` |
| CNAME | `agendamentos` | `cname.vercel-dns.com` |
| CNAME | `parceiros` | `cname.vercel-dns.com` |

É o mesmo desenho que o domínio atual já usa hoje.

### `avidoc.online` e `avidoc.net` (defensivos)

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` | *mesmo IP da Vercel* |
| CNAME | `www` | `cname.vercel-dns.com` |

O redirecionamento 301 é feito pela Vercel, não pelo DNS.

### O subdomínio `api` — leia antes de criar

Hoje existe `api.clickteleconsulta.online`, um CNAME para
`fnzvopspcoefzybtmwlg.supabase.co`, usado no proxy de imagens (`/cdn/...`) e liberado no CSP.

**Recomendação: não crie `api.avidoc.com.br` agora.** Domínio próprio no Supabase é um
recurso à parte e exige configuração lá dentro; se o DNS existir e o Supabase não estiver
configurado, o certificado falha e **as fotos dos médicos param de carregar**.

Duas saídas, nesta ordem de preferência:

- **Manter `api.clickteleconsulta.online`** enquanto o domínio antigo estiver renovado.
  Nada a fazer — já funciona.
- **Apontar o proxy direto para o Supabase**: trocar em `vercel.json` o destino
  `/cdn/:path*` para `https://fnzvopspcoefzybtmwlg.supabase.co/...` e ajustar o `connect-src`
  do CSP em `index.html`. É uma alteração de código; me peça quando decidir.

### Verificar

```bash
host avidoc.com.br && host www.avidoc.com.br && host avidoc.online
```

Propagação costuma levar de minutos a algumas horas. Só siga quando a Vercel marcar
os domínios como **Valid Configuration**.

---

## 3. Asaas — atualizar o site cadastrado

**Este é o passo que quebra pagamento se for esquecido.**

O checkout do Asaas valida o domínio de retorno (`callback`). Se o site cadastrado na conta
ainda for o antigo e o checkout for aberto a partir do novo, o retorno falha com erro de
domínio — o paciente paga e não volta para a confirmação.

Painel do Asaas → **Minha Conta → Informações da conta** → campo do **site/URL** →
trocar para `https://avidoc.com.br` → salvar.

Se houver uma allowlist de domínios de callback em **Integrações**, adicione
`https://avidoc.com.br` lá também, mantendo o antigo durante a transição.

---

## 4. Supabase — segredo e URLs de autenticação

Projeto `fnzvopspcoefzybtmwlg`.

### 4.1 Segredo das edge functions

**Project Settings → Edge Functions → Secrets** (ou via CLI):

| Segredo | Novo valor |
| --- | --- |
| `SITE_URL` | `https://avidoc.com.br` |

É o que monta os links dentro dos e-mails de agendamento e de convite ao médico.

### 4.2 URLs de autenticação

**Authentication → URL Configuration**:

- **Site URL** → `https://avidoc.com.br`
- **Redirect URLs** → adicionar, mantendo os antigos durante a transição:
  ```
  https://avidoc.com.br/**
  https://www.avidoc.com.br/**
  https://clickteleconsulta.online/**
  ```

**Se este passo for pulado, login, confirmação de cadastro e recuperação de senha param** —
o Supabase recusa redirecionar para uma URL fora da allowlist.

---

## 5. Resend — remetente dos e-mails

Painel do Resend → **Domains → Add Domain** → `avidoc.com.br`.

O Resend vai gerar registros **TXT (SPF/DKIM)** e possivelmente um **CNAME**. Crie todos na
DNS da Hostinger, no mesmo lugar do passo 2, e volte ao Resend para **Verify**.

Depois de verificado, atualizar o segredo no Supabase:

| Segredo | Novo valor |
| --- | --- |
| `INVITE_FROM` | `aviDoc <noreply@avidoc.com.br>` |

> Enquanto o domínio não estiver verificado no Resend, **não troque o `INVITE_FROM`** —
> o envio passa a ser recusado e nenhum e-mail sai.

---

## 6. Hostinger — caixas de e-mail

hPanel → **E-mails** → o domínio `avidoc.com.br` → criar as contas usadas no site:

- `suporte@avidoc.com.br`
- `contato@avidoc.com.br`

Isso exige os registros **MX da Hostinger** no `avidoc.com.br`. O painel oferece criá-los
automaticamente ao ativar o e-mail; aceite.

Se preferir só encaminhar para uma caixa existente, um **redirecionamento de e-mail**
resolve e evita criar caixas novas.

---

## Depois disso — o que eu faço

Com os passos 1 a 6 concluídos, me avise. Eu:

7. Preparo o commit numa branch e você confere no **preview da Vercel** antes de ir para a `main`.
8. Depois do deploy: redeploy das edge functions
   (`send-appointment-email`, `send-doctor-invite`, `jaas-token`, `create-asaas-payment`) —
   elas não sobem junto com o site.
9. Configuro o **301** de `clickteleconsulta.online` → `avidoc.com.br`, para ficar no ar
   **no mínimo 12 meses**.
10. Search Console: nova propriedade, **Mudança de endereço** e reenvio do sitemap.

---

## Conferência final

```bash
curl -sI https://avidoc.online | grep -i location      # deve apontar para avidoc.com.br
curl -s https://avidoc.com.br | grep -o '<title>[^<]*' # título do site, não parking
host api.clickteleconsulta.online                      # imagens ainda resolvendo
```

E no navegador: entrar, recuperar senha e **fazer um agendamento de teste até o retorno do
pagamento** — é o caminho que mais depende dos passos 3 e 4.
