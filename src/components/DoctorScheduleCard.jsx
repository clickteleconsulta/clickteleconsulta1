
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, Star, User, ChevronLeft, ChevronRight, CalendarOff, ChevronDown, Award, Asterisk, HeartHandshake, Info, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, addDays, startOfToday, isToday, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';
import { supabase } from '@/lib/customSupabaseClient';
import { Skeleton } from './ui/skeleton';

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
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-2 text-center space-y-1 min-h-[150px]">
                <Skeleton className="h-3 w-12 mx-auto rounded-md" />
                <Skeleton className="h-3 w-8 mx-auto rounded-md" />
                <div className="space-y-1 mt-3">
                    {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8 w-full rounded-md" />)}
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
  const [doctorAgenda, setDoctorAgenda] = useState([]);
  const [bookedSlots, setBookedSlots] = useState(new Map());
  const [isFavorite, setIsFavorite] = useState(false);
  
  const today = startOfToday();
  const visibleDays = useMemo(() => Array.from({ length: 5 }).map((_, i) => addDays(today, i + dayOffset)), [today, dayOffset]);

  const fetchAllData = useCallback(async () => {
    if (isFallback || !doctor?.id) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    
    try {
      const [agendaResult, bookedSlotsResult] = await Promise.all([
        supabase.from('agenda_medico').select('*').eq('medico_id', doctor.id).eq('status', 'disponivel'),
        getBookedSlots(doctor.id)
      ]);
      
      if (agendaResult.error) throw agendaResult.error;
      
      setDoctorAgenda(agendaResult.data || []);
      setBookedSlots(bookedSlotsResult);
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
      setDoctor(prev => JSON.stringify(prev) !== JSON.stringify(payload.new) ? payload.new : prev);
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

  const scheduleByDay = useMemo(() => {
    if (!doctorAgenda || isFallback) return visibleDays.map(day => ({
      date: day,
      dayName: isToday(day) ? 'HOJE' : format(day, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase(),
      dateFormatted: format(day, 'dd/MM'),
      slots: []
    }));
    return visibleDays.map(day => {
      const allSlots = generateTimeSlotsFromAgenda(doctorAgenda, day);
      return {
        date: day,
        dayName: isToday(day) ? 'HOJE' : format(day, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase(),
        dateFormatted: format(day, 'dd/MM'),
        slots: allSlots
      };
    });
  }, [doctorAgenda, visibleDays, isFallback]);

  const handleBooking = async (day, time) => {
    if (isFallback) {
      toast({
        variant: 'destructive',
        title: 'Não é possível agendar',
        description: 'A agenda do médico não pôde ser carregada. Tente novamente mais tarde.'
      });
      return;
    }

    if (!session) {
      navigate('/acesso-paciente');
      return;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentDate = new Date(day);
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    // Ensure we use the exact patient price calculated in the parent component
    const priceToUse = typeof patientPrice === 'number' 
      ? Math.round(patientPrice * 100) 
      : (doctor.price_in_cents || 0);
    
    const appointmentDetails = {
      medico_id: doctor.id,
      doctor_name: doctor.public_name || doctor.name,
      specialty: doctor.specialty,
      appointment_date: format(appointmentDate, 'yyyy-MM-dd'),
      appointment_time: time,
      horario_inicio: appointmentDate.toISOString(),
      horario_fim: addMinutes(appointmentDate, 30).toISOString(),
      price_in_cents: priceToUse
    };

    navigate('/agendamento/revisao', { state: { appointmentDetails } });
  };

  const handleFavorite = e => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "🚧 Esta funcionalidade não está implementada ainda",
      description: "Você pode solicitá-la em seu próximo prompt! 🚀",
      variant: "default"
    });
  };

  const isScheduleAvailable = scheduleByDay.some(d => d.slots.length > 0);

  // Directly use the formatted price passed from the parent which already includes the tax
  const displayPrice = formattedPatientPrice ? formattedPatientPrice : 'Consultar';

  // CRM: usa somente a parte numérica (o campo pode já vir com "/UF") e anexa a UF uma única vez
  const crmNumber = doctor?.crm ? String(doctor.crm).split('/')[0].trim() : '';
  const crmDisplay = crmNumber ? `CRM ${crmNumber}${doctor?.uf ? `/${doctor.uf}` : ''}` : '';
  const specialtyLabel = doctor?.specialty ? `Médico ${doctor.specialty}` : 'Médico';
  
  if (typeof patientPrice === 'number') {
    console.log(`Rendering DoctorScheduleCard price for ${doctor?.name}:`, formattedPatientPrice);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col relative overflow-hidden my-3 w-full max-w-[800px] mx-auto"
    >
      <div className="flex flex-col md:flex-row">
          <div className="p-5 md:p-6 flex flex-col gap-3 w-full md:w-[300px] md:min-w-[300px] border-b md:border-b-0 md:border-r border-slate-100">
              <div className="flex items-start gap-3">
                  <Avatar className="w-14 h-14 border-2 border-white shadow-lg ring-2 ring-slate-100 shrink-0 rounded-xl">
                      <AvatarImage src={doctor?.image_url} alt={`Foto de ${doctor?.public_name || 'médico'}`} className="rounded-xl object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl"><User size={24} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                      <Link to={!isFallback ? `/medico/${doctor.id}` : '#'} className={cn("block", !isFallback && "hover:underline")}>
                          <h3 className="text-lg font-bold text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap" title={doctor?.public_name || doctor?.name}>
                              {doctor?.public_name || doctor?.name}
                          </h3>
                      </Link>

                      <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                      </div>
                  </div>
              </div>
              
              <div className="mt-1">
                  <p className="text-sm text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" title={specialtyLabel}>
                      {specialtyLabel}
                  </p>
                  {crmDisplay && (
                      <p className="text-[13px] text-slate-400">{crmDisplay}</p>
                  )}
              </div>

              <div className="mt-2 text-[13px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-500" />
                      <span>Certificado</span>
                  </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-auto pt-4 border-t border-slate-100">
                  <Badge variant="custom" className="bg-emerald-50 text-emerald-700 font-semibold py-1 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] border border-emerald-100">
                      <Video className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Teleconsulta</span>
                  </Badge>
                  <Badge variant="custom" className="bg-blue-50 text-blue-700 font-bold py-1 px-3 rounded-full text-[13px] border border-blue-100 ml-auto">
                      {displayPrice}
                  </Badge>
              </div>
          </div>
          
          <div className="p-3.5 md:p-4 flex-1 flex flex-col min-h-[240px]">
              {loadingSlots ? <ScheduleSkeleton /> : !isScheduleAvailable ? <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground py-6">
                      <CalendarOff className="w-7 h-7 mb-1" />
                      <p className="font-semibold text-foreground text-sm">Sem horários disponíveis</p>
                      <p className="text-xs">{isFallback ? 'A agenda do médico não pôde ser carregada.' : 'Este médico está ajustando seus horários. Volte mais tarde.'}</p>
                  </div> : <>
                      <div className="flex items-center justify-between mb-3 px-1">
                           <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => Math.max(0, d - 5))} disabled={dayOffset === 0} className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                              <ChevronLeft className="w-5 h-5" />
                          </Button>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Selecione um horário</span>
                          <Button variant="ghost" size="icon" onClick={() => setDayOffset(d => d + 5)} className="w-8 h-8 hover:bg-gray-100 text-gray-500">
                             <ChevronRight className="w-5 h-5" />
                          </Button>
                      </div>
                      
                      <TooltipProvider delayDuration={100}>
                          <motion.div className="flex-1 flex flex-col">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-2 gap-y-0">
                                  {scheduleByDay.map(daySchedule => {
              const isDayToday = isToday(daySchedule.date);
              const hasSlots = daySchedule.slots.length > 0;
              return <div key={daySchedule.dateFormatted} className="flex flex-col min-h-[170px]">
                                              <div className="py-2 px-1 text-center mb-2">
                                                  <div className={cn("text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-0.5", isDayToday ? "text-blue-600" : "text-slate-400")}>
                                                      {daySchedule.dayName}
                                                  </div>
                                                  <div className={cn("text-sm font-bold", isDayToday ? "text-blue-600" : "text-slate-700")}>
                                                      {daySchedule.dateFormatted}
                                                  </div>
                                              </div>

                                              <div className="px-1 flex flex-col gap-2 flex-grow">
                                                  {(isExpanded ? daySchedule.slots : daySchedule.slots.slice(0, 4)).map(time => {
                    const slotDate = new Date(daySchedule.date);
                    const [hours, minutes] = time.split(':').map(Number);
                    slotDate.setHours(hours, minutes, 0, 0);
                    const slotIdentifier = `${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'yyyy-MM-dd')}T${format(utcToZonedTime(slotDate, 'America/Sao_Paulo'), 'HH:mm:ss')}`;
                    const isBooked = !!bookedSlots.get(slotIdentifier);
                    return <Tooltip key={time} disableHoverableContent={!isBooked}>
                                                              <TooltipTrigger asChild>
                                                                  <div className="w-full">
                                                                      <Button variant="outline" disabled={isBooked} onClick={() => handleBooking(daySchedule.date, time)} className={cn("w-full h-9 rounded-full border text-sm font-semibold transition-all px-1", isBooked ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white text-blue-700 border-blue-100 hover:border-blue-300 hover:bg-blue-50")} aria-disabled={isBooked}>
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
                              
                              {scheduleByDay.some(d => d.slots.length > 4) && <div className="mt-4 flex justify-center">
                                      <button onClick={() => setIsExpanded(!isExpanded)} className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors px-4 py-1.5 rounded-full hover:bg-slate-50 border border-slate-200 group">
                                          {isExpanded ? "Ver menos horários" : "Mostrar mais horários"}
                                          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                                      </button>
                                  </div>}
                          </motion.div>
                      </TooltipProvider>
                  </>}
          </div>
      </div>
    </motion.div>
  );
}
