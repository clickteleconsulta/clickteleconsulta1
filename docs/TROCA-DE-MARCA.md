# Troca de marca — checklist

**Estado atual: o nome já é `avidoc` no código. O domínio ainda é o antigo.**

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

## 2. No código

**Já feito (marca avidoc):**

- [x] `src/config/brand.js` — `name: 'aviDoc'` e `color: '#3B5BA5'`.
- [x] `index.html` (raiz) — título, OG, JSON-LD e `theme-color`.
- [x] `src/components/Logo.jsx` (ícone) e `src/components/Wordmark.jsx` (assinatura).
- [x] `public/favicon.svg` e `public/og-image.png` refeitos com o símbolo novo.
- [x] Interface em cobalto (escala `brand-*`); verde reservado para estados de sucesso.
- [x] `src/lib/guiaPdf.js` — cor e símbolo do PDF da guia.
- [x] E-mails das edge functions (`send-appointment-email`, `send-doctor-invite`).

**Falta, e só na virada do domínio:**

- [ ] `src/config/brand.js` — `domain`, `url`, `emails`, `social.instagram`.
- [ ] `index.html` — as URLs absolutas de `og:url`, `og:image` e do JSON-LD.
- [ ] `public/robots.txt` e `public/sitemap.xml` — host do sitemap.
- [ ] `vercel.json` — os `destination` dos redirects.
- [ ] `supabase/functions/jaas-token/index.ts` — lista de origens permitidas.
- [ ] `index.html` — `connect-src` do CSP (`api.<domínio>`).
- [ ] `npm run build` e conferir `dist/*/index.html` (títulos e canonical).

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
  | grep -v "src/config/brand.js" | grep -v "CLICK TELECONSULTA ONLINE LTDA"
```

O que aparecer aí ainda está escrito à mão e precisa ser migrado para `BRAND`.
Hoje o resultado é só o **domínio**, que segue no endereço antigo de propósito.

### Cores da marca

| Papel | Valor | Onde |
| --- | --- | --- |
| Marca / ação | `#3B5BA5` (brand-600) | `BRAND.color`, `--primary`, `--ring`, escala `brand` no tailwind.config |
| Superfície | `brand-50` / `brand-100` | cards e faixas. Fundo de página é branco — fundo preto foi testado e rejeitado |
| Azul claro | `#9FB4DE` | cápsula do logo sobre fundo escuro (prop `dark`) |
| Tipografia | Plus Jakarta Sans + DM Sans | títulos e corpo, carregadas no index.html |
| Sucesso / confirmado | família `green-*` | badges de estado — **não** usar a família da marca aqui |

A separação entre `brand` (marca) e `green` (estado) é intencional: se as duas
famílias voltarem a se misturar, um badge de "confirmado" fica igual a um botão.
