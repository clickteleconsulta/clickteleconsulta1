import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import DoctorPageHeader from '@/components/doctor/DoctorPageHeader';
import ConsultationStatusBadge from '@/components/doctor/ConsultationStatusBadge';
import {
    Loader2, LayoutDashboard, CalendarDays, Wallet, Star, Clock, ChevronRight,
    BellRing, CheckCircle2, Circle, AlertTriangle, FileWarning, CalendarClock, Landmark, ArrowRight, ExternalLink
} from 'lucide-react';

const TZ = 'America/Sao_Paulo';
const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ATIVAS = ['confirmado', 'pendente', 'reagendado', 'agendado'];

const DoctorOverview = () => {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const fetchAll = useCallback(async () => {
        const uid = session?.user?.id;
        if (!uid) return;
        setLoading(true);
        try {
            const { data: med } = await supabase.from('medicos')
                .select('id, public_name, name, specialty, sexo, formacao, bio, description, status, is_public, is_active, payment_settings')
                .eq('user_id', uid).maybeSingle();
            const docId = med?.id;
            // Dados bancários na tabela privada (RLS dono+admin)
            const { data: bank } = await supabase.from('medico_dados_bancarios')
                .select('withdrawal_payment_method, withdrawal_pix_key, withdrawal_bank_account, withdrawal_bank_agency')
                .eq('user_id', uid).maybeSingle();

            const todayStr = format(utcToZonedTime(new Date(), TZ), 'yyyy-MM-dd');
            const start = zonedTimeToUtc(`${todayStr} 00:00:00`, TZ).toISOString();
            const end = zonedTimeToUtc(`${todayStr} 23:59:59`, TZ).toISOString();

            const [hojeRes, saldoRes, avalRes, agendaRes, docsRes] = await Promise.all([
                docId ? supabase.from('agendamentos')
                    .select('id, horario_inicio, appointment_time, paciente_nome, status, patient:perfis_usuarios!patient_id(full_name)')
                    .eq('medico_id', docId).gte('horario_inicio', start).lte('horario_inicio', end).in('status', ATIVAS)
                    .order('horario_inicio', { ascending: true }) : Promise.resolve({ data: [] }),
                docId ? supabase.from('agendamentos')
                    .select('price_in_cents, taxa_percent_snapshot')
                    .eq('medico_id', docId).eq('pagamento_status', 'pago').is('saque_id', null).neq('status', 'cancelado') : Promise.resolve({ data: [] }),
                supabase.from('avaliacoes').select('rating').eq('medico_id', uid),
                docId ? supabase.from('agenda_medico').select('id', { count: 'exact', head: true }).eq('medico_id', docId) : Promise.resolve({ count: 0 }),
                supabase.from('medico_documentos').select('status').eq('user_id', uid),
            ]);

            const feeDefault = Number(med?.payment_settings?.platform_fee_percent) || 0;
            const saldoGuias = saldoRes.data || [];
            const saldo = saldoGuias.reduce((s, g) => {
                const total = (g.price_in_cents || 0) / 100;
                const fee = (g.taxa_percent_snapshot != null ? Number(g.taxa_percent_snapshot) : feeDefault);
                return s + (total - total * (fee / 100));
            }, 0);

            const ratings = (avalRes.data || []).map(r => r.rating).filter(Boolean);
            const notaMedia = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

            const docs = docsRes.data || [];
            const docStatuses = docs.map(d => d.status);

            setData({
                med, bank: bank || {},
                hoje: hojeRes.data || [],
                saldo, saldoCount: saldoGuias.length,
                notaMedia, nAval: ratings.length,
                agendaCount: agendaRes.count || 0,
                temDocs: docs.length > 0,
                docRejeitado: docStatuses.includes('rejeitado'),
                docEmAnalise: docStatuses.includes('pendente'),
            });
        } catch {
            /* silencioso */
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if (loading || !data) {
        return <div className="flex h-[40vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    const { med, bank, hoje, saldo, saldoCount, notaMedia, nAval, agendaCount, temDocs, docRejeitado, docEmAnalise } = data;

    const horaDe = (a) => a.horario_inicio ? format(utcToZonedTime(new Date(a.horario_inicio), TZ), 'HH:mm') : (a.appointment_time || '').slice(0, 5);
    const nomePaciente = (a) => a.paciente_nome || a.patient?.full_name || 'Paciente';
    const proxima = hoje[0];

    // Dados bancários completos? (tabela privada medico_dados_bancarios)
    const bancoOk = bank?.withdrawal_payment_method === 'pix'
        ? !!bank?.withdrawal_pix_key
        : bank?.withdrawal_payment_method === 'transferencia'
            ? !!(bank?.withdrawal_bank_account && bank?.withdrawal_bank_agency)
            : false;
    const perfilOk = !!(med?.public_name && med?.specialty && med?.sexo && (med?.formacao || med?.bio || med?.description));
    const agendaOk = agendaCount > 0;
    const ativoOk = med?.status === 'ativo';

    // Checklist de ativação
    const checklist = [
        { ok: perfilOk, label: 'Complete seu perfil', to: '/medico/dashboard/perfil', hint: 'Nome público, especialidade, sexo e formação' },
        { ok: temDocs, label: 'Envie sua documentação', to: '/medico/dashboard/perfil', hint: 'Certificado e carteirinha do conselho' },
        { ok: agendaOk, label: 'Configure sua agenda', to: '/medico/dashboard/agenda', hint: 'Defina os dias e horários de atendimento' },
        { ok: bancoOk, label: 'Cadastre seus dados bancários', to: '/medico/dashboard/financeiro', hint: 'Para receber os repasses' },
        { ok: ativoOk, label: 'Perfil aprovado e ativo', to: '/medico/dashboard/perfil', hint: 'Análise da administração após o envio dos documentos' },
    ];
    const feitos = checklist.filter(c => c.ok).length;
    const checklistCompleto = feitos === checklist.length;

    // Pendências ("Precisa da sua atenção")
    const pend = [];
    if (docRejeitado) pend.push({ key: 'docrej', tone: 'red', icon: FileWarning, label: 'Documentação recusada', sub: 'Reenvie os documentos para aprovação', to: '/medico/dashboard/perfil' });
    if (!agendaOk) pend.push({ key: 'agenda', tone: 'amber', icon: CalendarClock, label: 'Agenda não configurada', sub: 'Defina seus horários para receber agendamentos', to: '/medico/dashboard/agenda' });
    if (!bancoOk) pend.push({ key: 'banco', tone: 'amber', icon: Landmark, label: 'Dados bancários pendentes', sub: 'Cadastre para poder sacar seus repasses', to: '/medico/dashboard/financeiro' });
    if (!ativoOk && !docRejeitado) pend.push({ key: 'pausado', tone: 'blue', icon: AlertTriangle, label: docEmAnalise ? 'Documentação em análise' : 'Perfil pausado', sub: docEmAnalise ? 'Aguarde a aprovação da administração' : 'Envie sua documentação para ativar o perfil', to: '/medico/dashboard/perfil' });
    if (saldo > 0) pend.push({ key: 'saque', tone: 'teal', icon: Wallet, label: `${fmtBRL(saldo)} disponível para saque`, sub: `${saldoCount} guia(s) paga(s) prontas para retirada`, to: '/medico/dashboard/financeiro' });

    const toneCls = {
        red: 'bg-red-50 text-red-700 border-red-100', amber: 'bg-amber-50 text-amber-700 border-amber-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100', teal: 'bg-teal-50 text-teal-700 border-teal-100',
    };

    const Kpi = ({ icon: Icon, label, value, note, tone = 'text-gray-900' }) => (
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${tone}`}>{value}</div>
                {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <DoctorPageHeader icon={LayoutDashboard} title="Painel" subtitle="Sua visão geral do dia — consultas, saldo e pendências.">
                {med?.id && med?.is_active && (
                    <Button asChild variant="outline" size="sm" className="gap-2 shrink-0 border-gray-300 text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50">
                        <Link to={`/medico/${med.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" /> Ver meu perfil público
                        </Link>
                    </Button>
                )}
            </DoctorPageHeader>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi icon={CalendarDays} label="Consultas hoje" value={hoje.length} tone="text-blue-700"
                    note={proxima ? `Próxima ${horaDe(proxima)} · ${nomePaciente(proxima)}` : 'Nenhuma para hoje'} />
                <Kpi icon={Wallet} label="Saldo a receber" value={fmtBRL(saldo)} tone="text-teal-700" note={`${saldoCount} guia(s) para saque`} />
                <Kpi icon={Star} label="Nota média" value={notaMedia ? notaMedia.toFixed(1) : '—'} tone="text-amber-600" note={`${nAval} avaliação(ões)`} />
                <Kpi icon={CheckCircle2} label="Ativação" value={`${feitos}/${checklist.length}`} tone={checklistCompleto ? 'text-emerald-600' : 'text-gray-900'} note={checklistCompleto ? 'Tudo pronto 🎉' : 'Passos para começar'} />
            </div>

            {/* Precisa da sua atenção */}
            {pend.length > 0 && (
                <Card className="border-amber-200/70">
                    <CardHeader className="pb-3"><CardTitle className="dashboard-title flex items-center gap-2 text-base"><BellRing className="w-4 h-4 text-amber-600" /> Precisa da sua atenção</CardTitle></CardHeader>
                    <CardContent className="pt-0 grid gap-2.5 sm:grid-cols-2">
                        {pend.map((p) => (
                            <Link key={p.key} to={p.to} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5">
                                <span className={`flex items-center justify-center w-10 h-10 rounded-lg border shrink-0 ${toneCls[p.tone]}`}><p.icon className="w-5 h-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                                    <p className="text-xs text-gray-500 truncate">{p.sub}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary shrink-0" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Consultas de hoje */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="dashboard-title flex items-center gap-2 text-base"><CalendarDays className="w-4 h-4 text-primary" /> Consultas de hoje</CardTitle>
                        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary"><Link to="/medico/dashboard/consultas">Ver todas <ArrowRight className="w-3.5 h-3.5" /></Link></Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {hoje.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma consulta agendada para hoje.</p>
                        ) : hoje.slice(0, 6).map((a) => (
                            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 tabular-nums"><Clock className="w-3.5 h-3.5 text-primary" /> {horaDe(a)}</span>
                                <span className="flex-1 text-sm text-gray-700 truncate">{nomePaciente(a)}</span>
                                <ConsultationStatusBadge status={a.status} size="sm" />
                            </div>
                        ))}
                        {hoje.length > 6 && <p className="text-xs text-gray-400 text-center pt-1">+{hoje.length - 6} mais</p>}
                    </CardContent>
                </Card>

                {/* Checklist de ativação */}
                <Card className={checklistCompleto ? 'border-emerald-100 bg-emerald-50/40' : ''}>
                    <CardHeader className="pb-3">
                        <CardTitle className="dashboard-title flex items-center gap-2 text-base"><CheckCircle2 className="w-4 h-4 text-primary" /> Ativação do perfil</CardTitle>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(feitos / checklist.length) * 100}%` }} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        {checklistCompleto ? (
                            <p className="text-sm text-emerald-700 py-2">Seu perfil está completo e ativo. Você já aparece na página pública de agendamentos. 🎉</p>
                        ) : checklist.map((c, i) => (
                            <Link key={i} to={c.to} className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${c.ok ? 'opacity-60' : 'hover:bg-gray-50'}`}>
                                {c.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium ${c.ok ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{c.label}</p>
                                    {!c.ok && <p className="text-xs text-gray-500 truncate">{c.hint}</p>}
                                </div>
                                {!c.ok && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DoctorOverview;
