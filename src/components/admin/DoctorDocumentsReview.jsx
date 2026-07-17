import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FileText, Eye, Check, X, Clock, FileCheck2, ShieldCheck, Inbox } from 'lucide-react';

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

// Revisão da documentação de UM médico (usado dentro de Profissionais).
const DoctorDocumentsReview = ({ userId, onChanged }) => {
    const { toast } = useToast();
    const [items, setItems] = useState([]);
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const [docsRes, medRes] = await Promise.all([
                supabase.from('medico_documentos').select('*').eq('user_id', userId),
                supabase.from('medicos').select('is_public').eq('user_id', userId).maybeSingle(),
            ]);
            setItems(docsRes.data || []);
            setIsPublic(!!medRes.data?.is_public);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar documentos', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => { load(); }, [load]);

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
            const { error } = await supabase.from('medico_documentos').update({ status }).eq('id', doc.id);
            if (error) throw error;
            setItems((prev) => prev.map((it) => (it.id === doc.id ? { ...it, status } : it)));
            toast({ title: status === 'aprovado' ? 'Documento aprovado' : 'Documento rejeitado' });
            onChanged?.();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const approveAndActivate = async () => {
        setBusyId('all');
        try {
            await supabase.from('medico_documentos').update({ status: 'aprovado' }).eq('user_id', userId);
            // status='ativo' é obrigatório para a RLS pública (além de is_public/is_active)
            const { error } = await supabase.from('medicos').update({ is_active: true, is_public: true, status: 'ativo' }).eq('user_id', userId);
            if (error) throw error;
            toast({ title: 'Perfil aprovado e ativado!', description: 'O médico agora aparece publicamente.', variant: 'success' });
            onChanged?.();
            load();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao aprovar', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    const rejectAll = async () => {
        setBusyId('all');
        try {
            await supabase.from('medico_documentos').update({ status: 'rejeitado' }).eq('user_id', userId);
            await supabase.from('medicos').update({ is_public: false, status: 'inativo' }).eq('user_id', userId);
            toast({ title: 'Documentação recusada', description: 'O perfil permanece pausado.' });
            onChanged?.();
            load();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>;

    const busy = busyId != null;
    const hasAnyDoc = items.length > 0;

    return (
        <div className="space-y-2.5">
            {!hasAnyDoc && (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-2 text-gray-500">
                    <Inbox className="w-7 h-7 text-gray-300" />
                    <p className="text-sm">Este profissional ainda não enviou documentos.</p>
                </div>
            )}

            {hasAnyDoc && SLOT_ORDER.map((slotKey) => {
                const doc = items.find((i) => i.slot === slotKey);
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
                                <Button type="button" variant="outline" size="sm" onClick={() => handleView(doc)} disabled={busy} className="h-8 gap-1.5 text-xs border-gray-300 text-gray-700">
                                    {busyId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Ver
                                </Button>
                                <Button type="button" size="sm" onClick={() => setStatus(doc, 'aprovado')} disabled={busy || doc.status === 'aprovado'} className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Check className="w-3.5 h-3.5" /> Aprovar
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setStatus(doc, 'rejeitado')} disabled={busy || doc.status === 'rejeitado'} className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                    <X className="w-3.5 h-3.5" /> Rejeitar
                                </Button>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-1 border-t border-gray-100">
                <p className="text-xs">
                    {isPublic
                        ? <span className="text-emerald-600 font-medium">Perfil ativo (visível ao público)</span>
                        : <span className="text-amber-600 font-medium">Perfil pausado — aprove a documentação para ativar</span>}
                </p>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={rejectAll} disabled={busy || !hasAnyDoc} className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                        <X className="w-3.5 h-3.5" /> Recusar documentação
                    </Button>
                    <Button type="button" size="sm" onClick={approveAndActivate} disabled={busy || !hasAnyDoc} className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        {busyId === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Aprovar e ativar perfil
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DoctorDocumentsReview;
