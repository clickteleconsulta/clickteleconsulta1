import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';

const CONFIRM = 'RESETAR SISTEMA';

// Zona de perigo: reset de go-live. Apaga TODOS os dados operacionais e TODAS as
// contas de paciente, mantendo apenas os médicos cadastrados (e o admin).
const AdminSystemReset = () => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleReset = async () => {
        if (confirmText !== CONFIRM) return;
        setProcessing(true);
        try {
            const { error } = await supabase.rpc('reset_system_golive');
            if (error) throw error;
            toast({ title: 'Sistema resetado', description: 'Dados operacionais e pacientes removidos. A página será recarregada.', className: 'bg-green-600 text-white border-none' });
            setOpen(false);
            setConfirmText('');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao resetar', description: err.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Card className="border-red-200 max-w-2xl">
            <CardHeader>
                <CardTitle className="dashboard-title flex items-center gap-2 text-red-700"><ShieldAlert className="w-5 h-5" /> Resetar sistema para produção</CardTitle>
                <CardDescription>
                    Use ao final da fase de testes, antes de colocar no ar. Apaga tudo e deixa a plataforma limpa, prontos apenas os médicos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
                        <p className="font-semibold text-red-800 flex items-center gap-1.5 mb-1.5"><Trash2 className="w-4 h-4" /> Será excluído</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-red-700 text-xs">
                            <li>Todos os agendamentos, guias e histórico</li>
                            <li>Financeiro: saques, pagamentos e notas</li>
                            <li>Avaliações, denúncias e notificações</li>
                            <li>Logs de auditoria</li>
                            <li><strong>Todas as contas de paciente</strong></li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                        <p className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1.5"><CheckCircle2 className="w-4 h-4" /> Será mantido</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-emerald-700 text-xs">
                            <li>Contas dos <strong>médicos cadastrados</strong></li>
                            <li>Agenda e horários dos médicos</li>
                            <li>Procedimento Teleconsulta e valores</li>
                            <li>Documentação aprovada dos médicos</li>
                            <li>Sua conta de administrador</li>
                        </ul>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button variant="destructive" className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => setOpen(true)}>
                        <AlertTriangle className="w-4 h-4" /> Resetar sistema
                    </Button>
                </div>
            </CardContent>

            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmText(''); }}>
                <DialogContent className="border-red-200">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-6 h-6" /> Ação irreversível</DialogTitle>
                        <DialogDescription className="pt-2 text-gray-700">
                            Isto apaga <strong>todos os dados</strong> e <strong>todas as contas de paciente</strong>, mantendo apenas os médicos e a sua conta de administrador. Não há como desfazer.
                            <br /><br />
                            Para confirmar, digite exatamente: <span className="font-bold text-red-700">{CONFIRM}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder={`Digite ${CONFIRM}`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="border-red-300 focus:border-red-500 focus-visible:ring-red-200"
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(''); }}>Cancelar</Button>
                        <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleReset} disabled={processing || confirmText !== CONFIRM}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sim, resetar tudo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default AdminSystemReset;
