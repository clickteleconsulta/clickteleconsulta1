import React, { useMemo, useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  HelpCircle,
  LogOut,
  User,
  PlusCircle,
  Home,
  FileSignature,
  MessageSquare,
  Star,
  Video,
  Clock,
  Bell,
  Stethoscope,
} from 'lucide-react';
import PatientConsultations from '@/components/patient/PatientConsultations';
import SupportPage from '@/pages/SupportPage';
import PatientNewAppointmentPage from '@/pages/patient/PatientNewAppointmentPage';
import PatientData from '@/components/patient/PatientData';
import MessagesPage from '@/pages/MessagesPage';
import PatientReviewsPage from '@/pages/patient/PatientReviewsPage';
import { Link } from 'react-router-dom';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { FEATURES } from '@/config/features';
import ComunicadosBanner from '@/components/ComunicadosBanner';

// ─── Countdown Hook ───────────────────────────────────────────────────────────
const useCountdown = (targetDate) => {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!targetDate) return null;

  const target = new Date(targetDate);
  const diffSec = Math.floor((target.getTime() - now.getTime()) / 1000);

  if (diffSec < 0) return null;

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  return { hours, minutes, seconds, diffSec };
};

// ─── Next Appointment Card ─────────────────────────────────────────────────────
const NextAppointmentCard = ({ appointment }) => {
  const countdown = useCountdown(appointment?.horario_inicio);

  if (!appointment) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Próxima Consulta</h2>
            <p className="text-xs text-muted-foreground">Nenhuma consulta agendada</p>
          </div>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/paciente/dashboard/agendar">
            <PlusCircle className="w-4 h-4 mr-2" />
            Agendar Primeira Consulta
          </Link>
        </Button>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.horario_inicio);
  const minutesUntil = differenceInMinutes(appointmentDate, new Date());
  const canEnter = minutesUntil <= 15 && minutesUntil >= -30;

  const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
  const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="bg-gradient-to-br from-primary/5 to-blue-400/10 rounded-2xl border border-primary/20 p-6 mb-6 relative overflow-hidden">
      {/* Decoração */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12" />

      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-slate-900 text-lg">Próxima Consulta</h2>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {appointment.medicos?.public_name || appointment.medicos?.name}
          </p>
          <p className="text-sm text-primary font-medium">
            {appointment.medicos?.specialty}
          </p>
          <div className="flex items-center gap-3 mt-3 text-sm text-slate-700">
            <span className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 border border-white/80">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5 bg-white/70 rounded-full px-3 py-1 border border-white/80">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Countdown / Botão entrar */}
        <div className="flex flex-col items-end gap-3">
          {countdown && !canEnter && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Começa em</p>
              <div className="flex items-center gap-1.5">
                {countdown.hours > 0 && (
                  <>
                    <span className="text-2xl font-mono font-extrabold text-slate-900">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-muted-foreground font-bold">:</span>
                  </>
                )}
                <span className="text-2xl font-mono font-extrabold text-slate-900">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-muted-foreground font-bold">:</span>
                <span className="text-2xl font-mono font-extrabold text-slate-900">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          {canEnter && FEATURES.VIDEO_CALL ? (
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6 animate-pulse shadow-lg shadow-green-500/30"
            >
              <Link
                to={`/call/${appointment.id}`}
                className="flex items-center gap-2"
              >
                <Video className="w-5 h-5" />
                Entrar na Consulta
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="rounded-full"
            >
              <Link to="/paciente/dashboard/consultas">
                Ver detalhes
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canEnter && FEATURES.VIDEO_CALL && (
        <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>
            Sua consulta está prestes a começar! Clique em{' '}
            <strong>Entrar na Consulta</strong> para iniciar a videochamada.
          </span>
        </div>
      )}
    </div>
  );
};

// ─── PatientArea ─────────────────────────────────────────────────────────────
const PatientArea = () => {
  const { profile, signOut, session } = useAuth();
  const { appointments } = useAppointments();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Consultas agendadas (futuras)
  const upcomingList = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => ['confirmado', 'reagendado', 'pendente'].includes(a.status))
      .sort((a, b) => new Date(a.horario_inicio) - new Date(b.horario_inicio));
  }, [appointments]);
  const nextAppointment = upcomingList[0] || null;
  const upcomingCount = upcomingList.length;

  // Consultas atendidas ainda não avaliadas → badge "Avalie sua consulta"
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    supabase.from('avaliacoes').select('agendamento_id').eq('paciente_id', uid)
      .then(({ data }) => setReviewedIds(new Set((data || []).map((r) => r.agendamento_id))))
      .catch(() => {});
  }, [session?.user?.id, appointments]);
  const pendingReviews = useMemo(() => {
    if (!appointments) return 0;
    return appointments.filter(
      (a) => ['atendido', 'realizado', 'concluida'].includes(a.status) && !reviewedIds.has(a.id)
    ).length;
  }, [appointments, reviewedIds]);

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`;

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Minha conta — Click Teleconsulta</title>
      </Helmet>
      <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-4 sticky top-24">
          <div className="flex flex-col items-center text-center p-4 border border-border rounded-2xl bg-card shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-base font-bold">{profile?.full_name}</h2>
            <p className="text-xs text-muted-foreground">Paciente</p>
            {upcomingCount > 0 && (
              <Badge className="mt-2 bg-green-50 text-green-700 border-green-200 text-xs">
                {upcomingCount} consulta{upcomingCount > 1 ? 's' : ''} agendada{upcomingCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <Card className="p-4 rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
              Menu
            </p>
            <nav className="flex flex-col gap-1">
              <NavLink
                to="/paciente/dashboard/consultas"
                className={navLinkClasses}
              >
                <Calendar className="w-5 h-5" />
                Minhas Consultas
              </NavLink>
              <NavLink
                to="/paciente/dashboard/agendar"
                className={navLinkClasses}
              >
                <PlusCircle className="w-5 h-5" />
                Agendar Consulta
              </NavLink>
              {FEATURES.MESSAGING && (
              <NavLink
                to="/paciente/dashboard/mensagens"
                className={navLinkClasses}
              >
                <MessageSquare className="w-5 h-5" />
                Mensagens
              </NavLink>
              )}
              <NavLink
                to="/paciente/dashboard/avaliacoes"
                className={navLinkClasses}
              >
                <Star className="w-5 h-5" />
                <span className="flex-1">Avaliações</span>
                {pendingReviews > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold leading-none">
                    {pendingReviews > 99 ? '99+' : pendingReviews}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/paciente/dashboard/dados"
                className={navLinkClasses}
              >
                <FileSignature className="w-5 h-5" />
                Meus Dados
              </NavLink>
              <NavLink
                to="/paciente/dashboard/suporte"
                className={navLinkClasses}
              >
                <HelpCircle className="w-5 h-5" />
                Suporte
              </NavLink>
            </nav>

            <p className="text-xs font-semibold text-muted-foreground uppercase px-3 mt-4 mb-2">
              Outros
            </p>
            <nav className="flex flex-col gap-1">
              <NavLink to="/" className={navLinkClasses}>
                <Home className="w-5 h-5" />
                Página Inicial
              </NavLink>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className={`${navLinkClasses({ isActive: false })} w-full justify-start`}
              >
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </nav>
          </Card>
        </aside>

        {/* Conteúdo */}
        <main>
          <ComunicadosBanner audience="paciente" />
          <Routes>
            <Route path="/" element={<Navigate to="consultas" replace />} />
            <Route
              path="consultas"
              element={
                <div>
                  <NextAppointmentCard appointment={nextAppointment} />
                  <PatientConsultations />
                </div>
              }
            />
            <Route path="agendar" element={<PatientNewAppointmentPage />} />
            {FEATURES.MESSAGING && <Route path="mensagens" element={<MessagesPage />} />}
            <Route path="avaliacoes" element={<PatientReviewsPage />} />
            <Route path="dados" element={<PatientData />} />
            <Route path="suporte" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="consultas" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

export default PatientArea;
