import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Power, PowerOff, Globe, EyeOff } from 'lucide-react';

const DEFAULT_MSG = 'Estamos realizando melhorias na plataforma para atendê-lo melhor. Voltamos em instantes.';

// Liga/desliga o modo manutenção (settings.maintenance em configuracoes_site).
// Efeito é imediato para os visitantes — não exige novo deploy.
const MaintenanceToggle = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState(DEFAULT_MSG);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await supabase.from('configuracoes_site').select('settings').limit(1).maybeSingle();
                const m = data?.settings?.maintenance || {};
                setEnabled(!!m.enabled);
                setMessage(m.message || DEFAULT_MSG);
            } catch (err) {
                toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
            } finally {
                setLoading(false);
            }
        })();
    }, [toast]);

    const persist = async (nextEnabled) => {
        setSaving(true);
        try {
            const { data: current } = await supabase.from('configuracoes_site').select('id, settings').limit(1).maybeSingle();
            const cur = current?.settings || {};
            const newSettings = {
                ...cur,
                maintenance: { enabled: nextEnabled, message: (message || DEFAULT_MSG).trim(), updated_at: new Date().toISOString() },
            };
            let error;
            if (current?.id) {
                ({ error } = await supabase.from('configuracoes_site').update({ settings: newSettings }).eq('id', current.id));
            } else {
                ({ error } = await supabase.from('configuracoes_site').insert({ settings: newSettings }));
            }
            if (error) throw error;
            setEnabled(nextEnabled);
            toast({
                title: nextEnabled ? 'Site em manutenção' : 'Site no ar',
                description: nextEnabled
                    ? 'Visitantes e pacientes veem a página de manutenção. Você continua com acesso ao painel.'
                    : 'A plataforma voltou a ficar visível para todos.',
                className: nextEnabled ? 'bg-amber-600 text-white border-none' : 'bg-green-600 text-white border-none',
            });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <Card className={`max-w-2xl ${enabled ? 'border-amber-300' : 'border-gray-200'}`}>
            <CardHeader>
                <CardTitle className="dashboard-title flex items-center gap-2">
                    {enabled ? <EyeOff className="w-5 h-5 text-amber-600" /> : <Globe className="w-5 h-5 text-green-600" />}
                    Modo manutenção
                </CardTitle>
                <CardDescription className="dashboard-subtitle">
                    Esconde o site público. Só o painel administrativo continua acessível. O efeito é imediato — não precisa de novo deploy.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className={`flex items-center gap-3 rounded-xl border p-3.5 text-sm font-medium ${enabled ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-amber-500' : 'bg-green-500'}`} />
                    {enabled ? 'O site está EM MANUTENÇÃO no momento.' : 'O site está NO AR normalmente.'}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Mensagem exibida aos visitantes</Label>
                    <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={DEFAULT_MSG}
                        className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm" />
                    <p className="text-xs text-gray-400">A mensagem é salva junto ao ligar/desligar. Você também pode salvá-la com o site no ar.</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                    {enabled ? (
                        <Button onClick={() => persist(false)} disabled={saving}
                            className="min-w-[190px] bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 shadow-md">
                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aplicando…</> : <><Power className="w-4 h-4 mr-2" /> Colocar o site no ar</>}
                        </Button>
                    ) : (
                        <Button onClick={() => persist(true)} disabled={saving}
                            className="min-w-[190px] bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 shadow-md">
                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aplicando…</> : <><PowerOff className="w-4 h-4 mr-2" /> Colocar em manutenção</>}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => persist(enabled)} disabled={saving} className="rounded-xl h-10">
                        Salvar mensagem
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default MaintenanceToggle;
