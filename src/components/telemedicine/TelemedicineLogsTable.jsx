import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  History, Laptop, Globe, User, Download, RefreshCw,
  CheckCircle2, LogIn, LogOut, FileText, AlertCircle, Clock, Filter
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * TelemedicineLogsTable — Auditoria de logs de teleconsulta
 * Referência: CFM 2.314/2022 + LGPD (logs obrigatórios)
 *
 * Funcionalidades:
 * - Logs por consulta (appointmentId) ou todas as consultas (admin)
 * - Tipos de log: entrada/saída médico, entrada/saída paciente, TCLE, encerramento
 * - Exportar CSV para auditoria CFM
 * - Médico vê só suas consultas | Admin vê todas
 *
 * Props:
 *   appointmentId {string}   — filtra por consulta específica (opcional)
 *   adminMode {boolean}      — admin vê todas as consultas
 *   showExport {boolean}     — exibir botão de exportação CSV
 *   maxRows {number}         — limite de registros (default 50)
 */

const LOG_ACTIONS = {
  doctor_started_consultation: {
    label: 'Médico Iniciou Atendimento',
    icon: <LogIn className="w-3 h-3" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  patient_entered_consultation: {
    label: 'Paciente Entrou na Sala',
    icon: <LogIn className="w-3 h-3" />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  tcle_accepted: {
    label: 'TCLE Aceito pelo Paciente',
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  consultation_ended: {
    label: 'Consulta Encerrada',
    icon: <LogOut className="w-3 h-3" />,
    color: 'bg-gray-100 text-gray-600 border-gray-200'
  },
  patient_left: {
    label: 'Paciente Saiu da Sala',
    icon: <LogOut className="w-3 h-3" />,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  doctor_left: {
    label: 'Médico Saiu da Sala',
    icon: <LogOut className="w-3 h-3" />,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  consent_registered: {
    label: 'Consentimento Registrado',
    icon: <FileText className="w-3 h-3" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
};

// ── Exportar CSV ──
const exportToCSV = (logs, filename = 'logs-teleconsulta') => {
  const headers = ['ID', 'Agendamento', 'Ação', 'Ator', 'Role', 'Data/Hora', 'IP', 'User Agent', 'Duração (s)'];
  const rows = logs.map(log => [
    log.id,
    log.agendamento_id,
    LOG_ACTIONS[log.action]?.label || log.action,
    log.actor_id || '',
    log.actor_role || '',
    format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
    log.metadata?.ip || log.metadata?.ip_address || '',
    (log.metadata?.userAgent || log.metadata?.user_agent || '').substring(0, 100),
    log.metadata?.duration_seconds || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// ── Linha de log ──
const LogRow = ({ log }) => {
  const config = LOG_ACTIONS[log.action] || {
    label: log.action,
    icon: <AlertCircle className="w-3 h-3" />,
    color: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const durationSecs = log.metadata?.duration_seconds;

  return (
    <TableRow className="h-10 text-xs hover:bg-slate-50/50">
      <TableCell>
        <Badge variant="outline" className={`${config.color} flex items-center gap-1 w-fit px-2 py-0.5 text-[11px] whitespace-nowrap`}>
          {config.icon}
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="text-slate-600 font-medium whitespace-nowrap">
        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-slate-400" />
          <span className="text-slate-600 capitalize">{log.actor_role || '—'}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-[10px]">
        <div className="flex flex-col gap-0.5 max-w-[200px]">
          {(log.metadata?.ip || log.metadata?.ip_address) && (
            <span className="flex items-center gap-1 truncate">
              <Globe className="w-2.5 h-2.5 flex-shrink-0" />
              {log.metadata.ip || log.metadata.ip_address}
            </span>
          )}
          {durationSecs && (
            <span className="flex items-center gap-1 text-emerald-600">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              {Math.floor(durationSecs / 60)}min {durationSecs % 60}s
            </span>
          )}
          {(log.metadata?.userAgent || log.metadata?.user_agent) && (
            <span className="flex items-center gap-1 truncate text-slate-400">
              <Laptop className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate max-w-[160px]">
                {(log.metadata.userAgent || log.metadata.user_agent || '').substring(0, 60)}
              </span>
            </span>
          )}
          {!log.metadata?.ip && !log.metadata?.ip_address && !durationSecs && !log.metadata?.userAgent && !log.metadata?.user_agent && (
            <span className="text-slate-300">—</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

const TelemedicineLogsTable = ({
  appointmentId,
  adminMode = false,
  showExport = false,
  maxRows = 50
}) => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [stats, setStats] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('agendamento_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(maxRows);

      // Filtrar por consulta específica se fornecido
      if (appointmentId) {
        query = query.eq('agendamento_id', appointmentId);
      }

      // Médico: filtrar apenas suas consultas (via join ou subquery)
      // Admin: ver tudo (sem filtro adicional)
      if (!adminMode && profile?.role === 'medico') {
        // Buscar IDs de agendamentos do médico
        const { data: medsData } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('medico_id', profile.medico_id || profile.id);

        if (medsData?.length) {
          const ids = medsData.map(m => m.id);
          query = query.in('agendamento_id', ids);
        }
      }

      // Filtrar por tipo de ação
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);

      // Calcular estatísticas se by appointment
      if (appointmentId && data) {
        const entradaMedico = data.find(l => l.action === 'doctor_started_consultation');
        const encerramento = data.find(l => l.action === 'consultation_ended');
        const tcle = data.find(l => l.action === 'tcle_accepted');
        setStats({
          totalEvents: data.length,
          tcleAccepted: !!tcle,
          tcleTime: tcle?.created_at,
          doctorEnteredAt: entradaMedico?.created_at,
          endedAt: encerramento?.created_at,
          duration: encerramento?.metadata?.duration_seconds
        });
      }
    } catch (err) {
      console.error('TelemedicineLogsTable: fetchLogs error', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, adminMode, profile, filterAction, maxRows]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (logs.length === 0 && !loading) {
    return (
      <Card className="mt-6 border-muted bg-muted/5">
        <CardContent className="p-8 text-center text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum evento registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  // Logs filtrados para display
  const displayLogs = filterAction === 'all'
    ? logs
    : logs.filter(l => l.action === filterAction);

  return (
    <Card className="mt-6 border-muted bg-muted/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <History className="w-4 h-4" />
              Registro de Auditoria (CFM 2.314/2022)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {logs.length} evento{logs.length !== 1 ? 's' : ''} registrado{logs.length !== 1 ? 's' : ''}
              {stats && ` • TCLE: ${stats.tcleAccepted ? '✅' : '⏳'}`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro rápido */}
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="text-xs bg-background border border-muted rounded px-2 py-1 text-muted-foreground focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="tcle_accepted">TCLE</option>
                <option value="doctor_started_consultation">Entrada Médico</option>
                <option value="patient_entered_consultation">Entrada Paciente</option>
                <option value="consultation_ended">Encerramento</option>
              </select>
            </div>

            {/* Refresh */}
            <Button variant="ghost" size="sm" onClick={fetchLogs} className="h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>

            {/* Export CSV */}
            {(showExport || adminMode || profile?.role === 'admin') && logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(logs, `logs-consulta-${appointmentId || 'todas'}`)}
                className="h-7 text-xs gap-1 border-muted"
              >
                <Download className="w-3 h-3" />
                CSV
              </Button>
            )}
          </div>
        </div>

        {/* Stats rápidas */}
        {stats && (
          <div className="flex flex-wrap gap-2 mt-2">
            {stats.tcleAccepted && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                TCLE registrado
              </Badge>
            )}
            {stats.duration && (
              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                <Clock className="w-2.5 h-2.5 mr-1" />
                Duração real: {Math.floor(stats.duration / 60)}min
              </Badge>
            )}
            {stats.totalEvents && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                {stats.totalEvents} eventos
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-b-md border-t bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-8 hover:bg-transparent bg-muted/30">
                <TableHead className="w-[240px] text-xs font-semibold">Evento</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Data/Hora</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold">Ator</TableHead>
                <TableHead className="text-xs font-semibold">Detalhes Técnicos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLogs.map(log => (
                <LogRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        </div>

        {displayLogs.length === 0 && filterAction !== 'all' && (
          <div className="p-6 text-center text-slate-400 text-sm">
            Nenhum evento do tipo selecionado.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelemedicineLogsTable;
