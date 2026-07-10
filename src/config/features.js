// Flags de funcionalidade da plataforma.
// Fase inicial: apenas AGENDAMENTO + PAGAMENTO.
// Para religar uma feature no futuro, basta trocar false → true.
export const FEATURES = {
  VIDEO_CALL: false,   // videochamada / telemedicina (Jitsi/JaaS)
  PRONTUARIO: false,   // prontuário eletrônico + receitas (Memed)
  MESSAGING: false,    // chat paciente ↔ médico
  GUEST_ACCESS: false, // acesso de convidado (fluxo de vídeo)
};

export default FEATURES;
