// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDADE DA MARCA — ponto único de verdade.
//
// Para renomear a marca, altere APENAS este arquivo (e siga o checklist em
// docs/TROCA-DE-MARCA.md para o que vive fora do código: domínio, e-mail,
// segredos do Supabase, redes sociais e Search Console).
//
// ATENÇÃO: `EMPRESA` são dados LEGAIS (razão social, CNPJ, endereço) e NÃO
// mudam junto com a marca. A empresa continua a mesma; só o nome comercial muda.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = {
  /** Nome comercial exibido ao usuário. */
  name: 'Click Teleconsulta',
  /** Domínio sem protocolo (usado em textos e no rodapé). */
  domain: 'clickteleconsulta.online',
  /** URL canônica, sem barra no final (usada em SEO, PDFs e e-mails). */
  url: 'https://clickteleconsulta.online',
  /** Descrição curta do posicionamento — marketplace, não plataforma de teleconsulta. */
  tagline: 'Marketplace de agendamentos médicos',
  emails: {
    suporte: 'suporte@clickteleconsulta.online',
    contato: 'contato@clickteleconsulta.online',
  },
  social: {
    instagram: '@clickteleconsulta.online',
  },
};

/** Dados legais da pessoa jurídica — permanecem mesmo se a marca mudar. */
export const EMPRESA = {
  razaoSocial: 'CLICK TELECONSULTA ONLINE LTDA',
  cnpj: '68.171.336/0001-50',
  endereco: 'R. Antônio Pereira Ramos, nº 118, Centro, Coroaci/MG, CEP 39.710-000',
  cidadeUf: 'Coroaci/MG',
};

/** Linha institucional pronta, usada em rodapés e documentos. */
export const LINHA_LEGAL = `${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj}`;

export default BRAND;
