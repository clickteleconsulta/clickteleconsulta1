import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import {
    Loader2,
    User,
    FileText,
    Eye,
    Check,
    X,
    Clock,
    FileCheck2,
    Search,
    ShieldCheck,
    Inbox,
} from 'lucide-react';

const SLOT_LABELS = {
    certificado: 'Certificado de Especialização',
    carteirinha_frente: 'Carteirinha do Conselho — Frente',
    carteirinha_verso: 'Carteirinha do Conselho — Verso',
};
const SLOT_ORDER = ['certificado', 'carteirinha_frente', 'carteirinha_verso'];

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StatusPill = ({ status }) => {
    const map = {
        pendente: { label: 'Em análise', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
        aprovado: { label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileCheck2 },
        rejeitado: { label: 'Rejeitado', cls: 'bg-red-50 text-red-700 border-red-200', icon: X },
    };
    const s = map[status] || map.pendente;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            <Icon className="w-3 h-3" /> {s.label}
        </span>
    );
};

const AdminProfessionalDocsPage = () => {
    const { toast } = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: docs, error } = await supabase
                .from('medico_documentos')
                .select('*')
                .order('uploaded_at', { ascending: false });
            if (error) throw error;

            const userIds = [...new Set((docs || []).map((d) => d.user_id))];
            const medicosMap = {};
            const perfisMap = {};

            if (userIds.length > 0) {
                const [{ data: medicos }, { data: perfis }] = await Promise.all([
                    supabase.from('medicos').select('id, user_id, public_name, specialty, crm, uf, image_url, is_public, is_active').in('user_id', userIds),
                    supabase.from('perfis_usuarios').select('id, full_name, email').in('id', userIds),
                ]);
                (medicos || []).forEach((m) => { medicosMap[m.user_id] = m; });
                (perfis || []).forEach((p) => { perfisMap[p.id] = p; });
            }

            const byUser = {};
            (docs || []).forEach((d) => {
                if (!byUser[d.user_id]) byUser[d.user_id] = [];
                byUser[d.user_id].push(d);
            });

            const result = userIds.map((uid) => {
                const medico = medicosMap[uid] || {};
                const perfil = perfisMap[uid] || {};
                const items = byUser[uid] || [];
                const hasPending = items.some((i) => (i.status || 'pendente') === 'pendente');
                return {
                    user_id: uid,
                    medico_id: medico.id || null,
                    is_public: medico.is_public,
                    name: medico.public_name || perfil.full_name || 'Profissional',
                    email: perfil.email || '',
                    specialty: medico.specialty || '',
                    crm: medico.crm ? `${medico.crm}${medico.uf ? '/' + medico.uf : ''}` : '',
                    image_url: medico.image_url,
                    items,
                    hasPending,
                };
            });

            result.sort((a, b) => (b.hasPending ? 1 : 0) - (a.hasPending ? 1 : 0));
            setGroups(result);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleView = async (doc) => {
        setBusyId(doc.id);
        try {
            const { data, error } = await supabase.storage.from('doctor-documents').createSignedUrl(doc.path, 120);
            if (error) throw error;
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao abrir', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const setStatus = async (doc, status) => {
        setBusyId(doc.id);
        try {
            const { error } = await supabase
                .from('medico_documentos')
                .update({ status })
                .eq('id', doc.id);
            if (error) throw error;
            setGroups((prev) =>
                prev.map((g) =>
                    g.user_id !== doc.user_id
                        ? g
                        : {
                              ...g,
                              items: g.items.map((it) => (it.id === doc.id ? { ...it, status } : it)),
                              hasPending: g.items.some((it) => it.id !== doc.id && (it.status || 'pendente') === 'pendente'),
                          }
                )
            );
            toast({ title: status === 'aprovado' ? 'Documento aprovado' : 'Documento rejeitado' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const approveAndActivate = async (group) => {
        setBusyId(group.user_id);
        try {
            // Aprova todos os documentos do profissional
            const { error: docErr } = await supabase
                .from('medico_documentos')
                .update({ status: 'aprovado' })
                .eq('user_id', group.user_id);
            if (docErr) throw docErr;

            // Ativa o perfil (visível ao público). O status='ativo' é obrigatório: a RLS de
            // leitura pública de medicos exige status='ativo' (além de is_public/is_active).
            const { error: medErr } = await supabase
                .from('medicos')
                .update({ is_active: true, is_public: true, status: 'ativo' })
                .eq('user_id', group.user_id);
            if (medErr) throw medErr;

            toast({ title: 'Perfil aprovado e ativado!', description: `${group.name} agora aparece publicamente.`, variant: 'success' });
            fetchData();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao aprovar', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const rejectAll = async (group) => {
        setBusyId(group.user_id);
        try {
            const { error } = await supabase
                .from('medico_documentos')
                .update({ status: 'rejeitado' })
                .eq('user_id', group.user_id);
            if (error) throw error;
            // Mantém o perfil oculto ao público (status != 'ativo' para a RLS + is_public=false)
            await supabase.from('medicos').update({ is_public: false, status: 'inativo' }).eq('user_id', group.user_id);
            toast({ title: 'Documentação recusada', description: `${group.name} permanece pausado.` });
            fetchData();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const filtered = groups.filter((g) => {
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return g.name.toLowerCase().includes(t) || g.email.toLowerCase().includes(t) || g.crm.toLowerCase().includes(t);
    });

    const totalPending = groups.reduce(
        (acc, g) => acc + g.items.filter((i) => (i.status || 'pendente') === 'pendente').length,
        0
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-7 h-7 text-primary" /> Documentação
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Revise e aprove os documentos enviados pelos profissionais.
                        {totalPending > 0 && <span className="ml-1 font-medium text-amber-600">{totalPending} em análise.</span>}
                    </p>
                </div>
                <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                        placeholder="Buscar por nome, email ou CRM..."
                        className="h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button variant="secondary" size="sm" className="h-9">
                        <Search className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                            <Inbox className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">Nenhum documento enviado até o momento.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filtered.map((g) => (
                        <Card key={g.user_id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-11 h-11">
                                        <AvatarImage src={g.image_url} className="object-cover" />
                                        <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <CardTitle className="text-base leading-tight">{g.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {[g.specialty, g.crm && `CRM ${g.crm}`, g.email].filter(Boolean).join(' • ')}
                                        </p>
                                    </div>
                                    {g.hasPending && (
                                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                            <Clock className="w-3 h-3" /> Pendente
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2.5">
                                {SLOT_ORDER.map((slotKey) => {
                                    const doc = g.items.find((i) => i.slot === slotKey);
                                    return (
                                        <div key={slotKey} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/40">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-400'}`}>
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium text-gray-900 text-sm">{SLOT_LABELS[slotKey]}</p>
                                                        {doc && <StatusPill status={doc.status} />}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                        {doc ? <>{doc.name} <span className="text-gray-400">· {formatSize(doc.size)}</span></> : 'Não enviado'}
                                                    </p>
                                                </div>
                                            </div>
                                            {doc && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => handleView(doc)} disabled={busyId === doc.id} className="h-8 gap-1.5 text-xs border-gray-300 text-gray-700">
                                                        {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Ver
                                                    </Button>
                                                    <Button type="button" size="sm" onClick={() => setStatus(doc, 'aprovado')} disabled={busyId === doc.id || doc.status === 'aprovado'} className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                                        <Check className="w-3.5 h-3.5" /> Aprovar
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setStatus(doc, 'rejeitado')} disabled={busyId === doc.id || doc.status === 'rejeitado'} className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                        <X className="w-3.5 h-3.5" /> Rejeitar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-1 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        {g.is_public
                                            ? <span className="text-emerald-600 font-medium">Perfil ativo (visível ao público)</span>
                                            : <span className="text-amber-600 font-medium">Perfil pausado — aprove a documentação para ativar</span>}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => rejectAll(g)} disabled={busyId === g.user_id} className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                            <X className="w-3.5 h-3.5" /> Recusar documentação
                                        </Button>
                                        <Button type="button" size="sm" onClick={() => approveAndActivate(g)} disabled={busyId === g.user_id} className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {busyId === g.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Aprovar e ativar perfil
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminProfessionalDocsPage;
