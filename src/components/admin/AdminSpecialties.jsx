import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Stethoscope, Plus, Trash2, Check, Pencil, X } from 'lucide-react';

// CRUD de especialidades. A leitura é pública (usada no cadastro/perfil do médico
// e no filtro da página de agendamentos). Escrita restrita ao admin via RLS.
const AdminSpecialties = () => {
    const { toast } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [novo, setNovo] = useState('');
    const [adding, setAdding] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editNome, setEditNome] = useState('');
    const [delTarget, setDelTarget] = useState(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('especialidades').select('*').order('ordem').order('nome');
            if (error) throw error;
            setRows(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchRows(); }, [fetchRows]);

    const handleAdd = async () => {
        const nome = novo.trim();
        if (!nome) return;
        if (rows.some((r) => r.nome.toLowerCase() === nome.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Já existe', description: 'Essa especialidade já está cadastrada.' });
            return;
        }
        setAdding(true);
        try {
            const ordem = rows.length ? Math.max(...rows.map((r) => r.ordem || 0)) + 1 : 0;
            const { error } = await supabase.from('especialidades').insert({ nome, ordem });
            if (error) throw error;
            setNovo('');
            toast({ title: 'Especialidade adicionada', variant: 'success' });
            fetchRows();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        } finally {
            setAdding(false);
        }
    };

    const toggleAtivo = async (r) => {
        try {
            const { error } = await supabase.from('especialidades').update({ ativo: !r.ativo }).eq('id', r.id);
            if (error) throw error;
            setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ativo: !x.ativo } : x)));
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    };

    const saveEdit = async (r) => {
        const nome = editNome.trim();
        if (!nome) return;
        try {
            const { error } = await supabase.from('especialidades').update({ nome }).eq('id', r.id);
            if (error) throw error;
            setEditId(null);
            fetchRows();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    };

    const handleDelete = async () => {
        if (!delTarget) return;
        try {
            const { error } = await supabase.from('especialidades').delete().eq('id', delTarget.id);
            if (error) throw error;
            toast({ title: 'Especialidade removida' });
            setDelTarget(null);
            fetchRows();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro', description: err.message });
        }
    };

    return (
        <Card className="dashboard-card max-w-2xl">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="dashboard-title flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" /> Especialidades</CardTitle>
                <CardDescription className="dashboard-subtitle">Lista usada no cadastro dos médicos e no filtro da página pública de agendamentos.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="flex gap-2">
                    <Input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="Nova especialidade (ex.: Cardiologia)" className="h-10" maxLength={80} />
                    <Button onClick={handleAdd} disabled={adding || !novo.trim()} className="gap-2 shrink-0">
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma especialidade cadastrada.</p>
                ) : (
                    <div className="space-y-2">
                        {rows.map((r) => (
                            <div key={r.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${r.ativo ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
                                {editId === r.id ? (
                                    <>
                                        <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(r)} className="h-8 flex-1" autoFocus />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => saveEdit(r)}><Check className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 text-sm font-medium text-gray-900">{r.nome}</span>
                                        <span className="text-xs text-gray-400 mr-1">{r.ativo ? 'Ativa' : 'Inativa'}</span>
                                        <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditId(r.id); setEditNome(r.nome); }}><Pencil className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDelTarget(r)}><Trash2 className="w-4 h-4" /></Button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" /> Remover especialidade</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remover <strong>{delTarget?.nome}</strong>? Médicos que já a utilizam não são alterados, mas ela deixa de aparecer nas novas seleções.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export default AdminSpecialties;
