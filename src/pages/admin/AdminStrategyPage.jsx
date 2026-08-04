import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
import { downloadCsv, brNumber, csvDateSuffix } from '@/lib/exportCsv';
import { format } from 'date-fns';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
    Loader2, RefreshCw, Users, Stethoscope, Star, TrendingUp, DollarSign,
    Wallet, Landmark, CalendarCheck, XCircle, RotateCcw, Repeat, Info, LineChart,
    FolderCheck, Banknote, AlertTriangle, CheckCircle2, ChevronRight, BellRing, FileDown, CalendarDays
} from 'lucide-react';

const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

// O PostgREST devolve no máximo 1.000 linhas por requisição. Sem paginar, as métricas
// passariam a truncar silenciosamente (faturamento/ticket médio errados) quando a base crescer.
const PAGE_SIZE = 1000;
const fetchAllRows = async (table, columns) => {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
};

const PERIODS = [
    { v: '7', label: 'Últimos 7 dias' },
    { v: '30', label: 'Últimos 30 dias' },
    { v: '90', label: 'Últimos 90 dias' },
    { v: 'year', label: 'Este ano' },
    { v: 'all', label: 'Todo o período' },
];

// Data de início do recorte selecionado (null = tudo).
const periodStart = (period) => {
    if (period === 'all') return null;
    const now = new Date();
    if (period === 'year') return new Date(now.getFullYear(), 0, 1);
    const days = Number(period) || 30;
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
};

const refundPct = (a) => (a.refund_percent == null ? 100 : Number(a.refund_percent));
// Valor REAL do estorno (contábil): sempre o valor efetivamente devolvido (coluna
// valor_estornado). Só cai na estimativa por percentual se o valor real não existir.
const realRefundValue = (a) => (a.valor_estornado != null
    ? Number(a.valor_estornado)
    : ((a.price_in_cents || 0) / 100) * (refundPct(a) / 100));

// Métricas derivadas do período. Base atual (pacientes/médicos) e notas são cumulativas;
// funil, financeiro e qualidade usam a DATA DE CRIAÇÃO da guia (competência).
const computeDerived = (raw, period) => {
    if (!raw) return null;
    const start = periodStart(period);
    const inRange = (a) => !start || (a.created_at && new Date(a.created_at) >= start);
    const appts = (raw.appts || []).filter(inRange);

    const total = appts.length;
    const pagos = appts.filter(a => a.pagamento_status === 'pago');
    const reembolsados = appts.filter(a => a.pagamento_status === 'reembolsado');
    const atendidos = appts.filter(a => ['atendido', 'concluida'].includes(a.status));
    const cancelados = appts.filter(a => a.status === 'cancelado');

    let receitaPaga = 0, receitaPlataforma = 0;
    pagos.forEach(a => {
        const valor = (a.price_in_cents || 0) / 100;
        const taxa = valor * ((Number(a.taxa_percent_snapshot) || 0) / 100);
        receitaPaga += valor;
        receitaPlataforma += taxa;
    });
    const repasse = receitaPaga - receitaPlataforma;
    const ticket = pagos.length ? receitaPaga / pagos.length : 0;

    const reembolsoValor = reembolsados.reduce((s, a) => s + realRefundValue(a), 0);

    const porPaciente = {};
    pagos.forEach(a => { if (a.patient_id) porPaciente[a.patient_id] = (porPaciente[a.patient_id] || 0) + 1; });
    const recorrentes = Object.values(porPaciente).filter(n => n > 1).length;

    // Repasse ainda não vinculado a um saque — quanto a plataforma ainda deve aos médicos.
    const repassePendente = pagos
        .filter(a => !a.saque_id)
        .reduce((s, a) => {
            const valor = (a.price_in_cents || 0) / 100;
            return s + (valor - valor * ((Number(a.taxa_percent_snapshot) || 0) / 100));
        }, 0);

    // No-show: percentual sobre o que era para ter sido atendido (atendidos + faltas).
    const faltas = appts.filter(a => a.status === 'nao_compareceu').length;
    const baseComparecimento = atendidos.length + faltas;
    const noShowPct = pct(faltas, baseComparecimento);

    // Ranking de médicos por receita paga no período.
    const porMedico = {};
    pagos.forEach(a => {
        if (!a.medico_id) return;
        const valor = (a.price_in_cents || 0) / 100;
        const m = porMedico[a.medico_id] || (porMedico[a.medico_id] = { receita: 0, consultas: 0 });
        m.receita += valor;
        m.consultas += 1;
    });
    const topMedicos = Object.entries(porMedico)
        .map(([id, v]) => ({ id, nome: (raw.medicoNomes || {})[id] || 'Profissional', ...v }))
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 5);

    // Receita por mês (competência), para ver evolução em vez de um número único.
    const porMes = {};
    pagos.forEach(a => {
        if (!a.created_at) return;
        const chave = String(a.created_at).slice(0, 7); // YYYY-MM
        porMes[chave] = (porMes[chave] || 0) + (a.price_in_cents || 0) / 100;
    });
    const serieMensal = Object.entries(porMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mes, receita]) => ({ mes, receita }));

    return {
        repassePendente, faltas, noShowPct, topMedicos, serieMensal,
        // base (cumulativa)
        pacientes: raw.pacientes, medicosPublicos: raw.medicosPublicos, comAgenda: raw.comAgenda,
        medicosTotal: raw.medicosTotal, notaMedia: raw.notaMedia, nAval: raw.nAval,
        // período
        appts, total, pagos: pagos.length, atendidos: atendidos.length, cancelados: cancelados.length,
        reembolsados: reembolsados.length, reembolsoValor,
        receitaPaga, receitaPlataforma, repasse, ticket, recorrentes,
    };
};

// Painel "Precisa da sua atenção": transforma o Estudo Estratégico em centro de
// comando, listando as pendências acionáveis com atalho direto para cada tela.
const AttentionPanel = () => {
    const { counts, loading, total } = useAdminPendingCounts();

    const actions = [
        { key: 'documentos', n: counts.documentos, to: '/admin/dashboard/profissionais', icon: FolderCheck,
          label: 'Documentos para revisar', sub: 'profissional(is) com envio em análise', tone: 'blue' },
        { key: 'saques', n: counts.saques, to: '/admin/dashboard/saques-pagamentos', icon: Banknote,
          label: 'Saques a pagar', sub: 'solicitação(ões) aguardando pagamento', tone: 'teal' },
        { key: 'reembolsos', n: counts.reembolsos, to: '/admin/dashboard/reembolsos', icon: RotateCcw,
          label: 'Reembolsos a processar', sub: 'guia(s) paga(s) aguardando estorno', tone: 'amber' },
        { key: 'denuncias', n: counts.denuncias, to: '/admin/avaliacoes', icon: AlertTriangle,
          label: 'Denúncias a moderar', sub: 'avaliação(ões) denunciada(s)', tone: 'red' },
    ];
    const pending = actions.filter(a => a.n > 0);

    const tones = {
        blue: 'bg-brand-50 text-brand-800 border-brand-100',
        teal: 'bg-green-50 text-green-700 border-green-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };

    return (
        <Card className={total > 0 ? 'bg-white border-amber-200/70' : 'bg-green-50/50 border-green-100'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="dashboard-title flex items-center gap-2 text-base">
                    {total > 0
                        ? <><BellRing className="w-4 h-4 text-amber-600" /> Precisa da sua atenção</>
                        : <><CheckCircle2 className="w-4 h-4 text-green-600" /> Tudo em dia</>}
                </CardTitle>
                {total > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-amber-500 text-white text-xs font-bold">
                        {total > 99 ? '99+' : total}
                    </span>
                )}
            </CardHeader>
            <CardContent className="pt-0">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Verificando pendências…</div>
                ) : pending.length === 0 ? (
                    <p className="text-sm text-green-700">Nenhuma ação pendente no momento. Documentos, saques, reembolsos e denúncias estão todos resolvidos. 🎉</p>
                ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {pending.map((a) => (
                            <Link key={a.key} to={a.to}
                                className="group flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5">
                                <span className={`flex items-center justify-center w-10 h-10 rounded-lg border shrink-0 ${tones[a.tone]}`}>
                                    <a.icon className="w-5 h-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        {a.label}
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gray-900 text-white text-[11px] font-bold">{a.n}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{a.n} {a.sub}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const AdminStrategyPage = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [raw, setRaw] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [period, setPeriod] = useState('30');

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const [pacientesRes, medicos, agenda, appts, avaliacoes] = await Promise.all([
                supabase.from('perfis_usuarios').select('id', { count: 'exact', head: true }).eq('role', 'paciente'),
                fetchAllRows('medicos', 'id, is_public, is_active, status, name, public_name'),
                fetchAllRows('agenda_medico', 'medico_id'),
                fetchAllRows('agendamentos', 'status, pagamento_status, price_in_cents, taxa_percent_snapshot, patient_id, medico_id, saque_id, refund_percent, valor_estornado, created_at, appointment_date, protocolo'),
                fetchAllRows('avaliacoes', 'rating'),
            ]);

            const medicosPublicos = medicos.filter(d => d.is_public && d.is_active && d.status === 'ativo').length;
            const comAgenda = new Set(agenda.map(a => a.medico_id)).size;

            const ratings = avaliacoes.map(r => r.rating).filter(Boolean);
            const notaMedia = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

            setRaw({
                pacientes: pacientesRes.count || 0,
                medicosPublicos, comAgenda, medicosTotal: medicos.length,
                notaMedia, nAval: ratings.length,
                appts,
                medicoNomes: Object.fromEntries(medicos.map((m) => [m.id, m.public_name || m.name || 'Sem nome'])),
            });
            setUpdatedAt(new Date());
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar métricas', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

    const m = useMemo(() => computeDerived(raw, period), [raw, period]);

    if (loading && !m) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const periodLabel = PERIODS.find(p => p.v === period)?.label || '';

    const handleExportFinance = () => {
        const rows = m.appts;
        downloadCsv(`relatorio_financeiro_${period}_${csvDateSuffix()}`, [
            { header: 'Criado em', value: (a) => a.created_at ? format(new Date(a.created_at), 'dd/MM/yyyy HH:mm') : '' },
            { header: 'Data consulta', value: (a) => a.appointment_date ? format(new Date(a.appointment_date), 'dd/MM/yyyy') : '' },
            { header: 'Protocolo', value: (a) => a.protocolo || '' },
            { header: 'Status', value: (a) => a.status || '' },
            { header: 'Pagamento', value: (a) => a.pagamento_status || '' },
            { header: 'Valor (R$)', value: (a) => brNumber((a.price_in_cents || 0) / 100) },
            { header: 'Taxa (%)', value: (a) => Number(a.taxa_percent_snapshot) || 0 },
            { header: 'Receita plataforma (R$)', value: (a) => brNumber((a.pagamento_status === 'pago' ? (a.price_in_cents || 0) / 100 : 0) * ((Number(a.taxa_percent_snapshot) || 0) / 100)) },
            { header: 'Repasse (R$)', value: (a) => brNumber(a.pagamento_status === 'pago' ? ((a.price_in_cents || 0) / 100) * (1 - (Number(a.taxa_percent_snapshot) || 0) / 100) : 0) },
        ], rows);
    };

    const Kpi = ({ icon: Icon, label, value, note, tone = 'default' }) => {
        const tones = {
            default: 'text-gray-900', brand: 'text-brand-800', teal: 'text-green-700',
            green: 'text-green-700', amber: 'text-amber-700', red: 'text-red-700',
        };
        return (
            <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                    <Icon className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${tones[tone]}`}>{value}</div>
                    {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
                </CardContent>
            </Card>
        );
    };

    const funil = [
        { label: 'Agendamentos criados', n: m.total, base: m.total, color: '#3B5BA5' },
        { label: 'Pagos', n: m.pagos, base: m.total, color: '#0d9488' },
        { label: 'Atendidos', n: m.atendidos, base: m.total, color: '#14746c' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <AdminPageHeader icon={LineChart} title="Painel de Administrador" subtitle="Métricas do projeto em tempo real — captação, funil e financeiro.">
                {updatedAt && <span className="text-xs text-gray-400 hidden sm:inline">Atualizado {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[170px] h-9 gap-2 bg-white">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PERIODS.map(p => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={fetchMetrics} variant="outline" size="sm" className="gap-2" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
                </Button>
            </AdminPageHeader>

            {/* Precisa da sua atenção */}
            <AttentionPanel />

            {/* Base */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Base atual (acumulado)</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={Users} label="Pacientes cadastrados" value={m.pacientes} tone="brand" />
                    <Kpi icon={Stethoscope} label="Médicos ativos (públicos)" value={m.medicosPublicos} note={`${m.comAgenda} com agenda configurada`} tone="teal" />
                    <Kpi icon={Star} label="Nota média" value={m.notaMedia ? m.notaMedia.toFixed(1) : '—'} note={`${m.nAval} avaliação(ões)`} tone="amber" />
                    <Kpi icon={Repeat} label="Pacientes recorrentes" value={m.recorrentes} note={`no ${periodLabel.toLowerCase()}`} />
                </div>
            </div>

            {/* Funil */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Funil do sistema · {periodLabel}</p>
                <Card className="bg-white">
                    <CardContent className="p-5 space-y-3">
                        {m.total === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">Nenhum agendamento criado neste período.</p>
                        ) : (
                            <>
                                {funil.map((s) => (
                                    <div key={s.label} className="flex items-center gap-4">
                                        <div className="flex items-center text-white font-semibold text-sm rounded-lg px-4"
                                            style={{ background: s.color, height: 44, width: `${Math.max(pct(s.n, s.base), 12)}%`, minWidth: 130 }}>
                                            {s.n}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <b className="text-gray-900">{s.label}</b> · {pct(s.n, s.base)}% do total
                                        </div>
                                    </div>
                                ))}
                                <div className="flex flex-wrap gap-x-8 gap-y-1 pt-3 border-t border-gray-100 text-sm text-gray-600">
                                    <span>Conversão p/ pagamento: <b className="text-gray-900">{pct(m.pagos, m.total)}%</b></span>
                                    <span>Taxa de conclusão: <b className="text-gray-900">{pct(m.atendidos, m.pagos)}%</b></span>
                                    <span>Cancelamentos: <b className="text-gray-900">{pct(m.cancelados, m.total)}%</b></span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Financeiro */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Financeiro · {periodLabel}</p>
                    <Button onClick={handleExportFinance} variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={!m.appts.length}>
                        <FileDown className="w-3.5 h-3.5" /> Relatório (CSV)
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={DollarSign} label="Receita paga (total)" value={fmtBRL(m.receitaPaga)} note="pago pelos pacientes" tone="green" />
                    <Kpi icon={TrendingUp} label="Receita da plataforma" value={fmtBRL(m.receitaPlataforma)} note="taxa retida (congelada)" tone="brand" />
                    <Kpi icon={Wallet} label="Repasse aos médicos" value={fmtBRL(m.repasse)} tone="teal" />
                    <Kpi icon={Landmark} label="Ticket médio" value={fmtBRL(m.ticket)} note="por consulta paga" />
                    <Kpi icon={Wallet} label="Repasse pendente" value={fmtBRL(m.repassePendente)} note="ainda não incluído em saque" tone="amber" />
                </div>

                {/* Evolução mensal — antes só existia um número único por recorte */}
                {m.serieMensal.length > 1 && (
                    <div className="mt-4 rounded-md border bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Receita paga por mês</p>
                        <div className="flex items-end gap-3 h-28">
                            {m.serieMensal.map((p) => {
                                const maxV = Math.max(...m.serieMensal.map((x) => x.receita)) || 1;
                                const [ano, mes] = p.mes.split('-');
                                return (
                                    <div key={p.mes} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                                        <span className="text-[11px] font-semibold text-gray-700 tabular-nums">{fmtBRL(p.receita)}</span>
                                        <div
                                            className="w-full rounded-t-md bg-brand-600 min-h-[4px]"
                                            style={{ height: `${Math.max(4, (p.receita / maxV) * 100)}%` }}
                                            title={`${mes}/${ano}: ${fmtBRL(p.receita)}`}
                                        />
                                        <span className="text-[10px] text-gray-400 tabular-nums">{mes}/{ano.slice(2)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Qualidade */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Qualidade &amp; operação · {periodLabel}</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={CalendarCheck} label="Consultas atendidas" value={m.atendidos} tone="green" />
                    <Kpi icon={XCircle} label="Cancelamentos" value={m.cancelados} note={`${pct(m.cancelados, m.total)}% do total`} tone="red" />
                    <Kpi icon={RotateCcw} label="Reembolsos" value={m.reembolsados} note={fmtBRL(m.reembolsoValor)} tone="amber" />
                    <Kpi icon={XCircle} label="Não comparecimento" value={m.faltas} note={`${m.noShowPct}% dos que deveriam ser atendidos`} tone="amber" />
                    <Kpi icon={Landmark} label="Resultado da plataforma" value={fmtBRL(m.receitaPlataforma - m.reembolsoValor)} note="receita − reembolsos" tone="brand" />
                </div>
            </div>

            {/* Ranking de médicos por faturamento */}
            {m.topMedicos.length > 0 && (
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Profissionais que mais faturam · {periodLabel}</p>
                    <div className="rounded-md border bg-white divide-y">
                        {m.topMedicos.map((d, i) => (
                            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                    {i + 1}
                                </span>
                                <span className="flex-1 font-medium text-slate-800 truncate">{d.nome}</span>
                                <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
                                    {d.consultas} {d.consultas === 1 ? 'consulta' : 'consultas'}
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap w-24 text-right">
                                    {fmtBRL(d.receita)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Aguardando analytics */}
            <Card className="bg-brand-50/50 border-brand-100">
                <CardContent className="p-5 flex items-start gap-3">
                    <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-brand-800">
                        <p className="font-semibold mb-1">Métricas de topo de funil (aguardando analytics)</p>
                        <p className="text-brand-800/80 leading-relaxed">
                            Visitantes, origem do tráfego, CAC e conversão visita→cadastro dependem do GA4 + Meta Pixel (Fase 0, já
                            instalados no código). Assim que os IDs forem configurados no Vercel, essas métricas passam a ser
                            acompanhadas no Google Analytics e no Gerenciador de Eventos da Meta.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <p className="text-[11px] text-gray-400">
                O recorte de período usa a <b>data de criação da guia</b> como competência. Base, médicos e nota média são acumulados (não dependem do período).
            </p>
        </div>
    );
};

export default AdminStrategyPage;
