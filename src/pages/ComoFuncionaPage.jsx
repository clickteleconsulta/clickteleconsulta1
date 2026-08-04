import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarCheck, UserCheck, Video, ShieldCheck, CreditCard, Clock, ArrowRight, FileCheck2 } from 'lucide-react';

const STEPS = [
  { icon: UserCheck, title: '1. Escolha o médico', text: 'Veja os médicos parceiros disponíveis, os horários e o valor de cada um.' },
  { icon: CalendarCheck, title: '2. Agende e pague', text: 'Selecione o horário, crie sua conta em 1 minuto e pague por Pix ou cartão.' },
  { icon: Video, title: '3. Seja atendido', text: 'O médico entra em contato até 15 minutos antes para a teleconsulta por vídeo.' },
];
const BENEFITS = [
  { icon: Clock, title: 'Sem filas', text: 'Atendimento online, de onde você estiver, no seu tempo.' },
  { icon: CreditCard, title: 'A partir de R$ 40', text: 'Você paga só quando usa — sem mensalidade nem assinatura.' },
  { icon: ShieldCheck, title: 'Médicos verificados (CRM)', text: 'E seus dados protegidos conforme a LGPD.' },
];

const ComoFuncionaPage = () => {
  const howto = {
    '@context': 'https://schema.org', '@type': 'HowTo',
    name: `Como agendar uma teleconsulta na ${BRAND.name}`,
    step: STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title.replace(/^\d+\.\s/, ''), text: s.text })),
  };
  return (
    <>
      <Helmet>
        <title>{`Como funciona a teleconsulta · ${BRAND.name}`}</title>
        <meta name="description" content="Veja como agendar uma teleconsulta em 3 passos: escolha o médico, agende e pague, e seja atendido online. A partir de R$ 40, com Pix ou cartão." />
        <link rel="canonical" href={`${BRAND.url}/como-funciona`} />
        <script type="application/ld+json">{JSON.stringify(howto)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Como funciona</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">Sua teleconsulta em 3 passos simples</h1>
          <p className="text-slate-500 mt-3 text-lg leading-relaxed">Escolha um médico, agende e seja atendido online — sem sair de casa, sem fila e com preço acessível. Nosso propósito é democratizar o acesso à saúde para o que pode ser resolvido a distância, com agilidade. A {BRAND.name} é um marketplace de agendamentos: cuidamos do agendamento e do pagamento; o atendimento é conduzido pelo próprio médico.</p>
          <Button asChild className="mt-6 h-12 px-7 text-base rounded-md"><Link to="/agendamentos">Agendar consulta <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-12">
          {STEPS.map((s) => (
            <div key={s.title} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
              <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><s.icon className="w-5 h-5" /></div>
              <h2 className="font-bold text-slate-900 text-lg">{s.title}</h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-bold text-slate-900 text-center">Por que agendar pela {BRAND.name}</h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex items-start gap-3 p-4 rounded-md bg-brand-50 border border-slate-100">
                <b.icon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div><p className="font-semibold text-slate-800 text-sm">{b.title}</p><p className="text-xs text-slate-500 mt-0.5">{b.text}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* O 4º passo que não cabe nos três cards: o que vem DEPOIS do atendimento.
            É a dúvida mais comum de quem nunca fez teleconsulta. */}
        <div className="mt-14 bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Depois da consulta</h2>
              <p className="text-slate-600 mt-2 leading-relaxed">
                Quando a avaliação clínica indicar, o médico pode emitir prescrição digital, solicitação de
                exames e atestado — em PDF assinado digitalmente, com a mesma validade dos documentos de uma
                consulta presencial. Você pode conferir a autenticidade de cada um no validador oficial do
                Governo Federal.
              </p>
              <Link
                to="/documentos-e-validade"
                className="inline-flex items-center gap-1.5 mt-3 text-brand-600 font-medium hover:underline"
              >
                Ver como conferir os documentos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-brand-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Pronto para começar?</h2>
          <p className="opacity-90 mt-2">Encontre um médico e agende sua teleconsulta agora.</p>
          <Button asChild variant="secondary" className="mt-5 h-11 px-6 rounded-md bg-white text-slate-900 hover:bg-slate-100"><Link to="/agendamentos">Ver médicos disponíveis</Link></Button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-10">
          Ficou com dúvidas? Veja as <Link to="/perguntas-frequentes" className="text-brand-600 font-medium hover:underline">perguntas frequentes</Link>.
        </p>
      </div>
    </>
  );
};

export default ComoFuncionaPage;
