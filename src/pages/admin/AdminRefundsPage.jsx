import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, RefreshCcw, RotateCcw, CheckCircle2, AlertTriangle, FileDown, ScrollText, User, Stethoscope } from 'lucide-react';
import { downloadCsv, brNumber, csvDateSuffix } from '@/lib/exportCsv';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const safeDate = (v, p = 'dd/MM/yyyy') => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : format(d, p); };

// Reembolso conforme a política, gravado no cancelamento. Sem valor → 100% (a confirmar).
const refundPct = (a) => (a.refund_percent != null ? a.refund_percent : 100);
// Estimativa (bruta) para pendentes — o valor REAL só é conhecido após o estorno.
const estimatedRefund = (a) => ((a.price_in_cents || 0) / 100) * (refundPct(a) / 100);

// Rótulos amigáveis das ações registradas na trilha imutável (agendamento_logs).
const ACAO_LABEL = {
    paciente_cancelou_agendamento: 'Cancelamento pelo paciente',
    medico_cancelou_agendamento: 'Cancelamento pelo médico',
    estorno_processado: 'Estorno processado',
    estorno_horario_indisponivel: 'Estorno automático (horário indisponível)',
    estorno_reconciliado: 'Estorno reconciliado (conciliação Asaas)',
    pagamento_confirmado: 'Pagamento confirmado',
    paciente_cancelou: 'Cancelamento pelo paciente',
};

const AdminRefundsPage = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [rows, setRows] = useState([]);
    const [logsByAppt, setLogsByAppt] = useState({});
    const [tab, setTab] = useState('pendentes');
    const [target, setTarget] = useState(null);
    const [auditTarget, setAuditTarget] = useState(null);
    const [refundingId, setRefundingId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('id, protocolo, appointment_date, appointment_time, price_in_cents, refund_percent, valor_estornado, estornado_em, pagamento_status, status, cancelado_em, cancelado_por, patient_id, paciente_nome, patient:perfis_usuarios!patient_id(full_name, email, whatsapp), medicos(name, public_name, user_id)')
                .eq('status', 'cancelado')
                .in('pagamento_status', ['pago', 'reembolsado'])
                .order('cancelado_em', { ascending: false, nullsFirst: false });
            if (error) throw error;

            // Trilha imutável (agendamento_logs) das guias listadas — fonte de auditoria.
            const ids = (data || []).map((r) => r.id);
            const logsMap = {};
            if (ids.length) {
                const { data: logs } = await supabase
                    .from('agendamento_logs')
                    .select('id, agendamento_id, acao, dados, usuario_id, created_at')
                    .in('agendamento_id', ids)
                    .order('created_at', { ascending: true });
                (logs || []).forEach((l) => { (logsMap[l.agendamento_id] ||= []).push(l); });
            }
            setLogsByAppt(logsMap);
            setRows(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar reembolsos', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const apptLogs = useCallback((a) => logsByAppt[a.id] || [], [logsByAppt]);

    // Valor REAL do estorno: coluna gravada no estorno → log estorno_processado → estimativa.
    const realRefundValue = useCallback((a) => {
        if (a.valor_estornado != null) return Number(a.valor_estornado);
        const el = [...apptLogs(a)].reverse().find((l) => l.acao === 'estorno_processado');
        if (el?.dados?.valor_estornado != null) return Number(el.dados.valor_estornado);
        return estimatedRefund(a);
    }, [apptLogs]);

    const realRefundDate = useCallback((a) => {
        if (a.estornado_em) return a.estornado_em;
        const el = [...apptLogs(a)].reverse().find((l) => l.acao === 'estorno_processado');
        return el?.created_at || null;
    }, [apptLogs]);

    // Quem cancelou — derivado primeiro da trilha imutável, depois de cancelado_por.
    const cancelActor = useCallback((a) => {
        const logs = apptLogs(a);
        if (logs.some((l) => l.acao === 'paciente_cancelou_agendamento' || l.acao === 'paciente_cancelou')) return 'Paciente';
        if (logs.some((l) => l.acao === 'medico_cancelou_agendamento')) return 'Médico';
        if (logs.some((l) => l.acao === 'estorno_horario_indisponivel')) return 'Plataforma (sistema)';
        if (a.cancelado_por) {
            if (a.cancelado_por === a.patient_id) return 'Paciente';
            if (a.cancelado_por === a.medicos?.user_id) return 'Médico';
            return 'Plataforma/Admin';
        }
        return '—';
    }, [apptLogs]);

    const medicoNome = (a) => a.medicos?.public_name || a.medicos?.name || '—';

    const pendentes = useMemo(() => rows.filter((a) => a.pagamento_status === 'pago' && refundPct(a) > 0), [rows]);
    const historico = useMemo(() => rows.filter((a) => a.pagamento_status === 'reembolsado'), [rows]);
    const totalDevido = useMemo(() => pendentes.reduce((s, a) => s + estimatedRefund(a), 0), [pendentes]);
    const totalDevolvido = useMemo(() => historico.reduce((s, a) => s + realRefundValue(a), 0), [historico, realRefundValue]);

    const marcarReembolsado = async () => {
        if (!target) return;
        setProcessing(true);
        try {
            const updates = { pagamento_status: 'reembolsado', updated_at: new Date().toISOString() };
            if (target.refund_percent == null) updates.refund_percent = 100;
            const { error } = await supabase.from('agendamentos').update(updates).eq('id', target.id);
            if (error) throw error;
            toast({ title: 'Reembolso registrado', description: 'A guia foi marcada como reembolsada.', variant: 'success' });
            setTarget(null);
            fetchData();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    // Estorno automático via Asaas (reprocessa estornos pendentes conforme a política).
    const estornarNoAsaas = async (a) => {
        setRefundingId(a.id);
        try {
            const { data, error } = await supabase.functions.invoke('refund-asaas-payment', { body: { appointmentId: a.id } });
            if (error) throw error;
            if (data?.refunded) {
                toast({ title: 'Estorno realizado', description: `Valor devolvido ao paciente${data.refundValue ? ` (${fmtBRL(data.refundValue)})` : ''}.`, variant: 'success' });
                fetchData();
            } else {
                toast({ variant: 'destructive', title: 'Estorno não concluído', description: data?.error || 'Não foi possível estornar agora. Tente novamente quando houver saldo na conta Asaas.', duration: 9000 });
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro no estorno', description: err.message });
        } finally {
            setRefundingId(null);
        }
    };

    const list = tab === 'historico' ? historico : pendentes;
    const isHist = tab === 'historico';

    const handleExport = () => {
        downloadCsv(`reembolsos_${tab}_${csvDateSuffix()}`, [
            { header: 'Cancelado em', value: (a) => safeDate(a.cancelado_em, 'dd/MM/yyyy HH:mm') },
            { header: 'Cancelado por', value: (a) => cancelActor(a) },
            { header: 'Paciente', value: (a) => a.paciente_nome || a.patient?.full_name || '' },
            { header: 'Contato', value: (a) => a.patient?.email || a.patient?.whatsapp || '' },
            { header: 'Médico', value: (a) => medicoNome(a) },
            { header: 'Protocolo', value: (a) => a.protocolo || '' },
            { header: 'Valor pago (R$)', value: (a) => brNumber((a.price_in_cents || 0) / 100) },
            { header: 'Reembolso (%)', value: (a) => refundPct(a) },
            { header: isHist ? 'Valor estornado (R$)' : 'Valor a devolver (estimado, R$)', value: (a) => brNumber(isHist ? realRefundValue(a) : estimatedRefund(a)) },
            { header: 'Estornado em', value: (a) => (isHist ? safeDate(realRefundDate(a), 'dd/MM/yyyy HH:mm') : '') },
            { header: 'Status', value: (a) => (a.pagamento_status === 'reembolsado' ? 'Reembolsado' : 'Pendente') },
        ], list);
    };

    if (loading && rows.length === 0) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={RotateCcw} title="Reembolsos" subtitle="Devolva aos pacientes os valores de consultas pagas e canceladas, com trilha de auditoria fiel e imutável.">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={loading || list.length === 0}>
                    <FileDown className="w-4 h-4" /> Exportar CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Atualizar
                </Button>
            </AdminPageHeader>

            {/* Resumo */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-white border-amber-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700">A reembolsar (estimado)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{fmtBRL(totalDevido)}</div>
                        <p className="text-xs text-amber-500 mt-1">{pendentes.length} guia(s) aguardando estorno</p>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Já reembolsados</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{historico.length}</div>
                        <p className="text-xs text-gray-400 mt-1">{fmtBRL(totalDevolvido)} devolvidos</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-sm h-10 p-1 bg-gray-100/80 rounded-md">
                    <TabsTrigger value="pendentes" className="rounded-lg text-sm data-[state=active]:text-brand-800 data-[state=active]:shadow-sm">Pendentes {pendentes.length > 0 && `(${pendentes.length})`}</TabsTrigger>
                    <TabsTrigger value="historico" className="rounded-lg text-sm data-[state=active]:text-brand-800 data-[state=active]:shadow-sm">Histórico</TabsTrigger>
                </TabsList>
            </Tabs>

            <Card>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead>Cancelado em</TableHead>
                                <TableHead>Cancelado por</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Médico</TableHead>
                                <TableHead>Protocolo</TableHead>
                                <TableHead className="text-right">Valor pago</TableHead>
                                <TableHead className="text-center">Reembolso</TableHead>
                                <TableHead className="text-right">{isHist ? 'Valor estornado' : 'A devolver (est.)'}</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                        {isHist ? 'Nenhum reembolso processado ainda.' : 'Nenhum reembolso pendente. 🎉'}
                                    </TableCell>
                                </TableRow>
                            ) : list.map((a) => {
                                const actor = cancelActor(a);
                                return (
                                <TableRow key={a.id} className="hover:bg-gray-50/50">
                                    <TableCell className="text-sm whitespace-nowrap">{safeDate(a.cancelado_em, 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            actor === 'Paciente' ? 'bg-brand-50 text-brand-800 border-brand-200 text-[11px]'
                                            : actor === 'Médico' ? 'bg-brand-50 text-brand-800 border-brand-200 text-[11px]'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 text-[11px]'
                                        }>
                                            {actor === 'Paciente' ? <User className="w-3 h-3 mr-1" /> : actor === 'Médico' ? <Stethoscope className="w-3 h-3 mr-1" /> : null}
                                            {actor}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[160px]">
                                            <span className="font-medium text-sm truncate">{a.paciente_nome || a.patient?.full_name || 'Paciente'}</span>
                                            <span className="text-xs text-muted-foreground truncate">{a.patient?.email || a.patient?.whatsapp || ''}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[150px] truncate">{medicoNome(a)}</TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500">{a.protocolo || '—'}</TableCell>
                                    <TableCell className="text-right text-sm">{fmtBRL((a.price_in_cents || 0) / 100)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[11px]">
                                            {a.refund_percent != null ? `${a.refund_percent}%` : '100% (a confirmar)'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isHist ? (
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-green-700">{fmtBRL(realRefundValue(a))}</span>
                                                {realRefundDate(a) && <span className="text-[11px] text-gray-400">em {safeDate(realRefundDate(a), 'dd/MM/yyyy HH:mm')}</span>}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-amber-700">{fmtBRL(estimatedRefund(a))}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!isHist ? (
                                                <>
                                                    <Button size="sm" className="h-8 gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs" onClick={() => estornarNoAsaas(a)} disabled={refundingId === a.id}>
                                                        {refundingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Estornar no Asaas
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setTarget(a)} title="Marcar como reembolsado manualmente (se você já estornou por fora)" disabled={refundingId === a.id}>
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Manual
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">Devolvido</Badge>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-gray-500 hover:text-gray-800" onClick={() => setAuditTarget(a)} title="Ver trilha de auditoria (histórico imutável)">
                                                <ScrollText className="w-3.5 h-3.5" /> Auditoria
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );})}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Confirmação manual */}
            <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-700"><RotateCcw className="w-5 h-5" /> Confirmar reembolso</DialogTitle>
                        <DialogDescription>
                            Faça o estorno no gateway/banco e depois confirme aqui. Isto marca a guia como <strong>reembolsada</strong> e a remove da fila de pendentes.
                        </DialogDescription>
                    </DialogHeader>
                    {target && (
                        <div className="py-2 space-y-1.5 text-sm">
                            <p><span className="text-gray-500">Paciente:</span> <strong>{target.paciente_nome || target.patient?.full_name || 'Paciente'}</strong></p>
                            <p><span className="text-gray-500">Médico:</span> {medicoNome(target)}</p>
                            <p><span className="text-gray-500">Cancelado por:</span> {cancelActor(target)}</p>
                            <p><span className="text-gray-500">Protocolo:</span> {target.protocolo || '—'}</p>
                            <p><span className="text-gray-500">Valor pago:</span> {fmtBRL((target.price_in_cents || 0) / 100)}</p>
                            <p className="text-base"><span className="text-gray-500">Valor a devolver (estimado):</span> <strong className="text-amber-700">{fmtBRL(estimatedRefund(target))}</strong> ({refundPct(target)}%)</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTarget(null)} disabled={processing}>Voltar</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={marcarReembolsado} disabled={processing}>
                            {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar reembolso
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auditoria — trilha imutável */}
            <Dialog open={!!auditTarget} onOpenChange={(o) => !o && setAuditTarget(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-800"><ScrollText className="w-5 h-5 text-primary" /> Trilha de auditoria</DialogTitle>
                        <DialogDescription>
                            Histórico imutável registrado no sistema (agendamento_logs). Protocolo <strong>{auditTarget?.protocolo || '—'}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    {auditTarget && (
                        <div className="py-2 space-y-3 max-h-[55vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3 text-sm border-b pb-3">
                                <p><span className="text-gray-500">Paciente:</span><br /><strong>{auditTarget.paciente_nome || auditTarget.patient?.full_name || '—'}</strong></p>
                                <p><span className="text-gray-500">Médico:</span><br /><strong>{medicoNome(auditTarget)}</strong></p>
                                <p><span className="text-gray-500">Cancelado por:</span><br /><strong>{cancelActor(auditTarget)}</strong></p>
                                <p><span className="text-gray-500">Valor pago:</span><br /><strong>{fmtBRL((auditTarget.price_in_cents || 0) / 100)}</strong></p>
                                {auditTarget.pagamento_status === 'reembolsado' && (
                                    <>
                                        <p><span className="text-gray-500">Valor estornado (real):</span><br /><strong className="text-green-700">{fmtBRL(realRefundValue(auditTarget))}</strong></p>
                                        <p><span className="text-gray-500">Estornado em:</span><br /><strong>{safeDate(realRefundDate(auditTarget), 'dd/MM/yyyy HH:mm')}</strong></p>
                                    </>
                                )}
                            </div>
                            <ol className="relative border-l-2 border-gray-100 ml-2 space-y-4">
                                {apptLogs(auditTarget).length === 0 && <p className="text-sm text-muted-foreground pl-4">Sem eventos registrados.</p>}
                                {apptLogs(auditTarget).map((l) => (
                                    <li key={l.id} className="ml-4">
                                        <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary/70 border-2 border-white" />
                                        <p className="text-sm font-semibold text-gray-800">{ACAO_LABEL[l.acao] || l.acao}</p>
                                        <p className="text-xs text-gray-400">{safeDate(l.created_at, 'dd/MM/yyyy HH:mm:ss')}</p>
                                        {l.dados && Object.keys(l.dados).length > 0 && (
                                            <p className="text-[11px] text-gray-500 mt-1 font-mono bg-gray-50 rounded p-1.5 break-all">
                                                {Object.entries(l.dados).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAuditTarget(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminRefundsPage;
