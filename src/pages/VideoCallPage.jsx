import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import {
  Loader2, AlertTriangle, ArrowLeft, Mic, MicOff, Video, VideoOff,
  Monitor, MessageSquare, PhoneOff, Wifi, WifiOff,
  Maximize, Minimize, Clock, Bell, X, Send, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildJitsiRoomId } from '@/utils/jitsiRoomId';
import { openJitsiRoom } from '@/utils/telemedicineUtils';

// ─────────────────────────────────────────
// Sala de Espera — Componente
// ─────────────────────────────────────────
const WaitingRoom = ({ appointment, userRole, onEnterRoom, isEntering }) => {
  const doctorName = appointment?.medicos?.public_name || appointment?.medicos?.name || appointment?.medico_nome || 'Médico';
  const patientName = appointment?.perfis_usuarios?.full_name || appointment?.guest_patients?.name || 'Paciente';
  const consultaTime = appointment?.data_hora ? new Date(appointment.data_hora) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 mb-4">
            <Video className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sala de Teleconsulta</h1>
          <p className="text-slate-400 text-sm mt-1">Click Teleconsulta</p>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          {userRole === 'patient' ? (
            // ── Vista do Paciente ──
            <>
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center mx-auto">
                    <span className="text-3xl">👨‍⚕️</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-800" />
                </div>
                <p className="text-slate-300 text-sm">Consulta com</p>
                <h2 className="text-xl font-bold text-white mt-1">{doctorName}</h2>
                {consultaTime && (
                  <p className="text-slate-400 text-sm mt-2">
                    {format(consultaTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <div className="flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
                <div>
                  <p className="text-amber-300 text-sm font-medium">Aguardando o médico...</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">Você será notificado quando o médico entrar</p>
                </div>
              </div>

              <Button
                onClick={onEnterRoom}
                disabled={isEntering}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 rounded-xl gap-2 transition-all"
              >
                {isEntering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</>
                ) : (
                  <><Video className="w-4 h-4" /> Entrar na Sala de Espera</>
                )}
              </Button>
            </>
          ) : (
            // ── Vista do Médico ──
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🩺</span>
                </div>
                <h2 className="text-xl font-bold text-white">Pronto para atender?</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Paciente: <span className="text-white font-medium">{patientName}</span>
                </p>
                {consultaTime && (
                  <p className="text-slate-400 text-sm mt-1">
                    {format(consultaTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <p className="text-emerald-300 text-sm">Paciente aguardando na sala</p>
              </div>

              <Button
                onClick={onEnterRoom}
                disabled={isEntering}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-12 rounded-xl gap-2 transition-all"
              >
                {isEntering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Abrindo sala...</>
                ) : (
                  <><Video className="w-4 h-4" /> Iniciar Consulta com {patientName}</>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Dicas */}
        <div className="mt-4 text-center">
          <p className="text-slate-500 text-xs">
            💡 Certifique-se de que câmera e microfone estão liberados no navegador
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Chat Lateral — Componente
// ─────────────────────────────────────────
const SideChat = ({ onClose, appointmentId, userRole, userName }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'system', text: 'Chat da consulta iniciado. Mensagens visíveis apenas para médico e paciente.', time: new Date() }
  ]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: userRole,
      senderName: userName,
      text: newMsg.trim(),
      time: new Date()
    }]);
    setNewMsg('');
    // TODO: persist to Supabase realtime channel for cross-window communication
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700/50 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold text-sm">Chat da Consulta</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === userRole ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'system' ? (
              <div className="bg-slate-800/80 rounded-lg px-3 py-2 max-w-full">
                <p className="text-slate-400 text-xs text-center">{msg.text}</p>
              </div>
            ) : (
              <>
                <span className="text-slate-500 text-xs mb-1">{msg.senderName || msg.sender}</span>
                <div className={`rounded-2xl px-3 py-2 max-w-[85%] ${
                  msg.sender === userRole
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
                <span className="text-slate-600 text-[10px] mt-1">
                  {format(msg.time, 'HH:mm')}
                </span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 rounded-xl px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────
// Barra de Controles — Componente
// ─────────────────────────────────────────
const CallControls = ({
  isMuted, isVideoOff, isChatOpen, isFullscreen,
  onToggleMute, onToggleVideo, onToggleChat, onToggleFullscreen,
  onShareScreen, onEndCall, elapsedSeconds, appointmentEndTime,
  connectionQuality
}) => {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const minutesLeft = appointmentEndTime
    ? Math.max(0, Math.ceil(differenceInSeconds(new Date(appointmentEndTime), new Date()) / 60))
    : null;

  const QualityIcon = connectionQuality === 'good' ? Wifi
    : connectionQuality === 'fair' ? Wifi
    : connectionQuality === 'poor' ? Wifi
    : WifiOff;

  const qualityColor = connectionQuality === 'good' ? 'text-emerald-400'
    : connectionQuality === 'fair' ? 'text-amber-400'
    : 'text-red-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-6 flex justify-center pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-2xl px-6 py-4 shadow-2xl pointer-events-auto flex items-center gap-4">
        {/* Timer */}
        <div className="flex items-center gap-1.5 text-slate-300 mr-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="font-mono text-sm font-medium">{formatTime(elapsedSeconds)}</span>
          {minutesLeft !== null && minutesLeft <= 5 && minutesLeft > 0 && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs animate-pulse ml-1">
              {minutesLeft}min restantes
            </Badge>
          )}
        </div>

        {/* Separador */}
        <div className="w-px h-8 bg-slate-700" />

        {/* Mute */}
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
          title={isMuted ? 'Desativar mudo' : 'Ativar mudo'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isVideoOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
          title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Share Screen */}
        <button
          onClick={onShareScreen}
          className="w-12 h-12 rounded-full bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center transition-all"
          title="Compartilhar tela"
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Chat */}
        <button
          onClick={onToggleChat}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${
            isChatOpen
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="w-12 h-12 rounded-full bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center transition-all"
          title={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>

        {/* Separador */}
        <div className="w-px h-8 bg-slate-700" />

        {/* Connection quality */}
        <div className={`flex items-center gap-1 ${qualityColor}`} title={`Conexão: ${connectionQuality}`}>
          <QualityIcon className="w-4 h-4" />
        </div>

        {/* End Call */}
        <button
          onClick={onEndCall}
          className="w-14 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-900/30 ml-2"
          title="Encerrar chamada"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Alerta 5 minutos — Toast
// ─────────────────────────────────────────
const FiveMinuteAlert = ({ onDismiss }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
    <div className="bg-amber-500 text-white rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <Bell className="w-5 h-5 flex-shrink-0" />
      <div>
        <p className="font-semibold text-sm">⏰ Faltam 5 minutos</p>
        <p className="text-amber-100 text-xs">A consulta está próxima do fim</p>
      </div>
      <button onClick={onDismiss} className="ml-2 text-amber-200 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────
// VideoCallPage — Principal
// ─────────────────────────────────────────
const VideoCallPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointment, setAppointment] = useState(null);

  // UX State
  const [phase, setPhase] = useState('waiting'); // 'waiting' | 'in_call'
  const [isEntering, setIsEntering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFiveMinAlert, setShowFiveMinAlert] = useState(false);
  const [fiveMinAlertShown, setFiveMinAlertShown] = useState(false);

  const timerRef = useRef(null);
  const userRole = profile?.role === 'medico' ? 'doctor' : 'patient';
  const userName = profile?.full_name || (userRole === 'doctor' ? 'Médico' : 'Paciente');

  // Fetch appointment
  useEffect(() => {
    if (!session) {
      const timer = setTimeout(() => {
        if (!session) {
          setError('Você precisa estar logado para acessar esta consulta.');
          setLoading(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (!appointmentId) {
      setError('ID do agendamento não fornecido.');
      setLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        const { data, error } = await supabase
          .from('agendamentos')
          .select(`*, medicos:medico_id (id, name, public_name), perfis_usuarios:patient_id (id, full_name), guest_patients:guest_id (name)`)
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Agendamento não encontrado.');

        setAppointment(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointment:', err);
        setError('Erro ao carregar os dados da consulta.');
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [session, appointmentId, profile]);

  // Timer da chamada
  useEffect(() => {
    if (phase !== 'in_call') return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Alerta 5 minutos antes do fim
  useEffect(() => {
    if (!appointment?.data_hora || fiveMinAlertShown || phase !== 'in_call') return;
    const checkAlert = () => {
      const endTime = new Date(appointment.data_hora);
      const durMin = appointment.duracao_minutos || 30;
      endTime.setMinutes(endTime.getMinutes() + durMin);
      const secsLeft = differenceInSeconds(endTime, new Date());
      if (secsLeft > 0 && secsLeft <= 300) {
        setShowFiveMinAlert(true);
        setFiveMinAlertShown(true);
      }
    };
    const interval = setInterval(checkAlert, 15000);
    return () => clearInterval(interval);
  }, [appointment, fiveMinAlertShown, phase]);

  // Simular variação de qualidade de conexão
  useEffect(() => {
    if (phase !== 'in_call') return;
    const interval = setInterval(() => {
      const qualities = ['good', 'good', 'good', 'fair', 'good'];
      setConnectionQuality(qualities[Math.floor(Math.random() * qualities.length)]);
    }, 30000);
    return () => clearInterval(interval);
  }, [phase]);

  // Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Entrar na sala
  const handleEnterRoom = useCallback(async () => {
    setIsEntering(true);
    try {
      const roomName = appointment?.video_room || buildJitsiRoomId(appointmentId);
      const displayName = userRole === 'doctor'
        ? `Dr(a). ${appointment?.medicos?.public_name || appointment?.medicos?.name || 'Médico'}`
        : (profile?.full_name || 'Paciente');
      const isModerator = userRole === 'doctor';

      // Atualizar status_sala no Supabase
      await supabase.from('agendamentos').update({
        video_room: roomName,
        status_sala: isModerator ? 'medico_iniciou' : 'em_andamento',
        ...(isModerator ? { medico_iniciou_em: new Date().toISOString() } : { paciente_entrou_em: new Date().toISOString() })
      }).eq('id', appointmentId);

      // Log
      await supabase.from('agendamento_logs').insert({
        agendamento_id: appointmentId,
        actor_id: session?.user?.id,
        actor_role: userRole === 'doctor' ? 'medico' : 'paciente',
        action: isModerator ? 'doctor_started_consultation' : 'patient_entered_consultation',
        metadata: { timestamp: new Date().toISOString() }
      });

      const result = await openJitsiRoom(roomName, displayName, isModerator);

      if (!result.ok && result.error !== 'Popup bloqueado') {
        throw new Error(result.error);
      }

      setPhase('in_call');
    } catch (err) {
      console.error('Error entering room:', err);
    } finally {
      setIsEntering(false);
    }
  }, [appointment, appointmentId, userRole, profile, session]);

  // Encerrar chamada
  const handleEndCall = useCallback(async () => {
    clearInterval(timerRef.current);

    // Log encerramento
    try {
      await supabase.from('agendamento_logs').insert({
        agendamento_id: appointmentId,
        actor_id: session?.user?.id,
        actor_role: userRole === 'doctor' ? 'medico' : 'paciente',
        action: 'consultation_ended',
        metadata: { duration_seconds: elapsedSeconds, timestamp: new Date().toISOString() }
      });

      await supabase.from('agendamentos').update({
        status_sala: 'finalizado',
        duracao_real_segundos: elapsedSeconds
      }).eq('id', appointmentId);
    } catch (err) {
      console.error('Error logging end call:', err);
    }

    // Redirecionar para página de encerramento
    navigate(`/consulta/${appointmentId}/encerrada`);
  }, [appointmentId, session, userRole, elapsedSeconds, navigate]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Preparando ambiente seguro...</h2>
        <p className="text-slate-400 mt-2">Verificando credenciais e conexão.</p>
      </div>
    );
  }

  // ── Erro ──
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
              <p className="text-slate-400">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full bg-slate-700 hover:bg-slate-600 text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sala de Espera ──
  if (phase === 'waiting') {
    return (
      <>
        <Helmet><title>Sala de Espera — Click Teleconsulta</title></Helmet>
        <WaitingRoom
          appointment={appointment}
          userRole={userRole}
          onEnterRoom={handleEnterRoom}
          isEntering={isEntering}
        />
      </>
    );
  }

  // ── Em Chamada ──
  return (
    <>
      <Helmet><title>Teleconsulta em Andamento — Click Teleconsulta</title></Helmet>

      {showFiveMinAlert && (
        <FiveMinuteAlert onDismiss={() => setShowFiveMinAlert(false)} />
      )}

      {/* Background da sala */}
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        {/* Placeholder visual para o iframe JaaS aberto em nova aba */}
        <div className="text-center text-slate-500">
          <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Video className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-lg font-medium text-slate-400">Videochamada em andamento</p>
          <p className="text-sm text-slate-600 mt-1">A chamada foi aberta em outra aba do navegador</p>
          <button
            onClick={handleEnterRoom}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1 mx-auto"
          >
            Reabrir videochamada <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chat Lateral */}
      {isChatOpen && (
        <SideChat
          onClose={() => setIsChatOpen(false)}
          appointmentId={appointmentId}
          userRole={userRole}
          userName={userName}
        />
      )}

      {/* Barra de Controles */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isChatOpen={isChatOpen}
        isFullscreen={isFullscreen}
        onToggleMute={() => setIsMuted(m => !m)}
        onToggleVideo={() => setIsVideoOff(v => !v)}
        onToggleChat={() => setIsChatOpen(c => !c)}
        onToggleFullscreen={handleToggleFullscreen}
        onShareScreen={() => {}} // JaaS já tem share screen nativo
        onEndCall={handleEndCall}
        elapsedSeconds={elapsedSeconds}
        appointmentEndTime={appointment?.data_hora ? (() => {
          const d = new Date(appointment.data_hora);
          d.setMinutes(d.getMinutes() + (appointment.duracao_minutos || 30));
          return d;
        })() : null}
        connectionQuality={connectionQuality}
      />
    </>
  );
};

export default VideoCallPage;
