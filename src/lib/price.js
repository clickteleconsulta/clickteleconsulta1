// Utilitários de preço do paciente.
//
// Regra do negócio: ao aplicar a taxa da plataforma sobre o repasse do médico, o
// "preço paciente" nunca pode ficar quebrado — deve ser sempre arredondado PARA CIMA
// até o próximo múltiplo de R$ 0,50.
//   Ex.: 53,33 → 53,50 | 53,51 → 54,00 | 53,50 → 53,50 | 53,00 → 53,00

// Arredonda um valor (em reais) para cima até o próximo múltiplo de R$ 0,50.
export const roundUpToHalf = (value) => {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return 0;
  // Trabalha em centavos, com um epsilon para absorver erros de ponto flutuante
  // (ex.: 53,50 representado como 53,5000000001 não deve virar 54,00).
  const cents = n * 100;
  const roundedCents = Math.ceil((cents - 1e-6) / 50) * 50;
  return roundedCents / 100;
};

// Calcula o preço final do paciente a partir do repasse do médico e da taxa (%),
// já arredondado para o próximo R$ 0,50.
export const patientPriceFromRepasse = (repasse, taxPercent) => {
  const r = Number(repasse) || 0;
  const t = Number(taxPercent) || 0;
  const gross = t > 0 ? r / (1 - t / 100) : r;
  return roundUpToHalf(gross);
};
