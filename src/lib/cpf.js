// Validação de CPF pelos dígitos verificadores.
//
// Contar onze dígitos não basta: 123.456.789-00 tem onze e não existe. O CPF vai
// para a cobrança do Asaas, e cobrança emitida com CPF inválido volta como erro
// depois do agendamento feito — no pior momento possível para a pessoa e para o
// suporte.
export const somenteDigitos = (valor) => String(valor || '').replace(/\D/g, '');

export const isValidCPF = (valor) => {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10], 10);
};

export default isValidCPF;
