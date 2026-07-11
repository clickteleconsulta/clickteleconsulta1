import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, ArrowRight, Loader2, History, Download, Eye, Calendar as CalendarIcon, User as UserIcon, Stethoscope } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import WithdrawalDataForm from './WithdrawalDataForm';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

const DoctorFinance = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [stats, setStats] = useState({
        totalEarned: 0,
        pending: 0,
        cancelled: 0,
        available: 0
    });
    
    // Withdrawal Request State
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [requestingWithdraw, setRequestingWithdraw] = useState(false);
    const [doctorData, setDoctorData] = useState(null);
    const [detailTx, setDetailTx] = useState(null);
    const [selectedGuideIds, setSelectedGuideIds] = useState([]);
    const [detailSaque, setDetailSaque] = useState(null);

    useEffect(() => {
        if (user) {
            fetchFinancialData();
        }
    }, [user]);

    const fetchFinancialData = async () => {
        if (!doctorData) setLoading(true);
        try {
            const { data: doc, error: docError } = await supabase
                .from('medicos')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (docError) {
                console.error('Erro ao carregar médico (financeiro):', docError);
                toast({ variant: "destructive", title: "Erro", description: `Perfil do médico: ${docError.message}` });
                setLoading(false);
                return;
            }
            if (!doc) {
                // Sem cadastro de médico ainda: mostra a tela zerada, sem erro.
                setDoctorData(null);
                setTransactions([]);
                setWithdrawals([]);
                setStats({ totalEarned: 0, pending: 0, cancelled: 0, available: 0 });
                setLoading(false);
                return;
            }
            setDoctorData(doc);

            // Procedimentos do médico (fonte do "Serviço"). Cria um padrão se não houver.
            let procedures = [];
            {
                const { data, error } = await supabase
                    .from('procedimentos')
                    .select('id, nome, preco, principal')
                    .eq('medico_id', doc.id);
                if (error) console.warn('Erro procedimentos (financeiro):', error.message);
                else procedures = data || [];
            }
            if (procedures.length === 0) {
                const { data: created, error: seedErr } = await supabase
                    .from('procedimentos')
                    .insert({ medico_id: doc.id, nome: 'Teleconsulta', preco: 100.00, principal: true })
                    .select('id, nome, preco, principal')
                    .single();
                if (seedErr) console.warn('Erro ao criar procedimento padrão:', seedErr.message);
                else if (created) procedures = [created];
            }
            const procMap = {};
            procedures.forEach(p => { procMap[p.id] = p; });
            const principalProc = procedures.find(p => p.principal) || procedures[0];
            const defaultServiceName = principalProc?.nome || 'Teleconsulta';

            // Consultas (isolado: uma falha aqui não derruba a seção inteira)
            let appts = [];
            {
                const { data, error } = await supabase
                    .from('agendamentos')
                    .select('*, patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name)')
                    .eq('medico_id', doc.id)
                    .order('created_at', { ascending: false });
                if (error) console.warn('Erro ao carregar consultas (financeiro):', error.message);
                else appts = data || [];
            }

            // Saques (isolado: a tabela/coluna pode não existir em alguns ambientes)
            let withdraws = [];
            {
                const { data, error } = await supabase
                    .from('saques')
                    .select('*')
                    .eq('doctor_id', doc.id)
                    .order('created_at', { ascending: false });
                if (error) console.warn('Erro ao carregar saques (financeiro):', error.message);
                else withdraws = data || [];
            }
            setWithdrawals(withdraws);

            let totalEarned = 0;
            let pending = 0;
            let cancelled = 0;

            const totalWithdrawn = withdraws
                .filter(w => w.status !== 'Cancelado')
                .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

            const feePercent = doc.payment_settings?.platform_fee_percent || 0;

            const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

            const processedTransactions = appts.map(appt => {
                const totalValue = round2((appt.price_in_cents || 0) / 100);
                const platformFee = round2(totalValue * (feePercent / 100));
                const netValue = round2(totalValue - platformFee);

                if (appt.status === 'cancelado') {
                    cancelled += totalValue;
                } else if (appt.pagamento_status === 'pago') {
                    totalEarned += netValue;
                } else if (appt.status === 'confirmado') {
                    pending += netValue;
                }

                // Data da consulta (evita parseISO em valor nulo)
                const raw = appt.horario_inicio || (appt.appointment_date ? `${appt.appointment_date}T${appt.appointment_time || '00:00:00'}` : null);
                const dateObj = raw ? new Date(raw) : null;
                const validDate = dateObj && !isNaN(dateObj.getTime()) ? dateObj : null;

                // Data de criação do pagamento/guia
                const created = appt.created_at ? new Date(appt.created_at) : null;
                const createdValid = created && !isNaN(created.getTime()) ? created : null;

                return {
                    ...appt,
                    netValue,
                    platformFee,
                    totalValue,
                    displayDate: validDate ? format(validDate, 'dd/MM/yyyy') : '—',
                    displayTime: validDate ? format(validDate, 'HH:mm') : '',
                    createdDisplay: createdValid ? format(createdValid, 'dd/MM/yyyy') : '—',
                    createdTime: createdValid ? format(createdValid, 'HH:mm') : '',
                    serviceName: procMap[appt.servico_id]?.nome || defaultServiceName,
                    patientName: appt.paciente_nome || appt.patient?.full_name || 'Paciente',
                };
            });

            const available = Math.max(0, totalEarned - totalWithdrawn);

            setStats({ totalEarned, pending, cancelled, available });
            setTransactions(processedTransactions);

        } catch (error) {
            console.error("Financial fetch error:", error);
            toast({ variant: "destructive", title: "Erro", description: error?.message || "Não foi possível carregar os dados financeiros." });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestWithdraw = async () => {
        // Guias disponíveis (pagas e ainda não vinculadas a um saque)
        const available = transactions.filter(t => t.pagamento_status === 'pago' && !t.saque_id && t.status !== 'cancelado');
        const selected = available.filter(g => selectedGuideIds.includes(g.id));

        if (selected.length === 0) {
            toast({ variant: "destructive", title: "Nenhuma guia selecionada", description: "Selecione as guias que deseja sacar." });
            return;
        }

        // Intervalo de 7 dias entre solicitações
        const last = withdrawals[0];
        if (last?.created_at) {
            const nextDate = new Date(new Date(last.created_at).getTime() + 7 * 24 * 3600 * 1000);
            if (nextDate > new Date()) {
                toast({ variant: "destructive", title: "Aguarde o intervalo", description: `Novo saque disponível em ${format(nextDate, 'dd/MM/yyyy')}.` });
                return;
            }
        }

        if (!doctorData.withdrawal_payment_method) {
             toast({ variant: "destructive", title: "Dados incompletos", description: "Configure seus dados bancários abaixo antes de solicitar o saque." });
             return;
        }
        if (doctorData.withdrawal_payment_method === 'pix' && !doctorData.withdrawal_pix_key) {
             toast({ variant: "destructive", title: "Chave PIX ausente", description: "Adicione sua chave PIX nos dados para saque." });
             return;
        }
        if (doctorData.withdrawal_payment_method === 'transferencia' && (!doctorData.withdrawal_bank_account || !doctorData.withdrawal_bank_agency)) {
             toast({ variant: "destructive", title: "Dados bancários incompletos", description: "Verifique seus dados bancários para saque." });
             return;
        }

        const total = Math.round((selected.reduce((a, g) => a + g.netValue, 0) + Number.EPSILON) * 100) / 100;
        const totalCents = Math.round(total * 100);
        setRequestingWithdraw(true);
        try {
            const { data: saque, error } = await supabase
                .from('saques')
                .insert({
                    doctor_id: doctorData.id,
                    valor: total,
                    amount_cents: totalCents,
                    metodo_pagamento: doctorData.withdrawal_payment_method,
                    dados_saque_json: {
                        pix_key: doctorData.withdrawal_pix_key,
                        bank_name: doctorData.withdrawal_bank_name,
                        bank_agency: doctorData.withdrawal_bank_agency,
                        bank_account: doctorData.withdrawal_bank_account
                    },
                    status: 'Aguardando Recebimento'
                })
                .select()
                .single();

            if (error) throw error;

            // Vincula as guias selecionadas ao saque (saem do extrato de consultas)
            const ids = selected.map(g => g.id);
            const { error: linkErr } = await supabase
                .from('agendamentos')
                .update({ saque_id: saque.id })
                .in('id', ids);
            if (linkErr) throw linkErr;

            toast({
                title: "Solicitação enviada!",
                description: `Saque de ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com ${selected.length} guia(s). O administrador processará em até 7 dias.`,
                variant: "success"
            });

            setIsWithdrawOpen(false);
            setSelectedGuideIds([]);
            fetchFinancialData();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao solicitar", description: error.message });
        } finally {
            setRequestingWithdraw(false);
        }
    };

    const toggleGuideSelection = (id) => {
        setSelectedGuideIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const getStatusBadge = (status) => {
        const styles = {
          confirmado: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          pendente: 'bg-amber-50 text-amber-700 border-amber-100',
          cancelado: 'bg-red-50 text-red-700 border-red-100',
          atendido: 'bg-blue-50 text-blue-700 border-blue-100'
        };
        return <Badge className={`${styles[status] || 'bg-gray-50 text-gray-700 border-gray-100'} h-5 text-[10px] px-2 rounded-sm font-medium border`} variant="outline">{status?.toUpperCase()}</Badge>;
    };

    const getWithdrawalStatusBadge = (status) => {
        const styles = {
            'Aguardando Recebimento': 'bg-amber-50 text-amber-800 border-amber-200',
            'Recebido': 'bg-emerald-50 text-emerald-800 border-emerald-200',
            'Cancelado': 'bg-red-50 text-red-800 border-red-200'
        };
        return <Badge className={`${styles[status] || 'bg-gray-50 text-gray-700'} h-5 text-[10px] px-2 rounded-sm font-medium border`} variant="outline">{status}</Badge>;
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400 w-8 h-8" /></div>;

    // Guias disponíveis: pagas e ainda não vinculadas a um saque.
    // (Pendentes não pagas são canceladas automaticamente até 20 min antes do atendimento;
    //  guias já sacadas saem do extrato de consultas e passam para o extrato de saques.)
    const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
    const paidTransactions = transactions.filter(t => t.pagamento_status === 'pago' && !t.saque_id && t.status !== 'cancelado');
    const availableBalance = round2(paidTransactions.reduce((a, t) => a + t.netValue, 0));
    const selectedTotal = round2(paidTransactions.filter(g => selectedGuideIds.includes(g.id)).reduce((a, g) => a + g.netValue, 0));

    // Intervalo de 7 dias entre solicitações de saque
    const lastWithdrawal = withdrawals[0];
    let canRequestWithdraw = true;
    let nextEligibleDate = null;
    if (lastWithdrawal?.created_at) {
        const nd = new Date(new Date(lastWithdrawal.created_at).getTime() + 7 * 24 * 3600 * 1000);
        if (!isNaN(nd.getTime()) && nd > new Date()) { canRequestWithdraw = false; nextEligibleDate = nd; }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Financeiro</h1>
                    <p className="text-sm text-gray-500">Gerencie seus recebimentos e fluxo de caixa.</p>
                </div>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2 h-9 text-xs px-3 rounded-sm border-gray-300 text-gray-700">
                                <Wallet className="w-3.5 h-3.5" /> Dados para saque
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[380px] p-0 rounded-sm max-h-[80vh] overflow-y-auto border-gray-200 shadow-lg">
                            <WithdrawalDataForm onSave={fetchFinancialData} />
                        </PopoverContent>
                    </Popover>
                    <Button
                        onClick={() => { setSelectedGuideIds([]); setIsWithdrawOpen(true); }}
                        disabled={!canRequestWithdraw || paidTransactions.length === 0}
                        title={!canRequestWithdraw ? `Novo saque disponível em ${nextEligibleDate ? format(nextEligibleDate, 'dd/MM/yyyy') : ''}` : (paidTransactions.length === 0 ? 'Nenhuma guia disponível para saque' : 'Solicitar saque')}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-9 text-xs px-3 rounded-sm"
                    >
                        <Wallet className="w-3.5 h-3.5" /> Solicitar Saque
                    </Button>
                </div>
            </div>

            <div className="max-w-sm">
                <Card className="bg-white border-l-4 border-l-green-500 border-gray-200 shadow-sm p-4 rounded-sm">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saldo Disponível (Líquido)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-2xl font-bold text-gray-900">
                            {availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p className="text-[11px] text-green-600 flex items-center mt-1 font-medium">
                            <TrendingUp className="w-3 h-3 mr-1" /> {paidTransactions.length} guia(s) disponível(is) para saque
                        </p>
                        {!canRequestWithdraw && nextEligibleDate && (
                            <p className="text-[11px] text-amber-600 mt-1 font-medium">
                                Novo saque disponível em {format(nextEligibleDate, 'dd/MM/yyyy')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="consultas" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[300px] h-9 p-1 bg-gray-100 rounded-sm">
                    <TabsTrigger value="consultas" className="text-xs font-medium py-1.5 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">Extrato de Consultas</TabsTrigger>
                    <TabsTrigger value="saques" className="text-xs font-medium py-1.5 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">Extrato de Saques</TabsTrigger>
                </TabsList>
                
                <TabsContent value="consultas" className="mt-4">
                    <Card className="border border-gray-200 shadow-sm rounded-sm">
                        <CardHeader className="p-4 border-b border-gray-100">
                            <CardTitle className="text-sm font-semibold text-gray-900">Guias de Pagamento</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Histórico detalhado dos pagamentos das consultas.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50 border-b border-gray-200">
                                    <TableRow className="h-9 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Data de Criação</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Protocolo</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Valor</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Status</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Data da Consulta</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Paciente</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Especialista</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Serviço</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paidTransactions.length > 0 ? (
                                        paidTransactions.map((t) => (
                                            <TableRow key={t.id} className="h-10 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                <TableCell className="py-2 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 text-xs">{t.createdDisplay}</span>
                                                        <span className="text-[10px] text-gray-500">{t.createdTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-4">
                                                    <span className="font-mono text-xs font-semibold text-gray-800">{t.protocolo || '—'}</span>
                                                </TableCell>
                                                <TableCell className="text-right text-green-700 text-xs py-2 px-4 font-bold">
                                                    {t.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </TableCell>
                                                <TableCell className="py-2 px-4">
                                                    <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-sm font-medium border ${t.pagamento_status === 'pago' ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                                                        {t.pagamento_status?.toUpperCase() || 'PENDENTE'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-700">{t.displayDate}</span>
                                                        <span className="text-[10px] text-gray-500">{t.displayTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-4 text-xs font-medium text-gray-700">{t.patientName}</TableCell>
                                                <TableCell className="py-2 px-4 text-xs text-gray-700">{doctorData?.public_name || doctorData?.name || '—'}</TableCell>
                                                <TableCell className="py-2 px-4 text-xs text-gray-700">{t.serviceName}</TableCell>
                                                <TableCell className="text-right py-2 px-4">
                                                    <Button variant="outline" size="sm" onClick={() => setDetailTx(t)} className="h-7 gap-1 text-[11px] rounded-sm border-gray-300 text-gray-700">
                                                        <Eye className="w-3 h-3" /> Ver detalhes
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-gray-400 text-xs">
                                                Nenhuma guia de pagamento encontrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="saques" className="mt-4">
                     <Card className="border border-gray-200 shadow-sm rounded-sm">
                        <CardHeader className="p-4 border-b border-gray-100">
                            <CardTitle className="text-sm font-semibold text-gray-900">Extrato de Saques</CardTitle>
                            <CardDescription className="text-xs text-gray-500">Histórico de retiradas.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                             <Table>
                                <TableHeader className="bg-gray-50 border-b border-gray-200">
                                    <TableRow className="h-9 hover:bg-transparent">
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Data Solicitação</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Valor</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Destino</TableHead>
                                        <TableHead className="text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold text-gray-600 uppercase tracking-wide py-2 px-4">Processado em</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {withdrawals.length > 0 ? (
                                        withdrawals.map((w) => {
                                            const details = w.dados_saque_json || {};
                                            const createdAt = w.created_at ? new Date(w.created_at) : null;
                                            return (
                                                <TableRow key={w.id} className="h-10 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <TableCell className="font-medium text-gray-700 text-xs py-2 px-4">
                                                        {createdAt && !isNaN(createdAt.getTime()) ? format(createdAt, "dd/MM/yyyy 'às' HH:mm") : '—'}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-gray-900 text-xs py-2 px-4">
                                                        <div className="flex flex-col items-start">
                                                            <span>{(parseFloat(w.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            <button type="button" onClick={() => setDetailSaque(w)} className="text-[10px] text-blue-600 hover:underline font-medium">ver guias</button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600 py-2 px-4">
                                                        {w.metodo_pagamento === 'pix' ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] uppercase font-bold text-gray-400">PIX</span>
                                                                <span className="text-[10px] font-medium">{details.pix_key}</span>
                                                            </div>
                                                        ) : (
                                                             <div className="flex flex-col">
                                                                <span className="text-[9px] uppercase font-bold text-gray-400">Transf.</span>
                                                                <span className="text-[10px] font-medium">{details.bank_name}</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-4">
                                                        {getWithdrawalStatusBadge(w.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-gray-500 py-2 px-4 font-medium">
                                                        {w.data_processamento ? format(parseISO(w.data_processamento), "dd/MM/yyyy") : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2 text-xs">
                                                <History className="w-6 h-6 opacity-20" />
                                                Nenhum saque solicitado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                             </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>


            <Dialog open={!!detailTx} onOpenChange={(o) => !o && setDetailTx(null)}>
                <DialogContent className="p-6 sm:max-w-[460px] rounded-sm border-gray-200">
                    <DialogHeader className="p-0 pb-3">
                        <DialogTitle className="text-lg font-semibold text-gray-900">Detalhes da Guia de Pagamento</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            {detailTx?.protocolo ? `Protocolo ${detailTx.protocolo}` : 'Informações do pagamento e da consulta.'}
                        </DialogDescription>
                    </DialogHeader>
                    {detailTx && (
                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-gray-50 rounded-sm border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Valor pago pelo paciente</span>
                                    <span className="text-sm font-semibold text-gray-900">{detailTx.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Valor de repasse (você recebe)</span>
                                    <span className="text-lg font-bold text-green-700">{detailTx.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Status</p>
                                    <Badge variant="outline" className={`h-5 text-[10px] px-2 rounded-sm font-medium border ${detailTx.pagamento_status === 'pago' ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
                                        {detailTx.pagamento_status?.toUpperCase() || 'PENDENTE'}
                                    </Badge>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Serviço</p>
                                    <p className="text-xs text-gray-700 flex items-center gap-1"><Stethoscope className="w-3 h-3 text-gray-400" /> {detailTx.serviceName}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Data de Criação</p>
                                    <p className="text-xs text-gray-700">{detailTx.createdDisplay} {detailTx.createdTime}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Data da Consulta</p>
                                    <p className="text-xs text-gray-700 flex items-center gap-1"><CalendarIcon className="w-3 h-3 text-gray-400" /> {detailTx.displayDate} {detailTx.displayTime}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Paciente</p>
                                    <p className="text-xs text-gray-700 flex items-center gap-1"><UserIcon className="w-3 h-3 text-gray-400" /> {detailTx.patientName}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Especialista</p>
                                    <p className="text-xs text-gray-700">{doctorData?.public_name || doctorData?.name || '—'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="p-0 pt-4">
                        <Button variant="outline" onClick={() => setDetailTx(null)} className="h-9 text-xs rounded-sm border-gray-300">Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawOpen} onOpenChange={(o) => { setIsWithdrawOpen(o); if (!o) setSelectedGuideIds([]); }}>
                <DialogContent className="p-6 sm:max-w-[520px] rounded-sm border-gray-200">
                    <DialogHeader className="p-0 pb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900">Solicitar Saque</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Selecione as guias que deseja sacar. Elas sairão do extrato de consultas e ficarão registradas neste saque.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                         <div className="text-xs bg-blue-50 text-blue-900 p-3 rounded-sm border border-blue-100">
                             <strong className="block mb-1">Destino: </strong>
                             {doctorData?.withdrawal_payment_method === 'pix' ? (
                                 <span className="font-mono">PIX ({doctorData.withdrawal_pix_key})</span>
                             ) : doctorData?.withdrawal_payment_method === 'transferencia' ? (
                                 <span className="font-medium">Banco {doctorData.withdrawal_bank_name}</span>
                             ) : (
                                 <span className="text-red-600 font-semibold">Não configurado! Configure abaixo.</span>
                             )}
                         </div>

                         <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-sm p-2.5">
                             Após solicitar, um novo saque só poderá ser feito depois de <strong>7 dias</strong>, e o administrador processará o pagamento em <strong>até 7 dias</strong>.
                         </div>

                         {paidTransactions.length === 0 ? (
                             <p className="text-center text-xs text-gray-400 py-6">Nenhuma guia disponível para saque.</p>
                         ) : (
                             <div className="border border-gray-200 rounded-sm divide-y max-h-[280px] overflow-y-auto">
                                 <div className="flex items-center justify-between px-3 py-2 bg-gray-50 sticky top-0">
                                     <button
                                        type="button"
                                        onClick={() => setSelectedGuideIds(selectedGuideIds.length === paidTransactions.length ? [] : paidTransactions.map(g => g.id))}
                                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                                     >
                                        {selectedGuideIds.length === paidTransactions.length ? 'Desmarcar todas' : 'Selecionar todas'}
                                     </button>
                                     <span className="text-[11px] text-gray-500">{selectedGuideIds.length} de {paidTransactions.length}</span>
                                 </div>
                                 {paidTransactions.map((g) => (
                                     <label key={g.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                                         <input
                                            type="checkbox"
                                            checked={selectedGuideIds.includes(g.id)}
                                            onChange={() => toggleGuideSelection(g.id)}
                                            className="w-4 h-4 accent-blue-600"
                                         />
                                         <div className="flex-1 min-w-0">
                                             <p className="text-xs font-medium text-gray-800 truncate">{g.patientName} · <span className="text-gray-500">{g.serviceName}</span></p>
                                             <p className="text-[10px] text-gray-400">Protocolo <span className="font-mono text-gray-500">{g.protocolo || '—'}</span> · Consulta {g.displayDate}</p>
                                         </div>
                                         <span className="text-xs font-bold text-green-700 shrink-0">{g.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                     </label>
                                 ))}
                             </div>
                         )}

                         <div className="flex items-center justify-between bg-gray-50 p-3 rounded-sm border border-gray-200">
                             <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total do saque</span>
                             <span className="text-xl font-bold text-green-600">{selectedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                         </div>
                    </div>
                    <DialogFooter className="p-0 pt-4">
                        <Button variant="outline" onClick={() => { setIsWithdrawOpen(false); setSelectedGuideIds([]); }} className="h-9 text-xs rounded-sm border-gray-300">Cancelar</Button>
                        <Button onClick={handleRequestWithdraw} disabled={requestingWithdraw || selectedGuideIds.length === 0 || !doctorData?.withdrawal_payment_method || !canRequestWithdraw} className="h-9 text-xs rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                            {requestingWithdraw && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Confirmar Saque
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!detailSaque} onOpenChange={(o) => !o && setDetailSaque(null)}>
                <DialogContent className="p-6 sm:max-w-[480px] rounded-sm border-gray-200">
                    <DialogHeader className="p-0 pb-3">
                        <DialogTitle className="text-lg font-semibold text-gray-900">Guias deste Saque</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            {detailSaque ? `Solicitado em ${detailSaque.created_at ? format(new Date(detailSaque.created_at), "dd/MM/yyyy") : '—'} · ${detailSaque.status}` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    {detailSaque && (() => {
                        const guias = transactions.filter(t => t.saque_id === detailSaque.id);
                        return (
                            <div className="space-y-2">
                                {guias.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 py-4">Nenhuma guia vinculada.</p>
                                ) : (
                                    <div className="border border-gray-200 rounded-sm divide-y max-h-[300px] overflow-y-auto">
                                        {guias.map(g => (
                                            <div key={g.id} className="flex items-center justify-between px-3 py-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-gray-800 truncate">{g.patientName} · <span className="text-gray-500">{g.serviceName}</span></p>
                                                    <p className="text-[10px] text-gray-400">Protocolo <span className="font-mono text-gray-500">{g.protocolo || '—'}</span> · Consulta {g.displayDate}</p>
                                                </div>
                                                <span className="text-xs font-bold text-green-700 shrink-0">{g.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-sm border border-gray-200">
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</span>
                                    <span className="text-lg font-bold text-green-700">{(parseFloat(detailSaque.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                        );
                    })()}
                    <DialogFooter className="p-0 pt-4">
                        <Button variant="outline" onClick={() => setDetailSaque(null)} className="h-9 text-xs rounded-sm border-gray-300">Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DoctorFinance;