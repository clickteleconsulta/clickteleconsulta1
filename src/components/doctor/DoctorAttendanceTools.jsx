import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, AlertTriangle, Wrench } from 'lucide-react';

// Categorias e opções de ferramentas. Os nomes são apenas produtos de mercado;
// os textos de aviso/declaração foram redigidos de forma própria da Click.
const CATEGORIES = [
    { key: 'videoconferencia', label: 'Videoconferência', options: ['Conexa', 'Doctoralia', 'Google Meet', 'GoTo Meeting', 'Zoom'] },
    { key: 'prontuario', label: 'Prontuário eletrônico', options: ['Amplimed', 'Bionexo', 'Doctoralia', 'iClinic', 'iMedicina', 'Link Saúde', 'Memed'] },
    { key: 'prescricao', label: 'Prescrição digital', options: ['Amplimed', 'Diagnes', 'Doctoralia', 'iClinic', 'iMedicina', 'Laudo Online', 'Memed', 'Prescrição Eletrônica - CFM', 'Pulsares', 'Receita Digital'] },
    { key: 'atestado', label: 'Declaração e atestado', options: ['Diagnes', 'Doctoralia', 'iClinic', 'iMedicina', 'Laudo Online', 'Memed', 'Pró Laudo', 'Pulsares'] },
];

const DECLARACAO = 'Declaro, sob as penas da lei, que as ferramentas que utilizo no atendimento estão adequadas à Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e que possuo aptidão e situação regular para exercer a teleconsulta, conforme as normas do meu conselho profissional (CFM, CRP, CREFITO, entre outros).';

const DoctorAttendanceTools = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sel, setSel] = useState({});         // { [key]: string[] }
    const [outraOn, setOutraOn] = useState({}); // { [key]: bool }
    const [outra, setOutra] = useState({});     // { [key]: string }
    const [declaracao, setDeclaracao] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase.from('medicos').select('ferramentas_atendimento').eq('user_id', user.id).maybeSingle();
            const f = data?.ferramentas_atendimento || {};
            const s = {}, on = {}, o = {};
            CATEGORIES.forEach((c) => {
                s[c.key] = Array.isArray(f[c.key]) ? f[c.key] : [];
                o[c.key] = f[`${c.key}_outra`] || '';
                on[c.key] = !!f[`${c.key}_outra`];
            });
            setSel(s); setOutra(o); setOutraOn(on); setDeclaracao(!!f.declaracao);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { load(); }, [load]);

    const toggleOpt = (key, opt) => setSel((p) => ({
        ...p,
        [key]: (p[key] || []).includes(opt) ? (p[key] || []).filter((x) => x !== opt) : [...(p[key] || []), opt],
    }));

    const toggleOutra = (key, val) => {
        setOutraOn((p) => ({ ...p, [key]: val }));
        if (!val) setOutra((p) => ({ ...p, [key]: '' }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { declaracao: true, atualizado_em: new Date().toISOString() };
            CATEGORIES.forEach((c) => {
                payload[c.key] = sel[c.key] || [];
                payload[`${c.key}_outra`] = outraOn[c.key] ? (outra[c.key] || '').trim() : '';
            });
            const { error } = await supabase.from('medicos').update({ ferramentas_atendimento: payload }).eq('user_id', user.id);
            if (error) throw error;
            toast({ title: 'Salvo!', description: 'Suas ferramentas de atendimento foram atualizadas.', variant: 'success' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    return (
        <div className="space-y-5">
            {/* Aviso */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                    <p className="font-bold">Atenção</p>
                    <p className="text-amber-800 leading-relaxed mt-0.5">
                        A Click Teleconsulta é um marketplace de agendamento e <strong>não fornece ferramentas de atendimento remoto</strong> (videochamada, prontuário, prescrição, etc.). O acesso e o uso dessas ferramentas para realizar as consultas são de <strong>responsabilidade exclusiva do médico parceiro</strong>.
                    </p>
                </div>
            </div>

            <Card className="dashboard-card">
                <CardHeader className="px-0 pt-0 pb-4">
                    <CardTitle className="dashboard-title flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Ferramentas para atendimento</CardTitle>
                    <CardDescription className="dashboard-subtitle">Selecione as ferramentas que você utiliza para realizar suas teleconsultas online.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-7">
                    {CATEGORIES.map((c) => (
                        <div key={c.key} className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-800">{c.label}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                                {c.options.map((opt) => (
                                    <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 select-none">
                                        <Checkbox checked={(sel[c.key] || []).includes(opt)} onCheckedChange={() => toggleOpt(c.key, opt)} />
                                        {opt}
                                    </label>
                                ))}
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 select-none">
                                    <Checkbox checked={!!outraOn[c.key]} onCheckedChange={(v) => toggleOutra(c.key, !!v)} />
                                    Outra
                                </label>
                            </div>
                            {outraOn[c.key] && (
                                <div className="max-w-md">
                                    <Input
                                        value={outra[c.key] || ''}
                                        maxLength={100}
                                        onChange={(e) => setOutra((p) => ({ ...p, [c.key]: e.target.value }))}
                                        placeholder="Qual ferramenta?"
                                        className="h-10 text-sm"
                                    />
                                    <p className="text-[11px] text-gray-400 text-right mt-1">{(outra[c.key] || '').length}/100</p>
                                </div>
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Declaração */}
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4 cursor-pointer">
                <Checkbox checked={declaracao} onCheckedChange={(v) => setDeclaracao(!!v)} className="mt-0.5" />
                <span className="text-xs text-gray-600 leading-relaxed">{DECLARACAO}</span>
            </label>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !declaracao} className="min-w-[180px]">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>}
                </Button>
            </div>
        </div>
    );
};

export default DoctorAttendanceTools;
