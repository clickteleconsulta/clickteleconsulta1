import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileText, Banknote, RefreshCcw, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { downloadCsv, brNumber, csvDateSuffix } from '@/lib/exportCsv';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminWithdrawalsPage = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { toast } = useToast();
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [saqueGuias, setSaqueGuias] = useState([]);
    const [guiasLoading, setGuiasLoading] = useState(false);

    const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    // Repasse e taxa de uma guia, usando a taxa CONGELADA no pagamento (imutável).
    const calcGuia = (g) => {
        const total = (g.price_in_cents || 0) / 100;
        const fee = Number(g.taxa_percent_snapshot) || 0;
        const taxa = total * (fee / 100);
        return { total, taxa, repasse: total - taxa, fee };
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            // Sem embed de FK (evita falha se o relacionamento não estiver registrado no PostgREST)
            const { data, error } = await supabase
                .from('saques')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const rows = data || [];
            const doctorIds = [...new Set(rows.map(r => r.doctor_id).filter(Boolean))];
            let medicosMap = {};
            if (doctorIds.length > 0) {
                const { data: meds } = await supabase
                    .from('medicos')
                    .select('id, name, public_name')
                    .in('id', doctorIds);
                (meds || []).forEach(m => { medicosMap[m.id] = m; });
            }

            setWithdrawals(rows.map(r => ({ ...r, medicos: medicosMap[r.doctor_id] || null })));
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            toast({ variant: 'destructive', title: 'Erro', description: error?.message || 'Não foi possível carregar os saques.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        setProcessing(true);
        try {
            const updates = {
                status: newStatus,
                data_processamento: newStatus !== 'Aguardando Recebimento' ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from('saques')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            
            toast({ 
                title: 'Status atualizado', 
                description: `Saque marcado como ${newStatus}.`, 
                variant: newStatus === 'Recebido' ? 'success' : 'default' 
            });
            fetchWithdrawals();
            if(selectedWithdrawal?.id === id) {
                 setIsDetailsOpen(false);
                 setSelectedWithdrawal(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const openDetails = async (withdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setIsDetailsOpen(true);
        setSaqueGuias([]);
        setGuiasLoading(true);
        try {
            const { data } = await supabase
                .from('agendamentos')
                .select('id, protocolo, appointment_date, appointment_time, price_in_cents, taxa_percent_snapshot')
                .eq('saque_id', withdrawal.id)
                .order('appointment_date', { ascending: true });
            setSaqueGuias(data || []);
        } catch (e) {
            console.warn('Erro ao carregar guias do saque:', e?.message);
        } finally {
            setGuiasLoading(false);
        }
    };

    const safeDate = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : format(d, 'dd/MM/yyyy HH:mm'); };
    const handleExport = () => {
        downloadCsv(`saques_${csvDateSuffix()}`, [
            { header: 'Solicitado em', value: (w) => safeDate(w.created_at) },
            { header: 'Médico', value: (w) => w.medicos?.public_name || w.medicos?.name || '' },
            { header: 'Valor (R$)', value: (w) => brNumber(w.valor) },
            { header: 'Método', value: (w) => w.metodo_pagamento === 'transferencia' ? 'Transferência' : 'PIX' },
            { header: 'Status', value: (w) => w.status },
            { header: 'Processado em', value: (w) => safeDate(w.data_processamento) },
        ], withdrawals);
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Aguardando Recebimento': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Recebido': 'bg-green-100 text-green-800 border-green-200',
            'Cancelado': 'bg-red-100 text-red-800 border-red-200'
        };
        return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'} variant="outline">{status}</Badge>;
    }

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Solicitações de Saque</h2>
                    <p className="text-muted-foreground">Gerencie os pagamentos aos médicos parceiros.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={withdrawals.length === 0}>
                        <FileDown className="w-4 h-4 mr-2" /> Exportar CSV
                    </Button>
                    <Button variant="outline" onClick={fetchWithdrawals}>
                        <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Solicitações</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Médico</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {withdrawals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Nenhuma solicitação de saque encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                withdrawals.map((w) => (
                                    <TableRow key={w.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {format(parseISO(w.created_at), 'dd/MM/yyyy')}
                                                </span>
                                                <span className="text-xs text-gray-500">{format(parseISO(w.created_at), 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{w.medicos?.public_name || w.medicos?.name || 'Médico não encontrado'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {parseFloat(w.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">
                                            {w.metodo_pagamento === 'transferencia' ? 'Transferência' : 'PIX'}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(w.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openDetails(w)}>
                                                    <FileText className="w-4 h-4 mr-1" /> Detalhes
                                                </Button>
                                                {w.status === 'Aguardando Recebimento' && (
                                                    <Button 
                                                        size="sm" 
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleUpdateStatus(w.id, 'Recebido')}
                                                        disabled={processing}
                                                    >
                                                        <Banknote className="w-4 h-4 mr-1" /> Pagar
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Saque</DialogTitle>
                        <DialogDescription>
                            Dados bancários para realizar o pagamento.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedWithdrawal && (
                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <p className="text-sm text-gray-500 mb-1">Valor a Transferir</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {parseFloat(selectedWithdrawal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm border-b pb-1">Dados de Destino</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-gray-500">Beneficiário:</span>
                                    <span className="font-medium text-right">{selectedWithdrawal.medicos?.name}</span>
                                    
                                    <span className="text-gray-500">Método:</span>
                                    <span className="font-medium text-right uppercase">{selectedWithdrawal.metodo_pagamento}</span>
                                    
                                    {selectedWithdrawal.metodo_pagamento === 'pix' ? (
                                        <>
                                            <span className="text-gray-500">Chave PIX:</span>
                                            <span className="font-bold text-right text-blue-600">{selectedWithdrawal.dados_saque_json.pix_key}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-gray-500">Banco:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_name}</span>
                                            
                                            <span className="text-gray-500">Agência:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_agency}</span>
                                            
                                            <span className="text-gray-500">Conta:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json.bank_account}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Guias pagas neste saque, com repasse e taxa retida */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm border-b pb-1">
                                    Guias incluídas neste saque {saqueGuias.length > 0 && `(${saqueGuias.length})`}
                                </h4>
                                {guiasLoading ? (
                                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                                ) : saqueGuias.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">Nenhuma guia vinculada a este saque.</p>
                                ) : (
                                    <>
                                        <div className="space-y-1.5 max-h-52 overflow-auto pr-1">
                                            {saqueGuias.map((g) => {
                                                const c = calcGuia(g);
                                                return (
                                                    <div key={g.id} className="flex items-start justify-between gap-3 text-xs bg-gray-50 border rounded-md px-2.5 py-1.5">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-mono text-gray-700">{g.protocolo || '—'}</span>
                                                            <span className="text-gray-400">
                                                                {g.appointment_date ? format(parseISO(g.appointment_date), 'dd/MM/yyyy') : '—'}
                                                                {g.appointment_time ? ` ${String(g.appointment_time).slice(0, 5)}` : ''}
                                                            </span>
                                                        </div>
                                                        <div className="text-right shrink-0 leading-tight">
                                                            <div className="text-gray-600">Pago: <span className="font-medium">{fmt(c.total)}</span></div>
                                                            <div className="text-indigo-600">Taxa ({c.fee}%): {fmt(c.taxa)}</div>
                                                            <div className="text-blue-700 font-semibold">Repasse: {fmt(c.repasse)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {(() => {
                                            const tot = saqueGuias.reduce((acc, g) => {
                                                const c = calcGuia(g);
                                                acc.total += c.total; acc.taxa += c.taxa; acc.repasse += c.repasse;
                                                return acc;
                                            }, { total: 0, taxa: 0, repasse: 0 });
                                            return (
                                                <div className="flex items-center justify-between gap-3 text-xs font-semibold border-t pt-2 mt-1">
                                                    <span className="text-gray-700">Totais</span>
                                                    <div className="text-right leading-tight">
                                                        <div className="text-gray-600">Bruto: {fmt(tot.total)}</div>
                                                        <div className="text-indigo-600">Taxa retida: {fmt(tot.taxa)}</div>
                                                        <div className="text-blue-700">Repasse: {fmt(tot.repasse)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                         {selectedWithdrawal?.status === 'Aguardando Recebimento' && (
                             <>
                                <Button 
                                    variant="destructive" 
                                    className="sm:mr-auto"
                                    onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'Cancelado')}
                                    disabled={processing}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Cancelar Solicitação
                                </Button>
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleUpdateStatus(selectedWithdrawal.id, 'Recebido')}
                                    disabled={processing}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Pago
                                </Button>
                             </>
                         )}
                         <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminWithdrawalsPage;