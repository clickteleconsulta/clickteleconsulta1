import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  UserCircle,
  FileText,
  Tag,
  AlertTriangle,
  Calendar,
  Clock,
  Stethoscope,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { cn } from '@/lib/utils';

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const STEPS = ['Escolha', 'Revisão', 'Pagamento', 'Confirmação'];

const ProgressBar = ({ currentStep = 1 }) => (
  <div className="w-full mb-8">
    <div className="flex items-center justify-between max-w-xl mx-auto">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                  isCompleted && 'bg-primary text-white',
                  isActive &&
                    'bg-primary text-white ring-4 ring-primary/20',
                  !isCompleted &&
                    !isActive &&
                    'bg-gray-100 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mb-4',
                  stepNum < currentStep ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ─── Resumo da consulta (sidebar / mobile) ────────────────────────────────────
const AppointmentSummary = ({ appointmentDetails, compact = false }) => {
  if (!appointmentDetails) return null;

  const startDate = new Date(appointmentDetails.horario_inicio);
  const formattedDate = startDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const formattedTime = startDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const price = (appointmentDetails.price_in_cents / 100).toFixed(2).replace('.', ',');

  return (
    <Card
      className={cn(
        'border-primary/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/30',
        compact && 'shadow-none'
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Resumo da Consulta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold">{appointmentDetails.doctor_name}</p>
            <p className="text-xs text-muted-foreground">
              {appointmentDetails.specialty}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="capitalize">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
          <p>{formattedTime} (Horário de Brasília)</p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t font-bold">
          <span>Total</span>
          <span className="text-xl text-blue-600">R$ {price}</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Conclua o pagamento até <strong>20 minutos antes</strong> do horário
            da consulta. Guias não pagas nesse prazo são{' '}
            <strong>canceladas automaticamente</strong>, junto com o agendamento.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Dados do Paciente ────────────────────────────────────────────────────────
const PatientDataReview = ({ profile, user }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <UserCircle className="w-5 h-5 text-primary" />
        Dados do Paciente
      </CardTitle>
      <CardDescription>
        Dados que serão usados no seu agendamento.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2.5 text-sm">
      {[
        ['Nome Completo', profile?.full_name],
        ['CPF', profile?.cpf],
        [
          'Data de Nascimento',
          profile?.data_nasc
            ? new Date(profile.data_nasc + 'T00:00:00').toLocaleDateString(
                'pt-BR'
              )
            : null,
        ],
        ['Telefone', profile?.whatsapp],
        ['E-mail', user?.email],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between items-center py-1.5 border-b border-dashed last:border-0"
        >
          <span className="text-muted-foreground">{label}</span>
          <span
            className={cn(
              'font-medium text-right',
              !value && 'text-destructive text-xs'
            )}
          >
            {value || 'Não informado'}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

// ─── CheckoutPage ─────────────────────────────────────────────────────────────
const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createConfirmedAppointment, refetchAppointments } = useAppointments();
  const { profile, user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);

  const appointmentDetails = location.state?.appointmentDetails;

  const isProfileComplete =
    profile && profile.full_name && profile.cpf && profile.data_nasc && profile.whatsapp;

  useEffect(() => {
    if (!appointmentDetails) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum horário selecionado.',
      });
      navigate('/agendamentos');
    }
  }, [appointmentDetails, navigate, toast]);

  const handleGoToCompleteProfile = () => {
    navigate('/paciente/dashboard/dados', {
      state: { from: 'checkout', appointmentDetails },
    });
  };

  const handleConfirmAppointment = async () => {
    if (!isProfileComplete || !user || !appointmentDetails?.medico_id) {
      toast({
        variant: 'destructive',
        title: 'Dados incompletos',
        description:
          'Por favor, complete seu cadastro e selecione um horário válido.',
      });
      return;
    }

    setIsConfirming(true);

    const payload = {
      medico_id: appointmentDetails.medico_id,
      servico_id: appointmentDetails.servico_id,
      horario_inicio: appointmentDetails.horario_inicio,
      horario_fim: appointmentDetails.horario_fim,
      price_in_cents: appointmentDetails.price_in_cents,
    };

    const { data: newAppointment, error } = await createConfirmedAppointment(
      payload
    );

    if (error) {
      setIsConfirming(false);
      if (error.message.includes('agendamentos_confirmados_unicos_idx')) {
        navigate('/paciente/dashboard/consultas');
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Erro no Agendamento',
        description: error.message,
        duration: 5000,
      });
      setTimeout(() => navigate('/agendamentos'), 4000);
    } else if (newAppointment) {
      toast({
        title: 'Guia gerada!',
        description: 'Seu agendamento foi confirmado e a guia enviada ao médico.',
        duration: 5000,
      });
      await refetchAppointments();
      navigate('/agendamento-sucesso', {
        replace: true,
        state: { appointmentId: newAppointment.id },
      });
    }
  };

  if (!appointmentDetails || !profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Confirmar Agendamento — Click Teleconsulta</title>
      </Helmet>

      <div className="max-w-5xl mx-auto py-6">
        {/* Progress */}
        <ProgressBar currentStep={2} />

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Revise seu Agendamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Confirme os dados antes de finalizar.
          </p>
        </div>

        {/* Dados incompletos */}
        {!isProfileComplete && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-amber-900">
                  Cadastro Incompleto
                </h4>
                <p className="text-sm text-amber-800">
                  Complete seu cadastro para continuar com o agendamento.
                </p>
              </div>
              <Button
                onClick={handleGoToCompleteProfile}
                className="flex-shrink-0"
              >
                Completar Cadastro
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dados + Confirmação */}
          <div className="lg:col-span-2 space-y-6">
            <PatientDataReview profile={profile} user={user} />

            {/* Aviso email */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p>
                Após a confirmação, você receberá um{' '}
                <strong>email de confirmação</strong> com todos os detalhes do
                seu agendamento.
              </p>
            </div>

            {/* Aviso prazo de pagamento */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Prazo de pagamento:</strong> a consulta só é confirmada
                após o pagamento. Ele deve ser concluído até{' '}
                <strong>20 minutos antes</strong> do horário agendado — guias e
                agendamentos não pagos nesse prazo são{' '}
                <strong>cancelados automaticamente</strong>.
              </p>
            </div>

            {/* Resumo mobile */}
            <div className="lg:hidden">
              <AppointmentSummary appointmentDetails={appointmentDetails} />
            </div>

            {/* Botões */}
            <Card>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 py-6">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar e Escolher Outro Horário
                </Button>
                <Button
                  size="lg"
                  onClick={handleConfirmAppointment}
                  disabled={isConfirming || !isProfileComplete}
                  className="w-full sm:w-auto"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 mr-2" />
                      Confirmar e Gerar Guia
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Seus dados são protegidos por criptografia e seguem a LGPD.</span>
            </div>
          </div>

          {/* Resumo lateral (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <AppointmentSummary appointmentDetails={appointmentDetails} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;
