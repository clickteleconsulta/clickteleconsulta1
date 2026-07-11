import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Stethoscope, CheckCircle2, AlertTriangle } from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const DoctorInviteSignupPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [checking, setChecking] = useState(true);
    const [invite, setInvite] = useState(null);
    const [inviteError, setInviteError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const [form, setForm] = useState({ full_name: '', cpf: '', crm: '', uf: '', whatsapp: '', password: '', confirm: '' });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const validate = useCallback(async () => {
        setChecking(true);
        try {
            const { data, error } = await supabase.rpc('validar_convite_medico', { p_token: token });
            if (error) throw error;
            const row = Array.isArray(data) ? data[0] : data;
            if (!row || !row.email) setInviteError('Convite não encontrado.');
            else if (row.status !== 'pendente') setInviteError('Este convite já foi utilizado ou cancelado.');
            else setInvite(row);
        } catch (err) {
            setInviteError(err.message || 'Não foi possível validar o convite.');
        } finally {
            setChecking(false);
        }
    }, [token]);

    useEffect(() => { validate(); }, [validate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.full_name.trim()) { toast({ variant: 'destructive', title: 'Informe seu nome' }); return; }
        if (!form.crm.trim() || !form.uf) { toast({ variant: 'destructive', title: 'Informe CRM e UF' }); return; }
        if (form.password.length < 6) { toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Use pelo menos 6 caracteres.' }); return; }
        if (form.password !== form.confirm) { toast({ variant: 'destructive', title: 'As senhas não coincidem' }); return; }

        setSubmitting(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: invite.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.full_name.trim(),
                        role: 'medico',
                        cpf: form.cpf.trim(),
                        crm: form.crm.trim(),
                        uf: form.uf,
                        whatsapp: form.whatsapp.trim(),
                    }
                }
            });
            if (error) throw error;
            setDone(true);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao criar conta', description: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
            <Helmet><title>Cadastro de Médico — Click Teleconsulta</title></Helmet>

            <Link to="/" className="mb-6 font-bold text-slate-800 text-lg">Click Teleconsulta</Link>

            <Card className="w-full max-w-lg shadow-lg">
                {checking ? (
                    <CardContent className="py-16 flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm text-slate-500">Validando convite...</p>
                    </CardContent>
                ) : inviteError ? (
                    <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Convite inválido</h2>
                        <p className="text-sm text-slate-500 max-w-sm">{inviteError}</p>
                        <p className="text-xs text-slate-400">Somente profissionais convidados pela administração podem criar uma conta de médico.</p>
                        <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
                    </CardContent>
                ) : done ? (
                    <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Conta criada com sucesso!</h2>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Sua conta de médico foi criada. Faça login para acessar o painel (confirme o e-mail antes, se solicitado).
                        </p>
                        <Button onClick={() => navigate('/acesso-medico')} className="mt-2">Ir para o login</Button>
                    </CardContent>
                ) : (
                    <>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Stethoscope className="w-5 h-5 text-blue-600" /> Criar conta de médico
                            </CardTitle>
                            <CardDescription>
                                Convite para <span className="font-medium text-slate-700">{invite.email}</span>. Preencha seus dados para se tornar parceiro.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">E-mail</Label>
                                    <Input value={invite.email} disabled className="bg-slate-50" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600">Nome completo</Label>
                                    <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dr. Nome Sobrenome" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">CPF</Label>
                                        <Input value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">WhatsApp</Label>
                                        <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">CRM</Label>
                                        <Input value={form.crm} onChange={e => set('crm', e.target.value)} placeholder="000000" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">UF</Label>
                                        <Select value={form.uf} onValueChange={v => set('uf', v)}>
                                            <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">Senha</Label>
                                        <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600">Confirmar senha</Label>
                                        <Input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repita a senha" autoComplete="new-password" />
                                    </div>
                                </div>
                                <Button type="submit" disabled={submitting} className="w-full">
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
                                    Criar minha conta
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    );
};

export default DoctorInviteSignupPage;
