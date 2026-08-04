import { addDays, startOfToday, isToday, addMinutes, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const TZ = 'America/Sao_Paulo';

// Geração de horários a partir da agenda_medico — MESMA lógica do DoctorScheduleCard,
// para que o ranking reflita exatamente os horários que o paciente vê no card.
// `day` é um Date local; retorna array de "HH:mm" (horário de Brasília), ordenado.
export function generateTimeSlotsFromAgenda(agenda, day) {
  const dayOfWeek = day.getDay();
  const relevantBlocks = (agenda || []).filter(
    (block) => block.dia_semana === dayOfWeek && block.status === 'disponivel'
  );
  const slots = [];
  const nowInBrasilia = utcToZonedTime(new Date(), TZ);
  const timeLimitStr = format(addMinutes(nowInBrasilia, 20), 'HH:mm');
  const isDayToday = isToday(day);

  relevantBlocks.forEach((block) => {
    if (!block.hora_inicio || !block.hora_fim || !block.intervalo_em_minutos) return;
    const [startHour, startMin] = block.hora_inicio.split(':').map(Number);
    const [endHour, endMin] = block.hora_fim.split(':').map(Number);

    let totalMins = startHour * 60 + startMin;
    const endTotalMins = endHour * 60 + endMin;

    while (totalMins < endTotalMins) {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!isDayToday || timeStr > timeLimitStr) {
        slots.push(timeStr);
      }
      totalMins += block.intervalo_em_minutos;
    }
  });
  return [...new Set(slots)].sort();
}

// Verifica se um instante (ms) cai dentro de algum bloqueio do médico.
// `blocks` é um array de { inicio: ms, fim: ms }.
export function isInstantBlocked(instantMs, blocks) {
  if (!blocks || blocks.length === 0) return false;
  for (const b of blocks) {
    if (instantMs >= b.inicio && instantMs < b.fim) return true;
  }
  return false;
}

/**
 * O médico tem ao menos UM horário livre neste dia?
 *
 * Usa a mesma geração de horários do card, e desconta o que está vendido e o
 * que está bloqueado. O filtro por data da listagem depende disso: antes ele
 * olhava só se havia regra de agenda naquele dia da semana, então oferecia
 * médicos cuja agenda daquele dia estava inteira vendida ou bloqueada — o
 * paciente filtrava por uma data, abria o card e não achava vaga nenhuma.
 *
 * `dia` é um Date local; `bookedSetMs` é um Set de instantes (ms).
 */
export function temHorarioLivreNoDia(agenda, dia, bookedSetMs, blocks = []) {
  const times = generateTimeSlotsFromAgenda(agenda, dia);
  if (times.length === 0) return false;
  const diaStr = format(dia, 'yyyy-MM-dd');
  const agoraMs = Date.now();
  for (const time of times) {
    const instante = zonedTimeToUtc(`${diaStr} ${time}:00`, TZ).getTime();
    if (Number.isNaN(instante) || instante <= agoraMs) continue;
    if (bookedSetMs && bookedSetMs.has(instante)) continue;
    if (isInstantBlocked(instante, blocks)) continue;
    return true;
  }
  return false;
}

// Próximo horário disponível do médico, como instante (ms epoch), ignorando horários
// já reservados (pagos) e bloqueios. Retorna null se não houver disponibilidade no horizonte.
// `bookedSetMs` = Set de timestamps (ms) ocupados; `blocks` = array de { inicio, fim } em ms.
export function nextAvailableSlotMs(agenda, bookedSetMs, blocks = [], horizonDays = 30) {
  if (!agenda || agenda.length === 0) return null;
  const base = startOfToday();
  const nowMs = Date.now();

  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(base, i);
    const times = generateTimeSlotsFromAgenda(agenda, day);
    if (times.length === 0) continue;
    const dayStr = format(day, 'yyyy-MM-dd');
    for (const time of times) {
      const instant = zonedTimeToUtc(`${dayStr} ${time}:00`, TZ).getTime();
      if (Number.isNaN(instant) || instant <= nowMs) continue;
      if (bookedSetMs && bookedSetMs.has(instant)) continue;
      if (isInstantBlocked(instant, blocks)) continue;
      return instant;
    }
  }
  return null;
}
