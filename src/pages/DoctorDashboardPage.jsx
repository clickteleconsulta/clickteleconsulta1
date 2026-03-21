import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2, Calendar, Users, DollarSign, Check, X, Clock, Bell,
  Plus, Lock, FileText, TrendingUp, ChevronRight, Video, Star,
  AlertCircle, CalendarPlus, UserCheck, Activity, BarChart2, Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format, isToday, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {trend !== undefined && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(targetDateStr, targetTimeStr) {
  const [diff, setDiff] = useState(null);
  useEffect(() => {
    if (!targetDateStr || !targetTimeStr) return;
    const tick = () => {
      const target = new Date(`${targetDateStr}T${targetTimeStr}`);
      const now = new Date();
      setDiff(differenceInMinutes(target, now));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [targetDateStr, targetTimeStr]);
  return diff;
}

// ─── Next Consultation Card ────────────────────────────────────────────────────
const NextConsultationCard = ({ appt }) => {
  const countdown = useCountdown(appt?.appointment_date, appt?.appointment_time);
  const navigate = useNavigate();

  if (!appt) {
    return (
      <Card className="border border-dashed border-gray-200 shadow-sm">
        <CardContent className="p-6 text-center text-gray-400 flex flex-col items-center gap-3">
          <Calendar className="w-10 h-10 text-gray-200" />
          <p className="text-sm">Nenhuma consulta agendada para hoje</p>
        </CardContent>
      </Card>
    );
  }

  const isImminent = countdown !== null && countdown >= 0 && countdown <= 5;
  const isPast = countdown !== null && countdown < 0;

  return (
    <Card className={`border shadow-sm transition-all ${isImminent ? 'border-green-400 bg-green-50/30' : 'border-gray-200'}`}>
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Próxima Consulta
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-white shadow">
            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-lg">
              {(appt.paciente_nome || 'P')[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-gray-900">{appt.paciente_nome || 'Paciente'}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {appt.appointment_time?.slice(0, 5)}
            </p>
          </div>
        </div>

        {countdown !== null && (
          <div className={`rounded-xl p-3 text-center ${isImminent ? 'bg-green-100' : isPast ? 'bg-gray-100' : 'bg-blue-50'}`}>
            {isImminent ? (
              <p className="text-green-700 font-bold text-sm">🟢 Consulta em breve!</p>
            ) : isPast ? (
              <p className="text-gray-500 text-sm">Horário passado</p>
            ) : (
              <p className="text-blue-700 font-medium text-sm">
                Em <span className="font-bold">{countdown}min</span>
              </p>
            )}
          </div>
        )}

        <Button
          className={`w-full font-semibold ${isImminent ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
          variant={isImminent ? 'default' : 'outline'}
          onClick={() => navigate(`/call/${appt.id}`)}
        >
          <Video className="w-4 h-4 mr-2" />
          {isImminent ? 'Iniciar Consulta' : 'Entrar na Sala'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Timeline de Hoje ──────────────────────────────────────────────────────────
const DayTimeline = ({ appointments, workStart = 8, workEnd = 18, slotDuration = 30 }) => {
  const slots = [];
  for (let h = workStart; h < workEnd; h++) {
    for (let m = 0; m < 60; m += slotDuration) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const appt = appointments.find(a => a.appointment_time?.slice(0, 5) === timeStr);
      slots.push({ time: timeStr, appt });
    }
  }

  const statusColors = {
    confirmado: 'bg-blue-100 border-blue-300 text-blue-700',
    pendente: 'bg-amber-50 border-amber-300 text-amber-700',
    atendido: 'bg-green-50 border-green-300 text-green-600',
    cancelado: 'bg-red-50 border-red-200 text-red-400 line-through opacity-60',
  };

  return (
    <div className="space-y-1.5 overflow-y-auto max-h-[420px] pr-1">
      {slots.map(({ time, appt }) => (
        <div key={time} className="flex gap-3 items-center min-h-[44px]">
          <span className="text-xs text-gray-400 w-10 shrink-0 font-mono">{time}</span>
          {appt ? (
            <div className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-between gap-2 ${statusColors[appt.status] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <span className="truncate">{appt.paciente_nome || 'Paciente'}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{appt.status}</Badge>
            </div>
          ) : (
            <div className="flex-1 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-300">
              Livre
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Notification Item ─────────────────────────────────────────────────────────
const NotificationItem = ({ icon: Icon, color, title, sub, time }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
    <div className={`p-2 rounded-lg shrink-0 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {time && <span className="text-[11px] text-gray-400 shrink-0">{time}</span>}
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const DoctorDashboardPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: doc } = await supabase.from('medicos').select('*').eq('user_id', user.id).maybeSingle();
      setDoctorProfile(doc);

      if (doc) {
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = today.slice(0, 8) + '01';

        const [apptRes, reviewRes] = await Promise.all([
          supabase.from('agendamentos')
            .select('*')
            .eq('medico_id', doc.id)
            .gte('appointment_date', startOfMonth)
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true }),
          supabase.from('avaliacoes')
            .select('*')
            .eq('medico_id', doc.user_id)
            .eq('status', 'publicada')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        setAppointments(apptRes.data || []);
        setReviews(reviewRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdateStatus = async (id, status) => {
    await supabase.from('agendamentos').update({ status }).eq('id', id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    toast({ title: status === 'confirmado' ? 'Consulta confirmada' : 'Consulta cancelada' });
  };

  // ── KPI computation ──
  const today = new Date().toISOString().split('T')[0];
  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  })();

  const todayAppts = useMemo(() => appointments.filter(a => a.appointment_date === today && a.status !== 'cancelado'), [appointments, today]);
  const weekAppts = useMemo(() => appointments.filter(a => a.appointment_date >= startOfWeek && a.status !== 'cancelado'), [appointments, startOfWeek]);
  const monthAppts = useMemo(() => appointments.filter(a => a.status !== 'cancelado'), [appointments]);
  const monthRevenue = useMemo(() => monthAppts.reduce((acc, a) => acc + (a.price_in_cents || 0), 0) / 100, [monthAppts]);
  const avgRating = useMemo(() => reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—', [reviews]);

  // Next consultation (today, upcoming)
  const nowStr = new Date().toTimeString().slice(0, 5);
  const nextAppt = useMemo(() =>
    todayAppts
      .filter(a => a.appointment_time >= nowStr && (a.status === 'confirmado' || a.status === 'pendente'))
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))[0]
    , [todayAppts, nowStr]);

  // Notifications (recent pending + new reviews)
  const notifications = useMemo(() => {
    const items = [];
    appointments.filter(a => a.status === 'pendente' && a.appointment_date >= today).slice(0, 3).forEach(a => {
      items.push({
        icon: CalendarPlus, color: 'bg-amber-50 text-amber-600',
        title: `Novo agendamento: ${a.paciente_nome || 'Paciente'}`,
        sub: `${a.appointment_date} às ${a.appointment_time?.slice(0, 5)}`,
        time: '',
      });
    });
    reviews.slice(0, 2).forEach(r => {
      items.push({
        icon: Star, color: 'bg-yellow-50 text-yellow-500',
        title: `Nova avaliação: ${r.rating}★`,
        sub: r.comentario?.slice(0, 50) || '',
        time: '',
      });
    });
    return items;
  }, [appointments, reviews, today]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Painel do Médico - Click Teleconsulta</title></Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bom dia, {profile?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/medico/dashboard/agenda')}>
              <Lock className="w-3.5 h-3.5 mr-2" /> Bloquear Horário
            </Button>
            <Button size="sm" onClick={() => navigate('/medico/dashboard/agenda')}>
              <Plus className="w-3.5 h-3.5 mr-2" /> Disponibilidade
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Calendar}   label="Consultas hoje"  value={todayAppts.length}  sub={`${todayAppts.filter(a => a.status === 'confirmado').length} confirmadas`} color="blue" />
          <KPICard icon={Activity}   label="Esta semana"     value={weekAppts.length}   sub="agendamentos" color="purple" />
          <KPICard icon={BarChart2}  label="Este mês"        value={monthAppts.length}  sub="no total" color="amber" />
          <KPICard icon={DollarSign} label="Faturamento/mês" value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="estimado" color="green" />
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Column 1: Timeline ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Today's appointments rating */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Agenda de Hoje</CardTitle>
                  <p className="text-xs text-gray-400 mt-0.5">{todayAppts.length} consulta(s) no dia</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full font-semibold">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {avgRating}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <DayTimeline appointments={todayAppts} />
              </CardContent>
            </Card>

            {/* Pending approvals */}
            {appointments.filter(a => a.status === 'pendente' && a.appointment_date >= today).length > 0 && (
              <Card className="border border-amber-200 bg-amber-50/30 shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Aguardando Confirmação
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-2">
                  {appointments.filter(a => a.status === 'pendente' && a.appointment_date >= today).slice(0, 5).map(appt => (
                    <div key={appt.id} className="bg-white rounded-lg border border-amber-200 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{appt.paciente_nome || 'Paciente'}</p>
                        <p className="text-xs text-gray-500">{appt.appointment_date} · {appt.appointment_time?.slice(0, 5)}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-3"
                          onClick={() => handleUpdateStatus(appt.id, 'confirmado')}>
                          <Check className="w-3 h-3 mr-1" /> Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-500 hover:bg-red-50 px-2"
                          onClick={() => handleUpdateStatus(appt.id, 'cancelado')}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="h-16 flex-col gap-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700"
                onClick={() => navigate('/medico/dashboard/agenda')}>
                <Lock className="w-4 h-4" /> Bloquear Horário
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700"
                onClick={() => navigate('/medico/dashboard/agenda')}>
                <CalendarPlus className="w-4 h-4" /> Adicionar Disponibilidade
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700"
                onClick={() => navigate('/medico/dashboard/pacientes')}>
                <FileText className="w-4 h-4" /> Ver Prontuários
              </Button>
            </div>
          </div>

          {/* ── Column 2 (right panel) ── */}
          <div className="space-y-5">
            {/* Next consultation */}
            <NextConsultationCard appt={nextAppt} />

            {/* Notifications */}
            {notifications.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" /> Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {notifications.map((n, i) => (
                    <NotificationItem key={i} {...n} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Profile completeness */}
            {doctorProfile && (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Perfil completo</p>
                    <span className="text-xs font-bold text-blue-600">
                      {Math.round([
                        doctorProfile.bio, doctorProfile.image_url, doctorProfile.crm,
                        doctorProfile.specialty, doctorProfile.uf,
                      ].filter(Boolean).length / 5 * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round([
                      doctorProfile.bio, doctorProfile.image_url, doctorProfile.crm,
                      doctorProfile.specialty, doctorProfile.uf,
                    ].filter(Boolean).length / 5 * 100)}
                    className="h-2"
                  />
                  <Button variant="ghost" size="sm" className="w-full text-xs text-blue-600 hover:bg-blue-50 mt-1"
                    onClick={() => navigate('/medico/dashboard/perfil')}>
                    Completar perfil <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorDashboardPage;
