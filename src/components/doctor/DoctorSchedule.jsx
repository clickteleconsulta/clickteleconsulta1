import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle, Trash2, CalendarOff, Clock } from 'lucide-react';
import DoctorPageHeader from '@/components/doctor/DoctorPageHeader';
import useAsync from '@/hooks/useAsync';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const weekDays = [
    { id: 1, name: 'Segunda' }, { id: 2, name: 'Terça' }, { id: 3, name: 'Quarta' },
    { id: 4, name: 'Quinta' }, { id: 5, name: 'Sexta' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
];

const defaultTimeBlock = { hora_inicio: "08:00", hora_fim: "12:00", intervalo_em_minutos: 15 };

const intervaloOptions = [
    { value: 5, label: '5 min' }, { value: 10, label: '10 min' }, { value: 15, label: '15 min' },
    { value: 20, label: '20 min' }, { value: 30, label: '30 min' }, { value: 60, label: '60 min' },
];

const DoctorScheduleSkeleton = () => (
    <Card className="dashboard-card rounded-sm shadow-sm border-gray-200">
        <CardHeader className="p-6">
            <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <Skeleton className="h-64 w-full rounded-sm" />
        </CardContent>
    </Card>
);

const DoctorSchedule = ({ onScheduleSave }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const { control, handleSubmit, reset, register, setError, clearErrors, formState: { errors } } = useForm({
        defaultValues: { schedule: [] }
    });
    
    const { fields, append, remove } = useFieldArray({ control, name: "schedule" });

    const fetchDoctorProfile = useCallback(async () => {
        if (!user) throw new Error("Usuário não autenticado.");
        const { data, error } = await supabase.from('medicos').select('id').eq('user_id', user.id).maybeSingle();
        if (error) throw new Error("Erro ao buscar perfil.");
        return data;
    }, [user]);

    const { value: doctorProfile, status: doctorProfileStatus } = useAsync(fetchDoctorProfile, true);

    const fetchDoctorSchedule = useCallback(async () => {
        if (!doctorProfile?.id) return null;
        const { data, error } = await supabase.from('agenda_medico').select('*').eq('medico_id', doctorProfile.id).order('dia_semana').order('hora_inicio');
        if (error) throw error;
        const timeZone = 'America/Sao_Paulo';
        return (data || []).map(item => ({
            ...item,
            hora_inicio: item.hora_inicio ? item.hora_inicio.substring(0, 5) : '08:00',
            hora_fim: item.hora_fim ? item.hora_fim.substring(0, 5) : '12:00',
        }));
    }, [doctorProfile]);
    
    const { execute: loadSchedule, retry: retryLoad, status, value: savedSchedule, error: loadError } = useAsync(fetchDoctorSchedule, false);

    useEffect(() => {
        if (doctorProfileStatus === 'success' && doctorProfile?.id) loadSchedule();
    }, [doctorProfile, doctorProfileStatus, loadSchedule]);
    
    useEffect(() => {
        if (savedSchedule) reset({ schedule: savedSchedule });
    }, [savedSchedule, reset]);
    
    const validateBlocks = (scheduleData) => {
        let isValid = true;
        clearErrors();
        const groupedByDay = scheduleData.reduce((acc, block) => {
            if (block.dia_semana === null || block.dia_semana === undefined) return acc;
            acc[block.dia_semana] = acc[block.dia_semana] || [];
            acc[block.dia_semana].push(block);
            return acc;
        }, {});

        Object.values(groupedByDay).forEach(dayBlocks => {
            const sortedBlocks = dayBlocks.filter(b => b.hora_inicio && b.hora_fim).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));
            for (let i = 0; i < sortedBlocks.length; i++) {
                const currentBlock = sortedBlocks[i];
                const blockIndexInForm = scheduleData.findIndex(b => b.id === currentBlock.id || (b.hora_inicio === currentBlock.hora_inicio && b.dia_semana === currentBlock.dia_semana));
                if (currentBlock.hora_inicio >= currentBlock.hora_fim) {
                    setError(`schedule.${blockIndexInForm}.hora_fim`, { type: 'manual', message: 'Fim > Início' });
                    isValid = false;
                }
                if (i + 1 < sortedBlocks.length) {
                    const nextBlock = sortedBlocks[i+1];
                    const nextBlockIndex = scheduleData.findIndex(b => b.id === nextBlock.id || (b.hora_inicio === nextBlock.hora_inicio && b.dia_semana === nextBlock.dia_semana));
                    if (currentBlock.hora_fim > nextBlock.hora_inicio) {
                        setError(`schedule.${nextBlockIndex}.hora_inicio`, { type: 'manual', message: 'Sobreposto' });
                        isValid = false;
                    }
                }
            }
        });
        return isValid;
    };

    const onSubmit = async (formData) => {
        if (!doctorProfile) return;
        if (!validateBlocks(formData.schedule)) {
            toast({ variant: "destructive", title: "Erro de validação", description: "Verifique horários." });
            return;
        }
        setIsSaving(true);
        const toInsert = [];
        const toUpdate = [];
        // Coluna agenda_medico.hora_inicio/hora_fim é tipo TIME — mandar apenas HH:MM:SS
        const formatToUtcTimestamp = (timeString) => {
            if (!timeString) return null;
            const parts = timeString.split(':');
            return `${parts[0].padStart(2,'0')}:${(parts[1]||'00').padStart(2,'0')}:00`;
        };

        formData.schedule.forEach(block => {
            const { id, created_at, updated_at, ...rest } = block;
            const scheduleBlock = {
                ...rest,
                hora_inicio: formatToUtcTimestamp(block.hora_inicio),
                hora_fim: formatToUtcTimestamp(block.hora_fim),
                medico_id: doctorProfile.id,
                status: 'disponivel',
            };
            if (id && String(id).startsWith('new-')) toInsert.push(scheduleBlock);
            else if (id) { scheduleBlock.id = id; toUpdate.push(scheduleBlock); }
        });

        const originalIds = savedSchedule?.map(s => s.id).filter(id => id && !String(id).startsWith('new-')) || [];
        const currentIds = toUpdate.map(s => s.id);
        const idsToDelete = originalIds.filter(id => !currentIds.includes(id));
        
        try {
            const promises = [];
            if (idsToDelete.length > 0) promises.push(supabase.from('agenda_medico').delete().in('id', idsToDelete));
            if (toInsert.length > 0) promises.push(supabase.from('agenda_medico').insert(toInsert));
            if (toUpdate.length > 0) promises.push(supabase.from('agenda_medico').upsert(toUpdate));
            const results = await Promise.all(promises);
            for (const result of results) if (result.error) throw result.error;

            toast({ title: "Agenda salva!", description: "Disponibilidade atualizada." });
            loadSchedule();
            if (onScheduleSave) onScheduleSave();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const addNewBlock = (dayId) => {
        append({ id: `new-${Date.now()}`, dia_semana: dayId, ...defaultTimeBlock, medico_id: doctorProfile.id, status: 'disponivel' });
    };
    
    if (status === 'pending' || status === 'idle' || doctorProfileStatus === 'pending') return <DoctorScheduleSkeleton />;
    if (status === 'error' || doctorProfileStatus === 'error' || !doctorProfile) return <div className="text-center p-6 text-sm text-red-600 border border-red-200 rounded-sm bg-red-50">{loadError?.message || "Erro no perfil"}</div>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl mx-auto">
             <DoctorPageHeader icon={Clock} title="Configuração da Agenda" subtitle="Gerencie seus horários de atendimento semanais." />

            <Card className="bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <CardHeader className="px-6 pt-6 pb-4">
                    <CardTitle className="font-[Manrope] text-lg font-bold tracking-tight text-gray-900">Horários de Atendimento</CardTitle>
                    <CardDescription className="dashboard-subtitle text-sm">Defina quando você está disponível. Horário de Brasília.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                    <Tabs defaultValue="1" className="w-full">
                        <TabsList className="grid w-full grid-cols-7 bg-gray-100/80 p-1.5 rounded-xl h-auto mb-6">
                            {weekDays.map((day) => (<TabsTrigger key={day.id} value={String(day.id)} className="rounded-lg font-semibold text-xs py-2 transition-all duration-300 hover:text-blue-600 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/10 data-[state=active]:text-blue-700 data-[state=active]:scale-[1.03] text-gray-500">{day.name.slice(0, 3)}</TabsTrigger>))}
                        </TabsList>
                        {weekDays.map(day => {
                             const blocksForDay = fields.filter(field => field.dia_semana === day.id);
                             return (
                                <TabsContent key={day.id} value={String(day.id)} className="mt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                                {blocksForDay.length > 0 ? (
                                    <div className="space-y-3">
                                        {blocksForDay.map((item) => {
                                             const fieldIndex = fields.findIndex(f => f.id === item.id);
                                             return (
                                                 <div key={item.id} className="flex flex-wrap items-end gap-3 sm:gap-4 p-4 bg-gray-50/70 rounded-xl border border-gray-200 transition-all duration-300 hover:border-blue-200 hover:bg-white hover:shadow-md hover:shadow-blue-500/5 hover:ring-1 hover:ring-blue-100 animate-in fade-in slide-in-from-top-1">
                                                    <div className="w-[calc(50%-0.5rem)] sm:w-[120px]">
                                                        <Label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Início</Label>
                                                        <Input type="time" className="bg-white border-gray-300 h-9 text-sm rounded-lg transition-all duration-200 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100" {...register(`schedule.${fieldIndex}.hora_inicio`)} />
                                                    </div>
                                                    <div className="w-[calc(50%-0.5rem)] sm:w-[120px]">
                                                        <Label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Fim</Label>
                                                        <Input type="time" className="bg-white border-gray-300 h-9 text-sm rounded-lg transition-all duration-200 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100" {...register(`schedule.${fieldIndex}.hora_fim`)} />
                                                    </div>
                                                    <div className="flex-1 min-w-[130px] sm:flex-none sm:w-[150px]">
                                                        <Label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wide">Intervalo</Label>
                                                        <Controller name={`schedule.${fieldIndex}.intervalo_em_minutos`} control={control} render={({ field }) => (
                                                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value)}>
                                                                <SelectTrigger className="bg-white border-gray-300 h-9 text-sm rounded-lg transition-all duration-200 focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-100"><SelectValue /></SelectTrigger>
                                                                <SelectContent className="rounded-sm border-gray-200">{intervaloOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        )}/>
                                                    </div>
                                                    <div className="ml-auto sm:ml-1">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(fieldIndex)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 rounded-xl border border-transparent hover:border-red-200 transition-all duration-200 hover:scale-110 hover:rotate-6 active:scale-95"><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                     {errors?.schedule?.[fieldIndex] && <p className="text-xs text-red-600 font-medium mt-1 w-full">{errors.schedule[fieldIndex]?.hora_inicio?.message || errors.schedule[fieldIndex]?.hora_fim?.message}</p>}
                                                </div>
                                             )
                                        })}
                                        <Button type="button" variant="outline" size="sm" onClick={() => addNewBlock(day.id)} className="group w-full border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/60 h-10 text-xs rounded-xl mt-2 font-semibold transition-all duration-300 hover:shadow-md hover:shadow-blue-500/10"><PlusCircle className="mr-2 h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" /> Adicionar Horário</Button>
                                    </div>
                                ) : (
                                    <div className="group/empty text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/60 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50/30">
                                        <CalendarOff className="mx-auto h-9 w-9 text-gray-300 mb-3 transition-all duration-300 group-hover/empty:scale-110 group-hover/empty:text-blue-400" />
                                        <h3 className="font-[Manrope] text-sm font-bold tracking-tight text-gray-700">Dia sem atendimento</h3>
                                        <p className="text-xs text-gray-500 mt-1 mb-4">Você não tem horários configurados para {day.name}.</p>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addNewBlock(day.id)} className="group border-gray-300 text-gray-700 hover:bg-white hover:border-blue-400 hover:text-blue-600 h-9 text-xs rounded-xl font-semibold bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5"><PlusCircle className="mr-2 h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" /> Ativar {day.name}</Button>
                                    </div>
                                )}
                                </TabsContent>
                             )
                        })}
                    </Tabs>
                </CardContent>
                <CardFooter className="px-6 pt-4 flex justify-end border-t border-gray-200 pb-6 bg-gray-50/30 rounded-b-2xl">
                    <Button type="submit" disabled={isSaving} className="min-w-[150px] bg-primary hover:bg-primary/90 text-white h-11 text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-80 disabled:hover:translate-y-0">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Agenda'}</Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export default DoctorSchedule;