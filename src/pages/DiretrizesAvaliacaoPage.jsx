import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { BRAND } from '@/config/brand';
import { DIRETRIZES_AVALIACAO } from '@/content/siteContent';
import { Button } from '@/components/ui/button';
import { MessageCircle } from '@/components/ui/icones';

/**
 * As regras de avaliação, em página própria.
 *
 * POR QUE NÃO ENTRA EM /legal
 * Aquela rota lê PDF da tabela de documentos legais, feito para Termos e
 * Política — coisas que um advogado assina e versiona. Estas diretrizes são
 * texto de produto: mudam com o produto, precisam ser lidas no celular sem
 * baixar arquivo, e precisam ser encontradas pela busca. Página do site
 * resolve os três; PDF não resolve nenhum.
 */
const DiretrizesAvaliacaoPage = () => {
  const { titulo, chamada, atualizado, secoes, contato } = DIRETRIZES_AVALIACAO;

  return (
    <>
      <Helmet>
        <title>{titulo} — {BRAND.name}</title>
        <meta name="description" content={chamada} />
        <link rel="canonical" href="https://avidoc.com.br/diretrizes-de-avaliacao" />
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{titulo}</h1>
          <p className="text-lg text-muted-foreground mt-3 leading-relaxed">{chamada}</p>
          <p className="text-xs text-muted-foreground mt-4">Atualizado em {atualizado}</p>
        </header>

        <div className="space-y-8">
          {secoes.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="text-lg font-bold text-foreground mb-2">{secao.titulo}</h2>
              <div className="space-y-3">
                {secao.paragrafos.map((p, i) => (
                  <p key={i} className="text-[15px] text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{contato}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/suporte"><MessageCircle className="w-4 h-4 mr-2" /> Falar com o suporte</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/legal?doc=privacy_policy">Política de Privacidade</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiretrizesAvaliacaoPage;
