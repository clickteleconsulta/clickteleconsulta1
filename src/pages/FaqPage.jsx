import React from 'react';
import { BRAND } from '@/config/brand';
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
        <title>{`Perguntas frequentes · ${BRAND.name}`}</title>
        <meta name="description" content={`Tire suas dúvidas sobre a ${BRAND.name}: como agendar, valores, pagamento, reembolso, receita/atestado e proteção de dados.`} />
        <link rel="canonical" href={`${BRAND.url}/perguntas-frequentes`} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        {/* Sem ilustração no topo: aqui o que a pessoa quer é chegar à lista de
            perguntas, e uma arte antes do título só empurra a resposta para
            baixo. A ilustração desta página foi para o rodapé, onde ela tem
            contexto — ao lado de quem não achou o que procurava. */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Ajuda</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">Perguntas frequentes</h1>
          <p className="text-slate-500 mt-3 text-lg">Tudo o que você precisa saber para agendar sua teleconsulta.</p>
        </div>

        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group bg-white border border-slate-200 rounded-lg overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-5 font-semibold text-slate-800 hover:bg-brand-50">
                {f.q}
                <span className="text-brand-500 text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>

        {/* Arte AO LADO do texto, e pequena: aqui ela ilustra uma situação
            concreta — a pergunta que ficou sem resposta — em vez de decorar a
            página inteira. */}
        <div className="mt-10 p-6 bg-brand-100 border border-brand-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src="/ilustra/faq.svg"
            alt=""
            aria-hidden="true"
            className="w-32 sm:w-40 h-auto shrink-0 mx-auto sm:mx-0 select-none pointer-events-none"
          />
          <div className="text-center sm:text-left">
            <p className="text-slate-700 font-medium">Não encontrou sua resposta?</p>
            <p className="text-sm text-slate-500 mt-1">Fale com a gente em <a href={`mailto:${BRAND.emails.suporte}`} className="text-brand-600 hover:underline">{BRAND.emails.suporte}</a></p>
            <Button asChild className="mt-4 rounded-md"><Link to="/agendamentos">Agendar consulta</Link></Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FaqPage;
