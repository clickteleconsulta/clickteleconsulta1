
import React, { useEffect, useState } from 'react';
import { BRAND, EMPRESA } from '@/config/brand';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Helmet } from 'react-helmet';
import { Loader2, CheckCircle2, User, Calendar, DollarSign, FileText, Video, MessageCircle, Copy, Download, ArrowRight, CreditCard, Landmark, QrCode, ShieldCheck, Stethoscope, Lock, ClipboardList } from '@/components/ui/icones';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { trackPurchase } from '@/lib/analytics';
import Logo from '@/components/Logo';


const APPT_SELECT = '*, medico:medicos(public_name, specialty, clinic_logo_url, crm, uf, name, phone_number, instructions), guia:guia_id(*), patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name, cpf, data_nasc, whatsapp, email)';

const AppointmentConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile, session } = useAuth();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [adminSettings, setAdminSettings] = useState(null);

  // Get ID from state (normal flow) or URL (after Stripe redirect)
  const appointmentId = location.state?.appointmentId || searchParams.get('appointmentId');
  const paidReturn = searchParams.get('paid');

  // Retorno do checkout do Asaas (?paid=1): o pagamento é confirmado pelo webhook do Asaas.
  // Aqui apenas aguardamos o status refletir no agendamento.
  useEffect(() => {
    const confirmPayment = async () => {
      if (paidReturn && appointmentId && !verifyingPayment) {
        setVerifyingPayment(true);
        try {
          let paid = false;
          let paidValue = 0;
          for (let i = 0; i < 8; i++) {
            const { data: fresh } = await supabase
              .from('agendamentos').select(APPT_SELECT).eq('id', appointmentId).single();
            if (fresh) { setAppointment(fresh); paidValue = (fresh.price_in_cents || 0) / 100; }
            if (fresh?.pagamento_status === 'pago') { paid = true; break; }
            await new Promise((r) => setTimeout(r, 1500));
          }

          if (paid) {
            toast({
              title: "Pagamento Confirmado!",
              description: "Sua consulta foi confirmada com sucesso.",
              variant: "success"
            });
            // O aviso de WhatsApp ao médico NÃO sai daqui. Saía, e dependia de
            // o paciente voltar para esta tela: quem fechava a aba, ou pagava um
            // Pix duas horas depois, deixava o médico com uma consulta na agenda
            // sem nunca ter sido avisado. Agora quem dispara é o asaas-webhook,
            // no mesmo instante em que o pagamento vira "pago" no banco.
            // Evento de conversão do funil (uma vez, no retorno do checkout).
            trackPurchase({ value: paidValue, transactionId: appointmentId });
          } else {
            toast({
              title: "Aguardando confirmação",
              description: "Assim que o pagamento for compensado, sua consulta é confirmada automaticamente.",
              variant: "warning"
            });
          }
          // Limpa os parâmetros da URL
          navigate('.', { replace: true, state: { appointmentId } });
        } catch (err) {
          console.error("Confirmação de pagamento falhou:", err);
        } finally {
          setVerifyingPayment(false);
        }
      }
    };

    confirmPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidReturn, appointmentId]);

  useEffect(() => {
    if (!appointmentId) {
      navigate('/paciente/dashboard/consultas');
      return;
    }

    const fetchAppointmentAndSettings = async () => {
      setLoading(true);
      try {
        // Fetch payment instructions (RPC restrita a usuários autenticados)
        const { data: payData } = await supabase.rpc('get_payment_instructions');
        setAdminSettings(payData || {});

        // Fetch Appointment
        const { data, error } = await supabase
            .from('agendamentos')
            .select(`
            *,
            medico:medicos(public_name, specialty, clinic_logo_url, crm, uf, name, phone_number, instructions),
            guia:guia_id(*),
            patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name, cpf, data_nasc, whatsapp, email)
            `)
            .eq('id', appointmentId)
            .single();

        if (error || !data) {
            console.error("Error fetching appointment:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o agendamento.' });
            navigate('/paciente/dashboard/consultas');
        } else {
            setAppointment(data);
        }

      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
         setLoading(false);
      }
    };

    fetchAppointmentAndSettings();

    const channel = supabase.channel(`confirmation-page-${appointmentId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'agendamentos', 
        filter: `id=eq.${appointmentId}` 
      }, async (payload) => {
          const { data } = await supabase
            .from('agendamentos')
            .select('*, medico:medicos(public_name, specialty, clinic_logo_url, crm, uf, name, phone_number, instructions), guia:guia_id(*), patient:perfis_usuarios!agendamentos_patient_perfis_fkey(full_name, cpf, data_nasc, whatsapp, email)')
            .eq('id', appointmentId)
            .single();
          if (data) setAppointment(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, navigate, toast]);

  const handleAsaasPayment = async () => {
    if (!appointment) return;

    setProcessingPayment(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
            body: {
                appointmentId: appointment.id,
                origin: window.location.origin
            }
        });

        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error(data?.error || "Nenhuma URL de pagamento retornada");
        }
    } catch (err) {
        console.error("Asaas error:", err);
        toast({
            variant: "destructive",
            title: "Erro ao iniciar pagamento",
            description: "Não foi possível iniciar o pagamento. Tente novamente."
        });
        setProcessingPayment(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = adminSettings?.whatsapp_number || '5511999999999'; 
    const message = adminSettings?.whatsapp_message 
        ? encodeURIComponent(`${adminSettings.whatsapp_message} (Protocolo: ${appointment?.protocolo})`)
        : encodeURIComponent(`Olá, gostaria de confirmar o pagamento do agendamento ${appointment?.protocolo || ''}`);
        
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const generatePDF = async () => {
    if (!appointment) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Dados do agendamento não encontrados.' });
        return;
    }
    
    setGeneratingPDF(true);
    try {
        const element = document.getElementById('pdf-content-container');
        if (!element) throw new Error("Elemento do PDF não encontrado na página.");

        const canvas = await html2canvas(element, {
            scale: 2, // Higher quality
            useCORS: true,
            logging: false,
            windowWidth: 800 // Force width to avoid responsive shifts
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // A4 proportions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`guia-agendamento-${appointment.id.substring(0, 8)}.pdf`);
        
        toast({ title: "Sucesso", description: "Guia baixada com sucesso!" });
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar o arquivo PDF. Tente novamente." });
    } finally {
        setGeneratingPDF(false);
    }
  };

  if (loading || verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">{verifyingPayment ? "Verificando pagamento..." : "Carregando detalhes..."}</h2>
      </div>
    );
  }

  if (!appointment) return null;

  const { medico, patient, appointment_date, appointment_time, price_in_cents, status, protocolo, guia, pagamento_status } = appointment;
  const paymentSettings = adminSettings || {};
  
  const formattedDate = new Date(appointment_date + 'T' + appointment_time).toLocaleString('pt-BR', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const shortDate = new Date(appointment_date + 'T' + appointment_time).toLocaleDateString('pt-BR');
  const shortTime = new Date(appointment_date + 'T' + appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isPaid = pagamento_status === 'pago';
  const isDoctor = profile?.role === 'medico' || profile?.role === 'admin';

  return (
    <>
      <Helmet>
        <title>{`Agendamento Confirmado · ${BRAND.name}`}</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto py-8 px-4 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          {isPaid ? (
            <>
              <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-600 rounded-full mb-4">
                 <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Consulta confirmada!</h1>
              <p className="text-muted-foreground mt-2 text-lg">Seu pagamento foi confirmado e sua teleconsulta está garantida.</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center p-3 bg-amber-100 text-amber-600 rounded-full mb-4">
                 <CreditCard className="w-9 h-9" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Falta pouco: finalize o pagamento</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Sua consulta <strong className="text-amber-600">ainda não está confirmada</strong>. O agendamento só é efetivado após o pagamento — conclua abaixo para confirmar.
              </p>
            </>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* TELEMEDICINE SECTION */}
            {isPaid && !isDoctor && (
              <Card className="border-l-4 border-l-green-600 shadow-md bg-green-50/40">
                <CardContent className="py-6 flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-green-900 text-lg">Pagamento confirmado — sua consulta está garantida!</h3>
                    <p className="text-sm text-green-900/90 mt-1.5 leading-relaxed">
                      O médico entrará em contato <strong>até 15 minutos antes</strong> do horário para conduzir o atendimento pelos meios próprios dele.
                      Fique atento ao seu <strong>WhatsApp</strong> e <strong>e-mail</strong>, siga as orientações do médico e tenha uma ótima consulta.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instruções do médico ao paciente (cadastradas no procedimento) — só após pagamento confirmado */}
            {isPaid && !isDoctor && medico?.instructions && medico.instructions.trim() && (
              <Card className="border-l-4 border-l-primary shadow-md bg-brand-50/30">
                <CardContent className="py-6 flex items-start gap-3">
                  <ClipboardList className="w-7 h-7 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-brand-800 text-lg">Instruções do médico para a sua consulta</h3>
                    <p className="text-sm text-gray-700 mt-1.5 leading-relaxed whitespace-pre-line">{medico.instructions}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhes do Agendamento */}
            <Card className="border-t-4 border-t-primary shadow-md h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Detalhes da Consulta
                </CardTitle>
                <CardDescription>Protocolo: <span className="font-mono font-bold text-primary">{protocolo || 'Gerando...'}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2 pb-4 border-b">
                     <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                          <User className="w-4 h-4" /> Dados do Paciente
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><p className="text-sm text-muted-foreground">Nome Completo</p><p className="font-medium text-gray-800">{patient?.full_name}</p></div>
                          <div><p className="text-sm text-muted-foreground">CPF</p><p className="font-medium text-gray-800">{patient?.cpf}</p></div>
                     </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Video className="w-4 h-4" /> Tipo</div>
                    <p className="font-bold text-lg">Teleconsulta (Online)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Calendar className="w-4 h-4" /> Data e Hora</div>
                    <p className="font-semibold capitalize">{formattedDate}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Status do Agendamento:</span>
                      <Badge variant="outline" className={cn("text-sm font-semibold", isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800")}>
                        {isPaid ? 'Confirmado' : 'Aguardando pagamento'}
                      </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 justify-center p-6 flex flex-col sm:flex-row gap-3">
                 <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={generatePDF} disabled={generatingPDF}>
                    {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {generatingPDF ? 'Gerando PDF...' : 'Baixar Guia PDF'}
                 </Button>
                 
                 {!isDoctor && (
                     <Button variant="ghost" asChild className="w-full sm:w-auto">
                        <Link to="/paciente/dashboard/consultas">Ir para Minhas Consultas</Link>
                     </Button>
                 )}
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar Column: Payment & Contact */}
          <div className="space-y-6">
            <Card className="bg-white border shadow-md h-fit overflow-hidden">
              <CardHeader className="bg-brand-50 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pagamento_status === 'pago' ? (
                     <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <ShieldCheck className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-green-700">Pagamento Confirmado</h3>
                            <p className="text-sm text-muted-foreground mt-1">Sua consulta está garantida.</p>
                        </div>
                     </div>
                ) : (
                    <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3 rounded-lg bg-brand-50/60 border border-brand-100 p-3">
                            <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-brand-800">
                                Pague com segurança para <strong>confirmar sua consulta</strong>. Assim que o pagamento é aprovado, o agendamento é liberado para o médico.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-md shadow-md shadow-brand-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0"
                            onClick={handleAsaasPayment}
                            disabled={processingPayment}
                        >
                            {processingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            Pagar R$ {(price_in_cents / 100).toFixed(2).replace('.', ',')}
                        </Button>
                        {/* NOMEAR O ASAAS AQUI É OBRIGAÇÃO, não cortesia. A regra de
                            transparência do BaaS (Art. 14 e 20) exige "identificação
                            legível do Asaas como Instituição Prestadora de Serviços de
                            Pagamento" nas telas de pagamento. A frase anterior era
                            "Pagamento processado com segurança" — dizia que era seguro e
                            escondia por quem, que é exatamente o que a norma proíbe. */}
                        <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> Pagamento processado por <strong className="font-semibold text-gray-500">Asaas</strong> — Instituição de Pagamento.
                        </p>
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-[11px] text-gray-500 leading-relaxed">
                            <strong className="text-gray-600">Política de cancelamento:</strong> cancelando com <strong>2 horas ou mais</strong> de antecedência, reembolso <strong>integral (100%)</strong>; com <strong>menos de 2 horas</strong>, reembolso de <strong>50%</strong> (retida a taxa por cancelamento tardio); em caso de <strong>não comparecimento, não há reembolso</strong>. No reembolso integral, a taxa de processamento do pagamento é retida. Ao pagar, você concorda com os{' '}
                            <a href="/legal?doc=terms_of_service" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-800">Termos de Serviço</a>.
                        </div>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HIDDEN PDF TEMPLATE — guia institucional */}
        <div className="absolute left-[-9999px] top-0 z-[-1] overflow-hidden pointer-events-none">
            <div id="pdf-content-container" className="w-[800px] bg-white text-gray-900 font-sans">
                {/* Cabeçalho institucional */}
                <div className="bg-brand-600 px-10 py-7 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/15 rounded-lg p-2 flex items-center justify-center ring-1 ring-white/30">
                            <Logo className="w-12 h-12" />
                        </div>
                        <div className="text-white">
                            <p className="text-2xl font-black tracking-tight leading-none">{BRAND.name}</p>
                            <p className="text-white/85 text-sm mt-1">Marketplace de agendamento de consultas</p>
                        </div>
                    </div>
                    <div className="text-right text-white">
                        <p className="text-[11px] uppercase tracking-widest text-white/80">Protocolo</p>
                        <p className="font-mono font-bold text-lg leading-tight">{protocolo || 'N/A'}</p>
                        <p className="text-[11px] text-white/80 mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div className="px-10 py-8">
                    {/* Título + situação */}
                    <div className="flex items-center justify-between mb-7">
                        <h1 className="text-xl font-extrabold uppercase tracking-tight text-gray-800">Guia de Agendamento</h1>
                        <span className={cn("px-3 py-1.5 rounded-full text-sm font-bold border", isPaid ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                            {isPaid ? 'Pagamento confirmado' : 'Aguardando pagamento'}
                        </span>
                    </div>

                    {/* Consulta + Profissional */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="rounded-md border border-gray-200 p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-800 mb-4 pb-2 border-b border-gray-100">Informações da Consulta</h2>
                            <div className="space-y-3">
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Data e hora</p><p className="font-bold text-gray-800 text-lg">{shortDate} às {shortTime}</p></div>
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Tipo de atendimento</p><p className="font-medium text-gray-800">Teleconsulta (à distância)</p></div>
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Status</p><p className="font-medium text-gray-800">{isPaid ? 'Confirmado' : 'Aguardando pagamento'}</p></div>
                            </div>
                        </div>

                        <div className="rounded-md border border-gray-200 p-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-4 pb-2 border-b border-gray-100">Profissional</h2>
                            <div className="space-y-3">
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Médico(a)</p><p className="font-bold text-gray-800">{medico?.public_name || medico?.name || 'Não informado'}</p></div>
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Especialidade</p><p className="font-medium text-gray-800">{medico?.specialty || 'Não informado'}</p></div>
                                <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Registro (CRM)</p><p className="font-medium text-gray-800">{medico?.crm ? `${medico.crm} - ${medico.uf || ''}` : 'Não informado'}</p></div>
                                {isPaid && medico?.phone_number && (
                                    <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Contato</p><p className="font-bold text-gray-800">{medico.phone_number}</p></div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Paciente */}
                    <div className="mb-6">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Dados do Paciente</h2>
                        <div className="rounded-md border border-gray-200 p-5 grid grid-cols-2 gap-4">
                            <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Nome completo</p><p className="font-medium text-gray-800">{patient?.full_name || 'Não informado'}</p></div>
                            <div><p className="text-[11px] text-gray-400 font-semibold uppercase">CPF</p><p className="font-medium text-gray-800">{patient?.cpf || 'Não informado'}</p></div>
                            <div><p className="text-[11px] text-gray-400 font-semibold uppercase">E-mail</p><p className="font-medium text-gray-800">{patient?.email || 'Não informado'}</p></div>
                            <div><p className="text-[11px] text-gray-400 font-semibold uppercase">Telefone (WhatsApp)</p><p className="font-medium text-gray-800">{patient?.whatsapp || 'Não informado'}</p></div>
                        </div>
                    </div>

                    {/* Pagamento */}
                    <div className="mb-6">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Pagamento</h2>
                        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-5">
                            <div>
                                <p className="text-[11px] text-gray-400 font-semibold uppercase">Valor da consulta</p>
                                <p className="text-2xl font-black text-gray-800">R$ {((price_in_cents || 0) / 100).toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] text-gray-400 font-semibold uppercase">Situação</p>
                                <p className={cn("font-bold", isPaid ? "text-green-700" : "text-amber-700")}>{isPaid ? 'Pago' : 'Pendente'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Política de cancelamento */}
                    <div className="rounded-md border border-gray-200 p-5">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Política de Cancelamento e Reembolso</h2>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                            Cancelamento pelo paciente com <b>2h ou mais</b> de antecedência: reembolso <b>integral (100%)</b>, descontada a taxa de processamento. Com <b>menos de 2h</b>: reembolso de <b>50%</b> (retida a taxa por cancelamento tardio). Em caso de <b>não comparecimento</b> comprovado pelo médico: <b>sem reembolso</b>. Política completa nos Termos de Serviço em {BRAND.domain}.
                        </p>
                    </div>
                </div>

                {/* Rodapé institucional */}
                <div className="border-t border-gray-200 px-10 py-5 text-center">
                    <p className="text-xs font-bold text-gray-600">CLICK TELECONSULTA ONLINE LTDA · CNPJ 68.171.336/0001-50</p>
                    <p className="text-[11px] text-gray-400 mt-1">{EMPRESA.cidadeUf} · {BRAND.domain} · {BRAND.emails.suporte}</p>
                    <p className="text-[10px] text-gray-400 mt-2">Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}.</p>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentConfirmationPage;
