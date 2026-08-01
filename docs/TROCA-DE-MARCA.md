# Troca de marca — checklist

O nome comercial está centralizado em **`src/config/brand.js`**. Trocar `name`,
`domain` e `url` ali propaga para site, SEO (títulos, canonical, sitemap,
pré-renderização), PDFs e rodapé.

> **A empresa não muda.** Razão social, CNPJ e endereço ficam em `EMPRESA`, no
> mesmo arquivo, e permanecem os mesmos — só o nome comercial (marca) muda.

---

## 1. Antes de decidir o nome

- [ ] **Busca de anterioridade no INPI** — classe **44** (serviços médicos) e correlatas.
- [ ] Conferir **domínio** e **@ nas redes** junto com o INPI, não depois.
- [ ] **Depositar o pedido de marca no INPI** antes do lançamento público.
- [ ] Validar com advogado de propriedade industrial.

## 2. No código (rápido)

- [ ] Editar `src/config/brand.js`: `name`, `domain`, `url`, `emails`, `social.instagram`.
- [ ] `npm run build` e conferir `dist/*/index.html` (títulos e canonical) e `public/sitemap.xml`.
- [ ] `index.html` (raiz) — título, OG e JSON-LD ainda têm o nome escrito à mão.
- [ ] `public/robots.txt` — confere o host do sitemap.
- [ ] Trocar `public/og-image.png` e o favicon pela arte nova.
- [ ] `src/components/Logo.jsx` — se o símbolo mudar.

## 3. Backend (Supabase)

- [ ] Segredo **`SITE_URL`** → novo domínio.
- [ ] Edge functions com o nome no corpo do e-mail:
      `send-appointment-email`, `send-doctor-invite`, `notify-*`.
      (Precisam ser **re-deployadas** depois de editadas.)
- [ ] **`INVITE_FROM`** e o domínio verificado no **Resend** (remetente dos e-mails).
- [ ] Documentos legais em `platform_legal_documents` — trocar a marca no texto,
      **mantendo CNPJ e razão social**.

## 4. Infra e domínio

- [ ] Registrar o domínio novo e apontar para a Vercel.
- [ ] Manter o **domínio antigo com redirect 301** por **≥ 12 meses** (preserva SEO).
- [ ] Vercel: adicionar o domínio novo como principal.
- [ ] **Search Console**: cadastrar a nova propriedade e usar **"Mudança de endereço"**.
- [ ] Reenviar o sitemap novo.

## 5. Pagamento (Asaas)

- [ ] Atualizar o **site cadastrado** na conta Asaas (Minha Conta → Informações) —
      sem isso o `callback` de retorno do checkout falha com erro de domínio.

## 6. Marketing

- [ ] Instagram/Facebook: handle, nome de exibição, bio e link.
- [ ] Refazer o **kit de marca** e os **carrosséis** (pasta de Marketing na Área de Trabalho).
- [ ] Atualizar a assinatura de e-mail e materiais impressos.

## 7. Comunicação

- [ ] E-mail para **pacientes** e **médicos parceiros** avisando da mudança.
- [ ] Aviso no site ("*X agora é Y*") por alguns meses.
- [ ] Atualizar os textos de ajuda e o material do parceiro.

---

### Como conferir se sobrou algo

```bash
grep -rn "Click Teleconsulta\|clickteleconsulta" src/ tools/ public/ supabase/ index.html \
  | grep -v "src/config/brand.js"
```

O que aparecer aí ainda está escrito à mão e precisa ser migrado para `BRAND`.
