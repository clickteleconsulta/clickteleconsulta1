
import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, User, ChevronLeft, ChevronRight, CalendarOff, ChevronDown, CalendarCheck, ShieldCheck } from '@/components/ui/icones';
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
import { BrandCross } from '@/components/Logo';
import { TeleconsultaBadge } from '@/components/TeleconsultaBadge';
import Estrelas from '@/components/Estrelas';
import { doctorPath } from '@/lib/doctorSlug';
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

/**
 * Nome do médico com os selos SEMPRE logo depois do texto, e nunca em 3 linhas.
 *
 * As duas exigências brigam entre si em CSS puro. Com `line-clamp`, o corte come
 * o que estiver no fim — inclusive os selos. Tirando os selos do bloco cortado,
 * eles param de acompanhar o texto e ficam pendurados num canto fixo do card.
 *
 * A saída é decidir o corte por medida, não por CSS: medimos quanto cabe em duas
 * linhas descontando a largura dos selos e cortamos o nome em palavras inteiras
 * até sobrar espaço para eles. O resultado é o texto seguido dos selos, sempre
 * na mesma linha do fim do nome.
 *
 * A medição usa um <span> fora do React (criado e destruído aqui), porque mexer
 * no DOM que o React controla quebra a reconciliação.
 */
const medirLargura = (() => {
  let regua = null;
  return (texto, estilo) => {
    if (!regua) {
      regua = document.createElement('span');
      regua.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;top:-9999px;left:-9999px';
      document.body.appendChild(regua);
    }
    regua.style.font = estilo.font;
    regua.style.letterSpacing = estilo.letterSpacing;
    regua.textContent = texto;
    return regua.getBoundingClientRect().width;
  };
})();

/** Quebra gulosa em linhas, do jeito que o navegador quebraria. */
const quebrarLinhas = (texto, largura, estilo) => {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (atual && medirLargura(tentativa, estilo) > largura) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
};

const NomeComSelos = ({ nome, mostrarPonto }) => {
  const caixaRef = useRef(null);
  const selosRef = useRef(null);
  const [exibido, setExibido] = useState(nome);

  useLayoutEffect(() => {
    const caixa = caixaRef.current;
    const selos = selosRef.current;
    if (!caixa || !selos) return;

    const ajustar = () => {
      const largura = caixa.clientWidth;
      if (!largura) return;
      const cs = getComputedStyle(caixa);
      const estilo = { font: cs.font, letterSpacing: cs.letterSpacing };
      // Os selos precisam caber ao lado da última linha, então o espaço útil
      // dessa linha é menor que o das demais.
      const larguraSelos = selos.getBoundingClientRect().width + 6;

      // Até TRÊS linhas. Eram duas, e com duas o nome de um médico com quatro
      // sobrenomes chegava cortado ao paciente — o pior lugar possível para
      // abreviar, porque é por ele que a pessoa reconhece quem vai atender.
      //
      // Três linhas não desalinham nada: os cartões são uma LISTA vertical, um
      // por linha, então o nome comprido estica só o próprio cartão. Numa grade
      // de colunas isso não valeria.
      //
      // Medido com os nomes reais mais o pior caso plausível (43 caracteres,
      // "Dr. Pedro Henrique Cavalcanti de Albuquerque"): com a coluna em 400 px
      // e o título em 20 px, nenhum dos oito precisa de corte. O corte por
      // palavra continua abaixo como último recurso.
      // Os selos PODEM descer sozinhos para a linha seguinte. Antes não podiam,
      // e isso truncava nome CURTO: "Dr. Gustavo R. Ayres" cabia inteiro numa
      // linha, os selos não cabiam ao lado, e em vez de empurrá-los para baixo
      // a função reprovava o nome inteiro e ia cortando palavra por palavra —
      // o resultado era "Dr. Gustavo R.…" num cartão com espaço de sobra.
      // O que precisa caber é o TOTAL de linhas, contando a linha extra que os
      // selos ocupariam sozinhos.
      const LINHAS_MAX = 3;
      const cabe = (txt) => {
        const linhas = quebrarLinhas(txt, largura, estilo);
        const ultima = linhas[linhas.length - 1] || '';
        const selosNaMesmaLinha = medirLargura(ultima, estilo) + larguraSelos <= largura;
        return linhas.length + (selosNaMesmaLinha ? 0 : 1) <= LINHAS_MAX;
      };

      if (cabe(nome)) { setExibido(nome); return; }
      const palavras = nome.split(' ');
      for (let n = palavras.length - 1; n >= 1; n--) {
        const tentativa = `${palavras.slice(0, n).join(' ')}…`;
        if (cabe(tentativa)) { setExibido(tentativa); return; }
      }
      setExibido(`${palavras[0]}…`);
    };

    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(caixa);
    return () => ro.disconnect();
  }, [nome, mostrarPonto]);

  return (
    <h3
      ref={caixaRef}
      className="text-[20px] leading-[1.2] font-extrabold text-slate-900 tracking-tight"
      title={nome}
    >
      {exibido}
      {/* `whitespace-nowrap` prende os selos entre si e à última palavra: sem
          isso o ponto verde podia sozinho descer de linha. */}
      <span ref={selosRef} className="inline-flex items-center gap-1.5 ml-1 align-[-2px] whitespace-nowrap">
        <VerifiedSeal className="w-[17px] h-[17px]" />
        {/* Disponibilidade no dia: a CRUZ DA MARCA no jade, no lugar do ponto
            verde genérico. É o que dá assinatura ao card — qualquer site põe
            bolinha verde; a cruz é nossa.

            16 px e não os 8 do ponto: renderizei a cruz de 8 a 18 px ao lado do
            nome e abaixo de ~12 ela vira mancha. O <BrandCross> escolhe sozinho
            entre a irradiada e a maciça pelo tamanho (CROSS_DETAIL_MIN = 16), e
            16 é justamente o piso da irradiada — com o card maior, cabe aqui a
            marca no desenho completo, não a redução.

            Só aparece depois que a agenda carregou; enquanto carrega, a ausência
            não significa indisponível. */}
        {mostrarPonto && (
          // O rótulo vai no invólucro: o <BrandCross> fixa `aria-hidden` e não
          // repassa props, então um aria-label nele seria descartado e o leitor
          // de tela perderia a informação.
          <span className="inline-flex shrink-0" role="img" aria-label="Disponível hoje" title="Disponível hoje">
            <BrandCross size={16} color={BRAND.acento} />
          </span>
        )}
      </span>
    </h3>
  );
};

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

const ScheduleSkeleton = () => (
  <div className="flex-grow flex flex-col">
    <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-3 w-1/3 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-2.5 text-center space-y-1 min-h-[150px]">
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
  formattedPatientPrice,
  // A listagem já carrega agenda, horários pagos e bloqueios de TODOS os médicos
  // para montar o ranking. Recebendo isso pronto, o card não repete as três
  // consultas por médico — eram 3 requisições por cartão, 15 numa página de 5.
  // Sem os props (uso do card fora da listagem), ele volta a buscar sozinho.
  agendaPronta,
  bookedSlotsProntos,
  blocksProntos,
  // SÓ A GRADE DE HORÁRIOS, sem a coluna do médico e sem a moldura do cartão.
  // Serve ao perfil público, onde o nome, a foto e o CRM já estão na tela logo
  // acima — repetir tudo ali seria mostrar o mesmo médico duas vezes em duas
  // caixas diferentes. Tudo o que vem depois (buscar agenda, escutar horário
  // ocupado em tempo real, levar ao checkout, barrar convidado) continua o
  // mesmo: é o mesmo componente, não uma segunda implementação da agenda que
  // um dia divergiria desta.
  somenteAgenda = false,
}) {
  const temDadosProntos = !!agendaPronta;
  const { session } = useAuth();
  const { getBookedSlots } = useAppointments();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [doctor, setDoctor] = useState(initialDoctor);
  const [loadingSlots, setLoadingSlots] = useState(!isFallback && !temDadosProntos);
  const [dayOffset, setDayOffset] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  // No celular a agenda entra recolhida: o cartão do médico cabe inteiro na tela
  // e a lista fica navegável. A partir de md a grade é sempre visível e este
  // estado não tem efeito nenhum.
  const [agendaAberta, setAgendaAberta] = useState(false);
  const [doctorAgenda, setDoctorAgenda] = useState(agendaPronta || []);
  const [bookedSlots, setBookedSlots] = useState(bookedSlotsProntos || new Map());
  const [blocks, setBlocks] = useState(blocksProntos || []);
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
    // Com os dados vindos da listagem não há o que buscar na montagem. As
    // inscrições de tempo real abaixo seguem chamando fetchAllData() quando
    // algo muda de verdade — aí a consulta se paga.
    if (temDadosProntos) return;
    if (!isFallback && doctor?.id) {
      fetchAllData();
    }
  }, [doctor?.id, isFallback, fetchAllData, temDadosProntos]);

  // A listagem refaz a busca (tempo real, filtros) e manda dados novos.
  useEffect(() => {
    if (!temDadosProntos) return;
    setDoctorAgenda(agendaPronta || []);
    setBookedSlots(bookedSlotsProntos || new Map());
    setBlocks(blocksProntos || []);
    setLoadingSlots(false);
  }, [agendaPronta, bookedSlotsProntos, blocksProntos, temDadosProntos]);

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

  /**
   * Se ainda dá para ser atendido hoje. Calculado à parte de `scheduleByDay`
   * porque aquele acompanha a paginação — ao avançar os dias, a posição 0 deixa
   * de ser hoje e o selo apagaria sem o médico ter mudado nada.
   *
   * Conta só vaga que dê para agendar de verdade: fora de bloqueio e ainda
   * livre. `generateTimeSlotsFromAgenda` já descarta os horários que passaram,
   * com a folga de 20 minutos que ele aplica ao dia corrente.
   */
  const disponivelHoje = useMemo(() => {
    if (!doctorAgenda || isFallback) return false;
    const hoje = startOfToday();
    const dia = format(hoje, 'yyyy-MM-dd');
    return generateTimeSlotsFromAgenda(doctorAgenda, hoje).some((time) => {
      const instante = zonedTimeToUtc(`${dia} ${time}:00`, 'America/Sao_Paulo').getTime();
      if (isInstantBlocked(instante, blocks)) return false;
      return !bookedSlots.get(`${dia}T${time}:00`);
    });
  }, [doctorAgenda, isFallback, blocks, bookedSlots]);

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
      className={cn(
        'flex flex-col relative overflow-hidden w-full',
        !somenteAgenda &&
          'bg-white rounded-lg border border-slate-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 my-3 max-w-[920px] mx-auto'
      )}
    >
      <div className="flex flex-col md:flex-row">
          <div className={cn("p-5 md:p-6 flex flex-col gap-3 w-full md:w-[345px] md:min-w-[345px] lg:w-[400px] lg:min-w-[400px] border-b md:border-b-0 md:border-r border-slate-100", somenteAgenda && 'hidden')}>
              {/* Proporções tiradas do cartão de referência e reescaladas: lá o
                  conteúdo tem 800 px de largura, aqui 345 no desktop — fator 0,43.
                  Foto 186→84, nome 52→23, sub 27→13. Todo o card foi
                  reescalado por 1,15 de uma vez, para nada sair de proporção. Foto e texto centrados um
                  com o outro, como no modelo. */}
              <div className="flex items-center gap-3 lg:gap-4">
                  <Avatar className="w-[68px] h-[68px] lg:w-[84px] lg:h-[84px] shadow-lg shadow-slate-200/60 ring-2 ring-white shrink-0 rounded-full">
                      <AvatarImage src={toSiteUrl(doctor?.image_url)} alt={`Foto de ${doctor?.public_name || 'médico'}`} className="rounded-full object-cover" />
                      <AvatarFallback className="bg-brand-400 text-white rounded-full"><User size={30} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                      <Link to={!isFallback ? doctorPath(doctor) : '#'} className={cn("block", !isFallback && "hover:underline")}>
                          <NomeComSelos
                              nome={formatDoctorDisplayName(doctor?.sexo, doctor?.public_name || doctor?.name)}
                              mostrarPonto={!loadingSlots && disponivelHoje}
                          />
                      </Link>

                      {doctor?.reviewCount > 0 && (
                          <Link
                              to={!isFallback ? `${doctorPath(doctor)}#avaliacoes` : '#'}
                              className="flex items-center gap-1 mt-1 w-fit group"
                              title="Ver avaliações"
                              aria-label={`Nota ${doctor.rating.toFixed(1)} de 5, ${doctor.reviewCount} avaliações`}
                          >
                              <Estrelas nota={doctor.rating} tamanho={12} className="transition-transform group-hover:scale-110" />
                              <span className="text-xs text-slate-400 ml-0.5">({doctor.reviewCount})</span>
                          </Link>
                      )}
                      {/* CRM embaixo da especialidade, cada um na sua linha e
                          nenhum truncado. Na mesma linha, um CRM de nove dígitos
                          somado a "Médico · Generalista" não cabe na largura de
                          um celular: ou o separador sobrava pendurado na quebra,
                          ou a especialidade saía cortada. Em duas linhas os dois
                          aparecem inteiros. CRM em cobalto e negrito, por ser o
                          dado verificável. */}
                      <p className="text-[13px] text-slate-500 font-medium mt-1 leading-snug">
                          {specialtyLabel}
                      </p>
                      {crmDisplay && (
                          <p className="text-[13px] text-brand-700 font-bold leading-snug">{crmDisplay}</p>
                      )}
                  </div>
              </div>

              {/* O preço usa o jade da marca porque é o que mais diferencia a
                  plataforma e o primeiro dado que o paciente procura. É a única
                  aparição do jade fora do logo — por isso vem de BRAND.acento e
                  não de uma classe do Tailwind, para seguir sendo uma exceção
                  rastreável em vez de virar cor de interface. */}
              {/* Duas colunas encostadas, rótulo acima do dado. Sem
                  `justify-between`: com só dois itens ele os jogava para as
                  bordas opostas e o par se desfazia.

                  A modalidade voltou a ser SELO EM CAIXA e em corpo pequeno —
                  antes era um texto de 16 px solto, do mesmo tamanho do preço, e
                  os dois disputavam a atenção. Modalidade é qualificação; preço
                  é a informação que decide. Agora só o preço tem corpo grande.

                  A caixa de cada valor tem a altura do selo (h-7) e
                  `items-center`, para o selo e o preço ficarem centrados na
                  mesma faixa mesmo tendo alturas diferentes. */}
              <div className="pt-3 border-t border-slate-100 flex items-start gap-10">
                  <div>
                      <p className="h-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none">Modalidade</p>
                      <div className="mt-2 h-7 flex items-center">
                          <TeleconsultaBadge size="md" />
                      </div>
                  </div>
                  <div>
                      <p className="h-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none">Valor</p>
                      <div className="mt-2 h-7 flex items-center">
                          <span
                              className="text-[19px] font-extrabold tracking-tight tabular-nums leading-none"
                              style={{ color: BRAND.acento }}
                          >
                              {displayPrice}
                          </span>
                      </div>
                  </div>
              </div>

              {/* Sinal de confiança: pagamento online (Pix e cartão via Asaas) */}
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span>Pagamento online · Pix e cartão</span>
              </div>

              {/* A disponibilidade do dia agora é só a bolinha ao lado do selo,
                  lá em cima no nome. O badge que ficava aqui saiu: repetia a
                  informação e competia com o preço pela atenção. */}

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
                      className="md:hidden mt-1 flex items-center justify-center gap-1.5 w-full h-10 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-[15px] font-semibold active:bg-slate-100 transition-colors"
                  >
                      Horários
                      <ChevronDown className={cn('w-[21px] h-[21px] transition-transform duration-200', agendaAberta && 'rotate-180')} />
                  </button>
              )}
          </div>

          <div
              id={`agenda-${doctor?.id}`}
              className={cn(
                  'p-3 md:p-3.5 flex-1 flex-col min-h-[253px] md:flex',
                  somenteAgenda || agendaAberta ? 'flex' : 'hidden',
                  somenteAgenda && 'p-0 md:p-0'
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
                              <span className="text-[12.5px] font-bold text-brand-600 truncate px-1">Próxima vaga: {titleCase(nextAvailable.label)} · {nextAvailable.time}</span>
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
              return <div key={daySchedule.dateFormatted} className="flex flex-col min-h-[172px]">
                                              <div className="py-1.5 px-1 text-center mb-1.5">
                                                  <div className={cn("text-[11.5px] sm:text-[12.5px] font-bold uppercase tracking-wider mb-0.5", isDayToday ? "text-brand-600" : "text-slate-400")}>
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
                                                                      <Button variant="outline" disabled={isBooked} onClick={() => handleBooking(daySchedule.date, time)} className={cn("w-full h-8 rounded-md border-0 text-[15px] font-semibold transition-colors duration-150 px-1", isBooked ? "bg-slate-50 text-slate-300 line-through decoration-2 cursor-not-allowed hover:bg-slate-50" : "bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white")} aria-disabled={isBooked}>
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
                                      <button onClick={() => setIsExpanded(!isExpanded)} className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors px-4 py-1.5 rounded-md hover:bg-brand-50 border border-slate-200 group">
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
            className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-lg bg-brand-50 flex items-center justify-center mb-4">
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
