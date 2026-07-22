import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, CheckCircle2, Trash2, Save, Upload, FileType, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toSiteUrl } from '@/lib/storageUrl';

const TermoAdesaoManager = () => {
    const { toast } = useToast();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [deleteDoc, setDeleteDoc] = useState(null);
    const [activateDoc, setActivateDoc] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [clearing, setClearing] = useState(false);

    const fetchVersions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('termo_adesao')
            .select('*')
            .order('version', { ascending: false });
        if (error) toast({ variant: 'destructive', title: 'Erro ao carregar', description: error.message });
        else setVersions(data || []);
        setLoading(false);
    }, [toast]);

    useEffect(() => { fetchVersions(); }, [fetchVersions]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: 'Formato inválido', description: 'Apenas arquivos PDF são permitidos.' });
            e.target.value = null; return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Máximo 10MB.' });
            e.target.value = null; return;
        }
        setSelectedFile(file);
    };

    const saveNewVersion = async () => {
        if (!selectedFile) { toast({ variant: 'destructive', title: 'Selecione um PDF.' }); return; }
        setIsSaving(true);
        try {
            const ts = new Date().getTime();
            const rand = Math.random().toString(36).substring(7);
            const path = `termo_adesao/${ts}-${rand}.pdf`;
            const { error: upErr } = await supabase.storage.from('legal-documents').upload(path, selectedFile, {
                cacheControl: '3600', upsert: false, contentType: 'application/pdf',
            });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage.from('legal-documents').getPublicUrl(path);

            const nextVersion = (versions[0]?.version || 0) + 1;
            // desativa as anteriores e insere a nova como ativa
            await supabase.from('termo_adesao').update({ is_active: false }).eq('is_active', true);
            const { error: insErr } = await supabase.from('termo_adesao').insert({
                version: nextVersion, pdf_url: toSiteUrl(pub.publicUrl), pdf_file_name: selectedFile.name, is_active: true,
            });
            if (insErr) throw insErr;

            toast({ title: 'Sucesso!', description: 'Nova versão publicada e ativada.', variant: 'success' });
            setSelectedFile(null);
            const el = document.getElementById('termo-upload'); if (el) el.value = '';
            fetchVersions();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetActive = async () => {
        if (!activateDoc) return;
        try {
            await supabase.from('termo_adesao').update({ is_active: false }).eq('is_active', true);
            const { error } = await supabase.from('termo_adesao').update({ is_active: true }).eq('id', activateDoc.id);
            if (error) throw error;
            toast({ title: 'Versão ativada.' });
            setActivateDoc(null); fetchVersions();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao ativar', description: err.message });
        }
    };

    const handleDelete = async () => {
        if (!deleteDoc) return;
        try {
            const { error } = await supabase.from('termo_adesao').delete().eq('id', deleteDoc.id);
            if (error) throw error;
            toast({ title: 'Versão excluída.' });
            setDeleteDoc(null); fetchVersions();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
        }
    };

    const handleClearHistory = async () => {
        setClearing(true);
        try {
            const inativas = versions.filter(v => !v.is_active).length;
            const { error } = await supabase.from('termo_adesao').delete().eq('is_active', false);
            if (error) throw error;
            toast({ title: 'Histórico limpo', description: `${inativas} versão(ões) antiga(s) removida(s). A versão ativa foi mantida.` });
            setConfirmClear(false);
            fetchVersions();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao limpar histórico', description: err.message });
        } finally {
            setClearing(false);
        }
    };

    const activeVersion = versions.find(v => v.is_active);
    const inactiveCount = versions.filter(v => !v.is_active).length;

    return (
        <div className="mt-6 space-y-6">
            <Card className="border-blue-100 bg-blue-50/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Versão Ativa</CardTitle>
                    <CardDescription>Este termo é exibido aos médicos parceiros para aceite no momento da criação da conta.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                    ) : activeVersion ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-white text-gray-700 border-gray-200">v{activeVersion.version}</Badge>
                                    <span className="text-sm text-gray-500">Criado em {format(new Date(activeVersion.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-red-100 text-red-800 border-red-200"><FileType className="w-3 h-3 mr-1" /> PDF</Badge>
                                    <span className="text-xs text-gray-600 truncate max-w-[220px]" title={activeVersion.pdf_file_name}>{activeVersion.pdf_file_name}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" asChild><a href={activeVersion.pdf_url} target="_blank" rel="noopener noreferrer"><Upload className="w-4 h-4 mr-2 rotate-180" /> Baixar</a></Button>
                                <Button size="sm" variant="outline" onClick={() => setPreviewDoc(activeVersion)}><Eye className="w-4 h-4 mr-2" /> Visualizar</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Nenhuma versão ativa. Envie um PDF abaixo.</div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Histórico de Versões</CardTitle>
                    {inactiveCount > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} disabled={loading || clearing}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                            <Trash2 className="w-4 h-4 mr-2" /> Limpar histórico
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Versão</TableHead>
                                    <TableHead>Arquivo</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {versions.length > 0 ? versions.map((ver) => (
                                    <TableRow key={ver.id}>
                                        <TableCell className="font-medium">v{ver.version}</TableCell>
                                        <TableCell><span className="text-xs text-gray-500 truncate block max-w-[250px]" title={ver.pdf_file_name}>{ver.pdf_file_name || 'Arquivo'}</span></TableCell>
                                        <TableCell className="text-xs text-gray-500">{format(new Date(ver.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell>{ver.is_active ? <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge> : <Badge variant="outline" className="text-gray-500">Inativo</Badge>}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" title="Visualizar" onClick={() => setPreviewDoc(ver)}><Eye className="w-4 h-4 text-gray-500" /></Button>
                                                {!ver.is_active && (
                                                    <>
                                                        <Button size="icon" variant="ghost" title="Ativar" onClick={() => setActivateDoc(ver)}><CheckCircle2 className="w-4 h-4 text-blue-600" /></Button>
                                                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDeleteDoc(ver)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">{loading ? 'Carregando...' : 'Nenhuma versão enviada.'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Enviar Nova Versão</CardTitle>
                    <CardDescription>Faça upload de um PDF. Ele será publicado como a versão ativa (v{(versions[0]?.version || 0) + 1}).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                        <Input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="termo-upload" />
                        <label htmlFor="termo-upload" className="cursor-pointer flex flex-col items-center w-full h-full">
                            <div className="bg-blue-100 p-3 rounded-full mb-3"><Upload className="w-6 h-6 text-blue-600" /></div>
                            <span className="text-sm font-medium text-gray-900">{selectedFile ? selectedFile.name : 'Clique para selecionar o PDF'}</span>
                            <span className="text-xs text-gray-500 mt-1">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Máximo 10MB. Apenas .pdf'}</span>
                        </label>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button onClick={saveNewVersion} disabled={isSaving || !selectedFile}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Publicar Versão
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
                <DialogContent className="max-w-[900px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-lg">
                    <DialogHeader className="p-4 border-b bg-white"><DialogTitle>Termo de Adesão (v{previewDoc?.version})</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-auto bg-gray-100"><iframe src={previewDoc?.pdf_url} className="w-full h-full border-none" title="PDF" /></div>
                    <DialogFooter className="p-4 border-t bg-white"><Button variant="outline" onClick={() => setPreviewDoc(null)}>Fechar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Excluir versão v{deleteDoc?.version}?</DialogTitle><DialogDescription>Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancelar</Button><Button variant="destructive" onClick={handleDelete}>Excluir</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmClear} onOpenChange={(o) => !o && !clearing && setConfirmClear(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Limpar histórico do Termo de Adesão?</DialogTitle>
                        <DialogDescription>Todas as {inactiveCount} versão(ões) inativa(s) serão removidas permanentemente. A <strong>versão ativa é mantida</strong>. Esta ação não pode ser desfeita.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmClear(false)} disabled={clearing}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleClearHistory} disabled={clearing}>
                            {clearing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Limpando…</> : 'Limpar histórico'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!activateDoc} onOpenChange={(o) => !o && setActivateDoc(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Ativar versão v{activateDoc?.version}?</DialogTitle><DialogDescription>Passará a ser a versão exibida aos médicos. A anterior será arquivada.</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setActivateDoc(null)}>Cancelar</Button><Button onClick={handleSetActive} className="bg-green-600 hover:bg-green-700 text-white">Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TermoAdesaoManager;
