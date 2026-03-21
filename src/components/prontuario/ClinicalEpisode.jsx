import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, Save, ArrowLeft, Unlock, Clock, FileText, Activity, Target, Pill, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── SOAP Field ────────────────────────────────────────────────────────────────
const SOAPField = ({ label, field, value, onChange, placeholder, disabled, minH = 'min-h-[100px]', icon: Icon }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      {label}
    </Label>
    <Textarea
      value={value || ''}
      onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${minH} resize-y bg-white border-gray-200 focus:border-blue-300 focus:ring-1 focus:ring-blue-100 text-sm leading-relaxed p-3`}
    />
  </div>
);

// ─── Autosave indicator ────────────────────────────────────────────────────────
const AutosaveIndicator = ({ status }) => {
  if (status === 'saving') return <span className="text-xs text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>;
  if (status === 'saved') return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Salvo</span>;
  return null;
};

// ─── ClinicalEpisode ───────────────────────────────────────────────────────────
const ClinicalEpisode = ({ episode, onSave, onConclude, onReturn }) => {
  const [form, setForm] = useState({
    queixa_principal: episode.queixa_principal || '',
    hda: episode.hda || '',
    antecedentes: episode.antecedentes || '',
    medicamentos_uso: episode.medicamentos_uso || '',
    exame_fisico: episode.exame_fisico || '',
    hipoteses_diagnosticas: episode.hipoteses_diagnosticas || '',
    conduta: episode.conduta || '',
    observacoes: episode.observacoes || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(null);
  const autosaveTimer = useRef(null);
  const isDirty = useRef(false);

  useEffect(() => {
    setForm({
      queixa_principal: episode.queixa_principal || '',
      hda: episode.hda || '',
      antecedentes: episode.antecedentes || '',
      medicamentos_uso: episode.medicamentos_uso || '',
      exame_fisico: episode.exame_fisico || '',
      hipoteses_diagnosticas: episode.hipoteses_diagnosticas || '',
      conduta: episode.conduta || '',
      observacoes: episode.observacoes || '',
    });
  }, [episode.id]);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    isDirty.current = true;

    // Autosave debounce: 3 seconds after last change
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (!isDirty.current) return;
      setAutosaveStatus('saving');
      try {
        await onSave(episode.id, { ...form, [field]: value }, true /* silent */);
        setAutosaveStatus('saved');
        isDirty.current = false;
        setTimeout(() => setAutosaveStatus(null), 2000);
      } catch {
        setAutosaveStatus(null);
      }
    }, 3000);
  }, [episode.id, form, onSave]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); }, []);

  const handleSave = async () => {
    setIsSaving(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await onSave(episode.id, form);
    setIsSaving(false);
    isDirty.current = false;
  };

  const handleConclude = async () => {
    setIsSaving(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await onConclude(episode.id, form);
    setIsSaving(false);
  };

  const isCompleted = episode.status === 'completed';

  return (
    <Card className="border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 h-full flex flex-col">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onReturn} className="h-8 w-8 p-0 rounded-full hover:bg-gray-200">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </Button>
            <div className="flex flex-col">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                Prontuário Eletrônico (SOAP)
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    <CheckCircle2 className="h-3 w-3" /> Concluído
                  </span>
                )}
              </CardTitle>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Iniciado em {format(new Date(episode.started_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
          <AutosaveIndicator status={autosaveStatus} />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto">
        <Tabs defaultValue="subjetivo" className="h-full flex flex-col">
          {/* SOAP Tabs */}
          <div className="border-b border-gray-100 bg-white px-4 sticky top-0 z-10">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              {[
                { value: 'subjetivo', label: 'S — Subjetivo', color: 'text-indigo-600' },
                { value: 'objetivo', label: 'O — Objetivo', color: 'text-blue-600' },
                { value: 'avaliacao', label: 'A — Avaliação', color: 'text-violet-600' },
                { value: 'plano', label: 'P — Plano', color: 'text-green-600' },
                { value: 'notas', label: 'Notas Livres', color: 'text-gray-600' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-full rounded-none border-b-2 border-transparent px-1 pb-2 pt-2 text-xs font-semibold text-gray-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none transition-colors"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* S — Subjetivo */}
            <TabsContent value="subjetivo" className="m-0 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="bg-indigo-50/40 rounded-lg p-3 border border-indigo-100 text-xs text-indigo-700">
                <strong>Subjetivo:</strong> Relato do paciente — queixa principal, história da doença atual, antecedentes, medicamentos em uso
              </div>
              <SOAPField
                label="Queixa Principal"
                field="queixa_principal"
                value={form.queixa_principal}
                onChange={handleChange}
                placeholder="Descreva a queixa principal relatada pelo paciente..."
                disabled={isCompleted}
                icon={AlertCircle}
              />
              <SOAPField
                label="História da Doença Atual (HDA)"
                field="hda"
                value={form.hda}
                onChange={handleChange}
                placeholder="Evolução dos sintomas, duração, fatores que agravam ou aliviam..."
                disabled={isCompleted}
                minH="min-h-[120px]"
                icon={FileText}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SOAPField
                  label="Antecedentes Pessoais / Familiares"
                  field="antecedentes"
                  value={form.antecedentes}
                  onChange={handleChange}
                  placeholder="HAS, DM, cirurgias anteriores, histórico familiar..."
                  disabled={isCompleted}
                  icon={Activity}
                />
                <SOAPField
                  label="Medicamentos em Uso"
                  field="medicamentos_uso"
                  value={form.medicamentos_uso}
                  onChange={handleChange}
                  placeholder="Nome, dose e frequência de cada medicamento..."
                  disabled={isCompleted}
                  icon={Pill}
                />
              </div>
            </TabsContent>

            {/* O — Objetivo */}
            <TabsContent value="objetivo" className="m-0 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="bg-blue-50/40 rounded-lg p-3 border border-blue-100 text-xs text-blue-700">
                <strong>Objetivo:</strong> Achados objetivos — exame físico, sinais vitais, dados mensuráveis
              </div>
              <SOAPField
                label="Exame Físico / Dados Objetivos"
                field="exame_fisico"
                value={form.exame_fisico}
                onChange={handleChange}
                placeholder="PA, FC, FR, temperatura, SpO2. Exame físico geral e específico..."
                disabled={isCompleted}
                minH="min-h-[200px]"
                icon={Activity}
              />
            </TabsContent>

            {/* A — Avaliação */}
            <TabsContent value="avaliacao" className="m-0 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="bg-violet-50/40 rounded-lg p-3 border border-violet-100 text-xs text-violet-700">
                <strong>Avaliação:</strong> Impressão diagnóstica — hipóteses, diagnósticos diferenciais, raciocínio clínico
              </div>
              <SOAPField
                label="Hipóteses Diagnósticas / CID-10"
                field="hipoteses_diagnosticas"
                value={form.hipoteses_diagnosticas}
                onChange={handleChange}
                placeholder="1. Diagnóstico principal (CID: J06.9)&#10;2. Diagnóstico diferencial&#10;3. ..."
                disabled={isCompleted}
                minH="min-h-[200px]"
                icon={Target}
              />
            </TabsContent>

            {/* P — Plano */}
            <TabsContent value="plano" className="m-0 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="bg-green-50/40 rounded-lg p-3 border border-green-100 text-xs text-green-700">
                <strong>Plano:</strong> Conduta terapêutica — prescrição, exames, encaminhamentos, retorno
              </div>
              <SOAPField
                label="Conduta / Plano de Tratamento"
                field="conduta"
                value={form.conduta}
                onChange={handleChange}
                placeholder="Prescrever: ...&#10;Solicitar exames: ...&#10;Encaminhamento: ...&#10;Retorno em: ..."
                disabled={isCompleted}
                minH="min-h-[200px]"
                icon={CheckCircle2}
              />
            </TabsContent>

            {/* Notas Livres */}
            <TabsContent value="notas" className="m-0 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="bg-gray-50/60 rounded-lg p-3 border border-gray-200 text-xs text-gray-600">
                <strong>Notas Livres:</strong> Observações adicionais, comunicação com paciente, lembretes
              </div>
              <SOAPField
                label="Observações e Notas Adicionais"
                field="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                placeholder="Espaço livre para anotações, lembretes, orientações ao paciente..."
                disabled={isCompleted}
                minH="min-h-[200px]"
                icon={FileText}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>

      <CardFooter className="bg-gray-50/50 border-t border-gray-100 py-4 flex items-center justify-between gap-3 flex-shrink-0">
        <p className="text-[11px] text-gray-400 hidden sm:block">
          💾 Autosave ativo — rascunho salvo a cada 3 segundos
        </p>
        <div className="flex gap-3 ml-auto">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar e Sair
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10"
            onClick={handleConclude}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isCompleted ? 'Atualizar Conclusão' : 'Concluir Episódio'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ClinicalEpisode;
