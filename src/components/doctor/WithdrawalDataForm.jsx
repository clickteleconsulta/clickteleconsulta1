import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Wallet, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const labelCls = "text-[10px] font-medium text-gray-500 uppercase tracking-wider";
const inputCls = "bg-gray-50/50 border-gray-200 focus:bg-white transition-colors h-8 text-xs";

const WithdrawalDataForm = ({ onSave }) => {
    const { user } = useAuth();
    const { register, handleSubmit, control, watch, reset, formState: { isDirty } } = useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const paymentMethod = watch('withdrawal_payment_method');

    useEffect(() => {
        if (user) fetchDoctorData();
    }, [user]);

    const fetchDoctorData = async () => {
        try {
            // Dados bancários ficam em tabela privada (RLS dono+admin), fora da tabela pública medicos.
            const { data, error } = await supabase
                .from('medico_dados_bancarios')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            reset({
                withdrawal_payment_method: data?.withdrawal_payment_method || 'pix',
                withdrawal_holder_name: data?.withdrawal_holder_name || '',
                withdrawal_document: data?.withdrawal_document || '',
                withdrawal_pix_key: data?.withdrawal_pix_key || '',
                withdrawal_bank_name: data?.withdrawal_bank_name || '',
                withdrawal_account_type: data?.withdrawal_account_type || 'corrente',
                withdrawal_bank_agency: data?.withdrawal_bank_agency || '',
                withdrawal_bank_account: data?.withdrawal_bank_account || ''
            });
        } catch (error) {
            console.error("Error fetching withdrawal data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('medico_dados_bancarios')
                .upsert({
                    user_id: user.id,
                    withdrawal_payment_method: data.withdrawal_payment_method,
                    withdrawal_holder_name: data.withdrawal_holder_name,
                    withdrawal_document: data.withdrawal_document,
                    withdrawal_pix_key: data.withdrawal_pix_key,
                    withdrawal_bank_name: data.withdrawal_bank_name,
                    withdrawal_account_type: data.withdrawal_account_type,
                    withdrawal_bank_agency: data.withdrawal_bank_agency,
                    withdrawal_bank_account: data.withdrawal_bank_account,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;

            toast({ title: "Sucesso", description: "Dados para saque atualizados com sucesso.", variant: "default" });
            await fetchDoctorData();
            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar dados de saque." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card className="dashboard-card border-t-2 border-t-green-500 rounded-lg">
                <CardContent className="p-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="dashboard-card border-t-2 border-t-green-500 rounded-lg border-0 shadow-none">
                <CardHeader className="px-4 py-3 border-b border-gray-100">
                    <CardTitle className="dashboard-title flex items-center gap-2 text-sm">
                        <Wallet className="w-4 h-4 text-green-600" />
                        Configuração de resgate
                    </CardTitle>
                    <CardDescription className="dashboard-subtitle text-xs">
                        Cadastre os dados bancários para receber na sua conta os resgates dos valores dos Repasses Click Teleconsulta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-4 space-y-4">
                    {/* Importante */}
                    <div className="text-[11px] text-blue-800 bg-blue-50 border border-blue-100 rounded-md p-2.5 leading-relaxed">
                        <strong className="block mb-0.5">Importante</strong>
                        Para realizar alteração dos dados bancários ou Pix, favor enviar o comprovante de vínculo bancário com o estabelecimento através do nosso e-mail ou contato com o suporte.
                    </div>

                    {/* Como deseja receber */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-gray-700">Como você deseja receber?</Label>
                        <Controller
                            name="withdrawal_payment_method"
                            control={control}
                            defaultValue="pix"
                            render={({ field }) => (
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ v: 'transferencia', l: 'Conta Bancária' }, { v: 'pix', l: 'PIX' }].map(opt => (
                                        <button
                                            type="button"
                                            key={opt.v}
                                            onClick={() => field.onChange(opt.v)}
                                            className={`h-9 rounded-md border text-xs font-medium transition-colors ${field.value === opt.v ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                        <p className="text-[10px] text-gray-400">
                            Forma padrão de recebimento selecionada:{' '}
                            <span className="font-medium text-gray-600">{paymentMethod === 'pix' ? 'PIX' : 'Conta Bancária'}</span>
                        </p>
                    </div>

                    {/* Titular */}
                    <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="withdrawal_holder_name" className={labelCls}>Nome ou Razão Social</Label>
                            <Input id="withdrawal_holder_name" placeholder="Nome completo ou razão social" {...register('withdrawal_holder_name')} className={inputCls} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="withdrawal_document" className={labelCls}>CPF ou CNPJ</Label>
                            <Input id="withdrawal_document" placeholder="000.000.000-00" {...register('withdrawal_document')} className={inputCls} />
                        </div>
                    </div>

                    {/* Método específico */}
                    {paymentMethod === 'pix' ? (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                            <Label htmlFor="withdrawal_pix_key" className={labelCls}>Chave PIX</Label>
                            <Input id="withdrawal_pix_key" placeholder="CPF, E-mail, Telefone ou Aleatória" {...register('withdrawal_pix_key')} className={inputCls} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="space-y-1 col-span-2">
                                <Label htmlFor="withdrawal_bank_name" className={labelCls}>Banco</Label>
                                <Input id="withdrawal_bank_name" placeholder="Ex: Nubank, Banco do Brasil" {...register('withdrawal_bank_name')} className="bg-white border-gray-200 h-8 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="withdrawal_account_type" className={labelCls}>Tipo de Conta</Label>
                                <Controller
                                    name="withdrawal_account_type"
                                    control={control}
                                    defaultValue="corrente"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="bg-white border-gray-200 h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="corrente">Conta Corrente</SelectItem>
                                                <SelectItem value="poupanca">Poupança</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="withdrawal_bank_agency" className={labelCls}>Agência</Label>
                                <Input id="withdrawal_bank_agency" placeholder="0000" {...register('withdrawal_bank_agency')} className="bg-white border-gray-200 h-8 text-xs" />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <Label htmlFor="withdrawal_bank_account" className={labelCls}>Número da Conta</Label>
                                <Input id="withdrawal_bank_account" placeholder="00000-0" {...register('withdrawal_bank_account')} className="bg-white border-gray-200 h-8 text-xs" />
                            </div>
                        </div>
                    )}

                    {/* Aviso Importante */}
                    <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5 leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                        <span>
                            <strong className="block mb-0.5">Aviso Importante</strong>
                            Os dados bancários informados devem ser os mesmos relacionados ao CPF/CNPJ do local de atendimento e são de total responsabilidade do estabelecimento. Não nos responsabilizamos pelas informações cadastradas.
                        </span>
                    </div>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50/50 flex justify-end border-t border-gray-100">
                    <Button type="submit" disabled={saving || !isDirty} className="h-8 text-xs bg-primary hover:bg-primary/90 shadow-sm">
                        {saving ? (
                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Salvando...</>
                        ) : (
                            <><Save className="w-3 h-3 mr-2" /> Salvar dados de saque</>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default WithdrawalDataForm;
