import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FAQ } from '@/content/siteContent';

const FaqPage = () => {
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return (
    <>
      <Helmet>
        <title>Perguntas frequentes · Click Teleconsulta</title>
        <meta name="description" content="Tire suas dúvidas sobre a Click Teleconsulta: como agendar, valores, pagamento, reembolso, receita/atestado e proteção de dados." />
        <link rel="canonical" href="https://clickteleconsulta.online/perguntas-frequentes" />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Ajuda</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">Perguntas frequentes</h1>
          <p className="text-slate-500 mt-3 text-lg">Tudo o que você precisa saber para agendar sua teleconsulta.</p>
        </div>

        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-5 font-semibold text-slate-800 hover:bg-slate-50">
                {f.q}
                <span className="text-blue-500 text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>

        <div className="text-center mt-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl">
          <p className="text-slate-700 font-medium">Não encontrou sua resposta?</p>
          <p className="text-sm text-slate-500 mt-1">Fale com a gente em <a href="mailto:suporte@clickteleconsulta.online" className="text-blue-600 hover:underline">suporte@clickteleconsulta.online</a></p>
          <Button asChild className="mt-4 rounded-xl"><Link to="/agendamentos">Agendar consulta</Link></Button>
        </div>
      </div>
    </>
  );
};

export default FaqPage;
