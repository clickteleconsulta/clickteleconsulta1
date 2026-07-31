import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ShieldCheck, Wallet, UserCheck, ArrowRight, Building2 } from 'lucide-react';

const VALORES = [
  { icon: CalendarCheck, title: 'Democratizar o acesso à saúde', text: 'Para o que pode ser resolvido a distância, você agenda com agilidade — sem deslocamento e sem fila de espera.' },
  { icon: Wallet, title: 'Transparência no preço', text: 'Você vê o valor antes de agendar e paga somente quando usa. Sem mensalidade, sem assinatura e sem planos de saúde.' },
  { icon: UserCheck, title: 'Profissionais verificados', text: 'Os médicos parceiros são verificados junto ao CRM do respectivo estado antes de aparecerem na plataforma.' },
  { icon: ShieldCheck, title: 'Proteção de dados (LGPD)', text: 'Tratamos seus dados com cuidado e em conformidade com a Lei Geral de Proteção de Dados.' },
];

const QuemSomosPage = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Quem somos · Click Teleconsulta',
    url: 'https://clickteleconsulta.online/quem-somos',
    mainEntity: {
      '@type': 'Organization',
      name: 'Click Teleconsulta',
      legalName: 'CLICK TELECONSULTA ONLINE LTDA',
      taxID: '68.171.336/0001-50',
      url: 'https://clickteleconsulta.online',
      email: 'suporte@clickteleconsulta.online',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'R. Antônio Pereira Ramos, nº 118, Centro',
        addressLocality: 'Coroaci',
        addressRegion: 'MG',
        postalCode: '39710-000',
        addressCountry: 'BR',
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>Quem somos · Click Teleconsulta</title>
        <meta name="description" content="Nosso propósito é democratizar o acesso à saúde: para o que pode ser resolvido a distância, agilidade sem deslocamento, sem fila e com preço acessível. A Click Teleconsulta é um marketplace de agendamentos que conecta pacientes a médicos parceiros." />
        <link rel="canonical" href="https://clickteleconsulta.online/quem-somos" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Quem somos</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">
            Democratizar o acesso à saúde, um agendamento de cada vez
          </h1>
          <p className="text-slate-500 mt-4 text-lg leading-relaxed">
            A Click Teleconsulta nasceu para tornar o cuidado com a saúde mais simples e acessível.
            Nosso propósito é <strong className="text-slate-700">democratizar o acesso à saúde</strong>:
            para situações que podem ser conduzidas a distância, você resolve com agilidade — sem
            deslocamento, sem fila de espera e por um preço acessível, com ótimo custo-benefício.
          </p>
          <p className="text-slate-500 mt-3 text-lg leading-relaxed">
            Somos um <strong className="text-slate-700">marketplace de agendamentos</strong> que conecta
            pacientes a médicos parceiros: você encontra o profissional, escolhe o horário e realiza o
            pagamento pela plataforma, tudo em poucos cliques.
          </p>
          <Button asChild className="mt-6 h-12 px-7 text-base rounded-xl">
            <Link to="/agendamentos">Agendar consulta <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>

        {/* O que somos / o que não somos */}
        <div className="grid sm:grid-cols-2 gap-4 mt-12">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg">O que fazemos</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Fazemos a intermediação do <strong className="text-slate-700">agendamento</strong> e do
              <strong className="text-slate-700"> pagamento</strong> entre pacientes e médicos, e emitimos
              a nota fiscal referente à nossa taxa de intermediação.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-lg">O que não somos</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              <strong className="text-slate-700">Não somos uma plataforma de teleconsulta.</strong> A
              teleconsulta e o ato médico são de responsabilidade exclusiva do profissional que realiza o
              atendimento, conforme as normas do CFM.
            </p>
          </div>
        </div>

        {/* Valores */}
        <div className="mt-14">
          <h2 className="text-xl font-bold text-slate-900 text-center">No que acreditamos</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            {VALORES.map((v) => (
              <div key={v.title} className="flex items-start gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <v.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{v.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{v.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dados da empresa */}
        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900">Dados da empresa</h2>
          </div>
          <div className="text-sm text-slate-500 leading-relaxed space-y-1">
            <p><span className="text-slate-700 font-medium">Razão social:</span> CLICK TELECONSULTA ONLINE LTDA</p>
            <p><span className="text-slate-700 font-medium">CNPJ:</span> 68.171.336/0001-50</p>
            <p><span className="text-slate-700 font-medium">Endereço:</span> R. Antônio Pereira Ramos, nº 118, Centro, Coroaci/MG, CEP 39.710-000</p>
            <p>
              <span className="text-slate-700 font-medium">Contato:</span>{' '}
              <a href="mailto:suporte@clickteleconsulta.online" className="text-blue-600 hover:underline break-all">suporte@clickteleconsulta.online</a>
            </p>
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-12 text-center">
          <p className="text-slate-600">Pronto para cuidar da sua saúde sem sair de casa?</p>
          <Button asChild className="mt-4 h-12 px-8 text-base rounded-xl">
            <Link to="/agendamentos">Ver médicos e horários <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default QuemSomosPage;
