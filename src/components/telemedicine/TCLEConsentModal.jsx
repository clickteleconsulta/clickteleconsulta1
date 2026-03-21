import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowRight, ExternalLink, AlertTriangle, User, Stethoscope, Calendar, Globe } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * TCLEConsentModal — Termo de Consentimento Livre e Esclarecido
 * Conforme: Resolução CFM 2.314/2022 (Teleconsulta)
 *
 * Campos obrigatórios CFM:
 * - Identificação do paciente
 * - Identificação do médico (nome + CRM)
 * - Data e hora do aceite
 * - Aceite explícito por checkbox
 * - IP do usuário (para compliance)
 *
 * Versão: 2.0 (CFM 2.314/2022 compliant)
 */

const TCLE_VERSION = "2.0-cfm2314";

const TCLEConsentModal = ({
  open,
  onOpenChange,
  appointmentId,
  consentToken,
  tcleVersion = TCLE_VERSION,
  onConsentSuccess,
  isGuest = false,
  patientName,
  doctorName,
  doctorCrm,
  appointmentDate
}) => {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userIp, setUserIp] = useState('');
  const [consentTimestamp] = useState(new Date());
  const { toast } = useToast();

  // Buscar IP do usuário para compliance (CFM 2.314/2022)
  useEffect(() => {
    if (open) {
      fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => setUserIp(d.ip))
        .catch(() => setUserIp('desconhecido'));
    }
  }, [open]);

  // Retry de consentimentos pendentes (usuário autenticado)
  useEffect(() => {
    if (open && !isGuest) {
      retryPendingConsents();
    }
  }, [open, isGuest]);

  const retryPendingConsents = async () => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith("consentPending:"));
      for (const key of keys) {
        const payloadStr = localStorage.getItem(key);
        if (!payloadStr) continue;
        try {
          const payload = JSON.parse(payloadStr);
          supabase.functions.invoke('teleconsult-consent', { body: payload })
            .then(({ data, error }) => {
              if (!error && data?.ok) localStorage.removeItem(key);
            });
        } catch (e) {
          console.error("Error parsing pending consent:", e);
        }
      }
    } catch (err) {
      console.error("Error in retry logic:", err);
    }
  };

  const handleAccept = async () => {
    if (!appointmentId || !consentToken) {
      toast({ title: "Erro", description: "Parâmetros inválidos para consentimento.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Snapshot do TCLE para auditoria (CFM 2.314/2022)
    const tcleSnapshot = `TCLE v${tcleVersion} — Aceite em ${format(consentTimestamp, "dd/MM/yyyy 'às' HH:mm:ss")} — IP: ${userIp} — UA: ${navigator.userAgent.substring(0, 100)}`;

    const payload = {
      appointment_id: String(appointmentId),
      consent_token: String(consentToken),
      checkbox_checked: true,
      tcle_version: tcleVersion,
      tcle_snapshot: tcleSnapshot,
      ip_address: userIp,
      user_agent: navigator.userAgent,
      accepted_at: consentTimestamp.toISOString(),
      patient_name: patientName || '',
      doctor_name: doctorName || '',
      doctor_crm: doctorCrm || '',
    };

    try {
      if (isGuest) {
        const { error } = await supabase.functions.invoke('teleconsult-consent-public', { body: payload });
        if (error) throw new Error(error.message || "Falha ao registrar consentimento.");
      } else {
        await logConsentAsync(payload);
      }

      // Salvar aceite localmente (fail-open)
      localStorage.setItem(`consentAccepted:${appointmentId}`, "true");

      toast({
        title: "Termos aceitos ✓",
        description: "Consentimento registrado. Acesso à teleconsulta liberado.",
        className: "bg-green-600 text-white border-none"
      });

      if (onConsentSuccess) onConsentSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error("Consent submission error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar o aceite. Tente novamente."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const logConsentAsync = async (payload) => {
    try {
      const { data, error } = await supabase.functions.invoke('teleconsult-consent', { body: payload });
      if (error || (data && !data.ok)) throw new Error("API Error");
    } catch (err) {
      // Salvar para retry offline
      localStorage.setItem(`consentPending:${appointmentId}`, JSON.stringify(payload));
      // Não lançar erro — aceite otimista para usuários autenticados
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isSubmitting) onOpenChange(val); }}>
      <DialogContent
        className="sm:max-w-[540px] flex flex-col p-0 rounded-2xl overflow-hidden"
        onInteractOutside={(e) => { e.preventDefault(); }}
      >
        {/* Header */}
        <DialogHeader className="bg-blue-600 p-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <ShieldCheck className="w-6 h-6" />
            Termo de Consentimento — TCLE
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-sm mt-0.5">
            Resolução CFM 2.314/2022 — obrigatório para teleconsulta médica
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 overflow-y-auto max-h-[70vh]">

          {/* Identificação — campos obrigatórios CFM */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {patientName && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <User className="w-3 h-3" /> Paciente
                </div>
                <p className="font-semibold text-slate-800 text-sm">{patientName}</p>
              </div>
            )}
            {doctorName && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <Stethoscope className="w-3 h-3" /> Médico
                </div>
                <p className="font-semibold text-slate-800 text-sm">{doctorName}</p>
                {doctorCrm && <p className="text-slate-500 text-xs">CRM {doctorCrm}</p>}
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                <Calendar className="w-3 h-3" /> Data/Hora do Aceite
              </div>
              <p className="font-semibold text-slate-800 text-sm">
                {format(consentTimestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {userIp && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                  <Globe className="w-3 h-3" /> IP (Auditoria)
                </div>
                <p className="font-semibold text-slate-800 text-sm font-mono">{userIp}</p>
              </div>
            )}
          </div>

          {/* Aviso legal */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs leading-relaxed">
              <strong>Importante:</strong> Este é um atendimento médico via teleconsulta, nos termos da{' '}
              <strong>Resolução CFM 2.314/2022</strong>. O aceite é obrigatório e ficará registrado com
              data, hora e IP para fins de auditoria e compliance.
            </p>
          </div>

          {/* Texto do TCLE */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-sm text-slate-700 leading-relaxed space-y-2 max-h-48 overflow-y-auto">
            <p className="font-semibold text-slate-800">Termo de Consentimento Livre e Esclarecido para Teleconsulta Médica</p>
            <p>
              Eu, paciente identificado acima, declaro ter sido devidamente informado sobre a modalidade de
              atendimento médico por teleconsulta, compreendo que:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs">
              <li>A consulta será realizada de forma remota por videoconferência segura;</li>
              <li>O atendimento segue os mesmos padrões éticos de uma consulta presencial;</li>
              <li>Meus dados de saúde são protegidos pela LGPD e mantidos em sigilo;</li>
              <li>Posso encerrar a teleconsulta a qualquer momento;</li>
              <li>Em caso de emergência, devo acionar o SAMU (192) ou ir ao pronto-socorro;</li>
              <li>A gravação da consulta depende de autorização explícita de ambas as partes;</li>
              <li>O médico poderá prescrever medicamentos, mas pode recomendar exame presencial;</li>
              <li>Este aceite será registrado com dados de identificação para fins legais.</li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">
              Versão do Termo: {tcleVersion} | Resolução CFM 2.314/2022 | LGPD (Lei 13.709/2018)
            </p>
          </div>

          {/* Links legais */}
          <div className="flex gap-4 mb-4">
            <Link
              to="/legal?doc=terms_of_service"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              <ExternalLink className="w-3 h-3" /> Termos de Serviço
            </Link>
            <Link
              to="/legal?doc=privacy_policy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              <ExternalLink className="w-3 h-3" /> Política de Privacidade (LGPD)
            </Link>
          </div>

          {/* Checkbox de aceite explícito — CFM obrigatório */}
          <div className="flex items-start space-x-3 bg-white p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-colors mb-4">
            <Checkbox
              id="tcle-accept"
              checked={checkboxChecked}
              onCheckedChange={setCheckboxChecked}
              className="mt-0.5 data-[state=checked]:bg-blue-600 border-gray-300 h-5 w-5 rounded shadow-sm"
            />
            <Label
              htmlFor="tcle-accept"
              className="text-sm font-medium leading-snug cursor-pointer text-slate-700 select-none"
            >
              Li e compreendi o Termo de Consentimento acima e aceito voluntariamente participar da
              teleconsulta, confirmando minha identidade como{' '}
              <strong>{patientName || 'paciente'}</strong> e que li os documentos legais vinculados.
            </Label>
          </div>

          {/* Botão de aceite — só ativa com checkbox marcado */}
          <Button
            onClick={handleAccept}
            disabled={!checkboxChecked || isSubmitting}
            className={`w-full font-semibold h-12 rounded-xl text-sm transition-all ${
              checkboxChecked && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 shadow-lg'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Aceitar e Acessar Teleconsulta
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-slate-400 mt-3">
            🔒 Registro seguro • IP: {userIp || '...'} • {format(consentTimestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TCLEConsentModal;
