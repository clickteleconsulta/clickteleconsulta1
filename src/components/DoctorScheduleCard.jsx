
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, User, ChevronLeft, ChevronRight, CalendarOff, ChevronDown, CalendarCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, addDays, startOfToday, isToday, isTomorrow, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { supabase } from '@/lib/customSupabaseClient';
import { toSiteUrl } from '@/lib/storageUrl';
import { formatDoctorDisplayName } from '@/lib/doctorName';
import { isInstantBlocked } from '@/lib/doctorAvailability';
import { TeleconsultaBadge } from '@/components/TeleconsultaBadge';
import { BRAND } from '@/config/brand';
import { Skeleton } from './ui/skeleton';

// Selo de médico verificado — desenho próprio: círculo + check no gradiente da marca.
// Não usar roseta/estrela azul: a forma é fortemente associada ao selo do Instagram/Meta,
// cuja política de marcas veda sinais confusamente similares.
const VerifiedSeal = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Médico verificado">
    <title>Médico verificado</title>
    <defs>
      <linearGradient id="ctSeloGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3B5BA5" />
        <stop offset="100%" stopColor="#6B87C4" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#ctSeloGrad)" />
    <path d="M7.8 12.4 l2.8 2.8 5.4-5.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Rótulos de data no estilo Doctoralia: "HOJE", "AMANHÃ" ou dia da semana; e "1 Ago", "31 Jul".
const capMonth = (s) => s.replace(/\./g, '').replace(/ (\p{L})/u, (_, c) => ' ' + c.toUpperCase());
const dayLabel = (day) => isToday(day) ? 'HOJE' : isTomorrow(day) ? 'AMANHÃ' : format(day, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase();
const dateLabel = (day) => capMonth(format(day, 'd MMM', { locale: ptBR }));
const titleCase = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : s;

const generateTimeSlotsFromAgenda = (agenda, day) => {
  const dayOfWeek = day.getDay();
  const relevantBlocks = agenda.filter(block => block.dia_semana === dayOfWeek && block.status === 'disponivel');
  const slots = [];
  const timeZone = 'America/Sao_Paulo';
  const nowInBrasilia = utcToZonedTime(new Date(), timeZone);
  const timeLimitStr = format(addMinutes(nowInBrasilia, 20), 'HH:mm');
  const isDayToday = isToday(day);

  relevantBlocks.forEach(block => {
    // hora_inicio/hora_fim are stored as "HH:MM:SS" strings in Brasilia time
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
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Resume em uma linha os dias da semana em que o médico abriu agenda.
 *
 * Prefere a forma contínua ("Seg a sáb") porque cabe em qualquer largura; só
 * lista dia a dia quando há buraco no meio. Domingo é tratado como o começo da
 * semana, então uma agenda de sábado e domingo aparece como dois dias soltos —
 * e é isso mesmo que o paciente precisa ler.
 */
const resumoDosDias = (agenda) => {
  const dias = [...new Set(
    (agenda || [])
      .filter((b) => b.status === 'disponivel' && Number.isInteger(b.dia_semana))
      .map((b) => b.dia_semana)
  )].sort((a, b) => a - b);

  if (!dias.length) return null;
  if (dias.length === 7) return 'Todos os dias';

  const continuo = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  if (continuo && dias.length >= 3) {
    return `${DIAS[dias[0]]} a ${DIAS[dias[dias.length - 1]].toLowerCase()}`;
  }
  // Listar quatro ou mais dias soltos não cabe na largura de um celular e vira
  // uma tira cortada. A contagem informa o mesmo e sempre cabe.
  if (dias.length >= 4) return `${dias.length} dias por semana`;
  return dias.map((d) => DIAS[d]).join(', ');
};

const ScheduleSkeleton = () => (
  <div className="flex-grow flex flex-col">
    <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-2 text-center space-y-1 min-h-[130px]">
                <Skeleton className="h-3 w-12 mx-auto rounded-md" />
                <Skeleton className="h-3 w-8 mx-auto rounded-md" />
                <div className="space-y-1.5 mt-2.5">
                    {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8 w-full rounded-lg" />)}
                </div>
            </div>
        ))}
    </div>
  </div>
);

export function DoctorScheduleCard({
  initialDoctor,
  onScheduleUpdate,
  isFallback = false,
  patientPrice,
  formattedPatientPrice
}) {
  const { session } = useAuth();
  const { getBookedSlots } = useAppointments();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState(initialDoctor);
  const [loadingSlots, setLoadingSlots] = useState(!isFallback);
  const [dayOffset, setDayOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  // No celular a agenda entra recolhida: o cartão do médico cabe inteiro na tela
  // e a lista fica navegável. A partir de md a grade é sempre visível e este
  // estado não tem efeito nenhum.
  const [agendaAberta, setAgendaAberta] = useState(false);
  const [doctorAgenda, setDoctorAgenda] = useState([]);
  const [bookedSlots, setBookedSlots] = useState(new Map());
  const [blocks, setBlocks] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(null); // convidado tentando agendar
  // Dias visíveis por página: 3 no mobile (uma linha), 5 no desktop.
  const [perPage, setPerPage] = useState(typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setPerPage(mq.matches ? 5 : 3);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const today = startOfToday();
  const visibleDays = useMemo(() => Array.from({ length: perPage }).map((_, i) => addDays(today, i + dayOffset)), [today, dayOffset, perPage]);

  const fetchAllData = useCallback(async () => {
    if (isFallback || !doctor?.id) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    
    try {
      const [agendaResult, bookedSlotsResult, blocksResult] = await Promise.all([
        supabase.from('agenda_medico').select('*').eq('medico_id', doctor.id).eq('status', 'disponivel'),
        getBookedSlots(doctor.id),
        supabase.from('bloqueios_agenda').select('inicio, fim').eq('medico_id', doctor.id).gte('fim', new Date().toISOString())
      ]);

      if (agendaResult.error) throw agendaResult.error;

      setDoctorAgenda(agendaResult.data || []);
      setBookedSlots(bookedSlotsResult);
      setBlocks((blocksResult.data || []).map(b => ({ inicio: new Date(b.inicio).getTime(), fim: new Date(b.fim).getTime() })));
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar dados',
        description: 'Não foi possível carregar a agenda do médico.'
      });
      setDoctorAgenda([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctor?.id, toast, isFallback, getBookedSlots]);

  useEffect(() => {
    if (!isFallback && doctor?.id) {
      fetchAllData();
    }
  }, [doctor?.id, isFallback, fetchAllData]);

  useEffect(() => {
    if (isFallback || !doctor?.id) return;
    
    const doctorChannel = supabase.channel(`public:medicos:id=eq.${doctor.id}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'medicos', filter: `id=eq.${doctor.id}`
    }, payload => {
      // Preserva a nota calculada no pai (não é coluna de medicos) ao aplicar o update em tempo real.
      setDoctor(prev => JSON.stringify(prev) !== JSON.stringify(payload.new)
        ? { ...payload.new, rating: prev?.rating, reviewCount: prev?.reviewCount }
        : prev);
    }).subscribe();
    
    const appointmentsChannel = supabase.channel(`realtime-agendamentos-doctor-${doctor.id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'agendamentos', filter: `medico_id=eq.${doctor.id}`
    }, () => fetchAllData()).subscribe();
    
    const scheduleChannel = supabase.channel(`public:agenda_medico:medico_id=eq.${doctor.id}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'agenda_medico', filter: `medico_id=eq.${doctor.id}`
    }, () => fetchAllData()).subscribe();

    return () => {
      supabase.removeChannel(doctorChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, [doctor?.id, isFallback, fetchAllData]);

  // Posiciona o card na primeira janela (de 5 dias) que tenha horários disponíveis.
  // Agendas esparsas (ex.: médico só atende sexta) podem não ter nenhum dia disponível
  // nos próximos 5 dias; sem isto o card ficaria "vazio" mesmo havendo horários adiante.
  useEffect(() => {
    if (isFallback || !doctorAgenda || doctorAgenda.length === 0) return;
    const base = startOfToday();
    for (let i = 0; i <= 20; i++) {
      if (generateTimeSlotsFromAgenda(doctorAgenda, addDays(base, i)).length > 0) {
        setDayOffset(Math.floor(i / perPage) * perPage);
        return;
      }
    }
  }, [doctorAgenda, isFallback]);

  const scheduleByDay = useMemo(() => {
    if (!doctorAgenda || isFallback) return visibleDays.map(day => ({
      date: day,
      dayName: dayLabel(day),
      dateFormatted: dateLabel(day),
      slots: []
    }));
    return visibleDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      // Esconde horários que caem em um bloqueio de indisponibilidade do médico.
      const allSlots = generateTimeSlotsFromAgenda(doctorAgenda, day).filter(time => {
        const instant = zonedTimeToUtc(`${dayStr} ${time}:00`, 'America/Sao_Paulo').getTime();
        return !isInstantBlocked(instant, blocks);
      });
      return {
        date: day,
        dayName: dayLabel(day),
        dateFormatted: dateLabel(day),
        slots: allSlots
      };
    });
  }, [doctorAgenda, visibleDays, isFallback, blocks]);

  // Primeira vaga realmente livre na janela visível (ignora horários já ocupados).
  const nextAvailable = useMemo(() => {
    for (const d of scheduleByDay) {
      for (const time of d.slots) {
        const sd = new Date(d.date);
        const [h, m] = time.split(':').map(Number);
        sd.setHours(h, m, 0, 0);
        const z = utcToZonedTime(sd, 'America/Sao_Paulo');
        const id = `${format(z, 'yyyy-MM-dd')}T${format(z, 'HH:mm:ss')}`;
        if (!bookedSlots.get(id)) return { label: dayLabel(d.date), time };
      }
    }
    return null;
  }, [scheduleByDay, bookedSlots]);
  const day0HasSlots = (scheduleByDay[0]?.slots?.length || 0) > 0;

  const handleBooking = async (day, time) => {
    if (isFallback) {
      toast({
        variant: 'destructive',
        title: 'Não é possível agendar',
        description: 'A agenda do médico não pôde ser carregada. Tente novamente mais tarde.'
      });
      return;
    }

    // O horário do slot está no fuso de Brasília. Converte explicitamente para UTC
    // (independe do fuso do navegador), evitando gravar a hora local como se fosse UTC.
    const timeZone = 'America/Sao_Paulo';
    const dayStr = format(day, 'yyyy-MM-dd');
    const startUtc = zonedTimeToUtc(`${dayStr} ${time}:00`, timeZone);
    const endUtc = addMinutes(startUtc, 30);

    // Ensure we use the exact patient price calculated in the parent component
    const priceToUse = typeof patientPrice === 'number'
      ? Math.round(patientPrice * 100)
      : (doctor.price_in_cents || 0);

    const appointmentDetails = {
      medico_id: doctor.id,
      doctor_name: formatDoctorDisplayName(doctor.sexo, doctor.public_name || doctor.name),
      specialty: doctor.specialty,
      appointment_date: dayStr,
      appointment_time: `${time}:00`,
      horario_inicio: startUtc.toISOString(),
      horario_fim: endUtc.toISOString(),
      price_in_cents: priceToUse
    };

    // Convidado (sem conta): guarda o horário escolhido e explica que precisa de cadastro,
    // em vez de jogá-lo numa tela de login sem contexto (evita perda de conversão).
    if (!session) {
      try {
        localStorage.setItem('pendingBooking', JSON.stringify({
          details: appointmentDetails,
          doctorName: appointmentDetails.doctor_name,
          whenLabel: `${format(day, "dd/MM")} às ${time}`,
          ts: Date.now()
        }));
      } catch (_) { /* storage indisponível */ }
      setAuthPrompt({
        doctorName: appointmentDetails.doctor_name,
        whenLabel: `${format(day, "dd 'de' MMMM", { locale: ptBR })} às ${time}`
      });
      return;
    }

    navigate('/agendamento/revisao', { state: { appointmentDetails } });
  };

  const goToAuth = (mode) => {
    navigate('/acesso-cliente', { state: { from: { pathname: '/agendamento/revisao' }, authMode: mode } });
  };

  const isScheduleAvailable = scheduleByDay.some(d => d.slots.length > 0);
  // Se o médico tem agenda configurada, sempre mostramos a grade + setas de navegação
  // (mesmo que a janela atual esteja vazia), para que o paciente possa avançar até os
  // dias com disponibilidade. O estado "Sem horários" fica só para quem não tem agenda.
  const hasConfiguredAgenda = !isFallback && Array.isArray(doctorAgenda) && doctorAgenda.length > 0;
  const diasAbertos = useMemo(() => resumoDosDias(doctorAgenda), [doctorAgenda]);

  // Directly use the formatted price passed from the parent which already includes the tax
  const displayPrice = formattedPatientPrice ? formattedPatientPrice : 'Consultar';

  // CRM: usa somente a parte numérica (o campo pode já vir com "/UF") e anexa a UF uma única vez
  const crmNumber = doctor?.crm ? String(doctor.crm).split('/')[0].trim() : '';
  const crmDisplay = crmNumber ? `CRM ${crmNumber}${doctor?.uf ? `/${doctor.uf}` : ''}` : '';
  const rawSpecialty = doctor?.specialty?.trim();
  const specialtyLabel = rawSpecialty && rawSpecialty.toLowerCase() !== 'médico'
    ? `Médico · ${rawSpecialty}`
    : 'Médico';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative overflow-hidden my-3 w-full max-w-[800px] mx-auto"
    >
      <div className="flex flex-col md:flex-row">
          <div className="p-4 md:p-5 flex flex-col gap-3 w-full md:w-[300px] md:min-w-[300px] border-b md:border-b-0 md:border-r border-slate-100">
              <div className="flex items-start gap-3">
                  <Avatar className="w-16 h-16 shadow-lg shadow-slate-200/60 ring-2 ring-white shrink-0 rounded-full">
                      <AvatarImage src={toSiteUrl(doctor?.image_url)} alt={`Foto de ${doctor?.public_name || 'médico'}`} className="rounded-full object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-brand-400 to-brand-400 text-white rounded-full"><User size={26} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                      <Link to={!isFallback ? `/medico/${doctor.id}` : '#'} className={cn("block", !isFallback && "hover:underline")}>
                          <h3 className="text-[21px] leading-tight font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 min-w-0" title={formatDoctorDisplayName(doctor?.sexo, doctor?.public_name || doctor?.name)}>
                              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{formatDoctorDisplayName(doctor?.sexo, doctor?.public_name || doctor?.name)}</span>
                              <VerifiedSeal className="w-[19px] h-[19px] shrink-0" />
                          </h3>
                      </Link>

                      {doctor?.reviewCount > 0 && (
                          <Link
                              to={!isFallback ? `/medico/${doctor.id}#avaliacoes` : '#'}
                              className="flex items-center gap-1 mt-1 w-fit group"
                              title="Ver avaliações"
                              aria-label={`Nota ${doctor.rating.toFixed(1)} de 5, ${doctor.reviewCount} avaliações`}
                          >
                              <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={cn("w-3 h-3 transition-transform group-hover:scale-110", i < Math.round(doctor.rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
                                  ))}
                              </div>
                              <span className="text-xs text-slate-400 ml-0.5">({doctor.reviewCount})</span>
                          </Link>
                      )}
                      {/* Especialidade e CRM em cobalto: são o par que qualifica
                          o profissional. Em linhas separadas porque um CRM de
                          nove dígitos junto da especialidade não cabe na largura
                          de um celular — na mesma linha, o separador sobrava
                          pendurado no fim. O CRM em negrito por ser o verificável. */}
                      <p className="text-[13.5px] text-brand-700 font-medium mt-1 leading-snug overflow-hidden text-ellipsis whitespace-nowrap" title={specialtyLabel}>
                          {specialtyLabel}
                      </p>
                      {crmDisplay && (
                          <p className="text-[13.5px] font-bold text-brand-700 leading-snug whitespace-nowrap">{crmDisplay}</p>
                      )}
                  </div>
              </div>

              {/* O preço usa o jade da marca porque é o que mais diferencia a
                  plataforma e o primeiro dado que o paciente procura. É a única
                  aparição do jade fora do logo — por isso vem de BRAND.acento e
                  não de uma classe do Tailwind, para seguir sendo uma exceção
                  rastreável em vez de virar cor de interface.

                  As duas telas pedem arranjos diferentes, e cada um só existe na
                  sua largura. No celular, rótulo acima do dado em duas colunas,
                  com os dias da agenda — a grade de horários está recolhida, e
                  saber em que dias o médico atende ajuda a decidir se vale abrir.
                  A partir de md a grade já está ao lado mostrando os dias reais,
                  então repeti-los seria ruído: sobra uma linha só, modalidade à
                  esquerda e preço à direita. */}
              <div className="pt-3 border-t border-slate-100">
                  <div className="md:hidden flex items-start gap-8">
                      <div className="min-w-0">
                          <TeleconsultaBadge />
                          {/* Mesmo corpo e mesmo leading que o valor da agenda ao
                              lado, para as duas linhas assentarem na mesma base.
                              O preço continua liderando pela cor e pelo peso, não
                              pelo tamanho. */}
                          <p
                              className="mt-1.5 text-[18px] font-extrabold tracking-tight tabular-nums leading-none"
                              style={{ color: BRAND.acento }}
                          >
                              {displayPrice}
                          </p>
                      </div>
                      {diasAbertos && (
                          <div className="min-w-0">
                              <p className="h-6 flex items-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Agenda</p>
                              <p className="mt-1.5 text-[18px] font-bold tracking-tight text-slate-900 leading-none whitespace-nowrap">
                                  {diasAbertos}
                              </p>
                          </div>
                      )}
                  </div>

                  <div className="hidden md:flex items-center justify-between gap-3">
                      <TeleconsultaBadge size="md" />
                      {/* 19px encosta na altura do selo (h-7) sem ultrapassá-la,
                          então o `items-center` do flex centraliza os dois de
                          verdade em vez de compensar uma caixa maior. */}
                      <span
                          className="text-[19px] font-extrabold tracking-tight tabular-nums leading-none"
                          style={{ color: BRAND.acento }}
                      >
                          {displayPrice}
                      </span>
                  </div>
              </div>

              {/* Sinal de confiança: pagamento online (Pix e cartão via Asaas) */}
              <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span>Pagamento online · Pix e cartão</span>
              </div>

              {/* Abre a agenda no celular. Some a partir de md, onde a grade já
                  está ao lado. A palavra "Horários" ao lado da seta diz o que há
                  atrás dela — sozinha, a seta não sugeria o suficiente. O nome
                  acessível completa a ação para quem usa leitor de tela. */}
              {!loadingSlots && hasConfiguredAgenda && (
                  <button
                      type="button"
                      onClick={() => setAgendaAberta((v) => !v)}
                      aria-expanded={agendaAberta}
                      aria-controls={`agenda-${doctor?.id}`}
                      aria-label={agendaAberta ? 'Ocultar horários' : 'Ver horários'}
                      title={agendaAberta ? 'Ocultar horários' : 'Ver horários'}
                      className="md:hidden mt-1 flex items-center justify-center gap-1.5 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-[13.5px] font-semibold active:bg-slate-100 transition-colors"
                  >
                      Horários
                      <ChevronDown className={cn('w-[18px] h-[18px] transition-transform duration-200', agendaAberta && 'rotate-180')} />
                  </button>
              )}
          </div>

          <div
              id={`agenda-${doctor?.id}`}
              className={cn(
                  'p-3 md:p-3.5 flex-1 flex-col min-h-[220px] md:flex',
                  agendaAberta ? 'flex' : 'hidden'
              )}
          >
              {loadingSlots ? <ScheduleSkeleton /> : !hasConfiguredAgenda ? <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground py-6">
                      <CalendarOff className="w-7 h-7 mb-1" />
                      <p className="font-semibold text-foreground text-sm">Sem horários disponíveis</p>
                      <p className="text-xs">{isFallback ? 'A agenda do médico não pôde ser carregada.' : 'Este médico está ajustando seus horários. Volte mais tarde.'}</p>
                  </div> : <>
                      <div className="flex items-center justify-between mb-2.5 px-1">
                           <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => Math.max(0, d - perPage))} disabled={dayOffset === 0} aria-label="Dias anteriores" title="Dias anteriores" className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                              <ChevronLeft className="w-5 h-5" />
                          </Button>
                          {nextAvailable && !day0HasSlots ? (
                              <span className="text-[11px] font-bold text-brand-600 truncate px-1">Próxima vaga: {titleCase(nextAvailable.label)} · {nextAvailable.time}</span>
                          ) : (
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Selecione um horário</span>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => d + perPage)} aria-label="Próximos dias" title="Próximos dias" className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                             <ChevronRight className="w-5 h-5" />
                          </Button>
                      </div>
                      
                      <TooltipProvider delayDuration={100}>
                          <motion.div className="flex-1 flex flex-col">
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-2 gap-y-0">
                                  {scheduleByDay.map(daySchedule => {
              const isDayToday = isToday(daySchedule.date);
              const hasSlots = daySchedule.slots.length > 0;
              return <div key={daySchedule.dateFormatted} className="flex flex-col min-h-[150px]">
                                              <div className="py-1.5 px-1 text-center mb-1.5">
                                                  <div className={cn("text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5", isDayToday ? "text-brand-600" : "text-slate-400")}>
                                                      {daySchedule.dayName}
                                                  </div>
                                                  <div className={cn("text-sm font-bold", isDayToday ? "text-brand-600" : "text-slate-700")}>
                                                      {daySchedule.dateFormatted}
                                                  </div>
                                              </div>

                                              <div className="px-1 flex flex-col gap-1.5 flex-grow">
                                                  {(isExpanded ? daySchedule.slots : daySchedule.slots.slice(0, 4)).map(time => {
                    const slotDate = new Date(daySchedule.date);
                    const [hours, minutes] = time.split(':').map(Number);
                    slotDate.setHours(hours, minutes, 0, 0);
                    const slotIdentifier = `${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'yyyy-MM-dd')}T${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'HH:mm:ss')}`;
                    const isBooked = !!bookedSlots.get(slotIdentifier);
                    return <Tooltip key={time} disableHoverableContent={!isBooked}>
                                                              <TooltipTrigger asChild>
                                                                  <div className="w-full">
                                                                      <Button variant="outline" disabled={isBooked} onClick={() => handleBooking(daySchedule.date, time)} className={cn("w-full h-8 rounded-full border-0 text-[13px] font-semibold transition-all duration-200 px-1", isBooked ? "bg-slate-50 text-slate-300 line-through decoration-2 cursor-not-allowed hover:bg-slate-50" : "bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white hover:-translate-y-px active:translate-y-0 active:scale-[0.97]")} aria-disabled={isBooked}>
                                                                          {time}
                                                                      </Button>
                                                                  </div>
                                                              </TooltipTrigger>
                                                              {isBooked && <TooltipContent>
                                                                      <p>Horário indisponível</p>
                                                                  </TooltipContent>}
                                                          </Tooltip>;
                  })}
                                                  {!hasSlots && <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-4">
                                                          <div className="w-8 h-0.5 bg-gray-300 rounded-full mb-1"></div>
                                                      </div>}
                                              </div>
                                          </div>;
            })}
                              </div>
                              
                              {scheduleByDay.some(d => d.slots.length > 4) && <div className="mt-3 flex justify-center">
                                      <button onClick={() => setIsExpanded(!isExpanded)} className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full hover:bg-brand-50 border border-slate-200 group">
                                          {isExpanded ? "Ver menos horários" : "Mostrar mais horários"}
                                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                                      </button>
                                  </div>}
                          </motion.div>
                      </TooltipProvider>
                  </>}
          </div>
      </div>
      {authPrompt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setAuthPrompt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <CalendarCheck className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Falta pouco para agendar!</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Para agendar sua consulta com <b className="text-slate-700">{authPrompt.doctorName}</b> em{' '}
              <b className="text-slate-700">{authPrompt.whenLabel}</b> e reservar o horário, você precisa de uma
              conta gratuita. Leva menos de 1 minuto.
            </p>
            <div className="mt-5 space-y-2">
              <Button onClick={() => goToAuth('signup')} className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg">
                Criar conta grátis
              </Button>
              <Button variant="outline" onClick={() => goToAuth('login')} className="w-full h-11 font-semibold rounded-lg border-slate-300 text-slate-700">
                Já tenho conta — Entrar
              </Button>
            </div>
            <button onClick={() => setAuthPrompt(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600">
              Agora não
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
