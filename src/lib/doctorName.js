// Tratamento do médico (Dr./Dra.) aplicado automaticamente conforme o sexo.
// O nome de exibição (public_name) é armazenado SEM o prefixo; o "Dr."/"Dra."
// é acrescentado apenas na exibição.

export const stripDoctorTitle = (name) =>
    (name || '').replace(/^\s*(dra|dr)\.?\s+/i, '').trim();

export const doctorTitle = (sexo) => {
    const s = String(sexo || '').toLowerCase();
    return (s === 'feminino' || s === 'f') ? 'Dra.' : 'Dr.';
};

// Nome público com o tratamento: "Dr. Fulano" / "Dra. Fulana".
export const formatDoctorDisplayName = (sexo, name) => {
    const base = stripDoctorTitle(name);
    return base ? `${doctorTitle(sexo)} ${base}` : (name || '');
};
