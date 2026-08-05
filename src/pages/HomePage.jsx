import React, { useState, useEffect } from 'react';
import { BRAND } from '@/config/brand';
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
/**
 * A ilustração do herói. Do unDraw, recolorida para o cobalto da marca com o
 * jade entrando a cada três acentos — ver docs/ILUSTRACAO-HEROI.md.
 *
 * Trocar a arte é trocar este caminho. A caixa usa `object-contain` e altura
 * máxima, então qualquer proporção entra inteira, sem recorte.
 */
const HERO_ARTE = '/ilustra/heroi.svg';

const CYCLING_WORDS = ['sem sair de casa', 'sem fila', 'sem convênio'];

// Reserva o espaço do herói. Derivada da lista, e não escrita à mão: acrescentar
// uma palavra maior sem lembrar de atualizar aqui traria o pulo de volta.
const PALAVRA_MAIS_LONGA = CYCLING_WORDS.reduce((a, b) => (b.length > a.length ? b : a));

// ─── Especialidades ─────────────────────────────────────────────────────────────
const SPECIALTIES = [
  { name: 'Generalista', icon: Stethoscope, color: 'bg-brand-50 text-brand-600' },
  { name: 'Cardiologia', icon: Heart, color: 'bg-rose-50 text-rose-500' },
  { name: 'Dermatologia', icon: Sparkles, color: 'bg-amber-50 text-amber-500' },
  { name: 'Neurologia', icon: Brain, color: 'bg-violet-50 text-violet-500' },
  { name: 'Ortopedia', icon: Bone, color: 'bg-orange-50 text-orange-500' },
  { name: 'Pediatria', icon: Baby, color: 'bg-teal-50 text-teal-500' },
  { name: 'Ginecologia', icon: User, color: 'bg-pink-50 text-pink-500' },
  { name: 'Psicologia', icon: BrainCircuit, color: 'bg-indigo-50 text-indigo-500' },
];

// ─── Métricas de confiança ──────────────────────────────────────────────────────
// (paridade com a fase avançada: "15.000+" e nº de médicos dinâmico do banco)
const TRUST_METRICS = [
  { value: '15.000+', label: 'Consultas realizadas', icon: Video, color: 'text-brand-500' },
  { value: '50+', key: 'doctors', label: 'Médicos cadastrados', icon: Users, color: 'text-teal-500' },
  { value: '4,9', label: 'Avaliação média', icon: Star, iconClass: 'fill-amber-400 text-amber-400' },
  { value: 'CFM', label: 'Certificado', icon: Shield, color: 'text-green-600' },
];

// ─── Steps ──────────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: Search, title: 'Escolha o médico', desc: 'Filtre por especialidade, horário e preço e veja quem tem vaga.' },
  { icon: CalendarCheck, title: 'Agende e pague', desc: 'Reserve o horário e pague com Pix ou cartão, de forma protegida.' },
  { icon: CheckCircle, title: 'Confirmação na hora', desc: 'Você recebe a confirmação e um lembrete antes da consulta.' },
  { icon: Stethoscope, title: 'Seja atendido', desc: 'O médico entra em contato e realiza o atendimento pelos meios próprios.' },
];

// ─── Features (Bento) ──────────────────────────────────────────────────────────
const FEATURES = [
  // Sem `md:col-span-2` aqui. São 6 itens numa grade de 3 colunas: com um deles
  // ocupando duas, a conta deixa de fechar e o último cartão fica sozinho na
  // terceira linha, com dois terços de vazio ao lado. E o cartão largo tinha o
  // MESMO texto curto dos demais, então o dobro de largura só virava espaço
  // sobrando — lia como erro de enquadramento, não como destaque.
  // 6 ÷ 3 = duas linhas cheias. Se algum dia um item merecer destaque, ele
  // precisa de conteúdo que justifique a largura, não só da classe.
  { icon: Clock, title: 'Sem filas de espera', desc: 'Consulte no horário que funciona para você, sem esperar em salas lotadas.' },
  { icon: Shield, title: 'Registro verificado', desc: 'Todo médico parceiro tem o registro conferido junto ao CRM do respectivo estado.' },
  { icon: Calendar, title: 'Agendamento Rápido', desc: 'Escolha especialidade, médico e horário e agende em poucos cliques.' },
  { icon: Lock, title: 'Proteção LGPD', desc: 'Seus dados trafegam por conexão criptografada e são tratados conforme a LGPD.' },
  { icon: CheckCircle, title: 'Confirmação na Hora', desc: 'Seu agendamento é confirmado imediatamente após o pagamento.' },
  { icon: Users, title: 'Profissionais Qualificados', desc: 'Profissionais habilitados e verificados, prontos para atender você.' },
];

// ─── FAQ ────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'O que é teleconsulta?', a: 'É o atendimento médico à distância, regulamentado pelo CFM. Você encontra o profissional e agenda pela plataforma; o próprio médico realiza a consulta pelos meios que utiliza, sem você precisar se deslocar.' },
  { q: 'Preciso de convênio?', a: `Não. A ${BRAND.name} funciona de forma particular. Você paga diretamente pela consulta com preços acessíveis, sem necessidade de convênio ou plano de saúde.` },
  { q: 'Como acontece o atendimento?', a: 'Após agendar e confirmar o pagamento, o médico entra em contato e conduz o atendimento pelos meios próprios dele (por exemplo telefone, vídeo ou a plataforma que utilizar), conforme as normas do CFM.' },
  { q: 'A prescrição é válida?', a: 'Sim. Quando necessária, a prescrição é emitida pelo próprio médico, com assinatura e validade legal conforme a regulamentação vigente. A plataforma cuida apenas do agendamento e do pagamento.' },
  { q: 'Como pago?', a: 'Aceitamos cartão de crédito, débito e PIX. O pagamento é feito antes da consulta, em ambiente do provedor de pagamentos — os dados do cartão vão direto para ele e não passam pela plataforma.' },
  { q: 'Como meus dados são protegidos?', a: 'A navegação e o pagamento usam conexão criptografada, o tratamento dos dados segue a LGPD e os médicos parceiros têm o registro verificado junto ao CRM do respectivo estado.' },
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
      ? `/agendamentos?q=${encodeURIComponent(searchQuery.trim())}`
      : '/agendamentos';
    navigate(params);
  };

  return (
    <>
      <Helmet>
        <title>{BRAND.name} — Agende sua consulta com o médico que você escolher</title>
        <meta
          name="description"
          content="Marketplace de agendamento: escolha o profissional, veja preço e horários e agende em minutos. Pix ou cartão, sem mensalidade."
        />
        <link rel="canonical" href={`${BRAND.url}/`} />
      </Helmet>

      {/* Full-bleed: as seções ocupam a largura toda da tela (cancela o container/padding do main) */}
      <div className="-my-8 mx-[calc(50%-50vw)] w-screen">

      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        // Azul claro CHAPADO. Era um degradê que começava em branco, e o
        // branco no topo fazia o banner sumir dentro do cabeçalho — a página
        // parecia começar no meio. #E3EAF6 é o brand-100, o mesmo azul que já
        // era a ponta de baixo daquele degradê: a cor não é nova, o degradê é
        // que desabou nela.
        style={{ background: '#E3EAF6' }}
      >
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: 'radial-gradient(circle, #3B5BA5 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Herói mais baixo e assimétrico: o texto ancora à esquerda e a ação vai
            para a direita, em vez de tudo centrado numa coluna alta. O respiro
            vertical caiu de py-16/20/24 para py-10/12/14. */}
        <div className="relative z-10 container mx-auto px-4 py-10 md:py-12 lg:py-14">
          {/* Colunas que ABRAÇAM o conteúdo (`auto`) e ancoram à esquerda. Com
              `1fr` na primeira, a coluna do botão era empurrada para a borda da
              tela e ele ficava solto no canto, longe do texto a que pertence. */}
          {/* `items-end` e não `items-center`: o personagem da ilustração pisa
                  numa linha de chão, e alinhar essa linha com o pé do bloco de
                  texto faz o herói inteiro assentar sobre uma base só. Centrado,
                  a arte flutuava 124 px acima do botão — medido — e os dois
                  pareciam duas peças soltas em vez de uma cena. */}
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end gap-8 lg:gap-10">
            <motion.div
              className="max-w-2xl text-left"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {/* Era 68 px com entrelinha 68 — proporção 1,0 exata. Num título de
                  três linhas isso encosta a descendente de uma linha na maiúscula
                  da seguinte: é a sensação de texto espremido. Agora 56 px com
                  1,12, que devolve o ar sem o título deixar de ser o maior
                  elemento da tela. O tracking afrouxa junto (-0,035em ->
                  -0,025em): quanto menor o corpo, menos aperto horizontal o
                  desenho aguenta.

                  TODOS os tamanhos em valor arbitrário, de propósito. As classes
                  prontas do Tailwind (`text-5xl` e afins) trazem `line-height`
                  embutido, e no CSS gerado a regra de `text-*` vem DEPOIS da de
                  `leading-*` — resultado: um `md:text-5xl` no meio da lista
                  reimpunha entrelinha 1,0 e o `leading-[1.12]` era ignorado.
                  Foi exatamente o que aconteceu na primeira tentativa desta
                  correção. Sem classe pronta, ninguém injeta entrelinha. */}
              <motion.h1
                variants={fadeUp}
                className="font-display text-[2.6rem] md:text-[3rem] lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.12] tracking-[-0.025em]"
              >
                Consulta marcada em{' '}
                {/* A vírgula fica presa a "minutos" pelo whitespace-nowrap. Sem ele,
                    "minutos" é um inline-block e a vírgula um nó de texto solto: o
                    navegador podia quebrar a linha entre os dois e, no celular, a
                    troca da palavra animada refluía o texto e jogava a vírgula
                    sozinha para a linha de baixo. O nowrap envolve só os dois — o
                    espaço seguinte fica de fora, então a linha ainda pode quebrar
                    DEPOIS da vírgula, que é onde deve quebrar. */}
                <span className="whitespace-nowrap">
                  <span className="relative inline-block">
                    minutos
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M2 6C50 2 150 2 198 6" stroke="#A3B8DF" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </span>
                  ,
                </span>{' '}
                <br className="hidden sm:block" />
                {/* O espaço da palavra que gira é RESERVADO por um fantasma invisível
                    com a maior das opções; as palavras animadas ficam sobrepostas a
                    ele, em posição absoluta.

                    Sem isso o herói pulava de duas formas: no vão entre a palavra que
                    sai e a que entra o texto ficava uma linha mais curto, e palavras
                    de larguras diferentes mudavam a quebra de linha. Medido no celular:
                    o botão "Agendar Consulta" subia 50 px a cada 3 segundos.

                    Tentei antes resolver trocando o modo do AnimatePresence para
                    popLayout — não resolveu, porque o problema é de fluxo do texto e
                    não de qual elemento está montado. Reservar o espaço não depende do
                    comportamento interno da biblioteca de animação. */}
                <span className="relative inline-block align-top">
                  <span className="invisible" aria-hidden="true">{PALAVRA_MAIS_LONGA}</span>
                  <span className="absolute inset-0">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={wordIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="inline-block text-brand-600"
                      >
                        {CYCLING_WORDS[wordIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="font-body mt-5 text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg"
              >
                Veja preço e horários na hora, escolha o profissional e agende.
                Pix ou cartão, sem mensalidade.
              </motion.p>

              {/* A AÇÃO VEM AQUI, não na coluna da arte.
                  Embaixo da ilustração ela caía no pé do banner — medido: y=428
                  num herói que termina em 524, ou seja, a última coisa do bloco.
                  Quem lê o título e a promessa encontrava os selos de confiança
                  antes de encontrar o que fazer.
                  Na coluna do texto a ordem vira título -> promessa -> ação ->
                  reforço, que é a ordem em que a pessoa decide. */}
              <motion.div variants={fadeUp} className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-8 h-14 text-base font-display font-bold shadow-sm"
                >
                  <Link to="/agendamentos" className="flex items-center justify-center gap-2 whitespace-nowrap">
                    Agendar Consulta <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>

              {/* Selos de confiança */}
              <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-body text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-500" /> Agende a qualquer hora</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-600" /> Proteção LGPD</span>
                <span className="inline-flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-teal-500" /> Atendimentos médicos</span>
              </motion.div>
            </motion.div>

            {/* Só a ARTE nesta coluna.
                Ela já morou aqui com o botão embaixo, e antes disso com o botão
                em ABSOLUTO por cima — aquela versão existia para mirar a ponta
                de um dedo que apontava, numa ilustração que não usamos mais.
                Sem o botão, a arte cresce de 220 para 260 de altura e passa a
                equilibrar sozinha o peso do título, em vez de dividir a coluna.

                `object-contain`: cabe inteira, nunca recortada, seja qual for a
                proporção do arquivo. */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              // Largura EXPLÍCITA no lg: a coluna da grade é `auto`, então um
              // `w-full` aqui vira dependência circular (a coluna mede pelo
              // conteúdo, o conteúdo mede pela coluna) e a caixa colapsa para
              // zero — com ela, a imagem some.
              className="w-full lg:w-[520px] xl:w-[560px] lg:justify-self-end lg:-mr-8 xl:-mr-20 flex items-center justify-center"
            >
              <img
                src={HERO_ARTE}
                alt=""
                aria-hidden="true"
                className="hidden lg:block w-full h-auto max-h-[340px] object-contain select-none pointer-events-none"
              />
            </motion.div>
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
              Em 4 passos simples você agenda sua consulta
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row items-start md:items-center justify-center gap-8 md:gap-0 max-w-5xl mx-auto"
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
                      <div className="w-20 h-20 rounded-lg bg-brand-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                        <Icon className="w-8 h-8 text-brand-500" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-display font-bold flex items-center justify-center shadow-lg shadow-brand-500/30">
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
      <section className="bg-brand-50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Por que {BRAND.name}?
            </h2>
            <p className="font-body mt-3 text-slate-500 max-w-lg mx-auto">
              Nosso propósito é democratizar o acesso à saúde: para o que pode ser resolvido a
              distância, atendimento com agilidade — sem deslocamento, sem fila e com preço acessível.
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
                  className={`bg-white rounded-lg p-8 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${feature.span || ''}`}
                >
                  <div className="w-12 h-12 rounded-md bg-brand-50 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-brand-500" />
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
      {/* Fundo PRETO CHAPADO. Era um degradê de #141A24 para o cobalto, e ele
          era o último degradê de fundo do site fora do banner do topo — o único
          que ficou permitido. O preto usado é o #141A24, que já era a ponta
          escura desse degradê: o fundo não ganhou cor nova, o degradê é que
          desabou na cor que ele já tinha de um lado. */}
      <section className="relative py-20 overflow-hidden" style={{ background: '#141A24' }}>
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
              className="bg-white text-slate-900 hover:bg-brand-50 px-10 font-display font-bold text-base"
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
                  className="bg-brand-50 rounded-lg border-0 px-6 overflow-hidden"
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
      </div>
    </>
  );
};

export default HomePage;
