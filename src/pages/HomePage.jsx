import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Star,
  Shield,
  Users,
  Video,
  Heart,
  Brain,
  Bone,
  Baby,
  Stethoscope,
  UserPlus,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BrainCircuit,
  User,
  Clock,
  FileText,
  Lock,
  ClipboardList,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/lib/customSupabaseClient';

// ─── Cycling Words ──────────────────────────────────────────────────────────────
const CYCLING_WORDS = ['consultas médicas', 'especialistas de confiança', 'atendimento sem sair de casa'];

// ─── Especialidades ─────────────────────────────────────────────────────────────
const SPECIALTIES = [
  { name: 'Clínico Geral', icon: Stethoscope, color: 'bg-sky-50 text-sky-600' },
  { name: 'Cardiologia', icon: Heart, color: 'bg-rose-50 text-rose-500' },
  { name: 'Dermatologia', icon: Sparkles, color: 'bg-amber-50 text-amber-500' },
  { name: 'Neurologia', icon: Brain, color: 'bg-slate-100 text-slate-600' },
  { name: 'Ortopedia', icon: Bone, color: 'bg-orange-50 text-orange-500' },
  { name: 'Pediatria', icon: Baby, color: 'bg-blue-50 text-blue-600' },
  { name: 'Ginecologia', icon: User, color: 'bg-pink-50 text-pink-500' },
  { name: 'Psicologia', icon: BrainCircuit, color: 'bg-blue-50 text-blue-600' },
];

// ─── Métricas de confiança ──────────────────────────────────────────────────────
// (paridade com a fase avançada: "15.000+" e nº de médicos dinâmico do banco)
const TRUST_METRICS = [
  { value: '15.000+', label: 'Consultas realizadas', icon: Video, color: 'text-sky-500' },
  { value: '50+', key: 'doctors', label: 'Médicos cadastrados', icon: Users, color: 'text-sky-500' },
  { value: '4,9', label: 'Avaliação média', icon: Star, iconClass: 'fill-amber-400 text-amber-400' },
  { value: 'CFM', label: 'Certificado', icon: Shield, color: 'text-green-600' },
];

// ─── Steps ──────────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: UserPlus, title: 'Cadastre-se', desc: 'Crie sua conta em segundos — sem burocracia.' },
  { icon: Calendar, title: 'Escolha o médico', desc: 'Filtre por especialidade, horário e preço.' },
  { icon: Stethoscope, title: 'Seja atendido', desc: 'Após o pagamento, o médico entra em contato e realiza o atendimento pelos meios próprios.' },
];

// ─── Features (Bento) ──────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock, title: 'Sem filas de espera', desc: 'Consulte no horário que funciona para você, sem esperar em salas lotadas.', span: 'md:col-span-2' },
  { icon: Shield, title: 'CFM Certificado', desc: 'Todos os profissionais são habilitados pelo Conselho Federal de Medicina.' },
  { icon: Calendar, title: 'Agendamento Rápido', desc: 'Escolha especialidade, médico e horário e agende em poucos cliques.' },
  { icon: Lock, title: 'Seguro LGPD', desc: 'Seus dados protegidos com criptografia de ponta a ponta.' },
  { icon: CheckCircle, title: 'Confirmação na Hora', desc: 'Seu agendamento é confirmado imediatamente após o pagamento.' },
  { icon: Users, title: 'Especialistas Qualificados', desc: 'Profissionais habilitados e verificados, prontos para atender você.' },
];

// ─── FAQ ────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'O que é teleconsulta?', a: 'É o atendimento médico à distância, regulamentado pelo CFM. Você encontra o especialista e agenda pela plataforma; o próprio médico realiza a consulta pelos meios que utiliza, sem você precisar se deslocar.' },
  { q: 'Preciso de convênio?', a: 'Não. O Click Teleconsulta funciona de forma particular. Você paga diretamente pela consulta com preços acessíveis, sem necessidade de convênio ou plano de saúde.' },
  { q: 'Como acontece o atendimento?', a: 'Após agendar e confirmar o pagamento, o médico entra em contato e conduz o atendimento pelos meios próprios dele (por exemplo telefone, vídeo ou a plataforma que utilizar), conforme as normas do CFM.' },
  { q: 'A prescrição é válida?', a: 'Sim. Quando necessária, a prescrição é emitida pelo próprio médico, com assinatura e validade legal conforme a regulamentação vigente. A plataforma cuida apenas do agendamento e do pagamento.' },
  { q: 'Como pago?', a: 'Aceitamos cartão de crédito, débito e PIX. O pagamento é processado de forma segura antes da consulta.' },
  { q: 'É seguro?', a: 'Totalmente. Utilizamos criptografia de ponta a ponta, estamos em conformidade com a LGPD e todos os médicos são verificados junto ao CRM.' },
];

// ─── Animações ──────────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// ─── Componente Principal ───────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);


  const handleSearch = (e) => {
    e.preventDefault();
    const params = searchQuery.trim()
      ? `/medicos?q=${encodeURIComponent(searchQuery.trim())}`
      : '/medicos';
    navigate(params);
  };

  return (
    <>
      <Helmet>
        <title>Click Teleconsulta — Sua saúde a um clique de distância</title>
        <meta
          name="description"
          content="Agende teleconsultas com especialistas de forma rápida e segura. Sem filas, sem deslocamento."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=DM+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
          .font-body { font-family: 'DM Sans', system-ui, sans-serif; }
        `}</style>
      </Helmet>

      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #0c3547 100%)',
        }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 container mx-auto px-4 py-20 md:py-28 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Texto esquerda */}
            <motion.div
              className="max-w-xl flex-1"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              <motion.h1
                variants={fadeUp}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
              >
                Sua saúde a um{' '}
                <span className="relative inline-block">
                  clique
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C50 2 150 2 198 6" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>{' '}
                de{' '}
                <br className="hidden sm:block" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="inline-block text-blue-400"
                  >
                    {CYCLING_WORDS[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="font-body mt-6 text-lg text-slate-300 leading-relaxed max-w-md"
              >
                Encontre especialistas, agende sua consulta e seja atendido de onde estiver.
                Rápido, seguro e acessível.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 font-display font-bold shadow-lg shadow-blue-600/30"
                >
                  <Link to="/agendamentos" className="flex items-center gap-2">
                    Agendar Consulta <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Visual direito — shapes decorativos */}
            <div className="flex-1 relative hidden lg:flex items-center justify-center min-h-[400px]">
              {/* Card flutuante 1 */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute top-8 right-12 w-52 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-display text-white text-sm font-bold">Consulta agendada</p>
                    <p className="text-slate-400 text-xs font-body">Confirmação imediata</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-body">
                  <Shield className="w-3.5 h-3.5 text-green-400" /> Médico verificado (CFM)
                </div>
              </motion.div>

              {/* Card flutuante 2 */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-16 right-4 w-48 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-display text-white text-xs font-bold">LGPD Compliant</p>
                    <p className="text-blue-400 text-xs font-body">100% seguro</p>
                  </div>
                </div>
              </motion.div>

              {/* Card flutuante 3 */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1 }}
                className="absolute top-1/2 left-0 -translate-y-1/2 w-44 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-display text-white text-xs font-bold">Atendimentos médicos</p>
                    <p className="text-slate-400 text-xs font-body">por telemedicina</p>
                  </div>
                </div>
              </motion.div>

              {/* Círculos decorativos */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full border border-white/5" />
              <div className="absolute bottom-0 left-8 w-48 h-48 rounded-full border border-white/5" />
              <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-blue-500/5" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. COMO FUNCIONA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Como funciona? É simples!
            </h2>
            <p className="font-body mt-3 text-slate-500">
              Em 3 passos você agenda sua consulta
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row items-start md:items-center justify-center gap-8 md:gap-0 max-w-4xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={index}>
                  <motion.div
                    variants={fadeUp}
                    className="flex flex-col items-center text-center flex-1 px-4"
                  >
                    <div className="relative mb-5">
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <Icon className="w-8 h-8 text-blue-500" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-display font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm text-slate-500 leading-relaxed max-w-[200px]">
                      {step.desc}
                    </p>
                  </motion.div>
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:block w-16 h-px bg-slate-200 flex-shrink-0 mt-10" />
                  )}
                </React.Fragment>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          5. POR QUE CLICK TELECONSULTA
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Por que Click Teleconsulta?
            </h2>
            <p className="font-body mt-3 text-slate-500 max-w-lg mx-auto">
              Tecnologia e cuidado médico unidos para a melhor experiência em telemedicina
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className={`bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${feature.span || ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="font-body text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          7. CTA FINAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-20 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #2563eb 100%)',
        }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-4">
              Cuide da sua saúde agora mesmo
            </h2>
            <p className="font-body text-lg text-white/80 mb-10 max-w-md mx-auto">
              Consultas 7 dias por semana. Sem fila.
            </p>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-slate-900 hover:bg-slate-50 px-10 font-display font-bold shadow-xl shadow-black/20 text-base"
            >
              <Link to="/agendamentos" className="flex items-center gap-2">
                Agendar Consulta <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          8. FAQ
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Perguntas frequentes
            </h2>
            <p className="font-body mt-3 text-slate-500">
              Tire suas dúvidas sobre a teleconsulta
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <Accordion type="single" collapsible className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-slate-50 rounded-2xl border-0 px-6 overflow-hidden"
                >
                  <AccordionTrigger className="font-display text-left font-bold text-slate-900 hover:no-underline py-5 text-base">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-slate-500 leading-relaxed pb-5">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
