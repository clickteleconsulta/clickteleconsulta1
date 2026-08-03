# Onde a marca antiga ainda aparece

Auditoria feita em 03/08/2026, depois da migração para `avidoc.com.br`.

**No código do site: nada.** A varredura não encontra mais nenhuma ocorrência de
"Click Teleconsulta" fora da razão social, que deve mesmo permanecer:

```bash
grep -rn "Click Teleconsulta\|clickteleconsulta" src/ public/ index.html vercel.json supabase/ \
  | grep -v "CLICK TELECONSULTA ONLINE LTDA"
```

O que sobrou está **fora do código** — em painéis e em arquivos enviados. Lista completa,
em ordem de impacto.

---

## 1. Modelos de e-mail do Supabase Auth — **pendente**

São a causa dos e-mails ainda chegarem com a marca antiga. Ficam no painel, não no repositório.

HTML pronto para colar: **`docs/EMAILS-SUPABASE.md`**.

Cobre recuperação de senha, confirmação de cadastro, convite, link mágico e troca de e-mail.

---

## 2. PDFs dos documentos legais — **pendente, exige novo arquivo**

A tabela `platform_legal_documents` guarda **PDFs**, não texto. A marca antiga está dentro
dos arquivos e nos nomes:

| Documento | Versão | Arquivo |
| --- | --- | --- |
| Política de Privacidade (LGPD) | v4 | `Politica-de-Privacidade-Click-Teleconsulta.pdf` |
| Termos de Serviço | v6 | `Termos-de-Servico-Click-Teleconsulta-v5.pdf` |

**Não dá para corrigir por código** — é preciso gerar os PDFs novos e subir pela tela
**Admin → Legal**, que cria uma versão nova e desativa a anterior.

> **Atenção jurídica:** esses documentos citam a razão social e o CNPJ, que **não mudam**.
> Trocar só o nome comercial (Click Teleconsulta → aviDoc) e o domínio. Não altere
> cláusulas sem revisão — ver a orientação registrada sobre não criar texto legal por conta própria.

O link dos PDFs antigos continua funcionando: as URLs guardadas apontam para o domínio
antigo, mas `src/lib/storageUrl.js` as renormaliza para a origem atual em tempo de leitura.

---

## 3. Base de conhecimento da IA — **pendente, uma linha**

A resposta sobre suporte cita um e-mail que não existe mais:

> "Nosso suporte atende por e-mail em **suporte@clickteleconsulta.online** e por WhatsApp
> no (21) 3955-0563, em horário comercial."

Corrigir pela tela **Admin → Treinamento da IA**, ou direto no banco:

```sql
update ai_knowledge_base
   set answer = replace(answer, 'suporte@clickteleconsulta.online', 'contato@avidoc.com.br')
 where answer like '%clickteleconsulta%';
```

---

## 4. Segredos das edge functions — **conferir**

Em **Supabase → Edge Functions → Secrets**:

| Segredo | Valor esperado |
| --- | --- |
| `SITE_URL` | `https://avidoc.com.br` |
| `INVITE_FROM` | `aviDoc <noreply@avidoc.com.br>` |

O `INVITE_FROM` tem o mesmo problema que o remetente do SMTP tinha: se ficar no domínio
antigo, o Resend recusa com **550 domain is not verified**.

E as funções precisam ser **redeployadas** — elas não sobem com o site:

```bash
supabase functions deploy send-appointment-email send-doctor-invite jaas-token create-asaas-payment \
  --project-ref fnzvopspcoefzybtmwlg
```

---

## 5. Perfis e materiais externos — **pendente**

Arquivos prontos em `public/marca/`, servidos em `https://avidoc.com.br/marca/`:

| Onde | Arquivo |
| --- | --- |
| Instagram, Facebook, Google | `avatar-redondo.png` |
| WhatsApp Business, app, crachá | `avatar.png` |
| Assinatura de e-mail, apresentações | `logo.png` |
| Fundo escuro | `logo-branco.png` |
| Cabeçalho dos e-mails | `email-header.png` |

Falta atualizar: handle e bio das redes, assinatura de e-mail e qualquer material impresso.
