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
