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

// Próximo horário disponível do médico, como instante (ms epoch), ignorando horários
// já reservados (pagos). Retorna null se não houver disponibilidade dentro do horizonte.
// `bookedSetMs` é um Set de timestamps (ms) dos horario_inicio já ocupados desse médico.
export function nextAvailableSlotMs(agenda, bookedSetMs, horizonDays = 30) {
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
      return instant;
    }
  }
  return null;
}
