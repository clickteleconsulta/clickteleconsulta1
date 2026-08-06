// Política de cancelamento: quanto o paciente recebe de volta.
//
// A REGRA AUTORITATIVA VIVE NO BANCO, na RPC `paciente_cancelar_agendamento`,
// que é quem grava `refund_percent` no agendamento. Esta função existe para a
// interface poder DIZER ao paciente, antes de ele confirmar, o que vai
// acontecer — e para que esse aviso não seja uma segunda implementação escrita
// à mão dentro do JSX, como estava.
//
// Se a política mudar, mude nos dois lugares. O teste ao lado trava os valores
// atuais; se alguém mexer aqui sem querer, ele acusa.
//
// A política publicada (FAQ e Termos):
//   2h ou mais de antecedência   reembolso integral, retida só a taxa de processamento
//   menos de 2h                  reembolso de 50%
//   horário já passou            sem reembolso

/** Horas de antecedência a partir das quais o reembolso é integral. */
export const HORAS_REEMBOLSO_INTEGRAL = 2;

/**
 * Percentual devido ao paciente.
 *
 * @param {number} horasAteConsulta  positivo antes do horário, negativo depois
 * @param {boolean} pago             consulta ainda não paga não gera estorno
 * @returns {0|50|100}
 */
export const percentualDeReembolso = (horasAteConsulta, pago = true) => {
  if (!pago) return 0;
  const h = Number(horasAteConsulta);
  if (!Number.isFinite(h)) return 0;
  if (h <= 0) return 0;                              // horário passou: não comparecimento
  return h >= HORAS_REEMBOLSO_INTEGRAL ? 100 : 50;
};

/** Horas entre agora e o início da consulta. Separada para o cálculo ser testável sem relógio. */
export const horasAte = (inicioISO, agora = Date.now()) =>
  (new Date(inicioISO).getTime() - agora) / 3600000;

export default percentualDeReembolso;
