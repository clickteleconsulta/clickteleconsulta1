import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Clock, CheckCircle2, UserCheck, PlayCircle,
  WifiOff, Bell, Zap
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * TelemedicineStatusIndicator — Status em tempo real via Supabase Realtime
 * Referência: Conexa Saúde (status em tempo real)
 *
 * Estados:
 *   waiting_doctor    — Aguardando médico entrar
 *   waiting_patient   — Médico entrou, aguardando paciente
 *   medico_iniciou    — Médico iniciou (alias de waiting_patient)
 *   em_andamento      — Consulta em progresso
 *   finalizado        — Consulta encerrada
 *   reconnecting      — Perdeu conexão, tentando reconectar
 *
 * Props:
 *   appointmentId {string} — ID do agendamento
 *   userRole {string}      — 'paciente' | 'medico'
 *   onDoctorEntered {fn}   — callback quando médico entrar (para paciente)
 *   onPatientEntered {fn}  — callback quando paciente entrar (para médico)
 *   compact {boolean}      — modo compacto (só badge)
 */

const HEARTBEAT_INTERVAL = 30000; // 30s
const RECONNECT_DELAY = 5000;     // 5s

const TelemedicineStatusIndicator = ({
  appointmentId,
  userRole = 'paciente',
  onDoctorEntered,
  onPatientEntered,
  compact = false
}) => {
  const [statusSala, setStatusSala] = useState('pendente');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [pulseDoctor, setPulseDoctor] = useState(false);
  const [pulsePatient, setPulsePatient] = useState(false);

  const channelRef = useRef(null);
  const heartbeatRef = useRef(null);
  const prevStatusRef = useRef('pendente');

  // ── Buscar estado inicial ──
  const fetchStatus = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('status_sala, medico_iniciou_em, paciente_entrou_em, updated_at')
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      if (data) {
        setStatusSala(data.status_sala || 'pendente');
        prevStatusRef.current = data.status_sala || 'pendente';
      }
    } catch (err) {
      console.error('TelemedicineStatusIndicator: fetchStatus error', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  // ── Heartbeat a cada 30s para detectar conexão perdida ──
  const startHeartbeat = useCallback(() => {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(async () => {
      if (!appointmentId) return;
      try {
        const { data } = await supabase
          .from('agendamentos')
          .select('status_sala')
          .eq('id', appointmentId)
          .single();

        setLastHeartbeat(new Date());
        setIsOnline(true);
        if (data?.status_sala && data.status_sala !== prevStatusRef.current) {
          setStatusSala(data.status_sala);
          prevStatusRef.current = data.status_sala;
        }
      } catch {
        setIsOnline(false);
      }
    }, HEARTBEAT_INTERVAL);
  }, [appointmentId]);

  // ── Supabase Realtime subscription ──
  const setupRealtime = useCallback(() => {
    if (!appointmentId) return;

    // Limpar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`telemed-status-${appointmentId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agendamentos',
          filter: `id=eq.${appointmentId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status_sala;
          if (!newStatus) return;

          const prevStatus = prevStatusRef.current;
          setStatusSala(newStatus);
          prevStatusRef.current = newStatus;
          setLastHeartbeat(new Date());
          setIsOnline(true);

          // Callbacks de transição de estado
          if (userRole === 'paciente' && newStatus === 'medico_iniciou' && prevStatus !== 'medico_iniciou') {
            setPulseDoctor(true);
            setTimeout(() => setPulseDoctor(false), 5000);
            onDoctorEntered?.();
          }

          if (userRole === 'medico' && (newStatus === 'em_andamento' || newStatus === 'waiting_patient') && prevStatus === 'medico_iniciou') {
            setPulsePatient(true);
            setTimeout(() => setPulsePatient(false), 5000);
            onPatientEntered?.();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setReconnecting(false);
          setIsOnline(true);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsOnline(false);
          setReconnecting(true);
          // Tentar reconectar
          setTimeout(() => {
            setupRealtime();
          }, RECONNECT_DELAY);
        }
      });

    channelRef.current = channel;
  }, [appointmentId, userRole, onDoctorEntered, onPatientEntered]);

  useEffect(() => {
    if (!appointmentId) return;
    fetchStatus();
    setupRealtime();
    startHeartbeat();

    // Detectar reconexão de rede
    const handleOnline = () => {
      setIsOnline(true);
      setReconnecting(false);
      fetchStatus();
      setupRealtime();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(heartbeatRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [appointmentId, fetchStatus, setupRealtime, startHeartbeat]);

  // ── Configuração visual por status ──
  const getStatusConfig = (status) => {
    switch (status) {
      case 'medico_iniciou':
        return {
          label: 'Médico na Sala',
          description: userRole === 'paciente' ? 'Médico aguardando você' : 'Aguardando paciente',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: <PlayCircle className="w-3 h-3 mr-1.5" />,
          pulse: userRole === 'paciente' && pulseDoctor,
          cta: userRole === 'paciente' ? 'Entrar agora' : null
        };
      case 'waiting_patient':
        return {
          label: 'Aguardando Paciente',
          description: 'Médico pronto para atender',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: <UserCheck className="w-3 h-3 mr-1.5" />,
          pulse: userRole === 'paciente' && pulseDoctor,
          cta: userRole === 'paciente' ? 'Entrar agora' : null
        };
      case 'em_andamento':
        return {
          label: 'Em Andamento',
          description: 'Consulta em progresso',
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
          icon: <UserCheck className="w-3 h-3 mr-1.5" />,
          pulse: userRole === 'medico' && pulsePatient,
          cta: null
        };
      case 'finalizado':
        return {
          label: 'Finalizado',
          description: 'Consulta encerrada',
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          dotColor: 'bg-gray-400',
          icon: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
          pulse: false,
          cta: null
        };
      default:
        return {
          label: 'Aguardando Início',
          description: 'Sala ainda não aberta',
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: <Clock className="w-3 h-3 mr-1.5" />,
          pulse: false,
          cta: null
        };
    }
  };

  const config = getStatusConfig(statusSala);

  // ── Modo compacto — só o badge ──
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {reconnecting || !isOnline ? (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 flex items-center gap-1 px-2 py-0.5">
            <WifiOff className="w-3 h-3" />
            <span className="text-xs">Reconectando...</span>
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={`${config.color} flex items-center px-2.5 py-1 shadow-sm ${config.pulse ? 'animate-pulse ring-2 ring-blue-400 ring-offset-1' : ''}`}
          >
            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mr-1.5 ${config.pulse ? 'animate-ping' : ''}`} />
                {config.icon}
                <span className="text-xs font-medium">{config.label}</span>
              </>
            )}
          </Badge>
        )}
      </div>
    );
  }

  // ── Modo expandido ──
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Status da Sala:</span>

        {!isOnline || reconnecting ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 flex items-center gap-1.5 px-3 py-1">
              <WifiOff className="w-3 h-3" />
              Reconectando...
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { fetchStatus(); setupRealtime(); }}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Tentar
            </Button>
          </div>
        ) : (
          <Badge
            variant="outline"
            className={`${config.color} flex items-center gap-1 px-3 py-1 shadow-sm transition-all ${
              config.pulse ? 'animate-pulse ring-2 ring-blue-400/50 ring-offset-1' : ''
            }`}
          >
            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span className={`w-2 h-2 rounded-full ${config.dotColor} ${config.pulse ? 'animate-ping' : ''}`} />
                {config.icon}
                {config.label}
              </>
            )}
          </Badge>
        )}
      </div>

      {/* CTA para paciente quando médico entrou */}
      {config.pulse && userRole === 'paciente' && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 animate-in slide-in-from-top-1">
          <Bell className="w-4 h-4 text-blue-500 animate-bounce" />
          <p className="text-blue-700 text-sm font-medium">O médico entrou na sala! Clique em "Acessar videochamada" para entrar.</p>
        </div>
      )}

      {/* Notificação para médico quando paciente entrou */}
      {config.pulse && userRole === 'medico' && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 animate-in slide-in-from-top-1">
          <Zap className="w-4 h-4 text-emerald-500" />
          <p className="text-emerald-700 text-sm font-medium">Paciente entrou na sala!</p>
        </div>
      )}

      {/* Timestamp do último heartbeat */}
      {lastHeartbeat && !compact && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Atualizado {format(lastHeartbeat, 'HH:mm:ss', { locale: ptBR })}
        </p>
      )}
    </div>
  );
};

export default TelemedicineStatusIndicator;
