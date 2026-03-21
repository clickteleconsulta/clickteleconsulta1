import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

/**
 * TASK-M04 — Prescrição Digital via Memed
 * 
 * Abre o módulo Memed em modal (não nova aba).
 * Suporta: passar paciente via location.state, query param ?patientId, ou standalone.
 * Badge CFM visível para confiança.
 * Salva prescrição no agendamento quando concluída.
 */
const MemedPrescricaoPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Patient can come from router state OR query param
  const patientData = location.state?.patient || null;
  const appointmentId = location.state?.appointmentId || searchParams.get('appointmentId') || null;
  const patientIdParam = searchParams.get('patientId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleReady, setModuleReady] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [patientInfo, setPatientInfo] = useState(patientData);
  const [prescriptions, setPrescriptions] = useState([]);

  const scriptRef = useRef(null);
  const prescritionSavedRef = useRef(false);

  // 1. Fetch doctor profile
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('medicos').select('*').eq('user_id', user.id).single();
        if (error) throw error;
        setDoctorProfile(data);
      } catch (err) {
        setError("Não foi possível carregar os dados do médico.");
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [user]);

  // 2. Fetch patient by ID if passed as query param
  useEffect(() => {
    if (!patientIdParam || patientInfo) return;
    const fetch = async () => {
      const { data } = await supabase.from('perfis_usuarios').select('*').eq('id', patientIdParam).maybeSingle();
      if (data) setPatientInfo(data);
    };
    fetch();
  }, [patientIdParam, patientInfo]);

  // 3. Fetch existing prescriptions for this appointment
  useEffect(() => {
    if (!appointmentId) return;
    const fetch = async () => {
      const { data } = await supabase.from('prescricoes').select('*').eq('agendamento_id', appointmentId).order('created_at', { ascending: false });
      if (data) setPrescriptions(data);
    };
    fetch();
  }, [appointmentId]);

  // 4. Initialize Memed once doctor is loaded
  useEffect(() => {
    if (!doctorProfile) return;

    const initializeMemed = async () => {
      try {
        setLoading(true);
        setError(null);

        const nameParts = (doctorProfile.name || 'Doutor').split(' ');
        const payload = {
          external_id: doctorProfile.id,
          nome: nameParts[0],
          sobrenome: nameParts.slice(1).join(' ') || '.',
          cpf: doctorProfile.cpf || user?.user_metadata?.cpf || '00000000000',
          board_code: 'CRM',
          board_number: doctorProfile.crm || '00000',
          board_state: doctorProfile.uf || 'SP',
        };

        const { data, error: funcError } = await supabase.functions.invoke('memed-prescriber-token', { body: payload });
        if (funcError) throw funcError;
        if (!data?.data?.token) throw new Error("Token não recebido do servidor");

        const memedToken = data.data.token;

        // Inject script once
        if (!document.getElementById('memed-script')) {
          const script = document.createElement('script');
          script.id = 'memed-script';
          script.src = import.meta.env.VITE_MEMED_SCRIPT_URL || 'https://sandbox.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js';
          script.setAttribute('data-token', memedToken);
          script.setAttribute('data-color', '#2563eb');
          script.setAttribute('data-container', 'memed-prescricao-root');
          script.async = true;
          script.onerror = () => setError("Falha ao carregar o módulo de prescrição.");
          document.body.appendChild(script);
          scriptRef.current = script;
        }

        // Listen for module ready
        const handleModuleInit = (event) => {
          if (event.detail?.module === 'plataforma.prescricao') {
            setModuleReady(true);
            setLoading(false);

            if (window.MdHub) {
              window.MdHub.module.show('plataforma.prescricao');

              // Pre-fill patient if available
              if (patientInfo) {
                const pp = {
                  nome: patientInfo.full_name,
                  telefone: patientInfo.whatsapp || patientInfo.phone || '',
                  external_id: patientInfo.id,
                };
                if (patientInfo.cpf) pp.cpf = patientInfo.cpf;
                if (patientInfo.data_nasc) {
                  const d = new Date(patientInfo.data_nasc);
                  pp.data_nascimento = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                }
                window.MdHub.command.send('plataforma.prescricao', 'setPaciente', pp);
              }
            }
          }
        };

        // Listen for prescription save event from Memed
        const handlePrescriptionSaved = async (event) => {
          const prescriptionData = event.detail;
          if (!prescriptionData || prescritionSavedRef.current) return;
          prescritionSavedRef.current = true;

          try {
            if (appointmentId) {
              await supabase.from('prescricoes').insert({
                agendamento_id: appointmentId,
                patient_id: patientInfo?.id,
                doctor_id: doctorProfile.id,
                memed_id: prescriptionData.id || null,
                dados: prescriptionData,
                created_at: new Date().toISOString(),
              });
              toast({ title: '✅ Prescrição salva e vinculada à consulta!' });
              setPrescriptions(prev => [{ dados: prescriptionData, created_at: new Date().toISOString() }, ...prev]);
            }
          } catch (err) {
            console.error('Error saving prescription:', err);
          } finally {
            setTimeout(() => { prescritionSavedRef.current = false; }, 2000);
          }
        };

        document.addEventListener('core:moduleInit', handleModuleInit);
        document.addEventListener('memed:prescricao:salva', handlePrescriptionSaved);

        // Fallback timeout
        setTimeout(() => {
          if (window.MdHub && !moduleReady) {
            window.MdHub.module.show('plataforma.prescricao');
            setModuleReady(true);
            setLoading(false);
          }
        }, 6000);

        return () => {
          document.removeEventListener('core:moduleInit', handleModuleInit);
          document.removeEventListener('memed:prescricao:salva', handlePrescriptionSaved);
        };

      } catch (err) {
        console.error('[Memed] Init error:', err);
        setError(err.message || "Erro ao inicializar prescrição digital");
        setLoading(false);
      }
    };

    initializeMemed();
  }, [doctorProfile]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 h-16 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">Prescrição Digital</h1>
            <p className="text-xs text-gray-500">
              {patientInfo ? `Paciente: ${patientInfo.full_name}` : 'Nova Prescrição'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* CFM Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            CFM-Compliant · Assinatura Digital
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-medium text-xs">Carregando Memed...</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex">
        {/* Prescriptions history sidebar (if appointment context) */}
        {appointmentId && prescriptions.length > 0 && (
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Histórico desta Consulta
              </p>
            </div>
            <div className="p-3 space-y-2">
              {prescriptions.map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <p className="text-xs font-medium text-gray-700">Prescrição {i + 1}</p>
                  <p className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleString('pt-BR')}</p>
                  {p.memed_id && <Badge variant="outline" className="text-[10px] mt-1">ID: {p.memed_id}</Badge>}
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Memed container */}
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar prescrição</h2>
            <p className="text-gray-600 max-w-md mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="flex-1 relative">
            <div id="memed-prescricao-root" className="w-full h-full" style={{ minHeight: '600px' }} />
          </div>
        )}
      </main>
    </div>
  );
};

export default MemedPrescricaoPage;
