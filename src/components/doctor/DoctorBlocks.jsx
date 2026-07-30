import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, CalendarOff, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

const TZ = 'America/Sao_Paulo';
const todayStr = () => format(utcToZonedTime(new Date(), TZ), 'yyyy-MM-dd');

// Bloqueios de agenda do médico — datas/horários em que NÃO estará disponível.
// Esconde os horários no agendamento (o booking consulta esta tabela).
const DoctorBlocks = ({ doctorId, onChange }) => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Formulário
  const [data, setData] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diaInteiro, setDiaInteiro] = useState(true);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');
  const [motivo, setMotivo] = useState('');

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabase
      .from('bloqueios_agenda')
      .select('*')
      .eq('medico_id', doctorId)
      .gte('fim', nowIso)
      .order('inicio', { ascending: true });
    if (error) toast({ variant: 'destructive', title: 'Erro ao carregar bloqueios', description: error.message });
    setBlocks(rows || []);
    setLoading(false);
  }, [doctorId, toast]);

  useEffect(() => { load(); }, [load]);

  const addBlock = async () => {
    if (!doctorId) return;
    if (!data) {
      toast({ variant: 'destructive', title: 'Informe a data', description: 'Escolha a data do bloqueio.' });
      return;
    }
    const fimData = dataFim && dataFim >= data ? dataFim : data;
    const ehPeriodo = fimData !== data;

    let inicioUtc, fimUtc, isDiaInteiro;
    if (diaInteiro || ehPeriodo) {
      // Dia inteiro (ou período): do começo do 1º dia ao fim do último dia (Brasília)
      inicioUtc = zonedTimeToUtc(`${data} 00:00:00`, TZ);
      fimUtc = zonedTimeToUtc(`${fimData} 23:59:59`, TZ);
      isDiaInteiro = true;
    } else {
      if (horaInicio >= horaFim) {
        toast({ variant: 'destructive', title: 'Horário inválido', description: 'A hora final deve ser maior que a inicial.' });
        return;
      }
      inicioUtc = zonedTimeToUtc(`${data} ${horaInicio}:00`, TZ);
      fimUtc = zonedTimeToUtc(`${data} ${horaFim}:00`, TZ);
      isDiaInteiro = false;
    }

    setSaving(true);
    const { error } = await supabase.from('bloqueios_agenda').insert({
      medico_id: doctorId,
      inicio: inicioUtc.toISOString(),
      fim: fimUtc.toISOString(),
      dia_inteiro: isDiaInteiro,
      motivo: motivo.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao bloquear', description: error.message });
      return;
    }
    toast({ title: 'Bloqueio adicionado', description: 'Os horários ficarão indisponíveis para agendamento.', variant: 'success' });
    setData(''); setDataFim(''); setMotivo(''); setDiaInteiro(true);
    load();
    onChange?.();
  };

  const removeBlock = async (id) => {
    setDeletingId(id);
    const { error } = await supabase.from('bloqueios_agenda').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: error.message });
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    toast({ title: 'Bloqueio removido' });
    onChange?.();
  };

  const fmtBlock = (b) => {
    const ini = utcToZonedTime(new Date(b.inicio), TZ);
    const fim = utcToZonedTime(new Date(b.fim), TZ);
    const mesmoDia = format(ini, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd');
    if (b.dia_inteiro) {
      return mesmoDia
        ? `${format(ini, 'dd/MM/yyyy')} — dia inteiro`
        : `${format(ini, 'dd/MM/yyyy')} a ${format(fim, 'dd/MM/yyyy')} — dias inteiros`;
    }
    return `${format(ini, 'dd/MM/yyyy')} das ${format(ini, 'HH:mm')} às ${format(fim, 'HH:mm')}`;
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="font-[Manrope] text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" /> Bloquear horários
          </CardTitle>
          <CardDescription className="text-sm">Marque datas ou horários em que você não estará disponível. Horário de Brasília.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Data</Label>
              <Input type="date" min={todayStr()} value={data} onChange={(e) => setData(e.target.value)} className="h-9 text-sm rounded-lg border-gray-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Data final <span className="text-gray-400 normal-case font-normal">(opcional — período)</span></Label>
              <Input type="date" min={data || todayStr()} value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 text-sm rounded-lg border-gray-300" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-700">Dia inteiro</p>
              <p className="text-[11px] text-gray-400">Desligue para bloquear apenas um intervalo de horas (em um único dia)</p>
            </div>
            <Switch checked={diaInteiro} onCheckedChange={setDiaInteiro} disabled={!!(dataFim && dataFim > data)} />
          </div>

          {!diaInteiro && !(dataFim && dataFim > data) && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Das</Label>
                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="h-9 text-sm rounded-lg border-gray-300" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Às</Label>
                <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className="h-9 text-sm rounded-lg border-gray-300" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Motivo <span className="text-gray-400 normal-case font-normal">(opcional, só para você)</span></Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder="Ex.: férias, compromisso pessoal" className="h-9 text-sm rounded-lg border-gray-300" />
          </div>

          <Button onClick={addBlock} disabled={saving} className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Adicionar bloqueio
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <CardHeader className="px-6 pt-6 pb-3">
          <CardTitle className="text-base font-bold text-gray-900">Bloqueios ativos</CardTitle>
          <CardDescription className="text-xs text-gray-400">Períodos e horários indisponíveis para agendamento.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/60">
              <CalendarOff className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">Nenhum bloqueio ativo</p>
              <p className="text-xs text-gray-400 mt-1">Todos os seus horários da agenda estão disponíveis.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/60">
                  <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <Ban className="w-4 h-4 text-red-500" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{fmtBlock(b)}</p>
                    {b.motivo && <p className="text-xs text-gray-500 truncate">{b.motivo}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(b.id)} disabled={deletingId === b.id} className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                    {deletingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorBlocks;
