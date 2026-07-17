import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { Loader2, RefreshCcw, RotateCcw, CheckCircle2, AlertTriangle, FileDown } from 'lucide-react';
import { downloadCsv, brNumber, csvDateSuffix } from '@/lib/exportCsv';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const safeDate = (v, p = 'dd/MM/yyyy') => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : format(d, p); };

// Reembolso devido: % armazenado na guia (definido no cancelamento). Se não houver
// (ex.: cancelamento pelo médico), assume 100% como sugestão a confirmar.
const refundPct = (a) => (a.refund_percent != null ? a.refund_percent : 100);
const refundValue = (a) => ((a.price_in_cents || 0) / 100) * (refundPct(a) / 100);

const AdminRefundsPage = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [rows, setRows] = useState([]);
    const [tab, setTab] = useState('pendentes');
    const [target, setTarget] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('id, protocolo, appointment_date, appointment_time, price_in_cents, refund_percent, pagamento_status, status, cancelado_em, paciente_nome, patient:perfis_usuarios!patient_id(full_name, email, whatsapp), medicos(name, public_name)')
                .eq('status', 'cancelado')
                .in('pagamento_status', ['pago', 'reembolsado'])
                .order('cancelado_em', { ascending: false, nullsFirst: false });
            if (error) throw error;
            setRows(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar reembolsos', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Pendente = cancelado + ainda pago + reembolso > 0. Histórico = já reembolsado.
    const pendentes = useMemo(() => rows.filter(a => a.pagamento_status === 'pago' && refundPct(a) > 0), [rows]);
    const historico = useMemo(() => rows.filter(a => a.pagamento_status === 'reembolsado'), [rows]);
    const totalDevido = useMemo(() => pendentes.reduce((s, a) => s + refundValue(a), 0), [pendentes]);

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

    const list = tab === 'historico' ? historico : pendentes;

    const handleExport = () => {
        downloadCsv(`reembolsos_${tab}_${csvDateSuffix()}`, [
            { header: 'Cancelado em', value: (a) => safeDate(a.cancelado_em, 'dd/MM/yyyy HH:mm') },
            { header: 'Paciente', value: (a) => a.paciente_nome || a.patient?.full_name || '' },
            { header: 'Contato', value: (a) => a.patient?.email || a.patient?.whatsapp || '' },
            { header: 'Protocolo', value: (a) => a.protocolo || '' },
            { header: 'Valor pago (R$)', value: (a) => brNumber((a.price_in_cents || 0) / 100) },
            { header: 'Reembolso (%)', value: (a) => refundPct(a) },
            { header: 'Valor a devolver (R$)', value: (a) => brNumber(refundValue(a)) },
            { header: 'Status', value: (a) => a.pagamento_status === 'reembolsado' ? 'Reembolsado' : 'Pendente' },
        ], list);
    };

    if (loading && rows.length === 0) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
    }

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={RotateCcw} title="Reembolsos" subtitle="Devolva aos pacientes os valores de consultas pagas e canceladas dentro da política.">
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
                        <CardTitle className="text-sm font-medium text-amber-700">A reembolsar (pendente)</CardTitle>
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
                    <CardContent><div className="text-2xl font-bold text-gray-900">{historico.length}</div></CardContent>
                </Card>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-sm h-10 p-1 bg-gray-100/80 rounded-xl">
                    <TabsTrigger value="pendentes" className="rounded-lg text-sm data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Pendentes {pendentes.length > 0 && `(${pendentes.length})`}</TabsTrigger>
                    <TabsTrigger value="historico" className="rounded-lg text-sm data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Histórico</TabsTrigger>
                </TabsList>
            </Tabs>

            <Card>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead>Cancelado em</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Protocolo</TableHead>
                                <TableHead className="text-right">Valor pago</TableHead>
                                <TableHead className="text-center">Reembolso</TableHead>
                                <TableHead className="text-right">Valor a devolver</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        {tab === 'historico' ? 'Nenhum reembolso processado ainda.' : 'Nenhum reembolso pendente. 🎉'}
                                    </TableCell>
                                </TableRow>
                            ) : list.map((a) => (
                                <TableRow key={a.id} className="hover:bg-gray-50/50">
                                    <TableCell className="text-sm">{safeDate(a.cancelado_em, "dd/MM/yyyy HH:mm")}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col max-w-[180px]">
                                            <span className="font-medium text-sm truncate">{a.paciente_nome || a.patient?.full_name || 'Paciente'}</span>
                                            <span className="text-xs text-muted-foreground truncate">{a.patient?.email || a.patient?.whatsapp || ''}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-gray-500">{a.protocolo || '—'}</TableCell>
                                    <TableCell className="text-right text-sm">{fmtBRL((a.price_in_cents || 0) / 100)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[11px]">
                                            {a.refund_percent != null ? `${a.refund_percent}%` : '100% (a confirmar)'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-amber-700">{fmtBRL(refundValue(a))}</TableCell>
                                    <TableCell className="text-right">
                                        {tab === 'pendentes' ? (
                                            <Button size="sm" className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => setTarget(a)}>
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Reembolsado
                                            </Button>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">Devolvido</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Confirmação */}
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
                            <p><span className="text-gray-500">Protocolo:</span> {target.protocolo || '—'}</p>
                            <p><span className="text-gray-500">Valor pago:</span> {fmtBRL((target.price_in_cents || 0) / 100)}</p>
                            <p className="text-base"><span className="text-gray-500">Valor a devolver:</span> <strong className="text-amber-700">{fmtBRL(refundValue(target))}</strong> ({refundPct(target)}%)</p>
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
        </div>
    );
};

export default AdminRefundsPage;
