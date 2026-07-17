import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, Megaphone, Plus, Pencil, Trash2, Info, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const PUBLICO_LABEL = { todos: 'Todos', medico: 'Médicos', paciente: 'Pacientes' };
const TIPO_META = {
    info: { label: 'Informativo', icon: Info, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    alerta: { label: 'Alerta', icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    sucesso: { label: 'Sucesso', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};
const EMPTY = { titulo: '', mensagem: '', publico: 'todos', tipo: 'info', ativo: true };

const AdminBroadcastPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editId, setEditId] = useState(null);
    const [delTarget, setDelTarget] = useState(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('comunicados').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setRows(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchRows(); }, [fetchRows]);

    const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
    const openEdit = (c) => { setForm({ titulo: c.titulo, mensagem: c.mensagem, publico: c.publico, tipo: c.tipo, ativo: c.ativo }); setEditId(c.id); setOpen(true); };
    const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.titulo.trim() || !form.mensagem.trim()) {
            toast({ variant: 'destructive', title: 'Preencha título e mensagem' });
            return;
        }
        setSaving(true);
        try {
            if (editId) {
                const { error } = await supabase.from('comunicados').update({
                    titulo: form.titulo.trim(), mensagem: form.mensagem.trim(), publico: form.publico, tipo: form.tipo, ativo: form.ativo,
                }).eq('id', editId);
                if (error) throw error;
                toast({ title: 'Comunicado atualizado', variant: 'success' });
            } else {
                const { error } = await supabase.from('comunicados').insert({
                    titulo: form.titulo.trim(), mensagem: form.mensagem.trim(), publico: form.publico, tipo: form.tipo, ativo: form.ativo, created_by: user?.id,
                });
                if (error) throw error;
                toast({ title: 'Comunicado publicado', description: 'Já aparece para o público selecionado.', variant: 'success' });
            }
            setOpen(false);
            fetchRows();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const toggleAtivo = async (c) => {
        try {
            const { error } = await supabase.from('comunicados').update({ ativo: !c.ativo }).eq('id', c.id);
            if (error) throw error;
            setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, ativo: !r.ativo } : r)));
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    };

    const handleDelete = async () => {
        if (!delTarget) return;
        try {
            const { error } = await supabase.from('comunicados').delete().eq('id', delTarget.id);
            if (error) throw error;
            toast({ title: 'Comunicado excluído' });
            setDelTarget(null);
            fetchRows();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={Megaphone} title="Comunicados" subtitle="Envie avisos que aparecem no painel dos médicos e pacientes.">
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchRows} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
                <Button size="sm" className="gap-2" onClick={openNew}>
                    <Plus className="w-4 h-4" /> Novo comunicado
                </Button>
            </AdminPageHeader>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
            ) : rows.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <Megaphone className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    Nenhum comunicado ainda. Crie o primeiro para avisar médicos ou pacientes.
                </CardContent></Card>
            ) : (
                <div className="grid gap-3">
                    {rows.map((c) => {
                        const t = TIPO_META[c.tipo] || TIPO_META.info;
                        const Icon = t.icon;
                        return (
                            <Card key={c.id} className={`transition-opacity ${c.ativo ? '' : 'opacity-60'}`}>
                                <CardContent className="p-4 flex items-start gap-4">
                                    <span className={`flex items-center justify-center w-10 h-10 rounded-lg border shrink-0 ${t.cls}`}><Icon className="w-5 h-5" /></span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-gray-900">{c.titulo}</p>
                                            <Badge variant="outline" className="text-[11px]">{PUBLICO_LABEL[c.publico]}</Badge>
                                            <Badge variant="outline" className={`text-[11px] ${t.cls}`}>{t.label}</Badge>
                                            {!c.ativo && <Badge variant="outline" className="text-[11px] bg-gray-100 text-gray-500">Inativo</Badge>}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line line-clamp-3">{c.mensagem}</p>
                                        <p className="text-[11px] text-gray-400 mt-1.5">{c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy HH:mm') : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="flex items-center gap-1.5 mr-1" title={c.ativo ? 'Ativo' : 'Inativo'}>
                                            <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDelTarget(c)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Criar/Editar */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editId ? 'Editar comunicado' : 'Novo comunicado'}</DialogTitle>
                        <DialogDescription>Aparece como um aviso no topo do painel do público escolhido.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Título</Label>
                            <Input value={form.titulo} onChange={(e) => set('titulo')(e.target.value)} placeholder="Ex.: Manutenção programada" maxLength={120} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Mensagem</Label>
                            <Textarea value={form.mensagem} onChange={(e) => set('mensagem')(e.target.value)} rows={4} placeholder="Escreva o aviso…" maxLength={1000} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Público</Label>
                                <Select value={form.publico} onValueChange={set('publico')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="medico">Somente médicos</SelectItem>
                                        <SelectItem value="paciente">Somente pacientes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tipo</Label>
                                <Select value={form.tipo} onValueChange={set('tipo')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Informativo</SelectItem>
                                        <SelectItem value="alerta">Alerta</SelectItem>
                                        <SelectItem value="sucesso">Sucesso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <Label className="text-sm">Ativo</Label>
                                <p className="text-xs text-muted-foreground">Comunicados inativos não aparecem para os usuários.</p>
                            </div>
                            <Switch checked={form.ativo} onCheckedChange={set('ativo')} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? 'Salvar' : 'Publicar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Excluir */}
            <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" /> Excluir comunicado</AlertDialogTitle>
                        <AlertDialogDescription>Remover <strong>{delTarget?.titulo}</strong> permanentemente? Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminBroadcastPage;
