import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, ScrollText, RefreshCw, Search, FileDown, User, Stethoscope, Shield, Calendar, Landmark, FileCheck } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { downloadCsv, csvDateSuffix } from '@/lib/exportCsv';

const PAGE_SIZE = 25;

// Rótulos das ações de agendamento (logs herdados).
const ACAO_LABEL = {
    agendamento_criado: 'Agendamento criado',
    paciente_cancelou_agendamento: 'Paciente cancelou',
    paciente_cancelou: 'Paciente cancelou',
    medico_cancelou_agendamento: 'Médico cancelou',
    medico_confirmou_atendimento: 'Médico confirmou atendimento',
    medico_marcou_nao_comparecimento: 'Médico marcou não comparecimento',
    pagamento_confirmado: 'Pagamento confirmado',
    estorno_processado: 'Estorno processado',
    estorno_horario_indisponivel: 'Estorno automático (horário indisponível)',
    estorno_reconciliado: 'Estorno reconciliado (Asaas)',
    reagendado: 'Reagendado',
    termo_aceito: 'Aceitou o Termo de Adesão',
    documento_enviado: 'Enviou documento p/ análise',
    declaracao_ferramentas: 'Declaração de ferramentas (LGPD)',
};

// Rótulos das ações da plataforma (audit_logs: entidade.operacao).
const ENTITY_LABEL = {
    medico: 'Médico', perfil: 'Perfil', saque: 'Saque', configuracao: 'Configuração da plataforma',
    documento_legal: 'Documento legal', dados_bancarios: 'Dados bancários', procedimento: 'Procedimento',
    especialidade: 'Especialidade',
};
const OP_LABEL = { insert: 'criado(a)', update: 'alterado(a)', delete: 'removido(a)' };
const DOC_LABEL = { terms_of_service: 'Termos de Serviço', privacy_policy: 'Política de Privacidade' };
const AUTH_LABEL = {
    'auth.login': 'Login', 'auth.senha_alterada': 'Senha alterada', 'auth.email_alterado': 'E-mail alterado',
    'auth.2fa_ativado': '2FA ativado', 'auth.2fa_removido': '2FA removido',
};

const prettyAction = (action) => {
    if (!action) return '—';
    if (ACAO_LABEL[action]) return ACAO_LABEL[action];
    if (AUTH_LABEL[action]) return AUTH_LABEL[action];
    if (action.startsWith('aceite_')) return `Aceite: ${DOC_LABEL[action.replace('aceite_', '')] || action.replace('aceite_', '')}`;
    // Casos especiais mais legíveis
    if (action === 'perfil.update') return 'Papel de acesso alterado';
    if (action === 'saque.insert') return 'Saque solicitado';
    if (action === 'saque.update') return 'Saque atualizado';
    if (action === 'dados_bancarios.insert' || action === 'dados_bancarios.update') return 'Dados bancários alterados';
    if (action.includes('.')) {
        const [ent, op] = action.split('.');
        return `${ENTITY_LABEL[ent] || ent} ${OP_LABEL[op] || op}`;
    }
    return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
};

const CATEGORY_META = {
    agendamento: { label: 'Agendamento', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    plataforma: { label: 'Plataforma', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    consentimento: { label: 'Consentimento', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    acesso: { label: 'Acesso', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};
const ROLE_META = {
    admin: { label: 'Admin', icon: Shield, cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    medico: { label: 'Médico', icon: Stethoscope, cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    paciente: { label: 'Paciente', icon: User, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const fmtVal = (v) => {
    if (v == null) return '—';
    if (typeof v === 'object') { const s = JSON.stringify(v); return s.length > 50 ? '(alterado)' : s; }
    const s = String(v);
    return s.length > 50 ? s.slice(0, 50) + '…' : s;
};

// Resumo legível dos detalhes — cobre logs de agendamento, mudanças da plataforma e consentimentos.
const resumoDados = (d) => {
    if (!d || typeof d !== 'object') return '—';
    const parts = [];
    // Consentimento (LGPD)
    if (d.ip) parts.push(`IP ${d.ip}`);
    // Mudanças da plataforma (audit_logs)
    if (d.values && typeof d.values === 'object' && Object.keys(d.values).length) {
        Object.entries(d.values).forEach(([k, v]) => {
            if (v && typeof v === 'object' && ('de' in v || 'para' in v)) parts.push(`${k}: ${fmtVal(v.de)} → ${fmtVal(v.para)}`);
            else parts.push(`${k}: ${fmtVal(v)}`);
        });
    } else if (Array.isArray(d.changed) && d.changed.length) {
        parts.push(`campos: ${d.changed.join(', ')}`);
    }
    // Logs de agendamento
    if (d.status_anterior) parts.push(`de: ${d.status_anterior}`);
    if (d.motivo && d.motivo !== 'Nao informado') parts.push(`motivo: ${d.motivo}`);
    if (d.refund_percent != null) parts.push(`reembolso: ${d.refund_percent}%`);
    if (d.valor_estornado != null) parts.push(`estornado: ${Number(d.valor_estornado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    if (d.retido_taxa) parts.push('taxa retida');
    if (d.horas_antecedencia != null) parts.push(`${Math.round(d.horas_antecedencia)}h antes`);
    if (d.crm) parts.push(`CRM ${d.crm}${d.uf ? '/' + d.uf : ''}`);
    if (d.termo_versao != null) parts.push(`termo v${d.termo_versao}`);
    if (d.slot) parts.push(`tipo: ${d.slot}`);
    if (d.arquivo) parts.push(`arquivo: ${d.arquivo}`);
    if (d.reenvio) parts.push('reenvio');
    if (d.via) parts.push(`via ${d.via}`);
    if (d.source && !d.status_anterior) parts.push(`origem: ${d.source}`);
    return parts.length ? parts.join(' · ') : '—';
};

const toISOFrom = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const toISOTo = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : null);

const AdminAuditPage = () => {
    const { toast } = useToast();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);
    const debounceRef = useRef(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_audit_feed', {
                p_from: toISOFrom(from),
                p_to: toISOTo(to),
                p_action: null,
                p_category: category,
                p_search: search.trim() || null,
                p_limit: PAGE_SIZE,
                p_offset: (page - 1) * PAGE_SIZE,
            });
            if (error) throw error;
            setRows(data || []);
            setTotal(data && data.length ? Number(data[0].total) : 0);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao carregar auditoria', description: err.message });
            setRows([]); setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [from, to, category, search, page, toast]);

    // Recarrega ao mudar filtros/página (busca com debounce).
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchLogs, 300);
        return () => clearTimeout(debounceRef.current);
    }, [fetchLogs]);

    // Volta para a página 1 quando um filtro muda.
    useEffect(() => { setPage(1); }, [search, category, from, to]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const handleExport = async () => {
        try {
            const { data, error } = await supabase.rpc('admin_audit_feed', {
                p_from: toISOFrom(from), p_to: toISOTo(to), p_action: null,
                p_category: category, p_search: search.trim() || null, p_limit: 500, p_offset: 0,
            });
            if (error) throw error;
            const list = data || [];
            downloadCsv(`auditoria_${csvDateSuffix()}`, [
                { header: 'Data/hora', value: (l) => (l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss') : '') },
                { header: 'Categoria', value: (l) => CATEGORY_META[l.category]?.label || l.category },
                { header: 'Ação', value: (l) => prettyAction(l.action) },
                { header: 'Responsável', value: (l) => l.actor_name || '—' },
                { header: 'Perfil', value: (l) => ROLE_META[l.actor_role]?.label || '' },
                { header: 'Referência', value: (l) => l.entity_ref || '' },
                { header: 'Detalhes', value: (l) => resumoDados(l.dados) },
            ], list);
            if (list.length >= 500) toast({ title: 'Exportação limitada', description: 'Exportados os 500 mais recentes do filtro. Refine por data para o restante.' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao exportar', description: err.message });
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={ScrollText} title="Auditoria" subtitle="Registro imutável de quem fez o quê e quando — agendamentos, ações da plataforma e consentimentos.">
                <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={rows.length === 0}>
                    <FileDown className="w-4 h-4" /> Exportar CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </AdminPageHeader>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por responsável, referência ou ação…" className="pl-9 h-9" />
                        </div>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-full lg:w-52 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as categorias</SelectItem>
                                <SelectItem value="agendamento">Agendamentos</SelectItem>
                                <SelectItem value="plataforma">Plataforma (config/perfil/financeiro)</SelectItem>
                                <SelectItem value="acesso">Acessos (login/senha/2FA)</SelectItem>
                                <SelectItem value="consentimento">Consentimentos (LGPD)</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px] text-xs" title="Data inicial" />
                            </div>
                            <span className="text-gray-400 text-sm">até</span>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px] text-xs" title="Data final" />
                        </div>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="whitespace-nowrap">Data/hora</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Ação</TableHead>
                                    <TableHead>Responsável</TableHead>
                                    <TableHead>Referência</TableHead>
                                    <TableHead>Detalhes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
                                ) : rows.map((l) => {
                                    const role = ROLE_META[l.actor_role];
                                    const RoleIcon = role?.icon;
                                    const cat = CATEGORY_META[l.category];
                                    return (
                                        <TableRow key={l.id} className="hover:bg-gray-50/50">
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">{l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                                            <TableCell>
                                                {cat && <Badge variant="outline" className={`text-[10px] ${cat.cls}`}>{cat.label}</Badge>}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-gray-900">{prettyAction(l.action)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm truncate max-w-[150px]">{l.actor_name || '—'}</span>
                                                    {role ? (
                                                        <Badge variant="outline" className={`text-[10px] gap-1 ${role.cls}`}>{RoleIcon && <RoleIcon className="w-3 h-3" />}{role.label}</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">Sistema</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500 max-w-[160px] truncate" title={l.entity_ref || ''}>{l.entity_ref || '—'}</TableCell>
                                            <TableCell className="text-xs text-gray-600 max-w-[280px] truncate" title={resumoDados(l.dados)}>{resumoDados(l.dados)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{total} registro(s)</span>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>Anterior</Button>
                                <span>Página {page} de {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>Próxima</Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminAuditPage;
