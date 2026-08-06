import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ARTICLES, getArticle } from '@/content/siteContent';
import { ArrowLeft, ArrowRight, Clock } from '@/components/ui/icones';

const fmt = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };
const BASE = `${BRAND.url}`;

const BlogArticlePage = () => {
  const { slug } = useParams();
  const article = getArticle(slug);
  if (!article) return <Navigate to="/blog" replace />;

  const others = ARTICLES.filter((a) => a.slug !== slug).slice(0, 2);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: article.title, description: article.description,
    datePublished: article.date, dateModified: article.date,
    // Versionado junto com o index.html — ver o comentário lá sobre o cache das
    // redes sociais. O `logo` do publisher aponta para o logo de verdade, não
    // para o banner: o Schema.org espera a marca, não a arte de divulgação.
    image: `${BASE}/og-image-v3.png`,
    author: { '@type': 'Organization', name: BRAND.name },
    publisher: { '@type': 'Organization', name: BRAND.name, logo: { '@type': 'ImageObject', url: `${BASE}/marca/logo.png` } },
    mainEntityOfPage: `${BASE}/blog/${article.slug}`,
  };

  return (
    <>
      <Helmet>
        <title>{article.title} · {BRAND.name}</title>
        <meta name="description" content={article.description} />
        <link rel="canonical" href={`${BASE}/blog/${article.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.description} />
        <meta property="og:url" content={`${BASE}/blog/${article.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonld)}</script>
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-6"><ArrowLeft className="w-4 h-4" /> Voltar ao blog</Link>
        <div className="text-[12px] text-slate-400 font-medium flex items-center gap-2 mb-2">
          <span>{fmt(article.date)}</span><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readMin} min de leitura</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">{article.title}</h1>

        <article className="mt-6 space-y-4">
          {article.body.map((b, i) => {
            if (b.t === 'h2') return <h2 key={i} className="text-xl font-bold text-slate-900 pt-3">{b.c}</h2>;
            if (b.t === 'ul') return <ul key={i} className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
            return <p key={i} className="text-slate-600 leading-relaxed text-[15px]">{b.c}</p>;
          })}
        </article>

        <div className="mt-10 bg-brand-600 rounded-lg p-7 text-center text-white">
          <p className="text-lg font-bold">Precisa de atendimento?</p>
          <p className="opacity-90 text-sm mt-1">Agende sua teleconsulta com um médico, a partir de R$ 40.</p>
          <Button asChild variant="secondary" className="mt-4 rounded-md bg-white text-slate-900 hover:bg-slate-100"><Link to="/agendamentos">Agendar consulta</Link></Button>
        </div>

        {others.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Continue lendo</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {others.map((a) => (
                <Link key={a.slug} to={`/blog/${a.slug}`} className="group border border-slate-200 rounded-md p-4 hover:shadow-sm">
                  <p className="font-semibold text-slate-800 text-sm group-hover:text-brand-800 leading-snug">{a.title}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-brand-600 mt-2">Ler <ArrowRight className="w-3 h-3" /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlogArticlePage;
