import React, { useMemo, useState, useEffect } from 'react';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Video, PlusCircle, CheckCircle2, AlertTriangle, XCircle, MousePointerClick, ExternalLink, Copy, FileText, Lock, Phone, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { useJitsiRoom } from '@/hooks/useJitsiRoom';
import PatientTelemedicineButton from '@/components/telemedicine/PatientTelemedicineButton';
import { FEATURES } from '@/config/features';
import { supabase } from '@/lib/customSupabaseClient';

// Regras de cancelamento do paciente:
// - Não pagas (pendente): pode cancelar a qualquer momento.
// - Pagas: pode cancelar a qualquer momento antes do horário (≥2h = 100%, <2h = 50%).
//   Após o horário não é possível cancelar (não comparecimento = sem reembolso).
// - Já atendidas: não pode cancelar.
const canPatientCancel = (appt) => {
    if (['atendido', 'concluida', 'realizado', 'cancelado', 'expirado'].includes(appt.status)) return false;
    if (appt.pagamento_status !== 'pago') return true;
    const hoursUntil = (new Date(appt.horario_inicio).getTime() - Date.now()) / 3600000;
    return hoursUntil > 0;
};

const PatientConsultations = () => {
    const { appointments, loading, refetchAppointments } = useAppointments();
    const { toast } = useToast();
    const navigate = useNavigate();

    // Recarrega a lista sempre que a página é aberta (evita lista desatualizada)
    useEffect(() => {
        refetchAppointments?.();
    }, [refetchAppointments]);

    // Integrate Jitsi Hook for blocked room handling only
    const { generateRoomInfo } = useJitsiRoom();
    const [blockedRoom, setBlockedRoom] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const confirmCancel = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        try {
            const { data, error } = await supabase.rpc('paciente_cancelar_agendamento', { p_agendamento_id: cancelTarget.id });
            if (error) throw error;
            if (data?.success === false) {
                toast({ variant: 'destructive', title: 'Não foi possível cancelar', description: data.message });
            } else {
                toast({ title: 'Consulta cancelada', description: data?.message || 'Cancelamento realizado.', variant: 'success' });
                setCancelTarget(null);
                refetchAppointments?.();
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao cancelar', description: err.message });
        } finally {
            setIsCancelling(false);
        }
    };
    
    const upcomingAppointments = useMemo(() => appointments
        .filter(appt => ['confirmado', 'reagendado', 'pendente', 'agendado'].includes(appt.status))
        .sort((a, b) => new Date(a.horario_inicio) - new Date(b.horario_inicio)), [appointments]);

    const pastAppointments = useMemo(() => appointments
        .filter(appt => !['confirmado', 'reagendado', 'pendente', 'agendado'].includes(appt.status))
        .sort((a, b) => new Date(b.horario_inicio) - new Date(a.horario_inicio)), [appointments]);

    const getCallAccessibility = (scheduledTime, callOpenMinutesAfter = 30) => {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const minutesUntil = (scheduled.getTime() - now.getTime()) / (1000 * 60);
        const minutesAfter = (now.getTime() - scheduled.getTime()) / (1000 * 60);
        
        // Allowed if within 60 mins before AND within allowable time after
        const isAccessible = minutesUntil <= 60 && minutesAfter <= callOpenMinutesAfter;
        const isTooEarly = minutesUntil > 60;
        const isExpired = minutesAfter > callOpenMinutesAfter;
        
        return { isAccessible, isTooEarly, isExpired, minutesUntil: Math.ceil(minutesUntil) };
    };

    const copyFallbackInfo = () => {
        if(!blockedRoom) return;
        navigator.clipboard.writeText(`${blockedRoom.url}\nSenha: ${blockedRoom.password}`);
        toast({ title: "Copiado!", description: "Link e senha copiados para a área de transferência." });
    };

    const formatBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const apptValue = (appt) => appt.price_in_cents ? appt.price_in_cents / 100 : (Number(appt.preco) || 0);

    // Comprovante de pagamento (gerado no navegador, imprimível/salvável em PDF).
    const openReceipt = (appt) => {
        const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
        const medico = appt.medicos?.public_name || appt.medicos?.name || 'Profissional';
        const dataConsulta = new Date(appt.horario_inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' });
        const pago = appt.pagamento_status === 'pago' || appt.pagamento_status === 'reembolsado';
        const dataPag = appt.pagamento_confirmado_em ? new Date(appt.pagamento_confirmado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' }) : '—';
        const estornado = appt.pagamento_status === 'reembolsado';
        const linhas = [
            ['Protocolo', esc(appt.guias?.protocolo || appt.protocolo || appt.id)],
            ['Profissional', esc(medico)],
            ['Especialidade', esc(appt.medicos?.specialty || 'Médico')],
            ['Data da consulta', esc(dataConsulta)],
            ['Valor', formatBRL(apptValue(appt))],
            ['Forma de pagamento', 'Asaas (Pix / cartão)'],
            ['Data do pagamento', esc(dataPag)],
            ['ID da transação', esc(appt.checkout_session_id || '—')],
            ['Situação', estornado ? 'Estornada (valor devolvido)' : (pago ? 'Pagamento confirmado' : 'Pendente')],
        ];
        if (estornado && appt.valor_estornado != null) {
            const de = appt.estornado_em ? new Date(appt.estornado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' }) : '—';
            linhas.push(['Valor estornado', `${formatBRL(appt.valor_estornado)} em ${esc(de)}`]);
        }
        const rows = linhas.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join('');
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comprovante ${esc(appt.id)}</title>
        <style>
          *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1e293b;margin:0;padding:40px;background:#fff}
          .wrap{max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
          .head{background:#2563eb;color:#fff;padding:24px 28px}
          .head h1{margin:0;font-size:20px;font-weight:700} .head p{margin:4px 0 0;font-size:13px;opacity:.9}
          .body{padding:24px 28px}
          .tag{display:inline-block;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:16px}
          .ok{background:#dbeafe;color:#1d4ed8} .rf{background:#ede9fe;color:#6d28d9}
          table{width:100%;border-collapse:collapse;font-size:14px} td{padding:10px 0;border-bottom:1px solid #f1f5f9;vertical-align:top}
          td.k{color:#64748b;width:42%} td.v{font-weight:600;text-align:right}
          .foot{padding:18px 28px;background:#f8fafc;font-size:11px;color:#94a3b8;line-height:1.5}
          @media print{body{padding:0} .wrap{border:none}}
        </style></head><body>
          <div class="wrap">
            <div class="head"><h1>Comprovante de Pagamento</h1><p>Click Teleconsulta Online LTDA — CNPJ 68.171.336/0001-50</p></div>
            <div class="body">
              <span class="tag ${estornado ? 'rf' : 'ok'}">${estornado ? 'Estornada' : 'Pagamento confirmado'}</span>
              <table><tbody>${rows}</tbody></table>
            </div>
            <div class="foot">Documento gerado eletronicamente pela plataforma Click Teleconsulta. O pagamento é processado pela Asaas (IP Pagamentos). Este comprovante não é documento fiscal. Emitido em ${esc(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}.</div>
          </div>
          <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
        </body></html>`;
        const w = window.open('', '_blank');
        if (!w) { toast({ variant: 'destructive', title: 'Pop-up bloqueado', description: 'Permita pop-ups para abrir o comprovante.' }); return; }
        w.document.write(html);
        w.document.close();
    };

    const StatusInfo = ({ status, paymentStatus }) => {
        let variant = 'default';
        let text = 'Confirmada';
        let icon = <CheckCircle2 className="w-3 h-3 mr-1.5" />;
        let className = "";
    
        if (paymentStatus === 'reembolsado') {
            // Estornada tem prioridade: informa que houve devolução do valor.
            variant = 'custom';
            className = "bg-violet-100 text-violet-700 border-violet-200";
            text = 'Estornada';
            icon = <RotateCcw className="w-3 h-3 mr-1.5" />;
        } else if (status === 'confirmado' || status === 'reagendado' || status === 'pendente' || status === 'agendado') {
            if (paymentStatus === 'pago') {
                variant = 'custom';
                className = "bg-blue-600 hover:bg-blue-700 text-white border-transparent"; // Blue for paid
                text = 'Confirmada e Paga';
            } else {
                variant = 'amber';
                text = 'Aguardando Pagamento';
                icon = <AlertTriangle className="w-3 h-3 mr-1.5" />;
            }
        } else if (status === 'atendido' || status === 'concluida' || status === 'realizado') {
            variant = 'success';
            text = 'Realizada';
        } else if (status === 'expirado') {
            variant = 'destructive';
            text = 'Expirada';
            icon = <XCircle className="w-3 h-3 mr-1.5" />;
        } else {
            variant = 'destructive';
            text = 'Cancelada';
            icon = <XCircle className="w-3 h-3 mr-1.5" />;
        }
    
        return (
            <Badge variant={variant} className={`mb-2 sm:mb-0 h-7 flex items-center justify-center ${className}`}>
                {icon}
                {text}
            </Badge>
        );
    };

    const rowVariants = {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: -20 },
    };

    const AppointmentList = ({ appointmentsList }) => {
        if (appointmentsList.length === 0) {
            return (
                <div className="text-center py-8 border-2 border-dashed rounded-lg mt-4">
                    <p className="text-muted-foreground mb-4">Nenhuma consulta encontrada nesta categoria.</p>
                    <Button asChild><Link to="/paciente/dashboard/agendar"><PlusCircle className="w-4 h-4 mr-2"/> Agendar nova consulta</Link></Button>
                </div>
            );
        }

        return (
            <ul className="space-y-4 mt-4">
                 <AnimatePresence>
                    {appointmentsList.map(appt => {
                        const callAccess = getCallAccessibility(appt.horario_inicio, appt.call_open_minutes_after);
                        const isUpcoming = ['confirmado', 'reagendado', 'pendente', 'agendado'].includes(appt.status);
                        
                        // Check status sala for "Waiting doctor" message
                        const doctorStarted = appt.status_sala === 'medico_iniciou';
                        
                        // Pass callback to refresh local data if consent changes
                        const handleConsentChange = (isAccepted) => {
                             // Optional: trigger a refetch if needed globally, though button handles its own state mostly
                             // fetchAppointments(); 
                        };

                        return (
                            <motion.li 
                                key={appt.id} 
                                layout
                                variants={rowVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="p-5 border rounded-lg shadow-sm bg-white hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex-1 cursor-pointer" onClick={() => navigate('/agendamento/confirmado', { state: { appointmentId: appt.id } })}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-lg text-gray-900">
                                                {appt.medicos?.public_name || appt.medicos?.name}
                                            </p>
                                            {doctorStarted && isUpcoming && (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] animate-pulse">
                                                    Ao vivo
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium mb-3">{appt.medicos?.specialty}</p>
                                        
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                                <Calendar size={14} className="text-primary"/> 
                                                {new Date(appt.horario_inicio).toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'})}
                                            </span>
                                            <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                                <Clock size={14} className="text-primary"/> 
                                                {new Date(appt.horario_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                                            </span>
                                        </div>
                                        {isUpcoming && appt.pagamento_status === 'pago' && (
                                            <p className="mt-3 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-md p-2 leading-relaxed">
                                                O médico entrará em contato <strong>até 15 minutos antes</strong> para enviar o link da consulta. Fique atento ao seu <strong>WhatsApp</strong> e <strong>e-mail</strong>.
                                            </p>
                                        )}
                                        {appt.pagamento_status === 'pago' && appt.medicos?.phone_number && (
                                            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-700">
                                                <Phone size={14} className="text-primary" /> Contato do médico: <strong>{appt.medicos.phone_number}</strong>
                                            </p>
                                        )}
                                        {appt.pagamento_status === 'reembolsado' && (
                                            <p className="mt-2 flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-md p-2">
                                                <RotateCcw size={13} className="text-violet-500 shrink-0" />
                                                Valor devolvido{appt.valor_estornado != null && <>: <strong>{formatBRL(appt.valor_estornado)}</strong></>}
                                                {appt.estornado_em && ` em ${new Date(appt.estornado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}. O prazo para aparecer na fatura/conta depende da instituição.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                                       <div className="flex flex-wrap justify-end gap-2 w-full">
                                            {/* Badge */}
                                            <StatusInfo status={appt.status} paymentStatus={appt.pagamento_status} />
                                       </div>
                                        
                                        {/* Action Button: PatientTelemedicineButton now handles logic */}
                                        {FEATURES.VIDEO_CALL && isUpcoming && (
                                            <div className="w-full sm:w-auto">
                                                {callAccess.isAccessible ? (
                                                    <PatientTelemedicineButton 
                                                        appointment={appt} 
                                                        onConsentStatusChange={handleConsentChange}
                                                    />
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="w-full sm:w-auto">
                                                                <Button 
                                                                    disabled 
                                                                    className="w-full sm:w-[200px] bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                                                >
                                                                    <Lock size={16} className="mr-2"/>
                                                                    Acessar videochamada
                                                                </Button>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                                                            <p className="text-xs flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                                                {callAccess.isTooEarly 
                                                                    ? `Disponível em ${callAccess.minutesUntil}min` 
                                                                    : "Expirado"}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}

                                        {/* Cancelar consulta — regras: pendente sempre; pago só até 3h antes; atendido nunca */}
                                        {isUpcoming && !['atendido', 'concluida', 'realizado'].includes(appt.status) && (
                                            canPatientCancel(appt) ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCancelTarget(appt)}
                                                    className="w-full sm:w-[200px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" /> Cancelar consulta
                                                </Button>
                                            ) : (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="w-full sm:w-auto">
                                                            <Button disabled size="sm" className="w-full sm:w-[200px] bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed rounded-lg">
                                                                <Lock className="w-4 h-4 mr-2" /> Cancelar consulta
                                                            </Button>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700 max-w-[240px]">
                                                        <p className="text-xs">O horário já passou. Não é possível cancelar; em caso de não comparecimento, não há reembolso.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        )}

                                        {/* Comprovante de pagamento — disponível para consultas pagas ou estornadas */}
                                        {(appt.pagamento_status === 'pago' || appt.pagamento_status === 'reembolsado') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openReceipt(appt)}
                                                className="w-full sm:w-[200px] text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg"
                                            >
                                                <FileText className="w-4 h-4 mr-2" /> Comprovante
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </motion.li>
                        );
                    })}
                 </AnimatePresence>
            </ul>
        );
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-bold text-gray-800">Minhas Consultas</CardTitle>
                <CardDescription>Gerencie seus agendamentos, realize pagamentos e acesse suas teleconsultas.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div> : (
                    <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
                            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upcoming" className="mt-0">
                            <AppointmentList appointmentsList={upcomingAppointments} />
                        </TabsContent>
                        <TabsContent value="history" className="mt-0">
                            <AppointmentList appointmentsList={pastAppointments} />
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
            
            {/* Popup Fallback Dialog */}
            <Dialog open={!!blockedRoom} onOpenChange={(open) => !open && setBlockedRoom(null)}>
                <DialogContent className="sm:max-w-md rounded-xl shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="w-5 h-5" />
                            Janela Bloqueada
                        </DialogTitle>
                        <DialogDescription>
                            O navegador bloqueou a abertura automática da videochamada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-600">
                            Utilize o botão abaixo para abrir a sala manualmente ou copie os dados de acesso.
                        </p>
                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10" 
                            onClick={() => blockedRoom && window.open(blockedRoom.url, '_blank')}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Clique aqui para abrir manualmente
                        </Button>
                        
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                            <Button variant="outline" className="w-full text-xs" onClick={copyFallbackInfo}>
                                <Copy className="w-3 h-3 mr-2" />
                                Copiar Link e Senha
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setBlockedRoom(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmação de cancelamento */}
            <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
                <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" /> Cancelar consulta
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    {cancelTarget && (() => {
                        const hoursUntil = (new Date(cancelTarget.horario_inicio).getTime() - Date.now()) / 3600000;
                        const isPaid = cancelTarget.pagamento_status === 'pago';
                        const fullRefund = isPaid && hoursUntil >= 2;
                        const partialRefund = isPaid && hoursUntil > 0 && hoursUntil < 2;
                        return (
                            <div className="py-2 text-sm">
                                <p className="text-gray-700">
                                    <strong>{cancelTarget.medicos?.public_name || cancelTarget.medicos?.name}</strong> —{' '}
                                    {new Date(cancelTarget.horario_inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                                {isPaid ? (
                                    fullRefund ? (
                                        <p className="mt-2 rounded-md p-2 border bg-green-50 border-green-100 text-green-800 text-xs">
                                            Cancelando com <strong>2h ou mais de antecedência</strong>, você recebe <strong>reembolso integral (100%)</strong>, descontada apenas a taxa de processamento do pagamento.
                                        </p>
                                    ) : partialRefund ? (
                                        <p className="mt-2 rounded-md p-2 border bg-amber-50 border-amber-100 text-amber-800 text-xs">
                                            Faltam <strong>menos de 2 horas</strong> para a consulta: o reembolso será de <strong>50% do valor pago</strong> (os outros 50% ficam retidos como taxa por cancelamento tardio).
                                        </p>
                                    ) : (
                                        <p className="mt-2 rounded-md p-2 border bg-red-50 border-red-100 text-red-800 text-xs">
                                            O horário já passou — não há reembolso.
                                        </p>
                                    )
                                ) : (
                                    <p className="mt-2 rounded-md p-2 border bg-gray-50 border-gray-100 text-gray-600 text-xs">
                                        Agendamento não pago — cancelamento sem custo.
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={isCancelling}>Voltar</Button>
                        <Button variant="destructive" onClick={confirmCancel} disabled={isCancelling}>
                            {isCancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirmar cancelamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default PatientConsultations;