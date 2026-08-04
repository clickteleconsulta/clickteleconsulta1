import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DOCUMENTOS } from '@/content/siteContent';
import {
  FileText, FlaskConical, FileCheck2, ShieldCheck, MapPin, QrCode, ArrowRight, ExternalLink,
} from 'lucide-react';

/**
 * Página que explica a validade da teleconsulta e dos documentos que o médico
 * emite depois dela.
 *
 * Todo o texto vive em `DOCUMENTOS`, em src/content/siteContent.js — inclusive
 * a nota sobre por que a emissão é sempre atribuída ao médico. Esta página só
 * diagrama.
 */

const ICONES_EMISSAO = [FileText, FlaskConical, FileCheck2];

const DocumentosPage = () => {
  const { titulo, chamada, validade, emissao, conferencia, etica, normas } = DOCUMENTOS;

  // Marcação de FAQ para o buscador: as três perguntas que a página responde.
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { q: 'A teleconsulta tem validade legal no Brasil?', a: validade.paragrafos[0] },
      { q: 'Que documentos o médico pode emitir depois da teleconsulta?', a: emissao.intro },
      { q: 'Como conferir se uma receita ou atestado digital é verdadeiro?', a: conferencia.intro },
    ].map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <Helmet>
        <title>{`${titulo} · ${BRAND.name}`}</title>
        <meta
          name="description"
          content="A teleconsulta é válida em todo o Brasil. Veja quais documentos o médico pode emitir — prescrição, pedido de exames e atestado — e como conferir a autenticidade em validar.iti.gov.br."
        />
        <link rel="canonical" href={`${BRAND.url}/documentos-e-validade`} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Validade</span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">{titulo}</h1>
          <p className="text-slate-500 mt-3 text-lg leading-relaxed">{chamada}</p>
        </div>

        {/* Validade legal e alcance nacional */}
        <section className="mt-12 bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{validade.titulo}</h2>
              <div className="mt-3 space-y-3">
                {validade.paragrafos.map((p) => (
                  <p key={p} className="text-slate-600 leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Documentos que o médico pode emitir */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">{emissao.titulo}</h2>
          <p className="text-slate-600 mt-2 leading-relaxed">{emissao.intro}</p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {emissao.itens.map((item, i) => {
              const Icone = ICONES_EMISSAO[i];
              return (
                <div key={item.titulo} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                    <Icone className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">{item.titulo}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{item.texto}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Como conferir — o miolo da página */}
        <section className="mt-8 bg-brand-50 border border-brand-100 rounded-lg p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900">{conferencia.titulo}</h2>
          <p className="text-slate-600 mt-2 leading-relaxed">{conferencia.intro}</p>

          {/* Numerados porque são uma sequência: sem o PDF original, o passo 3 não funciona. */}
          <ol className="mt-6 space-y-4">
            {conferencia.passos.map((passo, i) => (
              <li key={passo} className="flex items-start gap-4">
                <span className="flex-none w-8 h-8 rounded-lg bg-white border border-brand-200 text-brand-600 font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-slate-700 leading-relaxed pt-1">{passo}</p>
              </li>
            ))}
          </ol>

          <Button asChild className="mt-6 h-11 px-6 rounded-md">
            <a href={conferencia.url} target="_blank" rel="noopener noreferrer">
              Abrir o validador oficial <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>

          <div className="mt-6 pt-6 border-t border-brand-100 flex items-start gap-3">
            <QrCode className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">{conferencia.qr.titulo}</p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{conferencia.qr.texto}</p>
            </div>
          </div>
        </section>

        {/* Ética e sigilo */}
        <section className="mt-8 bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{etica.titulo}</h2>
              <div className="mt-3 space-y-3">
                {etica.paragrafos.map((p) => (
                  <p key={p} className="text-slate-600 leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* As normas citadas, para quem quiser conferir na fonte */}
        <section className="mt-8">
          <h2 className="text-base font-bold text-slate-900">Normas citadas nesta página</h2>
          <dl className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
            {normas.map((norma) => (
              <div key={norma.n} className="p-4 sm:flex sm:gap-4">
                <dt className="font-semibold text-slate-800 text-sm sm:w-64 sm:shrink-0">{norma.n}</dt>
                <dd className="text-sm text-slate-500 mt-1 sm:mt-0 leading-relaxed">{norma.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 bg-brand-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Agende com um médico parceiro</h2>
          <p className="opacity-90 mt-2">Escolha o profissional, veja o preço e marque em minutos.</p>
          <Button asChild variant="secondary" className="mt-5 h-11 px-6 rounded-md bg-white text-slate-900 hover:bg-slate-100">
            <Link to="/agendamentos">Ver médicos disponíveis <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-10">
          Ficou com dúvidas? Veja as{' '}
          <Link to="/perguntas-frequentes" className="text-brand-600 font-medium hover:underline">perguntas frequentes</Link>.
        </p>
      </div>
    </>
  );
};

export default DocumentosPage;
