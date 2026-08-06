import React, { useState, useEffect } from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Baby, Bone, Brain, BrainCircuit, Calendar, CalendarCheck, CalendarPlus, CheckCircle2, Clock, Heart, Lock, Search, Shield, Sparkles, Stethoscope, User, Users } from '@/components/ui/icones';
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
 * A ilustração do herói. Do Storyset, estilo cuate, recolorida para o cobalto da
 * marca — ver docs/ILUSTRACOES-E-ICONES.md.
 *
 * É a MESMA arte da peça de anúncio "A partir de R$ 40", de propósito: quem
 * clica no anúncio reencontra o desenho aqui e não sente que caiu noutro lugar.
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

// ─── Métricas de confiança: REMOVIDAS ───────────────────────────────────────────
// Havia aqui um bloco com "15.000+ consultas realizadas", "4,9 de avaliação
// média" e "CFM · Certificado". Estava declarado e nunca renderizado, então não
// chegou a ir ao ar — mas era uma arma carregada: bastava alguém usar a
// constante para a home passar a mentir.
//
// Os três números eram falsos. O marketplace ainda não teve o primeiro
// agendamento, então não há consulta realizada nem nota média para mostrar. E o
// CFM não certifica plataforma de agendamento: ele regulamenta o exercício da
// medicina. Dizer "CFM · Certificado" ao lado do nosso logo sugere um aval que
// não existe.
//
// Quando houver consulta e avaliação de verdade, o número vem do banco — como
// já é feito com a contagem de médicos. Número de confiança escrito à mão no
// código é exatamente o tipo de coisa que ninguém lembra de conferir depois.

// ─── Steps ──────────────────────────────────────────────────────────────────────
// Cada passo mostra a AÇÃO dele, não o resultado dela. Parece óbvio e não é:
// o passo 2 usava CalendarCheck e o 3 usava CheckCircle2, ou seja, dois vistos
// em sequência. Lado a lado, os dois liam como o mesmo passo repetido, e a
// progressão de quatro etapas perdia justamente o meio.
//
// Agora as quatro formas são distintas de longe — lupa, calendário, círculo,
// estetoscópio — que é o que faz a sequência ser lida como sequência.
const STEPS = [
  { icon: Search, title: 'Escolha o médico', desc: 'Filtre por especialidade, horário e preço e veja quem tem vaga.' },
  { icon: CalendarPlus, title: 'Agende e pague', desc: 'Reserve o horário e pague com Pix ou cartão, de forma protegida.' },
  { icon: CheckCircle2, title: 'Confirmação na hora', desc: 'Você recebe a confirmação e um lembrete antes da consulta.' },
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
  { icon: Shield, title: 'Registro conferido', desc: 'Antes de aparecer aqui, o médico passa pela nossa conferência de identidade e de registro profissional.' },
  { icon: Calendar, title: 'Agendamento Rápido', desc: 'Escolha especialidade, médico e horário e agende em poucos cliques.' },
  { icon: Lock, title: 'Proteção LGPD', desc: 'Seus dados trafegam por conexão criptografada e são tratados conforme a LGPD.' },
  { icon: CheckCircle2, title: 'Confirmação na Hora', desc: 'Seu agendamento é confirmado imediatamente após o pagamento.' },
  { icon: Users, title: 'Profissionais qualificados', desc: 'Profissionais habilitados, prontos para atender você.' },
];

// ─── Seção de destaques com ilustração ──────────────────────────────────────────
/**
 * Três cartões com arte, para dar cor a uma página que é quase toda cobalto
 * sobre branco.
 *
 * O TEXTO NÃO FOI INVENTADO: cada linha reaproveita o que já está aprovado no
 * site — a descrição do passo "Escolha o médico" (STEPS) e a chamada da página
 * de documentos (siteContent). Só o rótulo dos botões é novo, e é rótulo de
 * navegação, não afirmação sobre o serviço.
 *
 * Cada cartão leva a uma página que EXISTE. Três botões apontando para o mesmo
 * lugar seria só enfeite com cara de escolha.
 */
const DESTAQUES = [
  {
    arte: '/ilustra/secao-escolher.svg',
    titulo: 'Escolha o médico por especialidade, horário e preço',
    rotulo: 'Ver médicos',
    para: '/agendamentos',
  },
  {
    arte: '/ilustra/secao-avaliacoes.svg',
    titulo: 'Veja a avaliação de quem já foi atendido',
    rotulo: 'Ver avaliações',
    para: '/agendamentos',
  },
  {
    arte: '/ilustra/secao-documentos.svg',
    titulo: 'Documentos com validade em todo o Brasil',
    rotulo: 'Saiba mais',
    para: '/documentos-e-validade',
  },
];

// ─── FAQ ────────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'O que é teleconsulta?', a: 'É o atendimento médico à distância, regulamentado pelo CFM. Você encontra o profissional e agenda pela plataforma; o próprio médico realiza a consulta pelos meios que utiliza, sem você precisar se deslocar.' },
  { q: 'Preciso de convênio?', a: `Não. A ${BRAND.name} funciona de forma particular. Você paga diretamente pela consulta com preços acessíveis, sem necessidade de convênio ou plano de saúde.` },
  { q: 'Como acontece o atendimento?', a: 'Após agendar e confirmar o pagamento, o médico entra em contato e conduz o atendimento pelos meios próprios dele (por exemplo telefone, vídeo ou a plataforma que utilizar), conforme as normas do CFM.' },
  { q: 'A prescrição é válida?', a: 'Sim. Quando necessária, a prescrição é emitida pelo próprio médico, com assinatura e validade legal conforme a regulamentação vigente. A plataforma cuida apenas do agendamento e do pagamento.' },
  { q: 'Como pago?', a: 'Aceitamos cartão de crédito, débito e PIX. O pagamento é feito antes da consulta, em ambiente do provedor de pagamentos — os dados do cartão vão direto para ele e não passam pela plataforma.' },
  { q: 'Como meus dados são protegidos?', a: 'A navegação e o pagamento usam conexão criptografada, o tratamento dos dados segue a LGPD e todo médico parceiro passa pela nossa conferência de identidade e de registro profissional antes de aparecer na plataforma.' },
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
      <div className="-my-8 full-bleed">

      {/* ═══════════════════════════════════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-x-clip"
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
        <div // O respiro de baixo é MENOR que o de cima de propósito: com a base do
          // calendário travada na linha do botão, as pernas do personagem ficam
          // sempre 16,3% da altura da arte abaixo dessa linha (57 px em 350). O
          // padding inferior é o que decide quanto disso o fundo azul cobre —
          // 32 px deixam ~25 px de pé para fora. Com pb-14 (56) as pernas
          // sumiam inteiras dentro da caixa.
          className="relative z-10 container mx-auto px-4 py-10 md:py-12 lg:pt-12 lg:pb-8">
          {/* Colunas que ABRAÇAM o conteúdo (`auto`) e ancoram à esquerda. Com
              `1fr` na primeira, a coluna do botão era empurrada para a borda da
              tela e ele ficava solto no canto, longe do texto a que pertence. */}
          {/* `items-end` e não `items-center`: o personagem da ilustração pisa
                  numa linha de chão, e alinhar essa linha com o pé do bloco de
                  texto faz o herói inteiro assentar sobre uma base só. Centrado,
                  a arte flutuava 124 px acima do botão — medido — e os dois
                  pareciam duas peças soltas em vez de uma cena. */}
              {/* `minmax(0,...)` nas duas colunas: sem isso a coluna da arte não
                  encolhe abaixo da largura da imagem (o mínimo de um `fr` é o
                  conteúdo), a imagem passa a empurrar a grade e rouba largura do
                  texto — foi o que jogou o título de volta para três linhas em
                  1024 px. Com o mínimo zerado, a arte transborda para fora da
                  tela em vez de espremer a frase. */}
              <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-end gap-8 lg:gap-10">
            <motion.div
              className="max-w-2xl lg:max-w-none text-left"
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
                className="font-display text-[2.6rem] md:text-[3rem] lg:text-[2.25rem] xl:text-[2.75rem] 2xl:text-[3rem] font-extrabold text-slate-900 leading-[1.12] tracking-[-0.025em]"
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
                className="font-body mt-4 text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg lg:max-w-none"
              >
                Veja preço e horários na hora, escolha o profissional e agende.
                Pix ou cartão, sem mensalidade.
              </motion.p>

              {/* AÇÃO E SELOS NA MESMA FAIXA.
                  Separados em duas linhas, o bloco afunilava — 672 px de título,
                  573 de subtítulo, 229 de botão — e a cunha que sobrava à
                  direita do botão era o "centro vazio" do banner. Lado a lado,
                  a última linha volta a ter a largura da coluna e o bloco fecha
                  como um retângulo.

                  Os selos vêm primeiro e o botão vai para a DIREITA da faixa. Num
                  bloco alinhado à esquerda, o canto direito é o fim natural da
                  leitura — a ação fica onde o olho termina, e não onde começa. No celular
                  eles voltam a empilhar, e ali o BOTÃO volta para cima
                  (`order-first`): empilhado, quem vem primeiro é quem se lê
                  primeiro, e deixar três linhas de selo antes da ação seria
                  justamente o que a troca corrigiu no desktop. */}
              <motion.div variants={fadeUp} className="mt-6 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-body text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-500" /> Agende a qualquer hora</span>
                <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-600" /> Proteção LGPD</span>
                <span className="inline-flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-teal-500" /> Atendimentos médicos</span>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto order-first sm:order-none sm:ml-auto lg:translate-x-6 shrink-0 bg-brand-600 hover:bg-brand-700 text-white px-8 h-14 text-base font-display font-bold shadow-sm"
                >
                  <Link to="/agendamentos" className="flex items-center justify-center gap-2 whitespace-nowrap">
                    Agendar Consulta <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Só a ARTE nesta coluna.
                Ela já morou aqui com o botão embaixo, e antes disso com o botão
                em ABSOLUTO por cima — aquela versão existia para mirar a ponta
                de um dedo que apontava, numa ilustração que não usamos mais.
                Sem o botão, a arte cresce de 220 para 260 de altura e passa a
                equilibrar sozinha o peso do título, em vez de dividir a coluna.

                `object-contain`: cabe inteira, nunca recortada, seja qual for a
                proporção do arquivo.

                O ALINHAMENTO É ANCORADO, NÃO CALCULADO EM PIXEL.
                A coluna alinha pela base (`items-end`), então a base da arte
                encostaria na base do botão. Mas o que precisa coincidir com o
                botão é a BASE DO CALENDÁRIO, e no arquivo ela está a 83,7% da
                altura da imagem — os 16,3% restantes são as pernas e os pés.
                Daí o `translate-y-[16.3%]`: a porcentagem no translate resolve
                contra a ALTURA DO PRÓPRIO ELEMENTO, então a conta se refaz
                sozinha se a arte mudar de tamanho, e o que sobra para baixo é
                exatamente o trecho das pernas.
                Como é `transform`, não mexe no layout: a altura da seção
                continua vindo da coluna de texto.

                A caixa é `h-[350px] w-auto`, e NÃO `max-h` com `w-full`. Com
                `max-h` a caixa ficava mais larga que o desenho, o desenho era
                centralizado dentro dela, e os 16,3% passavam a medir a CAIXA em
                vez da ARTE — em 1024 px isso já dava 10 px de desalinhamento.
                Com a altura fixa a caixa tem a proporção exata do arquivo e não
                sobra vão nenhum.

                E ela é ABSOLUTA no desktop. Em fluxo normal, a arte (350) é mais
                alta que a coluna de texto (263) e, com as duas alinhadas pela
                base, a diferença toda virava vazio ACIMA do título — 87 px de
                banner sobrando sem nada dentro. Fora do fluxo, a altura da seção
                passa a ser só a do texto e a arte se ancora na base da coluna,
                que continua sendo a linha do botão. O alinhamento não muda; o
                que some é a sobra. */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              // Largura EXPLÍCITA no lg: a coluna da grade é `auto`, então um
              // `w-full` aqui vira dependência circular (a coluna mede pelo
              // conteúdo, o conteúdo mede pela coluna) e a caixa colapsa para
              // zero — com ela, a imagem some.
              className="w-full lg:w-auto lg:justify-self-stretch lg:relative lg:-mr-10 xl:-mr-16 flex items-end justify-center lg:justify-end"
            >
              <img
                src={HERO_ARTE}
                alt=""
                aria-hidden="true"
                className="hidden lg:block h-[320px] w-auto max-w-none select-none pointer-events-none lg:absolute lg:bottom-0 lg:right-0 lg:translate-y-[16.3%]"
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
            className="grid grid-cols-2 md:flex md:flex-row items-start md:items-center justify-center gap-x-4 gap-y-10 md:gap-0 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* GRADE de 2 colunas no celular, linha única a partir de md.
                Empilhados, os quatro passos esticavam a página sem necessidade —
                cada um é curto e cabe em meia largura.

                Dá para trocar `flex` por `grid` sem tocar nos conectores porque
                eles são `hidden md:block`: item com `display:none` não ocupa
                célula na grade, então no celular sobram exatamente os quatro
                passos, dois por linha. A partir de md volta a ser flex e os
                conectores reaparecem entre eles. */}
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
                      {/* Número VAZADO, e não disco cheio. Com o ícone sólido dentro
                          da placa, o disco de cor virava uma segunda forma cheia
                          empilhada na primeira — duas manchas competindo no mesmo
                          canto, e o passo parecia carregado sem dizer mais nada.
                          Em contorno, a hierarquia fica certa: o desenho é o
                          assunto, o número é só a ordem dele. */}
                      <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white ring-[1.5px] ring-brand-200 text-brand-600 text-sm font-display font-bold flex items-center justify-center">
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
      {/* brand-100, e não brand-50: o fundo da página é slate-100 (#F1F5F9) e o
          brand-50 (#F2F5FB) fica a 2 pontos dele — o bloco de destaque era
          invisível, sobrava só a borda. Contra BRANCO o brand-50 lê bem, e é
          por isso que os ladrilhos de ícone dentro dos cartões continuam nele. */}
      <section className="bg-brand-100 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900">
              Por que agendar pela {BRAND.name}
            </h2>
            <p className="font-body mt-3 text-slate-500 max-w-lg mx-auto">
              Nosso propósito é democratizar o acesso à saúde: para o que pode ser resolvido a
              distância, atendimento com agilidade — sem deslocamento, sem fila e com preço acessível.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Duas colunas no celular. Empilhados, os seis cartões faziam a
                página rolar sem necessidade. Em meia largura o cartão fica com
                ~163 px, então padding, ícone e corpos de texto encolhem junto
                até md — com o p-8 do desktop sobrariam 99 px de conteúdo e o
                texto viraria uma coluna estreita demais para ler. */}
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className={`bg-white rounded-lg p-5 md:p-8 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${feature.span || ''}`}
                >
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-md bg-brand-50 flex items-center justify-center mb-3 md:mb-4">
                    <Icon className="w-6 h-6 text-brand-500" />
                  </div>
                  <h3 className="font-display text-[15px] md:text-lg font-bold text-slate-900 mb-1.5 md:mb-2">
                    {feature.title}
                  </h3>
                  <p className="font-body text-[13px] md:text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          6. DESTAQUES COM ILUSTRAÇÃO

          Faixa de cor no meio da página, que até aqui era cobalto sobre branco
          do começo ao fim.

          O fundo é um JADE bem diluído (6% sobre branco). O jade é proibido em
          interface — botão, link, ícone clicável, estado — e continua sendo:
          aqui ele é só a tinta do papel, e todo controle desta seção segue em
          ardósia e cobalto. É a mesma licença que a regra já dá às ilustrações.

          A arte transborda o topo do cartão de propósito: é o que tira a seção
          da cara de tabela e dá o ar de composição.
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-20" style={{ background: '#EDF7F2' }}>
        <div className="container mx-auto px-4">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 text-center max-w-2xl mx-auto"
          >
            Você vê tudo antes de agendar
          </motion.h2>

          <motion.div
            className="grid sm:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto mt-14 md:mt-16"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* DOIS ARRANJOS. No celular o cartão é uma LINHA — arte pequena à
                esquerda, texto e botão à direita —, porque empilhar os três no
                formato do desktop dava 1074 px de seção. Com três itens não dá
                para usar duas colunas sem deixar um órfão, então a saída é
                encurtar cada cartão em vez de reparti-los.
                A partir de sm volta o formato da referência: arte grande
                transbordando o topo do cartão.

                Este comentário fica FORA do `map`: o corpo da arrow é uma
                expressão entre parênteses, e um comentário JSX como primeira
                coisa dentro dela é lido como objeto e quebra o parse.
                E não escreva a sequência de fechar comentário aqui dentro —
                ela encerra o bloco antes da hora e o resto do texto vaza para
                a tela. Num grid, esse texto solto vira uma célula anônima e
                empurra os cartões para a coluna seguinte. */}
            {DESTAQUES.map((d) => (
              <motion.div key={d.titulo} variants={fadeUp} className="relative sm:pt-28">
                {/* Arte grande, só no desktop, saindo por cima do cartão. */}
                <img
                  src={d.arte}
                  alt=""
                  aria-hidden="true"
                  className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 h-56 w-auto max-w-full object-contain select-none pointer-events-none"
                />
                <div className="h-full bg-white rounded-lg border border-slate-200/80 p-4 sm:px-6 sm:pt-36 sm:pb-7 flex items-center gap-4 sm:block sm:text-center">
                  {/* Mesma arte, pequena e em fluxo — só no celular. */}
                  <img
                    src={d.arte}
                    alt=""
                    aria-hidden="true"
                    className="sm:hidden h-24 w-24 shrink-0 object-contain select-none pointer-events-none"
                  />
                  <div className="min-w-0 flex-1 flex flex-col items-start gap-3 sm:items-center sm:h-full sm:gap-0">
                    <h3 className="font-display text-[15px] sm:text-base font-bold text-slate-900 leading-snug">
                      {d.titulo}
                    </h3>
                    {/* `mt-auto` cola os botões na mesma linha no desktop, mesmo
                        com títulos de alturas diferentes. */}
                    <Button
                      asChild
                      variant="outline"
                      className="sm:mt-auto border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-10 sm:h-11 px-5 sm:px-6 text-sm sm:text-base font-semibold"
                    >
                      <Link to={d.para}>{d.rotulo}</Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
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
