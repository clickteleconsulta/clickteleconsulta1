# Modelos de e-mail do Supabase Auth — marca aviDoc

> **APLICADO em 03/08/2026 — mas não por este documento.**
>
> Os modelos que estão no ar não foram substituídos por estes: os originais foram
> mantidos e só tiveram a marca e as cores trocadas, para não mexer nos links.
> Ver `MARCA-ANTIGA-PENDENCIAS.md`, seção 1.
>
> **Não cole o HTML abaixo por cima do que está em produção.** Ele usa
> `{{ .ConfirmationURL }}`, e os modelos reais montam a URL com
> `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=…&next=…`,
> que é o formato que a rota `/auth/confirmar` do site espera. Trocar quebra o fluxo.
>
> O que segue vale como referência de layout, caso um dia os modelos sejam refeitos
> do zero — e nesse caso o link tem de ser reescrito no formato acima.

Os e-mails de **recuperação de senha, confirmação de cadastro, convite, link mágico e
troca de e-mail** não vêm do código do site: são modelos guardados no painel do Supabase.
Por isso continuaram com a marca antiga mesmo depois do deploy.

Onde editar: **Supabase → Authentication → Emails → Templates**, um modelo por aba.

Antes de colar, confira em **SMTP Settings**:

| Campo | Valor |
| --- | --- |
| Sender email | `noreply@avidoc.com.br` |
| Sender name | `aviDoc` |

---

## Estrutura comum

Todos usam o mesmo invólucro. O logo é servido pelo próprio site, então não precisa
anexar imagem: `https://avidoc.com.br/marca/email-header.png`.

As variáveis entre chaves são preenchidas pelo Supabase — **não traduza nem altere**.

---

## 1. Reset Password (Recuperação de senha)

**Assunto:** `Redefinir sua senha · aviDoc`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F5FB;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td align="center" style="padding:28px 0 8px">
        <img src="https://avidoc.com.br/marca/email-header.png" width="200" alt="aviDoc" style="display:block;border:0">
      </td></tr>
      <tr><td style="padding:8px 40px 32px;color:#1f2937;font-size:15px;line-height:1.65">
        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:16px 0 12px">Redefinir sua senha</h1>
        <p style="margin:0 0 20px">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova.</p>
        <p style="margin:0 0 26px">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#3B5BA5;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px">Redefinir senha</a>
        </p>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
        <p style="margin:0 0 24px;font-size:12px;word-break:break-all"><a href="{{ .ConfirmationURL }}" style="color:#3B5BA5">{{ .ConfirmationURL }}</a></p>
        <p style="margin:0;color:#6b7280;font-size:13px">Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
      </td></tr>
      <tr><td style="padding:20px 40px 28px;border-top:1px solid #eef2f6;color:#9aa3ae;font-size:11px;line-height:1.6">
        aviDoc · marketplace de agendamentos médicos<br>
        CLICK TELECONSULTA ONLINE LTDA · CNPJ 68.171.336/0001-50<br>
        <a href="https://avidoc.com.br" style="color:#9aa3ae">avidoc.com.br</a> · contato@avidoc.com.br
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 2. Confirm signup (Confirmação de cadastro)

**Assunto:** `Confirme seu cadastro · aviDoc`

Use o mesmo bloco acima trocando o miolo:

```html
<h1 style="font-size:22px;font-weight:800;color:#111827;margin:16px 0 12px">Confirme seu e-mail</h1>
<p style="margin:0 0 20px">Falta um passo para ativar sua conta. Clique no botão abaixo para confirmar este endereço.</p>
<p style="margin:0 0 26px">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#3B5BA5;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px">Confirmar cadastro</a>
</p>
```

---

## 3. Invite user (Convite)

**Assunto:** `Você foi convidado · aviDoc`

```html
<h1 style="font-size:22px;font-weight:800;color:#111827;margin:16px 0 12px">Você recebeu um convite</h1>
<p style="margin:0 0 20px">Use o botão abaixo para criar sua senha e acessar a plataforma.</p>
<p style="margin:0 0 26px">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#3B5BA5;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px">Aceitar convite</a>
</p>
```

---

## 4. Magic Link e Change Email

Mesmo invólucro. Trocar apenas o título e o rótulo do botão:

- **Magic Link** — "Entrar na sua conta" / botão "Entrar"
- **Change Email Address** — "Confirme seu novo e-mail" / botão "Confirmar e-mail"

---

## Verificação

Depois de salvar, dispare uma recuperação de senha e confira:

1. O remetente aparece como **aviDoc**, não como a marca antiga
2. O logo carrega (é uma URL pública do site, não precisa liberar imagem)
3. O link leva para `https://avidoc.com.br/auth/reset-password`

> O Supabase limita os e-mails de autenticação por hora. Se aparecer
> **429 email rate limit exceeded** nos Auth Logs, espere a janela virar ou aumente
> o teto em **Authentication → Rate Limits**.
