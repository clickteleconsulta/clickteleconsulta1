// Máscaras e validações para formulários de cadastro (paciente e médico)

export const onlyDigits = (v = '') => (v || '').replace(/\D/g, '');

// CPF: 000.000.000-00  (11 dígitos)
export const maskCPF = (v = '') => {
    const d = onlyDigits(v).slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Telefone/WhatsApp: (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo)
export const maskPhone = (v = '') => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d.replace(/(\d{0,2})/, '($1');
    if (d.length <= 6) return d.replace(/(\d{2})(\d{0,4})/, '($1) $2');
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

// CRM: apenas dígitos (até 8)
export const maskCRM = (v = '') => onlyDigits(v).slice(0, 8);

// UF: 2 letras maiúsculas
export const maskUF = (v = '') => (v || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);

// Validação de CPF (dígitos verificadores)
export const isValidCPF = (v = '') => {
    const cpf = onlyDigits(v);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
    let d1 = 11 - (sum % 11);
    if (d1 >= 10) d1 = 0;
    if (d1 !== parseInt(cpf[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
    let d2 = 11 - (sum % 11);
    if (d2 >= 10) d2 = 0;
    return d2 === parseInt(cpf[10], 10);
};

// Telefone válido: 10 (fixo) ou 11 (celular) dígitos
export const isValidPhone = (v = '') => {
    const d = onlyDigits(v);
    return d.length === 10 || d.length === 11;
};

/**
 * "12/06/1985" → "1985-06-12". Devolve '' se a data não existe.
 *
 * POR QUE DIGITAR EM VEZ DE ESCOLHER NO CALENDÁRIO
 * O seletor nativo (`<input type="date">`) abre no mês atual. Para uma data de
 * nascimento isso obriga a pessoa a rolar décadas para trás no celular — dezenas
 * de toques para uma informação que ela digita em cinco segundos. É atrito no
 * meio do cadastro, e cadastro é onde mais se perde gente.
 *
 * A CONFERÊNCIA NÃO É DECORATIVA
 * `new Date('2024-02-31')` não dá erro em JavaScript: vira 2 de março. Um dia
 * inválido digitado passaria batido e viraria idade errada — inclusive podendo
 * furar a barreira de 18 anos. Por isso a data é remontada e comparada campo a
 * campo com o que foi digitado.
 */
export const dataBrParaISO = (v = '') => {
  const d = onlyDigits(v);
  if (d.length !== 8) return '';
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4, 8));
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
  if (ano < 1900 || ano > new Date().getFullYear()) return '';
  const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const teste = new Date(`${iso}T00:00:00`);
  if (
    teste.getFullYear() !== ano ||
    teste.getMonth() + 1 !== mes ||
    teste.getDate() !== dia
  ) return '';
  return iso;
};

/** "1985-06-12" → "12/06/1985", para reexibir o que já está salvo. */
export const isoParaDataBr = (iso = '') => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
