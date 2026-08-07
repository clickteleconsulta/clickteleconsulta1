// Flags de funcionalidade da plataforma.
// Fase inicial: apenas AGENDAMENTO + PAGAMENTO.
// Para religar uma feature no futuro, basta trocar false → true.
export const FEATURES = {
  VIDEO_CALL: false,   // videochamada / telemedicina (Jitsi/JaaS)
  PRONTUARIO: false,   // prontuário eletrônico + receitas (Memed)
  MESSAGING: false,    // chat paciente ↔ médico
  GUEST_ACCESS: false, // acesso de convidado (fluxo de vídeo)

  // Verificação de telefone por código. NASCE DESLIGADA de propósito.
  //
  // Ligá-la sem a função `verificar-telefone` publicada trava o agendamento
  // inteiro: a tela de revisão passa a exigir um código que ninguém consegue
  // receber, e o botão de confirmar nunca libera. Foi o que aconteceu quando
  // a exigência subiu antes da função — por isso a flag existe.
  //
  // Ligue só depois de: publicar as duas funções, configurar o provedor
  // (WhatsApp ou SMS) e conferir que um código chega de verdade.
  // Ver docs/VERIFICACAO-TELEFONE.md.
  VERIFICACAO_TELEFONE: false,
};

export default FEATURES;
