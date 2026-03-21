import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ChevronRight, ChevronLeft, User, Shield, Stethoscope, Calendar, CreditCard, Eye, Check, Star, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const BRAZIL_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const SPECIALTIES = [
  'Clínica Geral','Cardiologia','Dermatologia','Endocrinologia','Ginecologia',
  'Neurologia','Oncologia','Ortopedia','Pediatria','Psiquiatria',
  'Reumatologia','Urologia','Oftalmologia','Otorrinolaringologia','Outras',
];

const STEPS = [
  { id: 1, label: 'Dados Pessoais', icon: User },
  { id: 2, label: 'CRM', icon: Shield },
  { id: 3, label: 'Especialidades', icon: Stethoscope },
  { id: 4, label: 'Agenda', icon: Calendar },
  { id: 5, label: 'Acesso', icon: CreditCard },
  { id: 6, label: 'Preview', icon: Eye },
];

// ─── Profile completeness ──────────────────────────────────────────────────────
const completeness = (form) => {
  const fields = [form.full_name, form.email, form.crm, form.uf, form.specialty, form.password, form.bio];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
};

// ─── Step indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-between relative mb-8">
    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
    {STEPS.map((step, i) => {
      const Icon = step.icon;
      const done = currentStep > step.id;
      const active = currentStep === step.id;
      return (
        <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
            done ? 'bg-blue-600 border-blue-600 text-white' :
            active ? 'bg-white border-blue-600 text-blue-600' :
            'bg-white border-gray-300 text-gray-400'
          }`}>
            {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
          </div>
          <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-blue-600' : done ? 'text-gray-600' : 'text-gray-400'}`}>
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);

// ─── Profile Preview ───────────────────────────────────────────────────────────
const ProfilePreview = ({ form }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-md mx-auto">
    <div className="h-20 bg-gradient-to-r from-blue-500/20 to-blue-600/10" />
    <div className="px-5 pb-5 relative">
      <div className="-mt-10 mb-3">
        <Avatar className="w-20 h-20 border-4 border-white shadow-md">
          <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 font-bold">
            {form.full_name?.[0] || 'M'}
          </AvatarFallback>
        </Avatar>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900">{form.full_name || 'Seu Nome'}</h3>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Verificado
          </Badge>
        </div>
        <p className="text-sm text-blue-600 font-medium mt-0.5">{form.specialty || 'Especialidade'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
          {form.crm && form.uf && (
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> CRM: {form.crm}/{form.uf}</span>
          )}
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Telemedicina</span>
          <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Novo profissional</span>
        </div>
        {form.bio && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-3">{form.bio}</p>
        )}
      </div>
    </div>
  </div>
);

// ─── Checklist ─────────────────────────────────────────────────────────────────
const ProfileChecklist = ({ form }) => {
  const items = [
    { label: 'Nome completo', done: !!form.full_name },
    { label: 'E-mail', done: !!form.email },
    { label: 'CRM + UF', done: !!(form.crm && form.uf) },
    { label: 'Especialidade', done: !!form.specialty },
    { label: 'Senha configurada', done: !!form.password },
    { label: 'Bio profissional', done: !!form.bio },
    { label: 'Horário de atendimento', done: !!(form.horario_inicio && form.horario_fim) },
  ];
  const pct = completeness(form);

  return (
    <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-900">Perfil completo em {pct}%</p>
        <span className="text-xs text-blue-600 font-bold">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="grid grid-cols-1 gap-1.5 mt-2">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs ${item.done ? 'text-green-700' : 'text-gray-500'}`}>
            {item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main wizard ───────────────────────────────────────────────────────────────
const DoctorSignUpPage = () => {
  const { signUp, loading: authLoading, user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crmStatus, setCrmStatus] = useState(null); // null | checking | valid | disclaimer

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    password_confirm: '',
    crm: '',
    uf: '',
    specialty: '',
    whatsapp: '',
    bio: '',
    horario_inicio: '08:00',
    horario_fim: '18:00',
    slot_duration: '30',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user && profile) navigate('/medico/dashboard');
  }, [user, profile, navigate]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.full_name.trim()) e.full_name = 'Nome obrigatório';
    }
    if (step === 2) {
      if (!form.crm.trim()) e.crm = 'CRM obrigatório';
      if (!form.uf) e.uf = 'UF obrigatório';
    }
    if (step === 3) {
      if (!form.specialty) e.specialty = 'Especialidade obrigatória';
    }
    if (step === 5) {
      if (!form.email.includes('@')) e.email = 'E-mail inválido';
      if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
      if (form.password !== form.password_confirm) e.password_confirm = 'As senhas não coincidem';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleCheckCRM = async () => {
    setCrmStatus('checking');
    // Simulate CRM check (integrate with CFM API when available)
    await new Promise(r => setTimeout(r, 800));
    setCrmStatus('disclaimer');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await signUp(form.email, form.password, {
        full_name: form.full_name,
        crm: form.crm,
        uf: form.uf,
        specialty: form.specialty,
        whatsapp: form.whatsapp,
        bio: form.bio,
        horario_inicio: form.horario_inicio,
        horario_fim: form.horario_fim,
        slot_duration: parseInt(form.slot_duration),
      }, 'doctor');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <>
      <Helmet>
        <title>Cadastro de Médico - Click Teleconsulta</title>
        <meta name="description" content="Cadastre-se como médico parceiro na Click Teleconsulta e comece a atender pacientes por telemedicina." />
      </Helmet>
      <div className="w-full flex justify-center items-start py-10 px-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Cadastro de Médico</h1>
            <p className="text-gray-500">Crie sua conta profissional em poucos minutos</p>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Etapa {step} de {STEPS.length}</span>
              <span className="text-xs text-blue-600 font-semibold">{Math.round((step / STEPS.length) * 100)}%</span>
            </div>
            <Progress value={Math.round((step / STEPS.length) * 100)} className="h-1.5 mb-6" />
            <StepIndicator currentStep={step} />

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-5 min-h-[280px]"
              >
                {/* Step 1: Dados Pessoais */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/40 rounded-lg p-3 text-sm text-blue-700 border border-blue-100">
                      👋 Vamos começar! Precisamos de algumas informações básicas.
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nome Completo *</Label>
                      <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Seu nome como aparece no CRM" className={errors.full_name ? 'border-red-300' : ''} />
                      {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp (opcional)</Label>
                      <Input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bio Profissional (opcional — pode preencher depois)</Label>
                      <Textarea
                        value={form.bio}
                        onChange={e => update('bio', e.target.value)}
                        placeholder="Conte sobre sua formação, experiência e abordagem de atendimento..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: CRM */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/40 rounded-lg p-3 text-sm text-blue-700 border border-blue-100">
                      🏥 Informe seu CRM para garantir a verificação do seu perfil.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Número CRM *</Label>
                        <Input value={form.crm} onChange={e => update('crm', e.target.value)} placeholder="123456" className={errors.crm ? 'border-red-300' : ''} />
                        {errors.crm && <p className="text-xs text-red-500">{errors.crm}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Estado (UF) *</Label>
                        <Select value={form.uf} onValueChange={v => update('uf', v)}>
                          <SelectTrigger className={errors.uf ? 'border-red-300' : ''}><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>{BRAZIL_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                        {errors.uf && <p className="text-xs text-red-500">{errors.uf}</p>}
                      </div>
                    </div>

                    {/* CRM validation */}
                    {form.crm && form.uf && (
                      <div>
                        {crmStatus === null && (
                          <Button variant="outline" size="sm" onClick={handleCheckCRM} className="text-xs">
                            <Shield className="w-3.5 h-3.5 mr-1.5" /> Verificar CRM
                          </Button>
                        )}
                        {crmStatus === 'checking' && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando CFM...
                          </div>
                        )}
                        {crmStatus === 'valid' && (
                          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CRM verificado automaticamente!
                          </div>
                        )}
                        {crmStatus === 'disclaimer' && (
                          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>A verificação automática via CFM não está disponível agora. <strong>Verificaremos seu CRM em até 24h</strong> após o cadastro.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Especialidades */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/40 rounded-lg p-3 text-sm text-blue-700 border border-blue-100">
                      🩺 Sua especialidade aparecerá no perfil público e no resultado de buscas.
                    </div>
                    <div className="space-y-1.5">
                      <Label>Especialidade Principal *</Label>
                      <Select value={form.specialty} onValueChange={v => update('specialty', v)}>
                        <SelectTrigger className={errors.specialty ? 'border-red-300' : ''}>
                          <SelectValue placeholder="Selecione sua especialidade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.specialty && <p className="text-xs text-red-500">{errors.specialty}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bio / Descrição Profissional</Label>
                      <Textarea
                        value={form.bio}
                        onChange={e => update('bio', e.target.value)}
                        placeholder="Ex: Sou cardiologista com 15 anos de experiência. Especializado em arritmias..."
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-gray-400">Esta descrição aparecerá no seu perfil público.</p>
                    </div>
                  </div>
                )}

                {/* Step 4: Agenda */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/40 rounded-lg p-3 text-sm text-blue-700 border border-blue-100">
                      📅 Configure seus horários padrão. Você poderá ajustar tudo depois na área de Agenda.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Horário Início</Label>
                        <Input type="time" value={form.horario_inicio} onChange={e => update('horario_inicio', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Horário Fim</Label>
                        <Input type="time" value={form.horario_fim} onChange={e => update('horario_fim', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duração padrão por consulta</Label>
                      <Select value={form.slot_duration} onValueChange={v => update('slot_duration', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-400">
                      💡 Você poderá configurar dias da semana, bloqueios e intervalos na área de Agenda.
                    </p>
                  </div>
                )}

                {/* Step 5: Acesso */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/40 rounded-lg p-3 text-sm text-blue-700 border border-blue-100">
                      🔐 Quase lá! Configure seu acesso à plataforma.
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail *</Label>
                      <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="seu@email.com" className={errors.email ? 'border-red-300' : ''} />
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Senha *</Label>
                      <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className={errors.password ? 'border-red-300' : ''} />
                      {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirmar Senha *</Label>
                      <Input type="password" value={form.password_confirm} onChange={e => update('password_confirm', e.target.value)} placeholder="Repita a senha" className={errors.password_confirm ? 'border-red-300' : ''} />
                      {errors.password_confirm && <p className="text-xs text-red-500">{errors.password_confirm}</p>}
                    </div>
                  </div>
                )}

                {/* Step 6: Preview */}
                {step === 6 && (
                  <div className="space-y-5">
                    <div className="bg-green-50/50 rounded-lg p-3 text-sm text-green-700 border border-green-200">
                      ✨ Veja como seu perfil ficará visível para os pacientes antes de finalizar.
                    </div>
                    <ProfilePreview form={form} />
                    <ProfileChecklist form={form} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              <Button variant="ghost" onClick={handleBack} disabled={step === 1} className="text-gray-500">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>

              {step < STEPS.length ? (
                <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || authLoading} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting || authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Criar Conta e Publicar Perfil
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link to="/acesso-medico" className="font-medium text-primary hover:underline">Faça login aqui.</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default DoctorSignUpPage;
