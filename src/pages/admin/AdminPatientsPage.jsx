import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, User, MoreHorizontal, Trash2, Search, Users, RefreshCw, CheckCircle2, FileDown } from 'lucide-react';
import { downloadCsv, csvDateSuffix } from '@/lib/exportCsv';
import { format } from 'date-fns';

const AdminPatientsPage = () => {
    const { toast } = useToast();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('perfis_usuarios')
                .select('id, full_name, email, whatsapp, cpf, created_at')
                .eq('role', 'paciente');
            if (error) throw error;
            const rows = (data || []).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            setPatients(rows);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar pacientes', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.rpc('admin_delete_patient', { p_user_id: deleteTarget.id });
            if (error) throw error;
            toast({ title: 'Conta excluída', description: `${deleteTarget.full_name || deleteTarget.email} foi removido permanentemente.`, variant: 'success' });
            setDeleteTarget(null);
            fetchPatients();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const filtered = patients.filter((p) => {
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (p.full_name || '').toLowerCase().includes(t)
            || (p.email || '').toLowerCase().includes(t)
            || (p.cpf || '').toLowerCase().includes(t);
    });

    const safeDate = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : format(d, 'dd/MM/yyyy HH:mm'); };
    const handleExport = () => {
        downloadCsv(`pacientes_${csvDateSuffix()}`, [
            { header: 'Nome', value: (p) => p.full_name || '' },
            { header: 'Email', value: (p) => p.email || '' },
            { header: 'WhatsApp', value: (p) => p.whatsapp || '' },
            { header: 'CPF', value: (p) => p.cpf || '' },
            { header: 'Cadastrado em', value: (p) => safeDate(p.created_at) },
        ], filtered);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-7 h-7 text-primary" /> Pacientes
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Todas as contas de pacientes cadastradas.
                        {!loading && <span className="ml-1 font-medium">{patients.length} no total.</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || filtered.length === 0} className="gap-2">
                        <FileDown className="w-4 h-4" /> Exportar CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchPatients} disabled={loading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Pacientes</CardTitle>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input placeholder="Buscar por nome, email ou CPF..." className="h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Button variant="secondary" size="sm" className="h-9"><Search className="w-4 h-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">Foto</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <Avatar className="w-9 h-9">
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                    {(p.full_name || p.email || 'P').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{p.full_name || '—'}</span>
                                                {p.cpf && <span className="text-xs text-muted-foreground">CPF {p.cpf}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs text-muted-foreground">
                                                <span>{p.email || '—'}</span>
                                                <span>{p.whatsapp || '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 gap-1 border-green-200" variant="outline">
                                                <CheckCircle2 className="w-3 h-3" /> Ativa
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(p)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Conta
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhum paciente encontrado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Excluir conta do paciente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação é <strong>irreversível</strong>. A conta de <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> e seus dados serão removidos permanentemente. O e-mail ficará livre para um novo cadastro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Excluir permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminPatientsPage;
