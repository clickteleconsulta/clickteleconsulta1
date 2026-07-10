import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  ArrowRight,
  Loader2,
  User,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  Bell,
  Video,
  Mail,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

// ─── Google Calendar Link ─────────────────────────────────────────────────────
const buildGoogleCalendarLink = (appointment) => {
  if (!appointment) return null;

  const startDate = new Date(appointment.horario_inicio);
  const endDate = appointment.horario_fim
    ? new Date(appointment.horario_fim)
    : new Date(startDate.getTime() + 30 * 60 * 1000);

  const formatGCal = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const title = encodeURIComponent(
    `Teleconsulta — ${appointment.medico?.public_name || 'Click Teleconsulta'}`
  );
  const dates = `${formatGCal(startDate)}/${formatGCal(endDate)}`;
  const details = encodeURIComponent(
    `Sua teleconsulta com ${appointment.medico?.public_name || 'o médico'} (${appointment.medico?.specialty || ''}) está confirmada.\n\nAcesse a plataforma 15 minutos antes do horário: https://clickteleconsulta.online/paciente/dashboard/consultas`
  );
  const location = encodeURIComponent('Teleconsulta Online — Click Teleconsulta');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};

// ─── Próximos passos ──────────────────────────────────────────────────────────
const NextSteps = ({ appointment }) => {
  const gcalLink = buildGoogleCalendarLink(appointment);

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-900 text-base">Próximos Passos</h3>
      <div className="space-y-2.5">
        {[
          {
            icon: <Mail className="w-4 h-4 text-blue-500" />,
            text: 'Verifique seu email — um email de confirmação foi enviado com todos os detalhes.',
            color: 'bg-blue-50 border-blue-100',
          },
          {
            icon: <Calendar className="w-4 h-4 text-green-500" />,
            text: 'Adicione ao seu calendário para não esquecer.',
            color: 'bg-green-50 border-green-100',
            action: gcalLink && (
              <a
                href={gcalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-green-700 hover:underline flex items-center gap-1 mt-1"
              >
                Google Calendar <ExternalLink className="w-3 h-3" />
              </a>
            ),
          },
          {
            icon: <Clock className="w-4 h-4 text-amber-500" />,
            text: 'Anote a data e o horário do seu agendamento e fique atento aos lembretes.',
            color: 'bg-amber-50 border-amber-100',
          },
          {
            icon: <Calendar className="w-4 h-4 text-primary" />,
            text: 'Acompanhe seu agendamento em "Minhas Consultas", na sua área do paciente.',
            color: 'bg-primary/5 border-primary/10',
          },
        ].map((step, i) => (
          <div
            key={i}
            className={`flex gap-3 p-3 rounded-xl border text-sm ${step.color}`}
          >
            <div className="flex-shrink-0 mt-0.5">{step.icon}</div>
            <div>
              <p className="text-slate-700">{step.text}</p>
              {step.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── AppointmentSuccessPage ────────────────────────────────────────────────────
const AppointmentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const appointmentId = location.state?.appointmentId;

  useEffect(() => {
    if (!appointmentId) {
      toast({
        variant: 'destructive',
        title: 'Erro de Navegação',
        description: 'Nenhum agendamento encontrado para confirmação.',
      });
      navigate('/paciente/dashboard/consultas');
      return;
    }

    const fetchAppointment = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select(
          `
          *, 
          medico:medicos(public_name, specialty), 
          guia:guias!agendamentos_guia_id_fkey(protocolo, pdf_url),
          patient:perfis_usuarios!agendamentos_patient_id_fkey(full_name)
        `
        )
        .eq('id', appointmentId)
        .single();

      if (error || !data) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Buscar Agendamento',
          description: 'Não foi possível encontrar os detalhes da sua confirmação.',
        });
        navigate('/paciente/dashboard/consultas');
        return;
      }

      setAppointment(data);
      setLoading(false);
    };

    fetchAppointment();
  }, [appointmentId, navigate, toast]);

  const handleDownloadGuide = () => {
    if (appointment?.guia?.pdf_url) {
      window.open(appointment.guia.pdf_url, '_blank');
    } else {
      toast({
        title: '🚧 Em Breve!',
        description:
          'A geração do PDF da guia está sendo finalizada. Você poderá baixá-la em breve no seu painel!',
      });
    }
  };

  const gcalLink = buildGoogleCalendarLink(appointment);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h1 className="text-xl font-semibold">Finalizando seu agendamento...</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Agendamento Concluído! — Click Teleconsulta</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="container mx-auto px-4 py-10 max-w-3xl"
      >
        {/* Header de sucesso */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.2,
            }}
            className="inline-flex"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl font-extrabold text-slate-900 mt-4">
              Agendamento Concluído!
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Sua consulta foi confirmada com sucesso. A guia foi enviada ao
              médico e você receberá um email de confirmação em breve.
            </p>
          </motion.div>
        </div>

        {/* Detalhes da consulta */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {appointment?.guia?.protocolo && (
                <div className="flex items-center gap-4 p-5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Protocolo da Guia
                    </p>
                    <p className="font-bold text-xl tracking-wider">
                      {appointment.guia.protocolo}
                    </p>
                  </div>
                </div>
              )}

              {appointment?.medico && (
                <div className="flex items-center gap-4 p-5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Médico(a)</p>
                    <p className="font-semibold text-lg">
                      {appointment.medico.public_name}
                    </p>
                    <p className="text-sm text-primary">
                      {appointment.medico.specialty}
                    </p>
                  </div>
                </div>
              )}

              {appointment?.horario_inicio && (
                <div className="flex items-center gap-4 p-5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Data e Hora (Horário de Brasília)
                    </p>
                    <p className="font-semibold text-lg">
                      {new Date(appointment.horario_inicio).toLocaleString(
                        'pt-BR',
                        {
                          dateStyle: 'full',
                          timeStyle: 'short',
                          timeZone: 'America/Sao_Paulo',
                        }
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Próximos passos */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            <NextSteps appointment={appointment} />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" variant="outline" onClick={handleDownloadGuide}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Guia
          </Button>

          {gcalLink && (
            <Button size="lg" variant="outline" asChild>
              <a href={gcalLink} target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-4 w-4" />
                Adicionar ao Google Calendar
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          )}

          <Button size="lg" asChild>
            <Link to="/paciente/dashboard/consultas">
              Ir para Minhas Consultas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </>
  );
};

export default AppointmentSuccessPage;
