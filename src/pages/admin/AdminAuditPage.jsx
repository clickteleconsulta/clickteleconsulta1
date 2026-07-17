import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, ScrollText, RefreshCw, Search, FileDown, User, Stethoscope, Shield } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { downloadCsv, csvDateSuffix } from '@/lib/exportCsv';

// Rótulos legíveis para as ações registradas nos logs.
const ACAO_LABEL = {
    paciente_cancelou_agendamento: 'Paciente cancelou',
    medico_cancelou_agendamento: 'Médico cancelou',
    medico_confirmou_atendimento: 'Médico confirmou atendimento',
    agendamento_criado: 'Agendamento criado',
    pagamento_confirmado: 'Pagamento confirmado',
    reagendado: 'Reagendado',
};
const prettyAcao = (a) => ACAO_LABEL[a] || (a || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const ROLE_META = {
    admin: { label: 'Admin', icon: Shield, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    medico: { label: 'Médico', icon: Stethoscope, cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    paciente: { label: 'Paciente', icon: User, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const PAGE_SIZE = 25;

const AdminAuditPage = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [acaoFilter, setAcaoFilter] = useState('all');
    const [page, setPage] = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data: rawLogs, error } = await supabase
                .from('agendamento_logs')
                .select('id, agendamento_id, acao, dados, usuario_id, created_at')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;
            const rows = rawLogs || [];

            const userIds = [...new Set(rows.map((r) => r.usuario_id).filter(Boolean))];
            const apptIds = [...new Set(rows.map((r) => r.agendamento_id).filter(Boolean))];

            const [usersRes, apptsRes] = await Promise.all([
                userIds.length ? supabase.from('perfis_usuarios').select('id, full_name, role').in('id', userIds) : Promise.resolve({ data: [] }),
                apptIds.length ? supabase.from('agendamentos').select('id, protocolo').in('id', apptIds) : Promise.resolve({ data: [] }),
            ]);
            const uMap = {}; (usersRes.data || []).forEach((u) => { uMap[u.id] = u; });
            const aMap = {}; (apptsRes.data || []).forEach((a) => { aMap[a.id] = a; });

            setLogs(rows.map((r) => ({
                ...r,
                usuario_nome: uMap[r.usuario_id]?.full_name || '—',
                usuario_role: uMap[r.usuario_id]?.role || null,
                protocolo: aMap[r.agendamento_id]?.protocolo || null,
            })));
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar auditoria', description: err.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const acoes = useMemo(() => [...new Set(logs.map((l) => l.acao).filter(Boolean))].sort(), [logs]);

    const filtered = useMemo(() => {
        const t = search.trim().toLowerCase();
        return logs.filter((l) => {
            if (acaoFilter !== 'all' && l.acao !== acaoFilter) return false;
            if (!t) return true;
            return (l.usuario_nome || '').toLowerCase().includes(t)
                || (l.protocolo || '').toLowerCase().includes(t)
                || prettyAcao(l.acao).toLowerCase().includes(t);
        });
    }, [logs, search, acaoFilter]);

    useEffect(() => { setPage(1); }, [search, acaoFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const resumoDados = (d) => {
        if (!d || typeof d !== 'object') return '—';
        const parts = [];
        if (d.status_anterior) parts.push(`de: ${d.status_anterior}`);
        if (d.motivo && d.motivo !== 'Nao informado') parts.push(`motivo: ${d.motivo}`);
        if (d.refund_percent != null) parts.push(`reembolso: ${d.refund_percent}%`);
        if (d.horas_antecedencia != null) parts.push(`${Math.round(d.horas_antecedencia)}h antes`);
        return parts.length ? parts.join(' · ') : Object.keys(d).length ? JSON.stringify(d) : '—';
    };

    const handleExport = () => {
        downloadCsv(`auditoria_${csvDateSuffix()}`, [
            { header: 'Data/hora', value: (l) => l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss') : '' },
            { header: 'Ação', value: (l) => prettyAcao(l.acao) },
            { header: 'Responsável', value: (l) => l.usuario_nome },
            { header: 'Perfil', value: (l) => ROLE_META[l.usuario_role]?.label || '' },
            { header: 'Protocolo', value: (l) => l.protocolo || '' },
            { header: 'Detalhes', value: (l) => resumoDados(l.dados) },
        ], filtered);
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={ScrollText} title="Auditoria" subtitle="Registro de quem fez o quê e quando nos agendamentos.">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={filtered.length === 0}>
                    <FileDown className="w-4 h-4" /> Exportar CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </AdminPageHeader>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por responsável, protocolo ou ação…" className="pl-9 h-9" />
                        </div>
                        <Select value={acaoFilter} onValueChange={setAcaoFilter}>
                            <SelectTrigger className="w-full sm:w-64 h-9"><SelectValue placeholder="Todas as ações" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as ações</SelectItem>
                                {acoes.map((a) => <SelectItem key={a} value={a}>{prettyAcao(a)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                                    <TableHead>Ação</TableHead>
                                    <TableHead>Responsável</TableHead>
                                    <TableHead>Protocolo</TableHead>
                                    <TableHead>Detalhes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                                ) : pageRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
                                ) : pageRows.map((l) => {
                                    const role = ROLE_META[l.usuario_role];
                                    const RoleIcon = role?.icon;
                                    return (
                                        <TableRow key={l.id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">{l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                                            <TableCell className="text-sm font-medium text-gray-900">{prettyAcao(l.acao)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm truncate max-w-[160px]">{l.usuario_nome}</span>
                                                    {role && <Badge variant="outline" className={`text-[10px] gap-1 ${role.cls}`}>{RoleIcon && <RoleIcon className="w-3 h-3" />}{role.label}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500">{l.protocolo || '—'}</TableCell>
                                            <TableCell className="text-xs text-gray-600 max-w-[280px] truncate" title={resumoDados(l.dados)}>{resumoDados(l.dados)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{filtered.length} registro(s){logs.length >= 500 && ' · mostrando os 500 mais recentes'}</span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                                <span>Página {page} de {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminAuditPage;
