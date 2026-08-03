# Onde a marca antiga ainda aparece

Auditoria de 03/08/2026, depois da migração para `avidoc.com.br`.
Atualizada no mesmo dia, com o que já foi aplicado no Supabase.

**No código do site: nada.** A varredura não encontra mais nenhuma ocorrência de
"Click Teleconsulta" fora da razão social, que deve mesmo permanecer:

```bash
grep -rn "Click Teleconsulta\|clickteleconsulta" src/ public/ index.html vercel.json supabase/ \
  | grep -v "CLICK TELECONSULTA ONLINE LTDA"
```

O que sobrou está **fora do código** — em painéis, no banco e em arquivos enviados.

---

## 1. Modelos de e-mail do Supabase Auth — **feito**

Aplicado direto pela Management API em 03/08/2026, nos cinco modelos em uso:
confirmação de cadastro, troca de e-mail, convite, link mágico e recuperação de senha.

O que mudou em cada um:

| Antes | Depois |
| --- | --- |
| "Click Teleconsulta" no cabeçalho, no corpo e na assinatura | "aviDoc" |
| `#0a2540` (faixa do topo) | `#28385C` |
| `#2563eb` (botão e links) | `#3B5BA5` |
| `#f1f5f9` / `#e2e8f0` (fundo e bordas) | `#F2F5FB` / `#E3EAF6` |
| Assunto "… — Click Teleconsulta" | "… — aviDoc" |

**Os links não foram tocados.** Os modelos montam a URL com
`{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=…&next=…`,
e não com `{{ .ConfirmationURL }}`. Nenhum domínio aparece escrito no modelo —
o que quebrava o link era o **Site URL** apontando para o domínio morto, já corrigido
para `https://avidoc.com.br`.

> Se um dia for preciso reescrever esses modelos do zero, **preserve essa construção
> de link**. Trocar por `{{ .ConfirmationURL }}` muda o fluxo: a rota `/auth/confirmar`
> do site espera `token_hash`, `type` e `next` como parâmetros.

O documento `EMAILS-SUPABASE.md` foi escrito antes dessa descoberta e usa
`{{ .ConfirmationURL }}` — **não sirva de base para colar por cima do que está no ar.**

---

## 2. Banco de dados — **parcialmente feito**

Varredura em todas as colunas de texto/JSON do schema `public`:

```sql
do $$
declare r record; n bigint;
begin
  create temp table if not exists _hits(tabela text, coluna text, linhas bigint) on commit drop;
  for r in
    select c.table_name t, c.column_name col from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and tb.table_type = 'BASE TABLE'
      and c.data_type in ('text','character varying','jsonb','json')
  loop
    execute format('select count(*) from public.%I where %I::text ~* %L',
                   r.t, r.col, 'click[ -]?tele[ -]?consulta') into n;
    if n > 0 then insert into _hits values (r.t, r.col, n); end if;
  end loop;
end $$;
select * from _hits order by tabela, coluna;
```

### Já corrigido

**`ai_knowledge_base.answer`** — a resposta sobre suporte citava
`suporte@clickteleconsulta.online`, uma caixa que não existe mais. Agora responde
`contato@avidoc.com.br`.

Também corrigidas — eram URLs com o domínio antigo em `medicos.image_url` (5),
`platform_legal_documents` (2), `termo_adesao` (1) e `documents.titulo` (2). Nunca
chegaram a quebrar: `src/lib/storageUrl.js` renormaliza qualquer `/cdn/…` ou
`/storage/v1/object/public/…` para a origem atual em tempo de leitura. Foi higiene.

A varredura acima, repetida depois, devolve apenas as duas linhas da seção seguinte.

### Deixado de fora de propósito

**`perfis_usuarios.email` = `suporte@clickteleconsulta.online`, `role = admin`.**
É o e-mail de login de uma conta de administrador, sincronizado por trigger com
`auth.users`. Trocar só o perfil desencaixa os dois lados, e a caixa antiga não
recebe mais nada — então essa conta hoje **não consegue recuperar senha**.
A troca correta é pelo painel, em **Authentication → Users**, mudando o e-mail da
conta em `auth.users`. Decida antes qual endereço fica no lugar.

**`termos_consentimento.conteudo`** — texto jurídico que começa com
"Termos de uso da plataforma ClickTeleConsulta…". É conteúdo que usuários já
aceitaram; reescrever retroativamente muda um documento com efeito jurídico.
Não alterei. O caminho é publicar uma versão nova, não editar a vigente.

---

## 3. PDFs dos documentos legais — **pendente, exige novo arquivo**

A tabela `platform_legal_documents` guarda **PDFs**. A marca antiga está dentro
dos arquivos, não só no nome:

| Documento | Versão |
| --- | --- |
| Política de Privacidade (LGPD) | v4 |
| Termos de Serviço | v6 |

**Não dá para corrigir por SQL** — é preciso gerar os PDFs novos e subir pela tela
**Admin → Legal**, que cria uma versão nova e desativa a anterior.

> **Atenção jurídica:** esses documentos citam a razão social e o CNPJ, que **não mudam**.
> Trocar só o nome comercial (Click Teleconsulta → aviDoc) e o domínio. Não altere
> cláusulas sem revisão.

---

## 4. Edge functions — **o item mais urgente**

O código no ar é **anterior à troca de marca**. Confirmado cruzando a data de deploy
com o histórico do repositório:

| Função | No ar desde | Do commit | O que o e-mail diz hoje |
| --- | --- | --- | --- |
| `send-doctor-invite` | 11/07/2026 · v17 | `7c141bd` | "Click Teleconsulta" ×6, domínio morto ×2 |
| `send-appointment-email` | 30/07/2026 · v6 | `9e98160` | "Click Teleconsulta" ×3, domínio morto ×3 |

A marca entrou em `3f4e634`, no dia 03/08 — **depois dos dois deploys**. Ou seja: não
é só a cor e o texto corrigidos em `4027f64`; hoje o médico convidado recebe um e-mail
com a marca antiga e um link para `clickteleconsulta.online`, que foi apagado.

```bash
supabase functions deploy send-appointment-email send-doctor-invite jaas-token create-asaas-payment \
  --project-ref fnzvopspcoefzybtmwlg
```

Em **Supabase → Edge Functions → Secrets**, os dois segredos abaixo **existem**, mas a
API não devolve valor de segredo — confira a olho:

| Segredo | Valor esperado |
| --- | --- |
| `SITE_URL` | `https://avidoc.com.br` |
| `INVITE_FROM` | `aviDoc <noreply@avidoc.com.br>` |

O `INVITE_FROM` tem o mesmo problema que o remetente do SMTP tinha: se ficar no domínio
antigo, o Resend recusa com **550 domain is not verified**.

---

## 5. Nome do projeto no Supabase — **cosmético**

O projeto ainda se chama "Click Teleconsulta" no painel (aparece na aba do navegador
e no seletor de projetos). Não afeta nada em produção. Trocável em
**Project Settings → General → Project name**.

---

## 6. Perfis e materiais externos — **pendente**

Arquivos prontos em `public/marca/`, servidos em `https://avidoc.com.br/marca/`:

| Onde | Arquivo |
| --- | --- |
| Instagram, Facebook, Google | `avatar-redondo.png` |
| WhatsApp Business, app, crachá | `avatar.png` |
| Assinatura de e-mail, apresentações | `logo.png` |
| Fundo escuro | `logo-branco.png` |
| Cabeçalho dos e-mails | `email-header.png` |

Falta atualizar: handle e bio das redes, assinatura de e-mail e qualquer material impresso.
