import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileText, Banknote, RefreshCcw, FileDown, AlertTriangle } from '@/components/ui/icones';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { downloadCsv, brNumber, csvDateSuffix } from '@/lib/exportCsv';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminWithdrawalsPage = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { toast } = useToast();
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [saqueGuias, setSaqueGuias] = useState([]);
    const [guiasLoading, setGuiasLoading] = useState(false);
    // Confirmação do repasse: exige conferência do valor e registro do comprovante.
    const [payTarget, setPayTarget] = useState(null);
    const [comprovante, setComprovante] = useState('');
    // Busca e filtro da lista
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('aguardando');

    const visibleWithdrawals = useMemo(() => {
        const termo = search.trim().toLowerCase();
        return withdrawals.filter((w) => {
            const aguardando = w.status === 'Aguardando Recebimento';
            if (statusFilter === 'aguardando' && !aguardando) return false;
            if (statusFilter === 'recebido' && aguardando) return false;
            if (!termo) return true;
            return (w.medicos?.name || '').toLowerCase().includes(termo);
        });
    }, [withdrawals, search, statusFilter]);

    const fmt = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    // Repasse e taxa de uma guia, usando a taxa CONGELADA no pagamento (imutável).
    //
    // Três valores diferentes que costumam ser confundidos:
    //
    //   total    o que o paciente pagou
    //   liquido  o que o Asaas creditou na conta, já descontada a taxa dele —
    //            é o único dinheiro que existe de verdade para movimentar
    //   repasse  o que pertence ao médico
    //
    // O repasse é `total - taxa da plataforma`, e NÃO parte do líquido: a
    // cláusula 5.2 do Termo de Adesão define a parte da aviDoc como um
    // percentual do valor total pago pelo paciente, e o restante como do
    // parceiro. A taxa do Asaas sai da margem da plataforma, não do médico.
    //
    // Por isso a margem real da plataforma é `liquido - repasse`, que é sempre
    // menor que a taxa nominal — e pode até ficar negativa em consultas baratas,
    // onde a taxa fixa do Asaas come toda a comissão. É justamente esse caso que
    // a tela precisa mostrar em vez de esconder.
    const calcGuia = (g) => {
        const total = (g.price_in_cents || 0) / 100;
        const fee = Number(g.taxa_percent_snapshot) || 0;
        const taxa = total * (fee / 100);
        const repasse = total - taxa;
        const temLiquido = g.valor_liquido_centavos != null;
        const liquido = temLiquido ? g.valor_liquido_centavos / 100 : null;
        return {
            total, taxa, repasse, fee, liquido, temLiquido,
            taxaAsaas: temLiquido ? total - liquido : null,
            margem: temLiquido ? liquido - repasse : null,
        };
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

    const handleUpdateStatus = async (id, newStatus, proof = null) => {
        setProcessing(true);
        try {
            const updates = {
                status: newStatus,
                data_processamento: newStatus !== 'Aguardando Recebimento' ? new Date().toISOString() : null
            };

            // Registra o comprovante junto ao saque (rastreabilidade da transferência).
            if (proof) {
                const alvo = withdrawals.find((w) => w.id === id);
                updates.dados_saque_json = {
                    ...(alvo?.dados_saque_json || {}),
                    comprovante: { referencia: proof, registrado_em: new Date().toISOString() },
                };
            }

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
                .select('id, protocolo, appointment_date, appointment_time, price_in_cents, taxa_percent_snapshot, valor_liquido_centavos')
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
            <AdminPageHeader icon={Banknote} title="Saques e Pagamentos" subtitle="Gerencie os pagamentos aos médicos parceiros.">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={withdrawals.length === 0} className="gap-2">
                    <FileDown className="w-4 h-4" /> Exportar CSV
                </Button>
                <Button variant="outline" size="sm" onClick={fetchWithdrawals} className="gap-2">
                    <RefreshCcw className="w-4 h-4" /> Atualizar
                </Button>
            </AdminPageHeader>

            <Card>
                <CardHeader className="gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle>Histórico de Solicitações</CardTitle>
                        <span className="text-sm text-muted-foreground">
                            {visibleWithdrawals.length === withdrawals.length
                                ? `${withdrawals.length} ${withdrawals.length === 1 ? 'saque' : 'saques'}`
                                : `${visibleWithdrawals.length} de ${withdrawals.length} saques`}
                        </span>
                    </div>
                    {/* Busca por médico + filtro de status: a tela financeira mais usada
                        carregava tudo de uma vez, sem forma de achar um saque específico. */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por médico..."
                            className="sm:max-w-xs"
                        />
                        <div className="inline-flex p-1 rounded-md bg-gray-100 w-fit">
                            {[
                                { v: 'aguardando', l: 'Aguardando' },
                                { v: 'recebido', l: 'Pagos' },
                                { v: 'todos', l: 'Todos' },
                            ].map((f) => (
                                <button
                                    key={f.v}
                                    type="button"
                                    onClick={() => setStatusFilter(f.v)}
                                    className={`px-4 h-8 rounded-lg text-sm font-semibold transition-all ${statusFilter === f.v ? 'bg-white text-brand-800 shadow-sm' : 'text-gray-500 hover:text-brand-600'}`}
                                >
                                    {f.l}
                                </button>
                            ))}
                        </div>
                    </div>
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
                            {visibleWithdrawals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Nenhuma solicitação de saque encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleWithdrawals.map((w) => (
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
                                                        onClick={() => { setPayTarget(w); setComprovante(''); }}
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

            {/* Confirmação do repasse — ação de dinheiro, irreversível pela tela */}
            <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar repasse</DialogTitle>
                        <DialogDescription>
                            Confirme apenas depois de efetuar a transferência. Esta ação dá baixa nas guias
                            e <strong>não pode ser desfeita por esta tela</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {payTarget && (
                        <div className="py-2 space-y-4">
                            <div className="rounded-lg border bg-gray-50 p-4 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Beneficiário</span>
                                    <span className="font-medium">{payTarget.medicos?.name || '—'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Método</span>
                                    <span className="font-medium uppercase">{payTarget.metodo_pagamento}</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-gray-500 text-sm">Valor</span>
                                    <span className="text-2xl font-bold text-green-700">{fmt(payTarget.valor)}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="comprovante">Comprovante / ID da transferência</Label>
                                <Input
                                    id="comprovante"
                                    value={comprovante}
                                    onChange={(e) => setComprovante(e.target.value)}
                                    placeholder="Ex.: E12345678202607311230 (E2E do Pix)"
                                    autoComplete="off"
                                />
                                <p className="text-xs text-gray-500">
                                    Fica registrado no saque para conferência contábil.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayTarget(null)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={processing || !comprovante.trim()}
                            onClick={async () => {
                                const alvo = payTarget;
                                setPayTarget(null);
                                await handleUpdateStatus(alvo.id, 'Recebido', comprovante.trim());
                            }}
                        >
                            {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Banknote className="w-4 h-4 mr-1" />}
                            Confirmar repasse
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                            <span className="font-bold text-right text-brand-600">
                                                {selectedWithdrawal.dados_saque_json?.pix_key || <span className="text-red-600 font-semibold">Não informada</span>}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-gray-500">Banco:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json?.bank_name || '—'}</span>

                                            <span className="text-gray-500">Agência:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json?.bank_agency || '—'}</span>

                                            <span className="text-gray-500">Conta:</span>
                                            <span className="font-medium text-right">{selectedWithdrawal.dados_saque_json?.bank_account || '—'}</span>
                                        </>
                                    )}
                                </div>

                                {/* Comprovante registrado no momento do repasse */}
                                {selectedWithdrawal.dados_saque_json?.comprovante?.referencia && (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Comprovante</p>
                                        <p className="font-mono text-sm text-green-900 break-all mt-0.5">
                                            {selectedWithdrawal.dados_saque_json.comprovante.referencia}
                                        </p>
                                        {selectedWithdrawal.dados_saque_json.comprovante.registrado_em && (
                                            <p className="text-[11px] text-green-700 mt-1">
                                                Registrado em {format(parseISO(selectedWithdrawal.dados_saque_json.comprovante.registrado_em), 'dd/MM/yyyy HH:mm')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Sem dados bancários não há como transferir — avisa em vez de quebrar a tela */}
                                {!selectedWithdrawal.dados_saque_json && (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>
                                            Este saque não tem dados bancários registrados. Peça ao profissional para
                                            preencher os dados de recebimento antes de efetuar a transferência.
                                        </span>
                                    </div>
                                )}
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
                                                            {c.temLiquido ? (
                                                                <div className="text-gray-600">Recebido: <span className="font-medium">{fmt(c.liquido)}</span> <span className="text-gray-400">(Asaas −{fmt(c.taxaAsaas)})</span></div>
                                                            ) : (
                                                                <div className="text-amber-600" title="Cobrança anterior ao registro do líquido do Asaas">Recebido: não informado</div>
                                                            )}
                                                            <div className="text-brand-600">Taxa ({c.fee}%): {fmt(c.taxa)}</div>
                                                            <div className="text-brand-800 font-semibold">Repasse: {fmt(c.repasse)}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {(() => {
                                            const tot = saqueGuias.reduce((acc, g) => {
                                                const c = calcGuia(g);
                                                acc.total += c.total; acc.taxa += c.taxa; acc.repasse += c.repasse;
                                                if (c.fee > 0) acc.comTaxa += 1;
                                                if (c.temLiquido) acc.liquido += c.liquido; else acc.semLiquido += 1;
                                                return acc;
                                            }, { total: 0, taxa: 0, repasse: 0, liquido: 0, semLiquido: 0, comTaxa: 0 });
                                            const completo = tot.semLiquido === 0;
                                            const margem = tot.liquido - tot.repasse;
                                            // Margem negativa tem duas causas muito diferentes, e tratá-las igual
                                            // faria o alerta tocar sempre para os médicos sem taxa — que é o caso
                                            // conhecido e aceito. Vermelho fica reservado para quando a taxa
                                            // existe e mesmo assim não cobriu o custo do Asaas, que é o que pede
                                            // revisão de preço.
                                            const isentoDeTaxa = tot.comTaxa === 0;
                                            return (
                                                <div className="flex items-center justify-between gap-3 text-xs font-semibold border-t pt-2 mt-1">
                                                    <span className="text-gray-700">Totais</span>
                                                    <div className="text-right leading-tight">
                                                        <div className="text-gray-600">Bruto: {fmt(tot.total)}</div>
                                                        {completo ? (
                                                            <div className="text-gray-800">Recebido do Asaas: {fmt(tot.liquido)}</div>
                                                        ) : (
                                                            <div className="text-amber-600">Recebido: {fmt(tot.liquido)} · {tot.semLiquido} guia(s) sem registro</div>
                                                        )}
                                                        <div className="text-brand-800">Repasse ao médico: {fmt(tot.repasse)}</div>
                                                        {completo && (
                                                            margem >= 0 ? (
                                                                <div className="text-gray-500">Margem da plataforma: {fmt(margem)}</div>
                                                            ) : isentoDeTaxa ? (
                                                                <div className="text-gray-500" title="Médico sem taxa de plataforma: o repasse é o valor cheio, então a taxa do Asaas fica por conta da plataforma.">
                                                                    Custo do Asaas: {fmt(-margem)} <span className="text-gray-400">· médico sem taxa</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-red-600" title="A taxa cobrada não cobriu o custo do Asaas nesta consulta.">
                                                                    Prejuízo: {fmt(-margem)} <span className="font-normal">· a taxa não cobriu o Asaas</span>
                                                                </div>
                                                            )
                                                        )}
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