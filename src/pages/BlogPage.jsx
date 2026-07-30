import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ARTICLES } from '@/content/siteContent';
import { ArrowRight, Clock } from 'lucide-react';

const fmt = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };

const BlogPage = () => (
  <>
    <Helmet>
      <title>Blog · Click Teleconsulta — Saúde e teleconsulta</title>
      <meta name="description" content="Artigos sobre teleconsulta, saúde online e como aproveitar melhor o atendimento à distância. Conteúdo informativo da Click Teleconsulta." />
      <link rel="canonical" href="https://clickteleconsulta.online/blog" />
    </Helmet>

    <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Blog</span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 tracking-tight">Saúde e teleconsulta</h1>
        <p className="text-slate-500 mt-3 text-lg">Conteúdo para você entender e aproveitar melhor o atendimento online.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {ARTICLES.map((a) => (
          <Link key={a.slug} to={`/blog/${a.slug}`} className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2">
              <span>{fmt(a.date)}</span><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readMin} min</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-2 leading-snug group-hover:text-blue-700">{a.title}</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{a.description}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">Ler artigo <ArrowRight className="w-4 h-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  </>
);

export default BlogPage;
