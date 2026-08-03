import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    Loader2, Save, ShieldCheck, CheckCircle2, Circle, Lock, Info, Landmark, FlaskConical
} from 'lucide-react';

// Provedor de pagamento da plataforma: Asaas (checkout hospedado · Pix e cartão).
// Ativo em produção: Edge Functions (create-asaas-payment, asaas-webhook, refund, reconcile) no ar e chaves configuradas.
const PROVIDERS = [
    {
        id: 'asaas',
        name: 'Asaas',
        icon: Landmark,
        tagline: 'Gateway brasileiro · Pix e cartão de crédito',
        desc: 'Checkout hospedado: o paciente paga numa página segura do Asaas (Pix ou cartão). Split nativo facilita o repasse automático aos médicos. Conta exige CNPJ.',
        ready: true,
        secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'],
    },
];

const AdminPaymentMethodsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState(null);
    const [provider, setProvider] = useState('asaas');    // Asaas é o provedor da plataforma
    const [environment, setEnvironment] = useState('test'); // 'test' | 'live'

    useEffect(() => {
        const fetchConfig = async () => {
            if (!user) return;
            try {
                const { data } = await supabase.from('configuracoes_site').select('id, settings').limit(1).maybeSingle();
                if (data) {
                    setRowId(data.id);
                    const gw = data.settings?.payment_gateway;
                    if (gw) {
                        setProvider(PROVIDERS.some(p => p.id === gw.provider) ? gw.provider : 'asaas');
                        setEnvironment(gw.environment ?? 'test');
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar gateway:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: current } = await supabase.from('configuracoes_site').select('id, settings').limit(1).maybeSingle();
            const currentSettings = current?.settings || {};
            const newSettings = { ...currentSettings, payment_gateway: { provider, environment, updated_at: new Date().toISOString() } };

            let error;
            if (current?.id) {
                ({ error } = await supabase.from('configuracoes_site').update({ settings: newSettings }).eq('id', current.id));
            } else {
                ({ error } = await supabase.from('configuracoes_site').insert({ id: 1, settings: newSettings }));
            }
            if (error) throw error;
            toast({ title: 'Salvo!', description: 'Configuração de gateway atualizada.', variant: 'success' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    const selected = PROVIDERS.find(p => p.id === provider);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h3 className="dashboard-title text-xl">Métodos de Recebimento</h3>
                <p className="text-sm text-muted-foreground">Escolha o gateway que processará os pagamentos dos pacientes.</p>
            </div>

            {/* Aviso de segurança */}
            <Card className="bg-brand-50/50 border-brand-100">
                <CardContent className="p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-brand-800">
                        <p className="font-semibold">As chaves de API ficam no servidor, nunca aqui.</p>
                        <p className="text-brand-800/80 leading-relaxed mt-0.5">
                            Aqui você apenas <strong>seleciona o provedor e o ambiente</strong>. As chaves secretas são
                            guardadas como <strong>Supabase Secrets</strong> (backend) e usadas pelas Edge Functions —
                            assim nenhuma credencial sensível passa pelo navegador ou fica salva no banco.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Seleção de provedor */}
            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title">Provedor de pagamento</CardTitle>
                    <CardDescription className="dashboard-subtitle">Um provedor ativo por vez. Você pode trocar quando quiser.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-3">
                    {PROVIDERS.map((p) => {
                        const active = provider === p.id;
                        const Icon = p.icon;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setProvider(p.id)}
                                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${active ? 'border-brand-400 ring-2 ring-brand-100 bg-brand-50/40' : 'border-gray-200 hover:border-brand-200 hover:bg-gray-50'}`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-bold text-gray-900">{p.name}</span>
                                        {p.ready
                                            ? <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Integrado</span>
                                            : <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Requer integração</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{p.tagline}</p>
                                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{p.desc}</p>
                                </div>
                                <div className="shrink-0 mt-1">
                                    {active ? <CheckCircle2 className="w-5 h-5 text-brand-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
                                </div>
                            </button>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Ambiente — informativo. O ambiente real NÃO é controlado por esta tela:
                quem manda é o segredo ASAAS_ENV das Edge Functions. Um seletor aqui daria
                a falsa impressão de estar em Teste enquanto a produção já roda. */}
            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title flex items-center gap-2"><FlaskConical className="w-4 h-4 text-primary" /> Ambiente</CardTitle>
                    <CardDescription className="dashboard-subtitle">Definido no servidor, não por esta tela.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p>
                                O ambiente (<strong>sandbox</strong> ou <strong>produção</strong>) é definido pelo
                                segredo <code className="font-mono text-[12px] bg-white/70 px-1 rounded">ASAAS_ENV</code> nas
                                Edge Functions do Supabase, junto com a chave de API.
                            </p>
                            <p className="text-brand-800/90">
                                Alterar aqui não mudaria o processamento real — por isso esta seção é apenas informativa.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checklist de ativação do provedor selecionado */}
            {selected && (
                <Card className="dashboard-card">
                    <CardHeader className="px-0 pt-0 pb-3">
                        <CardTitle className="dashboard-title flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Para ativar o {selected.name}</CardTitle>
                        <CardDescription className="dashboard-subtitle">Estes segredos precisam ser cadastrados no backend (Supabase Secrets) pela equipe técnica.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 space-y-2">
                        {selected.secrets.map((s) => (
                            <div key={s} className="flex items-center gap-2 text-sm">
                                <code className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">{s}</code>
                                <span className="text-gray-400 text-xs">— segredo no servidor</span>
                            </div>
                        ))}
                        {!selected.ready && (
                            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" /> O {selected.name} ainda não tem integração no código — precisa ser implementado antes de usar em produção.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="min-w-[160px] bg-primary hover:bg-primary/90 text-white rounded-xl h-10 shadow-md shadow-brand-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar configuração</>}
                </Button>
            </div>
        </div>
    );
};

export default AdminPaymentMethodsPage;
