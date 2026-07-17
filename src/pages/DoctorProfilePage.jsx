/**
 * DoctorProfilePage.jsx
 * Página de perfil público do médico com agendamento (versão redesenhada).
 * Rota: /medico/:id (legado, mantida para compatibilidade com links existentes)
 * A página pública principal é DoctorPublicProfilePage (/medico/:id via App.jsx).
 * Este arquivo serve como página de agendamento aprofundado quando acessado diretamente.
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Star,
  Shield,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
  Sun,
  Moon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  GraduationCap,
  Stethoscope,
  MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  format,
  addDays,
  startOfToday,
  isToday,
  addMinutes,
  parseISO,
  isBefore,
  startOfDay,
  endOfDay,
  isSameDay,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';
import { formatDistanceToNow } from 'date-fns';

const TIME_ZONE = 'America/Sao_Paulo';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateSlotsFromAgenda = (agenda, day) => {
  const dayOfWeek = day.getDay();
  const relevantBlocks = agenda.filter(
    (b) => b.dia_semana === dayOfWeek && b.status === 'disponivel'
  );
  const slots = [];
  const nowInBrasilia = utcToZonedTime(new Date(), TIME_ZONE);
  const timeLimit = addMinutes(nowInBrasilia, 20);

  relevantBlocks.forEach((block) => {
    const startUTC = parseISO(block.hora_inicio);
    const endUTC = parseISO(block.hora_fim);
    const zonedStart = utcToZonedTime(startUTC, TIME_ZONE);
    const zonedEnd = utcToZonedTime(endUTC, TIME_ZONE);

    let cur = new Date(day);
    cur.setHours(zonedStart.getHours(), zonedStart.getMinutes(), 0, 0);
    const endTime = new Date(day);
    endTime.setHours(zonedEnd.getHours(), zonedEnd.getMinutes(), 0, 0);

    while (cur < endTime) {
      const slotBr = utcToZonedTime(cur, TIME_ZONE);
      if (slotBr > timeLimit) {
        slots.push({ time: format(slotBr, 'HH:mm'), dateObj: new Date(cur) });
      }
      cur = addMinutes(cur, block.intervalo_em_minutos || 30);
    }
  });

  return slots.filter(
    (slot, idx, arr) => arr.findIndex((s) => s.time === slot.time) === idx
  );
};

const daysWithSlots = (agenda, month) => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const today = startOfToday();
  const days = eachDayOfInterval({ start: today > start ? today : start, end });
  return days.filter((d) => generateSlotsFromAgenda(agenda, d).length > 0);
};

// ─── Componentes internos ─────────────────────────────────────────────────────
const StarRating = ({ rating, size = 4 }) => (
  <div className="flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          `w-${size} h-${size}`,
          i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
        )}
      />
    ))}
  </div>
);

const ReviewCard = ({ review }) => (
  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          P
        </div>
        <div>
          <p className="text-xs font-semibold">Paciente Verificado</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(review.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
      <StarRating rating={review.rating} />
    </div>
    {review.comentario && (
      <p className="text-sm text-foreground/80 italic mt-2">
        &ldquo;{review.comentario}&rdquo;
      </p>
    )}
  </div>
);

// ─── Calendário Visual ────────────────────────────────────────────────────────
const VisualCalendar = ({ agenda, selectedDay, onSelectDay }) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const available = useMemo(() => daysWithSlots(agenda, viewMonth), [agenda, viewMonth]);
  const availableSet = useMemo(
    () => new Set(available.map((d) => format(d, 'yyyy-MM-dd'))),
    [available]
  );

  const start = startOfMonth(viewMonth);
  const end = endOfMonth(viewMonth);
  const allDays = eachDayOfInterval({ start, end });
  const firstDayOfWeek = getDay(start); // 0 = domingo

  const today = startOfToday();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={
            format(viewMonth, 'yyyy-MM') === format(today, 'yyyy-MM')
          }
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-bold capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-1">
        {/* Offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {allDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const isAvailable = availableSet.has(key);
          const isPast = isBefore(day, today);
          const isSelected =
            selectedDay && isSameDay(day, selectedDay);
          const isTodayDay = isToday(day);

          return (
            <button
              key={key}
              disabled={!isAvailable || isPast}
              onClick={() => onSelectDay(day)}
              className={cn(
                'w-full aspect-square rounded-lg text-xs font-medium transition-all flex items-center justify-center',
                isPast && 'text-muted-foreground/30 cursor-not-allowed',
                !isPast && !isAvailable && 'text-muted-foreground/40 cursor-not-allowed',
                !isPast && isAvailable && !isSelected &&
                  'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer font-semibold',
                isSelected && 'bg-primary text-white font-bold shadow-sm',
                isTodayDay && !isSelected && 'ring-1 ring-primary/40'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {available.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
          <div className="w-3 h-3 rounded bg-blue-100" />
          <span>Dias com horários disponíveis</span>
        </div>
      )}
    </div>
  );
};

// ─── Slots de horário ─────────────────────────────────────────────────────────
const TimeSlots = ({ slots, selectedSlot, onSelect, bookedTimes }) => {
  const morning = slots.filter((s) => {
    const h = parseInt(s.time.split(':')[0]);
    return h < 12;
  });
  const afternoon = slots.filter((s) => {
    const h = parseInt(s.time.split(':')[0]);
    return h >= 12;
  });

  const renderGroup = (group, label, Icon) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      {group.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Sem horários disponíveis
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {group.map((slot) => {
            const isBooked = bookedTimes.includes(slot.time);
            const isSelected = selectedSlot?.time === slot.time;
            return (
              <button
                key={slot.time}
                disabled={isBooked}
                onClick={() => onSelect(slot)}
                className={cn(
                  'py-2 px-1 rounded-lg text-sm font-semibold border transition-all',
                  isBooked &&
                    'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through',
                  !isBooked &&
                    !isSelected &&
                    'border-gray-200 bg-white text-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5',
                  isSelected &&
                    'border-primary bg-primary text-white shadow-sm'
                )}
              >
                {slot.time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
        <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum horário disponível neste dia.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione outro dia no calendário.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {renderGroup(morning, 'Manhã', Sun)}
      {renderGroup(afternoon, 'Tarde / Noite', Moon)}
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createConfirmedAppointment, refetchAppointments } = useAppointments();

  const [doctor, setDoctor] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [price, setPrice] = useState(null);
  const [mainService, setMainService] = useState(null);

  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  // Busca todos os dados
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const { data: doctorData, error } = await supabase
        .from('medicos')
        .select('*, agenda_medico(*)')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !doctorData) {
        toast({ variant: 'destructive', title: 'Médico não encontrado' });
        navigate('/agendamentos');
        return;
      }

      setDoctor(doctorData);
      setAgenda(doctorData.agenda_medico || []);

      // Preço
      const { data: procData } = await supabase
        .from('procedimentos')
        .select('*')
        .eq('medico_id', id)
        .eq('principal', true)
        .maybeSingle();

      if (procData) {
        setPrice(procData.preco);
        setMainService(procData);
      }

      // Avaliações
      const { data: reviewData } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('medico_id', doctorData.user_id)
        .eq('status', 'publicada')
        .order('created_at', { ascending: false });

      setReviews(reviewData || []);

      // Selecionar primeiro dia disponível
      const today = startOfToday();
      for (let i = 0; i < 30; i++) {
        const d = addDays(today, i);
        const slots = generateSlotsFromAgenda(doctorData.agenda_medico || [], d);
        if (slots.length > 0) {
          setSelectedDay(d);
          break;
        }
      }

      setLoading(false);
    };

    fetchAll();
  }, [id, navigate, toast]);

  // Busca horários já agendados quando muda o dia selecionado
  useEffect(() => {
    if (!selectedDay || !doctor) return;

    const fetchBooked = async () => {
      const dayStart = startOfDay(selectedDay).toISOString();
      const dayEnd = endOfDay(selectedDay).toISOString();

      const { data } = await supabase
        .from('agendamentos')
        .select('horario_inicio')
        .eq('medico_id', doctor.id)
        .in('status', ['confirmado', 'reagendado', 'pendente'])
        .gte('horario_inicio', dayStart)
        .lte('horario_inicio', dayEnd);

      if (data) {
        setBookedTimes(
          data.map((a) => {
            const d = utcToZonedTime(parseISO(a.horario_inicio), TIME_ZONE);
            return format(d, 'HH:mm');
          })
        );
      }
    };

    fetchBooked();
    setSelectedSlot(null);
  }, [selectedDay, doctor]);

  const slots = useMemo(
    () => (selectedDay && agenda.length > 0 ? generateSlotsFromAgenda(agenda, selectedDay) : []),
    [selectedDay, agenda]
  );

  const averageRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const handleBook = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para agendar sua consulta.',
      });
      navigate('/acesso-cliente', { state: { from: `/medico/${id}` } });
      return;
    }

    if (!selectedSlot || !mainService) {
      toast({ variant: 'destructive', title: 'Selecione um horário' });
      return;
    }

    setIsBooking(true);

    // Calcular horario_fim com base na duração do procedimento
    const duracao = mainService.duracao_em_minutos || 30;
    const inicio = selectedSlot.dateObj;
    const fim = addMinutes(inicio, duracao);

    const payload = {
      medico_id: doctor.id,
      servico_id: mainService.id,
      horario_inicio: inicio.toISOString(),
      horario_fim: fim.toISOString(),
      price_in_cents: Math.round(price * 100),
    };

    navigate('/checkout', {
      state: {
        appointmentDetails: {
          ...payload,
          doctor_name: doctor.public_name || doctor.name,
          specialty: doctor.specialty,
        },
      },
    });

    setIsBooking(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <>
      <Helmet>
        <title>
          {doctor.public_name || doctor.name} — Click Teleconsulta
        </title>
        <meta
          name="description"
          content={`Agende uma consulta online com ${doctor.public_name || doctor.name}, especialista em ${doctor.specialty}.`}
        />
      </Helmet>

      <div className="max-w-6xl mx-auto">
        {/* Voltar */}
        <Button
          variant="ghost"
          className="pl-0 hover:pl-1 transition-all text-sm mb-5"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Coluna Principal ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header do médico */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/15 to-blue-400/10" />
              <div className="px-6 pb-6 relative">
                <div className="flex justify-between items-end -mt-12 mb-4">
                  <Avatar className="w-24 h-24 border-4 border-white shadow-md bg-white rounded-xl">
                    <AvatarImage
                      src={doctor.image_url}
                      alt={doctor.public_name || doctor.name}
                      className="object-cover rounded-xl"
                    />
                    <AvatarFallback className="rounded-xl text-3xl bg-primary/10 text-primary">
                      {(doctor.public_name || doctor.name || 'M')[0]}
                    </AvatarFallback>
                  </Avatar>

                  {averageRating && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-amber-700">
                        {averageRating}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({reviews.length})
                      </span>
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-slate-900">
                  {doctor.public_name || doctor.name}
                </h1>
                <p className="text-primary font-semibold flex items-center gap-1.5 mt-1">
                  <Stethoscope className="w-4 h-4" />
                  {doctor.specialty}
                </p>

                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  {doctor.crm && (
                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-1">
                      <Shield className="w-3 h-3" />
                      CRM {doctor.crm}/{doctor.uf || 'BR'} ✓
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1 border">
                    <MapPin className="w-3 h-3" />
                    Telemedicina Online
                  </div>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1 border">
                      <MessageSquare className="w-3 h-3" />
                      {reviews.length}{' '}
                      {reviews.length === 1 ? 'avaliação' : 'avaliações'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="agendar" className="w-full">
              <TabsList className="grid grid-cols-3 w-full rounded-xl bg-gray-100">
                <TabsTrigger value="agendar" className="rounded-lg">
                  Agendar
                </TabsTrigger>
                <TabsTrigger value="sobre" className="rounded-lg">
                  Sobre
                </TabsTrigger>
                <TabsTrigger value="avaliacoes" className="rounded-lg">
                  Avaliações{reviews.length > 0 && ` (${reviews.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Tab: Agendar */}
              <TabsContent value="agendar" className="mt-4 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Selecione a Data
                  </h2>
                  {agenda.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                      <p className="text-sm text-muted-foreground">
                        Este médico ainda não configurou sua agenda.
                      </p>
                    </div>
                  ) : (
                    <VisualCalendar
                      agenda={agenda}
                      selectedDay={selectedDay}
                      onSelectDay={setSelectedDay}
                    />
                  )}
                </div>

                {selectedDay && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Horários disponíveis
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <TimeSlots
                      slots={slots}
                      selectedSlot={selectedSlot}
                      onSelect={setSelectedSlot}
                      bookedTimes={bookedTimes}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Tab: Sobre */}
              <TabsContent value="sobre" className="mt-4 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Sobre o especialista
                  </h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {doctor.bio ? (
                      doctor.bio
                        .split('\n')
                        .map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                      <p className="italic">
                        Informações profissionais não informadas.
                      </p>
                    )}
                  </div>
                </div>

                {doctor.instructions && (
                  <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5">
                    <h2 className="text-base font-bold flex items-center gap-2 mb-3 text-blue-800">
                      <Info className="w-4 h-4" />
                      Instruções para a consulta
                    </h2>
                    <div className="prose prose-sm max-w-none text-blue-700">
                      {doctor.instructions
                        .split('\n')
                        .map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Avaliações */}
              <TabsContent value="avaliacoes" className="mt-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  {averageRating && (
                    <div className="flex items-center gap-4 mb-5 pb-4 border-b">
                      <div className="text-center">
                        <p className="text-4xl font-extrabold text-slate-900">
                          {averageRating}
                        </p>
                        <StarRating rating={Math.round(parseFloat(averageRating))} size={4} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {reviews.length}{' '}
                          {reviews.length === 1 ? 'avaliação' : 'avaliações'}
                        </p>
                      </div>
                    </div>
                  )}

                  {reviews.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                      <p className="text-sm text-muted-foreground">
                        Este médico ainda não possui avaliações.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <ReviewCard key={r.id} review={r} />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar de agendamento ───────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-lg text-slate-900">
                  Resumo da Consulta
                </h3>

                {/* Preço */}
                {price !== null && (
                  <div className="flex justify-between items-center py-3 border-y">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Consulta online
                      </p>
                      {mainService?.duracao_em_minutos && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {mainService.duracao_em_minutos} min
                        </p>
                      )}
                    </div>
                    <p className="text-2xl font-extrabold text-blue-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(price)}
                    </p>
                  </div>
                )}

                {/* Seleção resumida */}
                {selectedDay && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                    <p className="flex items-center gap-2 text-slate-700">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
                    </p>
                    {selectedSlot && (
                      <p className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-primary" />
                        {selectedSlot.time}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full py-6 text-base font-bold rounded-xl"
                  disabled={!selectedSlot || isBooking}
                  onClick={handleBook}
                >
                  {isBooking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : selectedSlot ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirmar Agendamento
                    </>
                  ) : (
                    'Selecione um horário'
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <Shield className="w-3 h-3" />
                  Pagamento seguro · Dados protegidos (LGPD)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// StarRating também exportada para uso interno
const StarRating = ({ rating, size = 4 }) => (
  <div className="flex">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={cn(
          `w-${size} h-${size}`,
          i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
        )}
      />
    ))}
  </div>
);

export default DoctorProfilePage;
