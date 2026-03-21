import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  CheckCircle2, Star, Download, Calendar, FileText,
  ArrowRight, Clock, Loader2, ChevronRight, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

/**
 * ConsultaEncerradaPage — Pós-consulta
 * Rota: /consulta/:appointmentId/encerrada
 * Referência: Doctoralia (avaliação pós-consulta), iClinic (próximos passos)
 */

// ─── Estrelas de avaliação ───
const StarRating = ({ value, onChange, disabled }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => !disabled && setHovered(0)}
          className={`transition-transform ${!disabled ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-9 h-9 transition-colors ${
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 fill-transparent'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Seção do Paciente ───
const PatientPostConsulta = ({ appointment, onSubmitReview }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const doctorName = appointment?.medicos?.public_name || appointment?.medicos?.name || 'Médico';
  const doctorId = appointment?.medico_id;

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast({ title: 'Selecione uma nota', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('avaliacoes').insert({
        agendamento_id: appointment.id,
        medico_id: doctorId,
        patient_id: appointment.patient_id,
        nota: rating,
        comentario: comment.trim() || null,
      });
      if (error) throw error;
      setReviewSubmitted(true);
      toast({ title: 'Avaliação enviada!', description: 'Obrigado pelo seu feedback.', className: 'bg-emerald-600 text-white border-none' });
      onSubmitReview?.(rating);
    } catch (err) {
      console.error('Review error:', err);
      toast({ title: 'Erro ao enviar avaliação', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Ruim', 'Regular', 'Boa', 'Ótima', 'Excelente'];

  return (
    <div className="space-y-6">
      {/* Header de sucesso */}
      <div className="text-center py-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Consulta Concluída!</h2>
        <p className="text-slate-500 mt-1">Sua consulta com <strong>{doctorName}</strong> foi encerrada.</p>
      </div>

      {/* Avaliação */}
      {!reviewSubmitted ? (
        <Card className="border-amber-100 bg-amber-50/30">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-800 mb-1">Como foi sua consulta?</h3>
            <p className="text-slate-500 text-sm mb-4">Sua avaliação ajuda outros pacientes a escolherem um médico.</p>

            <div className="flex flex-col items-center gap-3 mb-4">
              <StarRating value={rating} onChange={setRating} disabled={submitting} />
              {rating > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  {ratingLabels[rating]}
                </Badge>
              )}
            </div>

            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Deixe um comentário (opcional)..."
              className="resize-none border-slate-200 text-sm mb-4"
              rows={3}
            />

            <Button
              onClick={handleSubmitReview}
              disabled={rating === 0 || submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Enviar Avaliação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">Avaliação enviada!</p>
              <p className="text-emerald-600 text-sm">Obrigado pelo seu feedback.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Prontuário */}
        <Card className="border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
          <CardContent className="p-4">
            <Link to="/paciente/dashboard/historico" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">Prontuário</p>
                <p className="text-slate-500 text-xs">Prescrições e anotações</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Agendar retorno */}
        {doctorId && (
          <Card className="border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer">
            <CardContent className="p-4">
              <Link to={`/medico/${doctorId}`} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">Agendar Retorno</p>
                  <p className="text-slate-500 text-xs">Com o mesmo médico</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Comprovante */}
        <Card className="border-slate-200 hover:border-slate-300 transition-all cursor-pointer">
          <CardContent className="p-4">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Download className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-800 text-sm">Comprovante</p>
                <p className="text-slate-500 text-xs">Download em PDF</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        onClick={() => navigate('/paciente/dashboard')}
        className="w-full border-slate-200 text-slate-600 gap-2"
      >
        Voltar ao Dashboard <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ─── Seção do Médico ───
const DoctorPostConsulta = ({ appointment, nextAppointment }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState('');

  const patientName = appointment?.perfis_usuarios?.full_name || appointment?.guest_patients?.name || 'Paciente';

  // Countdown para próxima consulta
  useEffect(() => {
    if (!nextAppointment?.data_hora) return;
    const tick = () => {
      const nextTime = new Date(nextAppointment.data_hora);
      const secsLeft = differenceInSeconds(nextTime, new Date());
      if (secsLeft <= 0) {
        setCountdown('Agora!');
        return;
      }
      const mins = Math.floor(secsLeft / 60);
      const secs = secsLeft % 60;
      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        setCountdown(`${hrs}h ${mins % 60}min`);
      } else {
        setCountdown(`${mins}min ${secs.toString().padStart(2, '0')}s`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextAppointment]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Consulta Encerrada</h2>
        <p className="text-slate-500 mt-1">Consulta com <strong>{patientName}</strong> finalizada.</p>
      </div>

      {/* Próxima consulta */}
      {nextAppointment && (
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-800">Próxima Consulta</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 font-medium text-sm">
                  {nextAppointment.perfis_usuarios?.full_name || 'Paciente'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {format(new Date(nextAppointment.data_hora), "HH:mm 'h' — dd/MM", { locale: ptBR })}
                </p>
              </div>
              <Badge className={`font-mono text-sm px-3 py-1 ${
                countdown === 'Agora!' ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {countdown}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Prontuário do paciente */}
        <Card className="border-slate-200 hover:border-blue-200 transition-all cursor-pointer">
          <CardContent className="p-4">
            <Link to={`/dashboard/medico/pacientes/${appointment?.patient_id}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">Prontuário</p>
                <p className="text-slate-500 text-xs">Finalizar anotações</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Reagendar retorno */}
        <Card className="border-slate-200 hover:border-emerald-200 transition-all cursor-pointer">
          <CardContent className="p-4">
            <Link to="/medico/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">Reagendar</p>
                <p className="text-slate-500 text-xs">Propor retorno</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        onClick={() => navigate('/medico/dashboard')}
        className="w-full border-slate-200 text-slate-600 gap-2"
      >
        Voltar ao Dashboard <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

// ─── Página Principal ───
const ConsultaEncerradaPage = () => {
  const { appointmentId } = useParams();
  const { session, profile } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRole = profile?.role === 'medico' ? 'doctor' : 'patient';

  useEffect(() => {
    if (!appointmentId || !session) return;

    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('agendamentos')
          .select(`*, medicos:medico_id (id, name, public_name), perfis_usuarios:patient_id (id, full_name), guest_patients:guest_id (name)`)
          .eq('id', appointmentId)
          .single();

        setAppointment(data);

        // Buscar próxima consulta (só para médico)
        if (userRole === 'doctor' && data?.medico_id) {
          const { data: nextData } = await supabase
            .from('agendamentos')
            .select(`*, perfis_usuarios:patient_id (full_name)`)
            .eq('medico_id', data.medico_id)
            .gt('data_hora', new Date().toISOString())
            .in('status', ['confirmado', 'pendente'])
            .order('data_hora', { ascending: true })
            .limit(1)
            .maybeSingle();

          setNextAppointment(nextData);
        }
      } catch (err) {
        console.error('Error fetching appointment:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [appointmentId, session, userRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Consulta Encerrada — Click Teleconsulta</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Duração da consulta */}
          {appointment?.duracao_real_segundos && (
            <div className="text-center mb-4">
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1.5 px-4 py-1.5">
                <Clock className="w-3.5 h-3.5" />
                Duração: {Math.floor(appointment.duracao_real_segundos / 60)} minutos
              </Badge>
            </div>
          )}

          {userRole === 'patient' ? (
            <PatientPostConsulta appointment={appointment} />
          ) : (
            <DoctorPostConsulta appointment={appointment} nextAppointment={nextAppointment} />
          )}
        </div>
      </div>
    </>
  );
};

export default ConsultaEncerradaPage;
