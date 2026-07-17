import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';
import {
    Loader2, RefreshCw, Users, Stethoscope, Star, TrendingUp, DollarSign,
    Wallet, Landmark, CalendarCheck, XCircle, RotateCcw, Repeat, Info, LineChart,
    FolderCheck, Banknote, AlertTriangle, CheckCircle2, ChevronRight, BellRing
} from 'lucide-react';

const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

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
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        teal: 'bg-teal-50 text-teal-700 border-teal-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };

    return (
        <Card className={total > 0 ? 'bg-white border-amber-200/70' : 'bg-emerald-50/50 border-emerald-100'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="dashboard-title flex items-center gap-2 text-base">
                    {total > 0
                        ? <><BellRing className="w-4 h-4 text-amber-600" /> Precisa da sua atenção</>
                        : <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tudo em dia</>}
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
                    <p className="text-sm text-emerald-700">Nenhuma ação pendente no momento. Documentos, saques, reembolsos e denúncias estão todos resolvidos. 🎉</p>
                ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                        {pending.map((a) => (
                            <Link key={a.key} to={a.to}
                                className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5">
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
    const [m, setM] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);

    const fetchMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const [pacientesRes, medicosRes, agendaRes, apptRes, avalRes] = await Promise.all([
                supabase.from('perfis_usuarios').select('id', { count: 'exact', head: true }).eq('role', 'paciente'),
                supabase.from('medicos').select('id, is_public, is_active, status'),
                supabase.from('agenda_medico').select('medico_id'),
                supabase.from('agendamentos').select('status, pagamento_status, price_in_cents, taxa_percent_snapshot, patient_id, saque_id'),
                supabase.from('avaliacoes').select('rating'),
            ]);

            const medicos = medicosRes.data || [];
            const medicosPublicos = medicos.filter(d => d.is_public && d.is_active && d.status === 'ativo').length;
            const comAgenda = new Set((agendaRes.data || []).map(a => a.medico_id)).size;

            const appts = apptRes.data || [];
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

            // Pacientes recorrentes = pagaram mais de uma consulta
            const porPaciente = {};
            pagos.forEach(a => { if (a.patient_id) porPaciente[a.patient_id] = (porPaciente[a.patient_id] || 0) + 1; });
            const recorrentes = Object.values(porPaciente).filter(n => n > 1).length;

            const ratings = (avalRes.data || []).map(r => r.rating).filter(Boolean);
            const notaMedia = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

            setM({
                pacientes: pacientesRes.count || 0,
                medicosPublicos, comAgenda, medicosTotal: medicos.length,
                total, pagos: pagos.length, atendidos: atendidos.length, cancelados: cancelados.length,
                reembolsados: reembolsados.length,
                receitaPaga, receitaPlataforma, repasse, ticket, recorrentes,
                notaMedia, nAval: ratings.length,
            });
            setUpdatedAt(new Date());
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar métricas', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

    if (loading && !m) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const Kpi = ({ icon: Icon, label, value, note, tone = 'default' }) => {
        const tones = {
            default: 'text-gray-900', brand: 'text-blue-700', teal: 'text-teal-700',
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
        { label: 'Agendamentos criados', n: m.total, base: m.total, color: 'linear-gradient(90deg,#2563eb,#4f83f0)' },
        { label: 'Pagos', n: m.pagos, base: m.total, color: 'linear-gradient(90deg,#1f8f86,#0d9488)' },
        { label: 'Atendidos', n: m.atendidos, base: m.total, color: 'linear-gradient(90deg,#14746c,#1f8f86)' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <LineChart className="w-7 h-7 text-primary" /> Estudo Estratégico
                    </h2>
                    <p className="text-muted-foreground">Métricas do projeto em tempo real — captação, funil e financeiro.</p>
                </div>
                <div className="flex items-center gap-3">
                    {updatedAt && <span className="text-xs text-gray-400">Atualizado {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                    <Button onClick={fetchMetrics} variant="outline" size="sm" className="gap-2" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
                    </Button>
                </div>
            </div>

            {/* Precisa da sua atenção */}
            <AttentionPanel />

            {/* Base */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Base atual</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={Users} label="Pacientes cadastrados" value={m.pacientes} tone="brand" />
                    <Kpi icon={Stethoscope} label="Médicos ativos (públicos)" value={m.medicosPublicos} note={`${m.comAgenda} com agenda configurada`} tone="teal" />
                    <Kpi icon={Star} label="Nota média" value={m.notaMedia ? m.notaMedia.toFixed(1) : '—'} note={`${m.nAval} avaliação(ões)`} tone="amber" />
                    <Kpi icon={Repeat} label="Pacientes recorrentes" value={m.recorrentes} note="pagaram + de 1 consulta" />
                </div>
            </div>

            {/* Funil */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Funil do sistema (agendamento → receita)</p>
                <Card className="bg-white">
                    <CardContent className="p-5 space-y-3">
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
                    </CardContent>
                </Card>
            </div>

            {/* Financeiro */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Financeiro (pagamentos confirmados)</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={DollarSign} label="Receita paga (total)" value={fmtBRL(m.receitaPaga)} note="pago pelos pacientes" tone="green" />
                    <Kpi icon={TrendingUp} label="Receita da plataforma" value={fmtBRL(m.receitaPlataforma)} note="taxa retida (congelada)" tone="brand" />
                    <Kpi icon={Wallet} label="Repasse aos médicos" value={fmtBRL(m.repasse)} tone="teal" />
                    <Kpi icon={Landmark} label="Ticket médio" value={fmtBRL(m.ticket)} note="por consulta paga" />
                </div>
            </div>

            {/* Qualidade */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Qualidade &amp; operação</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Kpi icon={CalendarCheck} label="Consultas atendidas" value={m.atendidos} tone="green" />
                    <Kpi icon={XCircle} label="Cancelamentos" value={m.cancelados} note={`${pct(m.cancelados, m.total)}% do total`} tone="red" />
                    <Kpi icon={RotateCcw} label="Reembolsos" value={m.reembolsados} tone="amber" />
                    <Kpi icon={Star} label="Avaliações recebidas" value={m.nAval} />
                </div>
            </div>

            {/* Aguardando analytics */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-5 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Métricas de topo de funil (aguardando analytics)</p>
                        <p className="text-blue-800/80 leading-relaxed">
                            Visitantes, origem do tráfego, CAC e conversão visita→cadastro dependem do GA4 + Meta Pixel (Fase 0, já
                            instalados no código). Assim que os IDs forem configurados no Vercel, essas métricas passam a ser
                            acompanhadas no Google Analytics e no Gerenciador de Eventos da Meta.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminStrategyPage;
