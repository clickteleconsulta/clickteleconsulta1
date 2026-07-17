import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    Loader2, Save, ShieldCheck, CheckCircle2, Circle, Lock, Info, CreditCard, Zap, Landmark, FlaskConical
} from 'lucide-react';

// Provedores suportados. "ready" = já tem integração no código (Stripe: checkout + webhook).
const PROVIDERS = [
    {
        id: 'asaas',
        name: 'Asaas',
        icon: Landmark,
        tagline: 'Gateway brasileiro · Pix, boleto e cartão',
        desc: 'Split de pagamento nativo (facilita o repasse automático aos médicos). Conta exige CNPJ.',
        ready: false,
        secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'],
    },
    {
        id: 'pagarme',
        name: 'Pagar.me',
        icon: Zap,
        tagline: 'Gateway brasileiro (Stone) · Pix e cartão',
        desc: 'Split de recebíveis e antifraude robustos. Conta exige CNPJ.',
        ready: false,
        secrets: ['PAGARME_API_KEY', 'PAGARME_WEBHOOK_SECRET'],
    },
    {
        id: 'stripe',
        name: 'Stripe',
        icon: CreditCard,
        tagline: 'Internacional · Cartão de crédito',
        desc: 'Já integrado no código (checkout e confirmação de pagamento). Ideal para começar em modo teste.',
        ready: true,
        secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    },
];

const AdminPaymentMethodsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowId, setRowId] = useState(null);
    const [provider, setProvider] = useState(null);       // 'asaas' | 'pagarme' | 'stripe' | null
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
                        setProvider(gw.provider ?? null);
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
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <p className="font-semibold">As chaves de API ficam no servidor, nunca aqui.</p>
                        <p className="text-blue-800/80 leading-relaxed mt-0.5">
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
                                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${active ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/40' : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'}`}
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className="font-bold text-gray-900">{p.name}</span>
                                        {p.ready
                                            ? <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Integrado</span>
                                            : <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Requer integração</span>}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{p.tagline}</p>
                                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{p.desc}</p>
                                </div>
                                <div className="shrink-0 mt-1">
                                    {active ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
                                </div>
                            </button>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Ambiente */}
            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title flex items-center gap-2"><FlaskConical className="w-4 h-4 text-primary" /> Ambiente</CardTitle>
                    <CardDescription className="dashboard-subtitle">Comece em <strong>Teste</strong>. Produção exige a conta no gateway com o CNPJ ativo.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="inline-flex p-1 rounded-xl bg-gray-100">
                        {[{ v: 'test', l: 'Teste' }, { v: 'live', l: 'Produção' }].map((e) => (
                            <button
                                key={e.v}
                                type="button"
                                onClick={() => setEnvironment(e.v)}
                                className={`px-5 h-9 rounded-lg text-sm font-semibold transition-all ${environment === e.v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}
                            >
                                {e.l}
                            </button>
                        ))}
                    </div>
                    {environment === 'live' && (
                        <p className="text-xs text-amber-700 mt-3 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Só ative Produção após a conta do gateway estar aprovada (CNPJ).</p>
                    )}
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
                <Button onClick={handleSave} disabled={saving} className="min-w-[160px] bg-primary hover:bg-primary/90 text-white rounded-xl h-10 shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar configuração</>}
                </Button>
            </div>
        </div>
    );
};

export default AdminPaymentMethodsPage;
