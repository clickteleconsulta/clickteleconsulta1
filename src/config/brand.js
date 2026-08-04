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
  /**
   * Nome comercial exibido ao usuário. A grafia é **aviDoc** — minúsculo até o
   * "i", maiúsculo no "D" — igual ao desenho do wordmark. Não escreva o nome na
   * mão em lugar nenhum: importe daqui. Sete pontos já divergiram por copiar a
   * grafia errada de um comentário desatualizado.
   */
  name: 'aviDoc',
  /**
   * Domínio canônico, sem protocolo. `.com.br` é o principal; `.online` e `.net`
   * existem como defensivos e devem apenas redirecionar (301) para cá.
   */
  domain: 'avidoc.com.br',
  /** URL canônica, sem barra no final (usada em SEO, PDFs e e-mails). */
  url: 'https://avidoc.com.br',
  /** Descrição curta do posicionamento — marketplace, não plataforma de teleconsulta. */
  tagline: 'Marketplace de agendamentos médicos',
  emails: {
    suporte: 'contato@avidoc.com.br',
    contato: 'contato@avidoc.com.br',
  },
  social: {
    instagram: '@avidoc.com.br',
  },
  /** Cor única da marca — cobalto. Espelha --primary no index.css e brand-600 no Tailwind. */
  color: '#3B5BA5',

  /**
   * Verde de acento — **exclusivo da marca**. Vive na metade da cápsula e na
   * sílaba "Doc" do wordmark, e em mais lugar nenhum.
   *
   * NÃO está na escala `brand-*` do Tailwind de propósito: se virasse classe,
   * em pouco tempo apareceria num botão ou num card, e aí deixaria de ser
   * acento. Só `Logo.jsx` e `Wordmark.jsx` importam daqui.
   *
   * Também não é o verde de sucesso da interface — esse é o `green-600` do
   * Tailwind (#16A34A). O jade fica 18° de matiz afastado justamente para o
   * logo não ser lido como um selo de "confirmado".
   *
   * `acento` é para fundo claro (contraste 3,72 no branco — passa em texto
   * grande); `acentoClaro` é a gêmea para fundo escuro, onde o jade some.
   */
  acento: '#0C9769',
  acentoClaro: '#3DDC97',
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
