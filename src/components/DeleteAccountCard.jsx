import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

const CONFIRM_WORD = 'EXCLUIR';

const DeleteAccountCard = () => {
    const { signOut } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_own_account');
            if (error) throw error;

            toast({ title: 'Conta excluída', description: 'Sua conta e seus dados foram removidos.' });
            try { await signOut(); } catch (_) { /* sessão já pode estar inválida */ }
            navigate('/');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao excluir conta', description: err.message });
            setDeleting(false);
        }
    };

    return (
        <Card className="rounded-sm border-red-200">
            <CardHeader className="px-6 pt-6 pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" /> Excluir Conta
                </CardTitle>
                <CardDescription className="text-sm">
                    A exclusão é permanente. Todos os seus dados serão removidos e esta ação não poderá ser desfeita.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4">
                <AlertDialog
                    open={open}
                    onOpenChange={(v) => {
                        setOpen(v);
                        if (!v) setConfirmText('');
                    }}
                >
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2 h-9 text-sm rounded-sm">
                            <Trash2 className="w-4 h-4" /> Excluir minha conta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
                                <AlertTriangle className="w-5 h-5" /> Excluir conta definitivamente
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação é <strong>irreversível</strong>. Sua conta, dados de perfil e informações associadas
                                serão permanentemente removidos. Para confirmar, digite{' '}
                                <span className="font-semibold text-gray-900">{CONFIRM_WORD}</span> abaixo.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 py-2">
                            <Label htmlFor="confirm-delete" className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                Confirmação
                            </Label>
                            <Input
                                id="confirm-delete"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={CONFIRM_WORD}
                                autoComplete="off"
                                className="rounded-sm"
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleting} className="rounded-sm">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                disabled={deleting || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
                                className="bg-red-600 hover:bg-red-700 rounded-sm"
                            >
                                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Excluir permanentemente
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
};

export default DeleteAccountCard;
