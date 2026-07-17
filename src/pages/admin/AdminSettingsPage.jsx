import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, SlidersHorizontal, Percent, Wallet, CalendarClock, Info, CreditCard, FileText, ShieldCheck, Bot } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminPaymentMethodsPage from '@/pages/admin/AdminPaymentMethodsPage';
import AdminLegalPage from '@/pages/admin/AdminLegalPage';
import AdminSecurityPage from '@/pages/admin/AdminSecurityPage';
import AdminAiTrainingPage from '@/pages/admin/AdminAiTrainingPage';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const DEFAULTS = {
    default_fee_percent: 25,
    default_repasse: 30,
    repasse_min: 30,
    repasse_max: 150,
    cancel_window_hours: 3,
    refund_full_hours: 48,
    refund_partial_hours: 24,
    refund_partial_pct: 50,
};

const Field = ({ label, suffix, value, onChange, step = '1', min = '0' }) => (
    <div className="space-y-1.5">
        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</Label>
        <div className="relative">
            <Input type="number" step={step} min={min} value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm pr-12" />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{suffix}</span>}
        </div>
    </div>
);

const PlatformRules = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState(null);
    const [r, setR] = useState(DEFAULTS);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase.from('configuracoes_site').select('id, settings').limit(1).maybeSingle();
                if (data) {
                    setRowId(data.id);
                    setR({ ...DEFAULTS, ...(data.settings?.platform_rules || {}) });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
            } finally {
                setLoading(false);
            }
        })();
    }, [toast]);

    const set = (k) => (v) => setR((p) => ({ ...p, [k]: v }));

    const handleSave = async () => {
        // Normaliza para número e valida
        const rules = {};
        Object.keys(DEFAULTS).forEach((k) => { rules[k] = Number(r[k]); });
        if (rules.repasse_min > rules.repasse_max) {
            toast({ variant: 'destructive', title: 'Valores inconsistentes', description: 'O repasse mínimo não pode ser maior que o máximo.' });
            return;
        }
        setSaving(true);
        try {
            const { data: current } = await supabase.from('configuracoes_site').select('id, settings').limit(1).maybeSingle();
            const currentSettings = current?.settings || {};
            const newSettings = { ...currentSettings, platform_rules: { ...(currentSettings.platform_rules || {}), ...rules } };
            let error;
            if (current?.id) {
                ({ error } = await supabase.from('configuracoes_site').update({ settings: newSettings }).eq('id', current.id));
            } else {
                ({ error } = await supabase.from('configuracoes_site').insert({ settings: newSettings }));
            }
            if (error) throw error;
            toast({ title: 'Configurações salvas!', description: 'As novas regras já valem para o sistema.', variant: 'success' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    // Prévia do preço ao paciente com a taxa e repasse padrão
    const previewPaciente = r.default_fee_percent < 100
        ? (Math.ceil((Number(r.default_repasse) / (1 - Number(r.default_fee_percent) / 100)) * 2) / 2)
        : 0;

    return (
        <div className="space-y-6 max-w-4xl">

            {/* Repasse & taxa */}
            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title flex items-center gap-2"><Percent className="w-4 h-4 text-primary" /> Repasse &amp; taxa (novas contas)</CardTitle>
                    <CardDescription className="dashboard-subtitle">Valores padrão aplicados quando um novo médico é cadastrado.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Taxa da plataforma" suffix="%" value={r.default_fee_percent} onChange={set('default_fee_percent')} />
                    <Field label="Repasse padrão" suffix="R$" value={r.default_repasse} onChange={set('default_repasse')} />
                    <Field label="Repasse mínimo" suffix="R$" value={r.repasse_min} onChange={set('repasse_min')} />
                    <Field label="Repasse máximo" suffix="R$" value={r.repasse_max} onChange={set('repasse_max')} />
                    <div className="md:col-span-2 flex items-start gap-2 text-xs text-blue-800 bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                        <span>Com repasse <strong>R$ {Number(r.default_repasse).toFixed(2)}</strong> e taxa <strong>{Number(r.default_fee_percent)}%</strong>, o paciente pagaria ~<strong>R$ {previewPaciente.toFixed(2)}</strong> (repasse ÷ (1 − taxa), arredondado).</span>
                    </div>
                </CardContent>
            </Card>

            {/* Cancelamento & reembolso */}
            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" /> Cancelamento &amp; reembolso</CardTitle>
                    <CardDescription className="dashboard-subtitle">Regras para o paciente cancelar consultas pagas e o reembolso proporcional.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Prazo para cancelar consulta paga" suffix="horas antes" value={r.cancel_window_hours} onChange={set('cancel_window_hours')} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Reembolso 100% se faltar +de" suffix="horas" value={r.refund_full_hours} onChange={set('refund_full_hours')} />
                        <Field label="Reembolso parcial se faltar +de" suffix="horas" value={r.refund_partial_hours} onChange={set('refund_partial_hours')} />
                        <Field label="% do reembolso parcial" suffix="%" value={r.refund_partial_pct} onChange={set('refund_partial_pct')} />
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Regra atual: cancelamento permitido até <strong>{Number(r.cancel_window_hours)}h</strong> antes · reembolso <strong>100%</strong> com +{Number(r.refund_full_hours)}h · <strong>{Number(r.refund_partial_pct)}%</strong> entre {Number(r.refund_partial_hours)}h e {Number(r.refund_full_hours)}h · <strong>0%</strong> abaixo de {Number(r.refund_partial_hours)}h. Consultas já atendidas nunca são canceláveis.</span>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="min-w-[180px] bg-primary hover:bg-primary/90 text-white rounded-xl h-10 shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar configurações</>}
                </Button>
            </div>
        </div>
    );
};

const TABS = [
    { v: 'regras', label: 'Regras', icon: SlidersHorizontal },
    { v: 'pagamentos', label: 'Métodos de Recebimento', icon: CreditCard },
    { v: 'legal', label: 'Documentos Legais', icon: FileText },
    { v: 'seguranca', label: 'Segurança', icon: ShieldCheck },
    { v: 'ia', label: 'Assistente IA', icon: Bot },
];

const AdminSettingsPage = () => {
    const [params, setParams] = useSearchParams();
    const active = TABS.some(t => t.v === params.get('tab')) ? params.get('tab') : 'regras';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <AdminPageHeader icon={SlidersHorizontal} title="Configurações"
                subtitle="Regras de negócio, recebimento, documentos legais, segurança e assistente de IA." />

            <Tabs value={active} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-gray-100/80 rounded-xl">
                    {TABS.map((t) => (
                        <TabsTrigger key={t.v} value={t.v}
                            className="gap-1.5 rounded-lg text-sm px-3 py-1.5 transition-all duration-200 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="regras" className="mt-5"><PlatformRules /></TabsContent>
                <TabsContent value="pagamentos" className="mt-5"><AdminPaymentMethodsPage /></TabsContent>
                <TabsContent value="legal" className="mt-5"><AdminLegalPage /></TabsContent>
                <TabsContent value="seguranca" className="mt-5"><AdminSecurityPage /></TabsContent>
                <TabsContent value="ia" className="mt-5"><AdminAiTrainingPage /></TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSettingsPage;
