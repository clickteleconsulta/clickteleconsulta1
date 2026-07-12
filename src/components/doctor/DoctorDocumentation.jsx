import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { maskCPF } from '@/lib/masks';
import {
    Loader2,
    FileText,
    UploadCloud,
    Eye,
    Trash2,
    ShieldCheck,
    Clock,
    FileCheck2,
    Lock,
    Save,
    UserCog,
} from 'lucide-react';

const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const SLOTS = [
    {
        key: 'certificado',
        label: 'Certificado de Especialização',
        hint: 'Certificado de conclusão que comprove a especialização do profissional.',
    },
    {
        key: 'carteirinha_frente',
        label: 'Carteirinha do Conselho — Frente',
        hint: 'Frente da carteirinha do conselho profissional, contendo a foto do profissional.',
    },
    {
        key: 'carteirinha_verso',
        label: 'Carteirinha do Conselho — Verso',
        hint: 'Verso da carteirinha do conselho profissional.',
    },
];

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
        rejeitado: { label: 'Reenviar', cls: 'bg-red-50 text-red-700 border-red-200', icon: FileText },
    };
    const s = map[status] || map.pendente;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            <Icon className="w-3 h-3" /> {s.label}
        </span>
    );
};

const DocumentSlot = ({ slot, doc, uploading, busy, onUpload, onView, onRemove }) => {
    const inputRef = useRef(null);
    const hasDoc = !!doc?.path;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-sm border border-gray-200 bg-gray-50/40">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${hasDoc ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-gray-400'}`}>
                    <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{slot.label}</p>
                        {hasDoc && <StatusPill status={doc.status} />}
                    </div>
                    {hasDoc ? (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {doc.name} <span className="text-gray-400">· {formatSize(doc.size)}</span>
                        </p>
                    ) : (
                        <p className="text-xs text-gray-500 mt-0.5">{slot.hint}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <input
                    ref={inputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) onUpload(slot.key, f);
                    }}
                    disabled={uploading}
                />
                {hasDoc && (
                    <>
                        <Button type="button" variant="outline" size="sm" onClick={() => onView(slot.key)} disabled={busy} className="h-8 gap-1.5 rounded-sm border-gray-300 text-gray-700 text-xs">
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Visualizar
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(slot.key)} disabled={busy} className="h-8 w-8 p-0 rounded-sm text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </>
                )}
                <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="h-8 gap-1.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs min-w-[92px]">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    {hasDoc ? 'Substituir' : 'Anexar'}
                </Button>
            </div>
        </div>
    );
};

const DoctorDocumentation = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [docs, setDocs] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploadingKey, setUploadingKey] = useState(null);
    const [busyKey, setBusyKey] = useState(null);

    // Dados privados do profissional (perfis_usuarios)
    const [priv, setPriv] = useState({ data_nasc: '', cpf: '', email: '' });
    const [cpfLocked, setCpfLocked] = useState(false);
    const [savingPriv, setSavingPriv] = useState(false);

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('medico_documentos')
            .select('*')
            .eq('user_id', user.id);
        if (!error && data) {
            const map = {};
            data.forEach((row) => { map[row.slot] = row; });
            setDocs(map);
        }

        const { data: perfil } = await supabase
            .from('perfis_usuarios')
            .select('data_nasc, cpf, email')
            .eq('id', user.id)
            .maybeSingle();
        if (perfil) {
            setPriv({ data_nasc: perfil.data_nasc || '', cpf: perfil.cpf || '', email: perfil.email || user.email || '' });
            setCpfLocked(!!perfil.cpf); // CPF já preenchido não pode ser editado
        }
        setLoading(false);
    }, [user?.id]);

    const savePrivate = async () => {
        setSavingPriv(true);
        try {
            const updates = { data_nasc: priv.data_nasc || null };
            // O CPF só é gravado se ainda não estava definido; após inserido é imutável.
            if (!cpfLocked && priv.cpf) updates.cpf = priv.cpf;
            const { error } = await supabase.from('perfis_usuarios').update(updates).eq('id', user.id);
            if (error) throw error;
            if (!cpfLocked && priv.cpf) setCpfLocked(true);
            toast({ title: 'Dados salvos!', description: 'Informações privadas atualizadas.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSavingPriv(false);
        }
    };

    useEffect(() => { load(); }, [load]);

    const handleUpload = async (slotKey, file) => {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_EXT.includes(ext)) {
            toast({ variant: 'destructive', title: 'Formato inválido', description: 'Envie um arquivo jpg, jpeg, png ou pdf.' });
            return;
        }
        if (file.size > MAX_SIZE) {
            toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo permitido é 5MB.' });
            return;
        }
        setUploadingKey(slotKey);
        try {
            const path = `${user.id}/${slotKey}_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('doctor-documents')
                .upload(path, file, { upsert: true, contentType: file.type || undefined });
            if (upErr) throw upErr;

            const prev = docs[slotKey];
            const row = {
                user_id: user.id,
                slot: slotKey,
                path,
                name: file.name,
                size: file.size,
                status: 'pendente',
                uploaded_at: new Date().toISOString(),
            };
            const { data, error } = await supabase
                .from('medico_documentos')
                .upsert(row, { onConflict: 'user_id,slot' })
                .select()
                .single();
            if (error) throw error;
            setDocs((d) => ({ ...d, [slotKey]: data }));
            if (prev?.path && prev.path !== path) {
                supabase.storage.from('doctor-documents').remove([prev.path]).catch(() => {});
            }
            toast({ title: 'Documento enviado!', description: 'Seu documento foi anexado e ficará disponível para análise.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro no envio', description: err.message });
        } finally {
            setUploadingKey(null);
        }
    };

    const handleView = async (slotKey) => {
        const doc = docs[slotKey];
        if (!doc?.path) return;
        setBusyKey(slotKey);
        try {
            const { data, error } = await supabase.storage.from('doctor-documents').createSignedUrl(doc.path, 120);
            if (error) throw error;
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao abrir', description: err.message });
        } finally {
            setBusyKey(null);
        }
    };

    const handleRemove = async (slotKey) => {
        const doc = docs[slotKey];
        if (!doc) return;
        setBusyKey(slotKey);
        try {
            const { error } = await supabase
                .from('medico_documentos')
                .delete()
                .eq('user_id', user.id)
                .eq('slot', slotKey);
            if (error) throw error;
            setDocs((d) => { const n = { ...d }; delete n[slotKey]; return n; });
            if (doc.path) supabase.storage.from('doctor-documents').remove([doc.path]).catch(() => {});
            toast({ title: 'Documento removido.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message });
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <div className="space-y-4">
        <Card className="dashboard-card rounded-sm">
            <CardHeader className="px-6 pt-6 pb-2">
                <CardTitle className="dashboard-title text-lg flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-primary" /> Dados privados do profissional
                </CardTitle>
                <CardDescription className="dashboard-subtitle text-sm">
                    Preencha as informações privadas do profissional. Estas informações não ficarão visíveis para os pacientes.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="doc_data_nasc" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Data de Nascimento</Label>
                                <Input id="doc_data_nasc" type="date" value={priv.data_nasc} onChange={(e) => setPriv((p) => ({ ...p, data_nasc: e.target.value }))} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm text-gray-700" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="doc_cpf" className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    CPF {cpfLocked && <Lock className="w-3 h-3 text-gray-400" />}
                                </Label>
                                <Input id="doc_cpf" placeholder="000.000.000-00" value={priv.cpf} onChange={(e) => setPriv((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} inputMode="numeric" maxLength={14} disabled={cpfLocked} readOnly={cpfLocked} className={`border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm ${cpfLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`} />
                                {cpfLocked && <p className="text-[11px] text-gray-500">O CPF não pode ser alterado após o cadastro.</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="doc_email" className="text-xs font-bold text-gray-700 uppercase tracking-wide">E-mail</Label>
                                <Input id="doc_email" type="email" value={priv.email} disabled readOnly className="bg-gray-100 border-gray-300 h-10 text-sm rounded-lg shadow-sm text-gray-500 cursor-not-allowed" />
                            </div>
                        </div>
                        <div className="flex justify-end mt-5">
                            <Button onClick={savePrivate} disabled={savingPriv} className="bg-primary hover:bg-primary/90 text-white rounded-xl h-9 text-sm shadow-md shadow-blue-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0">
                                {savingPriv ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar dados privados
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>

        <Card className="dashboard-card rounded-sm">
            <CardHeader className="px-6 pt-6 pb-2">
                <CardTitle className="dashboard-title text-lg flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Documentação
                </CardTitle>
                <CardDescription className="dashboard-subtitle text-sm">
                    Anexe os documentos que comprovem as especialidades e qualificações cadastradas. Eles serão analisados pela administração do sistema.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4 space-y-4">
                <div className="text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-sm p-3 leading-relaxed">
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Certificado de conclusão que comprove a especialização do profissional;</li>
                        <li>Carteirinha do conselho profissional (frente e verso) contendo a foto do profissional;</li>
                        <li>Formatos aceitos: <span className="font-medium text-gray-700">jpg, jpeg, png ou pdf</span> com tamanho máximo de <span className="font-medium text-gray-700">5MB</span>.</li>
                    </ul>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full rounded-sm" />
                        <Skeleton className="h-20 w-full rounded-sm" />
                        <Skeleton className="h-20 w-full rounded-sm" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {SLOTS.map((slot) => (
                            <DocumentSlot
                                key={slot.key}
                                slot={slot}
                                doc={docs[slot.key]}
                                uploading={uploadingKey === slot.key}
                                busy={busyKey === slot.key}
                                onUpload={handleUpload}
                                onView={handleView}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
};

export default DoctorDocumentation;
