import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, User as UserIcon, Save, ExternalLink, Phone, KeyRound, Eye, EyeOff, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useAsync from '@/hooks/useAsync';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TwoFactorCard from '@/components/TwoFactorCard';
import DoctorDocumentation from '@/components/doctor/DoctorDocumentation';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import { maskCRM, maskPhone, maskCPF } from '@/lib/masks';
import { toSiteUrl } from '@/lib/storageUrl';
import { formatDoctorDisplayName, stripDoctorTitle } from '@/lib/doctorName';

const ProfileSkeleton = () => (
    <div className="space-y-4">
        <Card className="rounded-xl border-gray-200 shadow-sm">
            <CardHeader>
                <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-6 mb-6">
                     <Skeleton className="w-20 h-20 rounded-full" />
                     <div className="space-y-2 w-full pt-2">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-1/4" />
                     </div>
                </div>
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                 </div>
            </CardContent>
        </Card>
    </div>
);

const specialtiesList = [
    "Clínico Geral"
];

const BRAZIL_UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const DoctorProfile = () => {
    const { user, profile, reloadProfile } = useAuth();
    const { register, handleSubmit, formState: { errors, isDirty }, reset, control, setValue, watch } = useForm();
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef(null);

    // Troca de senha
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Use pelo menos 6 caracteres.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'As senhas não coincidem', description: 'Confirme a mesma senha nos dois campos.' });
            return;
        }
        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({ title: 'Senha alterada!', description: 'Sua nova senha já está ativa.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Erro ao alterar senha', description: err.message });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const fetchDoctorProfile = useCallback(async () => {
        if (!user?.id) throw new Error("Usuário não autenticado.");
        
        const { data, error } = await supabase
            .from('medicos')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw new Error(`Erro ao buscar perfil: ${error.message}`);
        
        return data || {};
    }, [user?.id]);
    
    const { retry: retryLoad, status, value: doctorData, error: loadError, setValue: setDoctorData } = useAsync(fetchDoctorProfile, true);

    useEffect(() => {
        if (doctorData) {
            const formData = {
                ...doctorData,
                instructions: doctorData.instructions || '',
                specialty: doctorData.specialty || "Clínico Geral",
                phone_number: doctorData.phone_number || '',
                formacao: doctorData.formacao || '',
                // Dados privados (perfis_usuarios) — não visíveis para pacientes
                data_nasc: profile?.data_nasc || '',
                cpf: profile?.cpf || '',
                email: profile?.email || user?.email || ''
            };
            reset(formData);
        }
    }, [doctorData, profile, user, reset]);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !doctorData) return;

        setUploading(true);
        try {
            const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const { data: updatedData, error: updateError } = await supabase
                .from('medicos')
                .update({ image_url: toSiteUrl(publicUrl), updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            toast({ title: 'Foto de perfil atualizada!' });
            setDoctorData(updatedData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro no Upload', description: error.message });
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (formData) => {
        setIsSaving(true);
        try {
            const updates = {
                public_name: stripDoctorTitle(formData.public_name),
                specialty: formData.specialty,
                crm: formData.crm,
                uf: formData.uf,
                phone_number: formData.phone_number,
                sexo: formData.sexo || null,
                bio: formData.bio,
                formacao: formData.formacao || null,
                instructions: formData.instructions,
                updated_at: new Date().toISOString(),
            };

            const { data, error } = await supabase.from("medicos").update(updates).eq("user_id", user.id).select().single();
            if (error) throw error;

            // Dados privados do profissional (perfis_usuarios) — não visíveis para pacientes
            const { error: perfilError } = await supabase.from("perfis_usuarios").update({
                cpf: formData.cpf || null,
                data_nasc: formData.data_nasc || null,
            }).eq("id", user.id);
            if (perfilError) console.warn('Erro ao salvar dados privados:', perfilError.message);

            toast({ title: "Perfil Salvo!", description: `Seus dados foram atualizados.`, variant: "default" });
            setDoctorData(data);

            reset({
                ...data,
                instructions: data.instructions || '',
                phone_number: data.phone_number || '',
                formacao: data.formacao || '',
                data_nasc: formData.data_nasc || '',
                cpf: formData.cpf || '',
                email: formData.email || ''
            });
            reloadProfile().catch(console.error);
        } catch (err) {
            toast({ variant: "destructive", title: "Erro ao atualizar", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (status === 'pending' || status === 'idle') return <ProfileSkeleton />;
    if (status === 'error') return <div className="p-4 text-center text-sm"><p className="text-red-600 mb-2">{loadError.message}</p><Button onClick={retryLoad} size="sm" className="rounded-xl">Tentar novamente</Button></div>;

    return (
        <div className="space-y-4 max-w-5xl mx-auto pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="dash-page-title text-2xl">Meu Perfil</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">Gerencie suas informações profissionais.</p>
                        {isDirty && <span className="text-xs text-amber-600 font-medium animate-pulse">• Alterações não salvas</span>}
                    </div>
                </div>
                {doctorData?.id && (
                    <Button asChild variant="outline" size="sm" className="gap-2 shadow-sm border-gray-300 font-medium text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 h-9 rounded-xl transition-all duration-200">
                        <Link to={`/medico/${doctorData.id}`} target="_blank">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver Perfil Público
                        </Link>
                    </Button>
                )}
            </div>

            <Tabs defaultValue="perfil" className="w-full">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-gray-100/80 p-1 rounded-xl">
                    <TabsTrigger value="perfil" className="text-xs sm:text-sm rounded-lg gap-1.5 transition-all duration-200 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><UserIcon className="w-3.5 h-3.5" /> Perfil</TabsTrigger>
                    <TabsTrigger value="documentacao" className="text-xs sm:text-sm rounded-lg gap-1.5 transition-all duration-200 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><FileText className="w-3.5 h-3.5" /> Documentação</TabsTrigger>
                    <TabsTrigger value="seguranca" className="text-xs sm:text-sm rounded-lg gap-1.5 transition-all duration-200 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><ShieldCheck className="w-3.5 h-3.5" /> Segurança</TabsTrigger>
                    <TabsTrigger value="conta" className="text-xs sm:text-sm rounded-lg gap-1.5 transition-all duration-200 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"><Trash2 className="w-3.5 h-3.5" /> Conta</TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Card className="dashboard-card mb-4">
                    <CardHeader className="px-6 pt-6 pb-2">
                        <CardTitle className="dashboard-title text-lg">Dados Profissionais</CardTitle>
                        <CardDescription className="dashboard-subtitle text-sm">Informações visíveis para seus pacientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-4">
                        <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50/50 rounded-xl border border-gray-200 mb-6">
                            <div className="relative group shrink-0 mx-auto sm:mx-0">
                                <Avatar className="w-24 h-24 border-4 border-white shadow-sm rounded-full">
                                    <AvatarImage src={doctorData?.image_url} className="object-cover" />
                                    <AvatarFallback className="bg-gray-200 text-gray-500"><UserIcon size={36}/></AvatarFallback>
                                </Avatar>
                                <label className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer ${uploading ? 'opacity-100' : ''}`}>
                                    {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                                    <Input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} ref={fileInputRef} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-2 text-center sm:text-left pt-2">
                                <h3 className="font-semibold text-gray-900 text-base">Foto de Perfil</h3>
                                <p className="text-sm font-normal text-gray-500 max-w-sm">Uma boa foto aumenta a confiança dos pacientes. Prefira fundos neutros e iluminação adequada.</p>
                            </div>
                        </div>

                        <div className="grid gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="public_name" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nome de Exibição</Label>
                                    <Input id="public_name" placeholder="Nome Sobrenome" {...register('public_name', { required: true })} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm" />
                                    {errors.public_name && <p className="text-xs text-red-600 font-medium mt-1">Obrigatório</p>}
                                    <p className="text-[11px] text-gray-500">
                                        Informe apenas o nome. Aparece como{' '}
                                        <span className="font-semibold text-blue-600">{formatDoctorDisplayName(watch('sexo'), watch('public_name')) || '—'}</span>.
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="specialty" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Especialidade</Label>
                                    <Controller
                                        name="specialty"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm">
                                                    <SelectValue placeholder="Selecione a especialidade" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border-gray-200">
                                                    {specialtiesList.map((spec) => (
                                                        <SelectItem key={spec} value={spec}>
                                                            {spec}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sexo" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sexo</Label>
                                    <Controller
                                        name="sexo"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border-gray-200">
                                                    <SelectItem value="masculino">Masculino</SelectItem>
                                                    <SelectItem value="feminino">Feminino</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="text-[11px] text-gray-500">Define o tratamento (Dr./Dra.).</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="crm" className="text-xs font-bold text-gray-700 uppercase tracking-wide">CRM</Label>
                                    <Input id="crm" placeholder="000000" {...register('crm', { required: true })} onChange={(e) => setValue('crm', maskCRM(e.target.value), { shouldDirty: true })} inputMode="numeric" maxLength={8} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="uf" className="text-xs font-bold text-gray-700 uppercase tracking-wide">UF</Label>
                                    <Controller
                                        name="uf"
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm">
                                                    <SelectValue placeholder="UF" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border-gray-200 max-h-56">
                                                    {BRAZIL_UFS.map((uf) => (
                                                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone_number" className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Número de Contato
                                    </Label>
                                    <Input id="phone_number" placeholder="(00) 00000-0000" {...register('phone_number')} onChange={(e) => setValue('phone_number', maskPhone(e.target.value), { shouldDirty: true })} inputMode="numeric" maxLength={15} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 transition-colors h-10 text-sm rounded-lg shadow-sm" />
                                    <p className="text-[11px] text-gray-500">Compartilhado com o paciente apenas após a confirmação do pagamento. Não aparece no perfil público.</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="bio" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Biografia</Label>
                                <Textarea id="bio" {...register('bio')} rows={4} className="resize-none bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 text-sm rounded-lg shadow-sm p-3" placeholder="Fale sobre sua experiência, formação e abordagem..." />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="formacao" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Formação</Label>
                                <Textarea id="formacao" {...register('formacao')} rows={4} className="resize-none bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 text-sm rounded-lg shadow-sm p-3" placeholder="Informe a formação acadêmica, informações sobre residência e experiência clínica — tudo que mostre ao paciente o conhecimento e a experiência adquiridos ao longo da sua trajetória como profissional de saúde. Inclua o tipo de graduação, curso, instituição e ano de conclusão (opcional)." />
                                <p className="text-[11px] text-gray-500">Aparece para os pacientes no seu perfil.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="instructions" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Instruções ao Paciente</Label>
                                <Textarea id="instructions" {...register('instructions')} rows={3} className="resize-none bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 text-sm rounded-lg shadow-sm p-3" placeholder="Ex: Chegue 5 minutos antes para conexão. Tenha em mãos seus exames recentes." />
                            </div>

                            {/* Dados privados do profissional — não visíveis para pacientes */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-800">Dados privados do profissional</h3>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Preencha as informações privadas do profissional. Estas informações não ficarão visíveis para os pacientes.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="data_nasc" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Data de Nascimento</Label>
                                        <Input id="data_nasc" type="date" {...register('data_nasc')} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm text-gray-700" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cpf" className="text-xs font-bold text-gray-700 uppercase tracking-wide">CPF</Label>
                                        <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} onChange={(e) => setValue('cpf', maskCPF(e.target.value), { shouldDirty: true })} inputMode="numeric" maxLength={14} className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-bold text-gray-700 uppercase tracking-wide">E-mail</Label>
                                        <Input id="email" type="email" {...register('email')} disabled readOnly className="bg-gray-100 border-gray-300 h-10 text-sm rounded-lg shadow-sm text-gray-500 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="flex items-center justify-end pt-4 border-t border-gray-200 gap-3">
                        <Button type="button" variant="ghost" onClick={() => reset(doctorData)} disabled={!isDirty || isSaving} className="text-gray-600 hover:text-gray-900 h-9 text-sm rounded-xl">Cancelar</Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[120px] bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-blue-500/20 h-9 text-sm rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80 disabled:hover:translate-y-0">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
                </TabsContent>

                <TabsContent value="documentacao" className="mt-4">
                    <DoctorDocumentation />
                </TabsContent>

                <TabsContent value="seguranca" className="mt-4 space-y-4">
            <Card className="dashboard-card">
                <CardHeader className="px-6 pt-6 pb-2">
                    <CardTitle className="dashboard-title text-lg flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-primary" /> Alterar Senha
                    </CardTitle>
                    <CardDescription className="dashboard-subtitle text-sm">
                        Defina uma nova senha de acesso à sua conta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                    <form onSubmit={handleChangePassword} className="grid gap-5 max-w-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="newPassword" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nova Senha</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        autoComplete="new-password"
                                        className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="confirmPassword" className="text-xs font-bold text-gray-700 uppercase tracking-wide">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    autoComplete="new-password"
                                    className="bg-white border-gray-300 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100 h-10 text-sm rounded-lg shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isChangingPassword || !newPassword || !confirmPassword}
                                className="min-w-[140px] bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-blue-500/20 h-9 text-sm rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-80 disabled:hover:translate-y-0"
                            >
                                {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                Alterar Senha
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <TwoFactorCard />
                </TabsContent>

                <TabsContent value="conta" className="mt-4">
                    <DeleteAccountCard />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DoctorProfile;