import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, ChevronLeft, ChevronRight, Plus, X, Lock,
  Settings, RefreshCw, Calendar, Clock, Users, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, addMonths, subMonths, parseISO, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEK_DAYS = [
  { id: 1, short: 'Seg', full: 'Segunda-feira' },
  { id: 2, short: 'Ter', full: 'Terça-feira' },
  { id: 3, short: 'Qua', full: 'Quarta-feira' },
  { id: 4, short: 'Qui', full: 'Quinta-feira' },
  { id: 5, short: 'Sex', full: 'Sexta-feira' },
  { id: 6, short: 'Sáb', full: 'Sábado' },
  { id: 0, short: 'Dom', full: 'Domingo' },
];

const DURATION_OPTIONS = [
  { value: 20, label: '20 min' }, { value: 30, label: '30 min' },
  { value: 45, label: '45 min' }, { value: 60, label: '60 min' },
];
const INTERVAL_OPTIONS = [
  { value: 5, label: '5 min' }, { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
];

// ─── Calendar Cell ─────────────────────────────────────────────────────────────
const CalendarDay = ({ date, appointments, blockedDates, currentMonth, onClick, isSelected }) => {
  const inMonth = isSameMonth(date, currentMonth);
  const isBlockedArr = blockedDates || [];
  const dayStr = format(date, 'yyyy-MM-dd');
  const isBlocked = isBlockedArr.includes(dayStr);
  const dayAppts = appointments.filter(a => a.appointment_date === dayStr);
  const confirmedCount = dayAppts.filter(a => a.status === 'confirmado').length;
  const pendingCount = dayAppts.filter(a => a.status === 'pendente').length;
  const hasAppts = dayAppts.length > 0;

  let bg = '';
  if (!inMonth) bg = '';
  else if (isBlocked) bg = 'bg-red-50 border-red-200';
  else if (hasAppts) bg = 'bg-blue-50 border-blue-200';
  else bg = 'bg-white border-gray-100 hover:bg-gray-50';

  return (
    <button
      onClick={() => onClick(date)}
      className={`
        relative w-full aspect-square sm:aspect-auto sm:h-16 rounded-lg border text-left p-1.5 transition-all
        ${bg}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${!inMonth ? 'opacity-30 pointer-events-none' : ''}
        ${isToday(date) ? 'ring-1 ring-blue-400' : ''}
      `}
    >
      <span className={`text-xs font-semibold ${isToday(date) ? 'text-blue-600' : 'text-gray-700'}`}>
        {format(date, 'd')}
      </span>
      <div className="flex gap-0.5 flex-wrap mt-0.5">
        {confirmedCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`${confirmedCount} confirmada(s)`} />
        )}
        {pendingCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${pendingCount} pendente(s)`} />
        )}
        {isBlocked && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="Bloqueado" />
        )}
      </div>
    </button>
  );
};

// ─── Day Detail Panel ──────────────────────────────────────────────────────────
const DayDetailPanel = ({ date, appointments, blockedDates, onBlock, onUnblock }) => {
  const dayStr = format(date, 'yyyy-MM-dd');
  const isBlocked = blockedDates.includes(dayStr);
  const dayAppts = appointments.filter(a => a.appointment_date === dayStr);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="p-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-gray-900">
              {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
            {isToday(date) && (
              <Badge className="mt-1 text-[10px] bg-blue-100 text-blue-700 border-0">Hoje</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={isBlocked ? 'default' : 'outline'}
            className={`text-xs h-7 ${isBlocked ? 'bg-green-600 hover:bg-green-700' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
            onClick={() => isBlocked ? onUnblock(dayStr) : onBlock(dayStr)}
          >
            {isBlocked ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Desbloquear</> : <><Lock className="w-3 h-3 mr-1" /> Bloquear</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isBlocked ? (
          <div className="text-center py-4 text-sm text-red-400 bg-red-50 rounded-lg border border-dashed border-red-200">
            <AlertCircle className="w-5 h-5 mx-auto mb-1" /> Dia bloqueado — sem agendamentos
          </div>
        ) : dayAppts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma consulta neste dia</p>
        ) : (
          <div className="space-y-2">
            {dayAppts.sort((a, b) => a.appointment_time?.localeCompare(b.appointment_time)).map(appt => (
              <div key={appt.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-xs font-mono text-gray-600">{appt.appointment_time?.slice(0, 5)}</span>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{appt.paciente_nome || 'Paciente'}</span>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${
                  appt.status === 'confirmado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  appt.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-gray-50 text-gray-500'
                }`}>{appt.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Recurring Schedule Editor ─────────────────────────────────────────────────
const RecurringScheduleEditor = ({ doctorId, onSaved }) => {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState([]);
  const [settings, setSettings] = useState({
    slot_duration: 30,
    interval_between: 10,
    max_per_day: 12,
    accept_new_patients: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    const load = async () => {
      const { data } = await supabase.from('disponibilidade_medicos')
        .select('*').eq('medico_id', doctorId);
      if (data) setSchedule(data);

      const { data: doc } = await supabase.from('medicos').select('slot_duration, interval_between, max_per_day, accept_new_patients').eq('id', doctorId).maybeSingle();
      if (doc) setSettings(prev => ({ ...prev, ...doc }));
    };
    load();
  }, [doctorId]);

  const toggleDay = (dayId) => {
    const exists = schedule.find(s => s.dia_semana === dayId);
    if (exists) {
      setSchedule(prev => prev.filter(s => s.dia_semana !== dayId));
    } else {
      setSchedule(prev => [...prev, { dia_semana: dayId, hora_inicio: '08:00', hora_fim: '18:00', medico_id: doctorId }]);
    }
  };

  const updateDay = (dayId, field, value) => {
    setSchedule(prev => prev.map(s => s.dia_semana === dayId ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save recurring schedule
      await supabase.from('disponibilidade_medicos').delete().eq('medico_id', doctorId);
      if (schedule.length > 0) {
        const { error } = await supabase.from('disponibilidade_medicos').insert(
          schedule.map(s => ({ medico_id: doctorId, dia_semana: s.dia_semana, hora_inicio: s.hora_inicio, hora_fim: s.hora_fim }))
        );
        if (error) throw error;
      }
      // Save settings
      await supabase.from('medicos').update(settings).eq('id', doctorId);
      toast({ title: 'Agenda salva com sucesso!' });
      onSaved?.();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="p-5 border-b border-gray-100">
        <CardTitle className="text-base font-bold">Horários Recorrentes</CardTitle>
        <CardDescription className="text-xs text-gray-400">Configure os dias e horários de atendimento</CardDescription>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Day toggles */}
        <div className="space-y-2">
          {WEEK_DAYS.map(day => {
            const daySchedule = schedule.find(s => s.dia_semana === day.id);
            const isActive = !!daySchedule;
            return (
              <div key={day.id} className={`rounded-lg border transition-all ${isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                <div className="flex items-center gap-3 p-3">
                  <Switch checked={isActive} onCheckedChange={() => toggleDay(day.id)} />
                  <span className={`text-sm font-semibold w-10 ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{day.short}</span>
                  {isActive ? (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-500 shrink-0">Das</Label>
                        <Input
                          type="time"
                          value={daySchedule.hora_inicio}
                          onChange={e => updateDay(day.id, 'hora_inicio', e.target.value)}
                          className="h-7 text-xs w-28 border-blue-200"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-500 shrink-0">às</Label>
                        <Input
                          type="time"
                          value={daySchedule.hora_fim}
                          onChange={e => updateDay(day.id, 'hora_fim', e.target.value)}
                          className="h-7 text-xs w-28 border-blue-200"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 flex-1">Sem atendimento</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Duração por consulta</Label>
            <Select
              value={String(settings.slot_duration || 30)}
              onValueChange={v => setSettings(s => ({ ...s, slot_duration: Number(v) }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Intervalo entre consultas</Label>
            <Select
              value={String(settings.interval_between || 10)}
              onValueChange={v => setSettings(s => ({ ...s, interval_between: Number(v) }))}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Máx. consultas por dia</Label>
            <Input
              type="number" min={1} max={40}
              value={settings.max_per_day || 12}
              onChange={e => setSettings(s => ({ ...s, max_per_day: Number(e.target.value) }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-700">Aceitar novos pacientes</p>
              <p className="text-[10px] text-gray-400">Liga/desliga agendamentos</p>
            </div>
            <Switch
              checked={settings.accept_new_patients !== false}
              onCheckedChange={v => setSettings(s => ({ ...s, accept_new_patients: v }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const DoctorSchedulePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [doctorId, setDoctorId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: doc } = await supabase.from('medicos').select('id').eq('user_id', user.id).maybeSingle();
      if (doc) {
        setDoctorId(doc.id);
        await loadData(doc.id);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const loadData = async (did) => {
    const startStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const [apptRes, blockedRes] = await Promise.all([
      supabase.from('agendamentos').select('*').eq('medico_id', did)
        .gte('appointment_date', startStr).lte('appointment_date', endStr),
      supabase.from('horarios_bloqueados').select('data_bloqueada').eq('medico_id', did)
        .gte('data_bloqueada', startStr).lte('data_bloqueada', endStr),
    ]);

    setAppointments(apptRes.data || []);
    setBlockedDates((blockedRes.data || []).map(b => b.data_bloqueada));
  };

  useEffect(() => {
    if (doctorId) loadData(doctorId);
  }, [currentMonth, doctorId]);

  const handleBlock = async (dateStr) => {
    if (!doctorId) return;
    const { error } = await supabase.from('horarios_bloqueados').insert({ medico_id: doctorId, data_bloqueada: dateStr });
    if (!error) {
      setBlockedDates(prev => [...prev, dateStr]);
      toast({ title: 'Dia bloqueado' });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const handleUnblock = async (dateStr) => {
    if (!doctorId) return;
    const { error } = await supabase.from('horarios_bloqueados').delete().eq('medico_id', doctorId).eq('data_bloqueada', dateStr);
    if (!error) {
      setBlockedDates(prev => prev.filter(d => d !== dateStr));
      toast({ title: 'Dia desbloqueado' });
    }
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start
    const startDow = getDay(start);
    const padStart = startDow === 0 ? 6 : startDow - 1;
    const prevDays = [];
    for (let i = padStart; i > 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      prevDays.push(d);
    }
    // Pad end
    const endDow = getDay(end);
    const padEnd = endDow === 0 ? 0 : 7 - endDow;
    const nextDays = [];
    for (let i = 1; i <= padEnd; i++) {
      const d = new Date(end);
      d.setDate(d.getDate() + i);
      nextDays.push(d);
    }
    return [...prevDays, ...days, ...nextDays];
  }, [currentMonth]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <>
      <Helmet><title>Minha Agenda - Click Teleconsulta</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minha Agenda</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gerencie disponibilidade, bloqueios e consultas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData(doctorId)}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-base font-bold text-gray-900 capitalize min-w-[160px] text-center">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Confirmado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Pendente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Bloqueado</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Week headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => (
                    <CalendarDay
                      key={i}
                      date={day}
                      appointments={appointments}
                      blockedDates={blockedDates}
                      currentMonth={currentMonth}
                      onClick={setSelectedDate}
                      isSelected={isSameDay(day, selectedDate)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Day Detail */}
            <DayDetailPanel
              date={selectedDate}
              appointments={appointments}
              blockedDates={blockedDates}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
            />
          </div>

          {/* Right panel: recurring schedule config */}
          <div>
            {doctorId && (
              <RecurringScheduleEditor
                doctorId={doctorId}
                onSaved={() => loadData(doctorId)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorSchedulePage;
