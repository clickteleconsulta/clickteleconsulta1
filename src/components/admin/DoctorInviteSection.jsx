import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Send, Copy, Ban, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
    const map = {
        pendente: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
        enviado: { label: 'Enviado', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send },
        aceito: { label: 'Aceito', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
        cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: Ban },
    };
    const s = map[status] || map.pendente;
    const Icon = s.icon;
    return <Badge variant="outline" className={`gap-1 ${s.cls}`}><Icon className="w-3 h-3" /> {s.label}</Badge>;
};

const DoctorInviteSection = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    const inviteLink = (token) => `${window.location.origin}/cadastro-medico/${token}`;

    const sendInvite = async (targetEmail) => {
        const { error } = await supabase.functions.invoke('send-doctor-invite', {
            body: { email: targetEmail, origin: window.location.origin },
        });
        if (error) {
            let msg = error.message;
            try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch (_) { /* ignore */ }
            throw new Error(msg);
        }
    };

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('convites_medico')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } else {
            setInvites(data || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    const handleSend = async (e) => {
        e.preventDefault();
        const clean = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
            toast({ variant: 'destructive', title: 'E-mail inválido', description: 'Informe um e-mail válido.' });
            return;
        }
        setSending(true);
        try {
            await sendInvite(clean);
            toast({ title: 'Convite enviado!', description: `Um e-mail de convite foi enviado para ${clean}.` });
            setEmail('');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao convidar', description: err.message });
        } finally {
            setSending(false);
            fetchInvites();
        }
    };

    const handleResend = async (inv) => {
        try {
            await sendInvite(inv.email);
            toast({ title: 'E-mail reenviado!', description: `Convite reenviado para ${inv.email}.` });
            fetchInvites();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Falha ao reenviar', description: err.message });
        }
    };

    const handleCopy = async (token) => {
        try {
            await navigator.clipboard.writeText(inviteLink(token));
            toast({ title: 'Link copiado!', description: 'Envie ao médico para ele criar a conta.' });
        } catch (_) {
            toast({ variant: 'destructive', title: 'Não foi possível copiar', description: inviteLink(token) });
        }
    };

    const handleCancel = async (id) => {
        const { error } = await supabase.from('convites_medico').update({ status: 'cancelado' }).eq('id', id);
        if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
        else { toast({ title: 'Convite cancelado.' }); fetchInvites(); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" /> Enviar Convite
                </CardTitle>
                <CardDescription>
                    Convide um profissional por e-mail para criar a conta e se tornar parceiro. Somente e-mails convidados podem abrir conta de médico.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="invite-email" className="text-xs font-semibold text-gray-600">E-mail do médico</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            placeholder="medico@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-10"
                        />
                    </div>
                    <Button type="submit" disabled={sending} className="gap-2 h-10">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar convite
                    </Button>
                </form>

                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">Convites enviados</h4>
                    <Button variant="ghost" size="sm" onClick={fetchInvites} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : invites.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Nenhum convite enviado ainda.</p>
                ) : (
                    <div className="border border-gray-200 rounded-lg divide-y">
                        {invites.map((inv) => (
                            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">{inv.email}</span>
                                        <StatusBadge status={inv.status} />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                        Enviado em {inv.created_at ? format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                                        {inv.status === 'aceito' && inv.aceito_em && ` · aceito em ${format(new Date(inv.aceito_em), 'dd/MM/yyyy')}`}
                                    </p>
                                </div>
                                {['pendente', 'enviado'].includes(inv.status) && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button variant="outline" size="sm" onClick={() => handleResend(inv)} className="gap-1.5 h-8 text-xs">
                                            <Send className="w-3.5 h-3.5" /> Reenviar
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleCopy(inv.token)} className="gap-1.5 h-8 text-xs">
                                            <Copy className="w-3.5 h-3.5" /> Copiar link
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleCancel(inv.id)} className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <Ban className="w-3.5 h-3.5" /> Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DoctorInviteSection;
