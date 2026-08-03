import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2, Share2, Plus, Trash2, Send, Pause, Play, Upload, Instagram, Facebook, RefreshCw, Info, Image as ImageIcon } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const STATUS = {
    agendado: { label: 'Agendado', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    publicado: { label: 'Publicado', cls: 'bg-green-50 text-green-700 border-green-200' },
    erro: { label: 'Erro', cls: 'bg-red-50 text-red-700 border-red-200' },
    pausado: { label: 'Pausado', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};
const PLAT = { ambos: 'Instagram + Facebook', instagram: 'Instagram', facebook: 'Facebook' };
const toLocalInput = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

const AdminSocialPage = () => {
    const { toast } = useToast();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const [imageUrl, setImageUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [plataforma, setPlataforma] = useState('ambos');
    const [tipo, setTipo] = useState('feed');
    const [scheduledAt, setScheduledAt] = useState(toLocalInput(new Date(Date.now() + 3600000)));

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('social_posts').select('*').order('scheduled_at', { ascending: false });
        if (error) toast({ variant: 'destructive', title: 'Erro ao carregar', description: error.message });
        setPosts(data || []);
        setLoading(false);
    }, [toast]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'png').toLowerCase();
            const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error } = await supabase.storage.from('social').upload(path, file, { contentType: file.type, upsert: false });
            if (error) throw error;
            const { data } = supabase.storage.from('social').getPublicUrl(path);
            setImageUrl(data.publicUrl);
            toast({ title: 'Imagem enviada', description: 'URL pública preenchida abaixo.', variant: 'success' });
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro no upload', description: err.message });
        } finally {
            setUploading(false);
        }
    };

    const addPost = async () => {
        if (!imageUrl.trim()) { toast({ variant: 'destructive', title: 'Falta a imagem', description: 'Envie uma imagem ou cole a URL pública.' }); return; }
        setSaving(true);
        const { error } = await supabase.from('social_posts').insert({
            image_url: imageUrl.trim(), caption: caption.trim() || null, plataforma, tipo,
            scheduled_at: new Date(scheduledAt).toISOString(), status: 'agendado',
        });
        setSaving(false);
        if (error) { toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message }); return; }
        toast({ title: 'Post agendado', variant: 'success' });
        setImageUrl(''); setCaption('');
        fetchPosts();
    };

    const act = async (id, patch, msg) => {
        setBusyId(id);
        const { error } = await supabase.from('social_posts').update(patch).eq('id', id);
        setBusyId(null);
        if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); return; }
        if (msg) toast({ title: msg });
        fetchPosts();
    };
    const remove = async (id) => { setBusyId(id); const { error } = await supabase.from('social_posts').delete().eq('id', id); setBusyId(null); if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); return; } setPosts((p) => p.filter((x) => x.id !== id)); };

    return (
        <div className="space-y-6">
            <AdminPageHeader icon={Share2} title="Redes Sociais" subtitle="Agende e publique automaticamente no Instagram e no Facebook.">
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchPosts} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Atualizar
                </Button>
            </AdminPageHeader>

            <div className="flex items-start gap-2 text-xs text-brand-800 bg-brand-50/70 border border-brand-100 rounded-lg p-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-600" />
                <span>Os posts são publicados automaticamente pelo sistema no horário agendado, <b>assim que a integração com a Meta estiver configurada</b> (token e IDs em Configurações do Supabase). Até lá, ficam como <b>Agendado</b> e nada é publicado. As imagens ficam em um endereço público (necessário para o Instagram).</span>
            </div>

            {/* Novo post */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Agendar novo post</CardTitle>
                    <CardDescription>Envie a arte, escreva a legenda e escolha data, plataforma e formato.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-gray-600">Imagem (PNG/JPG)</Label>
                            <div className="flex items-center gap-2">
                                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-300 text-sm cursor-pointer hover:bg-gray-50">
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Enviar imagem
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                                </label>
                                {imageUrl && <img src={imageUrl} alt="prévia" className="h-9 w-9 rounded object-cover border" />}
                            </div>
                            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="ou cole a URL pública da imagem" className="h-9 text-xs mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wide text-gray-600">Plataforma</Label>
                                <Select value={plataforma} onValueChange={setPlataforma}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ambos">Instagram + Facebook</SelectItem>
                                        <SelectItem value="instagram">Só Instagram</SelectItem>
                                        <SelectItem value="facebook">Só Facebook</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-wide text-gray-600">Formato</Label>
                                <Select value={tipo} onValueChange={setTipo}>
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="feed">Feed</SelectItem>
                                        <SelectItem value="story">Story (só Instagram)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-xs font-bold uppercase tracking-wide text-gray-600">Data e hora</Label>
                                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-9" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wide text-gray-600">Legenda</Label>
                        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Escreva a legenda com hashtags. (Story não usa legenda.)" className="text-sm" />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={addPost} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agendar post
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Fila */}
            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Fila de publicação ({posts.length})</CardTitle></CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-10 text-sm text-gray-400 border border-dashed rounded-xl">Nenhum post agendado ainda.</div>
                    ) : (
                        <ul className="space-y-2">
                            {posts.map((p) => {
                                const st = STATUS[p.status] || STATUS.agendado;
                                return (
                                    <li key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                                        {p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border shrink-0" /> : <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-gray-400" /></div>}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                                    {p.plataforma !== 'facebook' && <Instagram className="w-3 h-3" />}{p.plataforma !== 'instagram' && <Facebook className="w-3 h-3" />}
                                                    {PLAT[p.plataforma]} · {p.tipo}
                                                </span>
                                                <span className="text-[11px] text-gray-400">{p.scheduled_at ? format(new Date(p.scheduled_at), 'dd/MM/yyyy HH:mm') : '—'}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate mt-0.5">{p.caption || <span className="italic text-gray-400">sem legenda</span>}</p>
                                            {p.status === 'erro' && p.erro && <p className="text-[11px] text-red-600 truncate">{p.erro}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {p.status !== 'publicado' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-brand-600 hover:bg-brand-50" title="Publicar no próximo ciclo (até 10 min)" disabled={busyId === p.id} onClick={() => act(p.id, { status: 'agendado', scheduled_at: new Date().toISOString(), erro: null }, 'Marcado para publicar agora (até 10 min).')}>
                                                    {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </Button>
                                            )}
                                            {p.status === 'agendado' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:bg-gray-100" title="Pausar" disabled={busyId === p.id} onClick={() => act(p.id, { status: 'pausado' })}><Pause className="w-4 h-4" /></Button>
                                            )}
                                            {p.status === 'pausado' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" title="Retomar" disabled={busyId === p.id} onClick={() => act(p.id, { status: 'agendado' })}><Play className="w-4 h-4" /></Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" title="Excluir" disabled={busyId === p.id} onClick={() => remove(p.id)}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSocialPage;
