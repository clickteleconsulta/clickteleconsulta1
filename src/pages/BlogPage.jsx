import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ARTICLES } from '@/content/siteContent';
import { ArrowRight, Clock } from 'lucide-react';

const fmt = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };

const BlogPage = () => (
  <>
    <Helmet>
      <title>Blog · {BRAND.name} — Saúde e teleconsulta</title>
      <meta name="description" content={`Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância. Conteúdo informativo da ${BRAND.name}.`} />
      <link rel="canonical" href={`${BRAND.url}/blog`} />
    </Helmet>

    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      {/* SEM ilustração, de propósito. Numa lista, quem manda são os cards dos
          artigos; uma arte antes deles competia por atenção com o conteúdo e
          empurrava o primeiro título para baixo da dobra. Nem toda página ganha
          com ilustração — pôr em todas é o que dá cara de site montado em série.
          A arte de blog segue em public/ilustra/ para quando houver um lugar em
          que ela renda, como uma página de artigo sem imagem própria. */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Blog</span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">Saúde e teleconsulta</h1>
        <p className="text-slate-500 mt-3 text-lg">Conteúdo para você entender e aproveitar melhor o atendimento online.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {ARTICLES.map((a) => (
          <Link key={a.slug} to={`/blog/${a.slug}`} className="group bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
              <span>{fmt(a.date)}</span><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readMin} min</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2 leading-snug group-hover:text-brand-800">{a.title}</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{a.description}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 mt-3">Ler artigo <ArrowRight className="w-4 h-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  </>
);

export default BlogPage;
