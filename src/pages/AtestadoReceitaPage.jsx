import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileCheck2, ShieldCheck, Clock, AlertTriangle, ArrowRight, Stethoscope } from '@/components/ui/icones';

/**
 * Página de destino para quem procura "atestado médico online" e "receita
 * médica online".
 *
 * POR QUE ELA É ESCRITA ASSIM
 * Boa parte de quem digita esses termos não quer consultar: quer comprar o
 * documento. Uma página que sugerisse que o atestado sai junto com o pagamento
 * atrairia esse tráfego, não converteria, e nos colocaria em posição
 * insustentável perante o CFM — atestado e receita dependem de avaliação
 * clínica, e a decisão é do médico, não da plataforma.
 *
 * Então a página assume isso no primeiro parágrafo, em vez de esconder na letra
 * miúda. Quem quer comprar atestado sai; quem tem um sintoma real e precisa de
 * um documento válido fica, e essa é a pessoa que agenda.
 *
 * NADA AQUI FOI ESCRITO DE CABEÇA PRÓPRIA: as normas citadas e a explicação da
 * conferência vêm de DOCUMENTOS em siteContent.js, que já estava publicado na
 * página /documentos-e-validade.
 */
const CASOS = [
  {
    icon: Stethoscope,
    titulo: 'Renovação de receita de uso contínuo',
    texto: 'Para quem já usa um medicamento e precisa da prescrição atualizada. O médico avalia o histórico e decide sobre a renovação.',
  },
  {
    icon: FileCheck2,
    titulo: 'Atestado após avaliação',
    texto: 'Quando o médico examina o quadro na consulta e conclui que há necessidade de afastamento, o atestado é emitido e assinado digitalmente.',
  },
  {
    icon: Clock,
    titulo: 'Pedido de exame',
    texto: 'A solicitação de exames complementares também sai assinada e é aceita em laboratório como qualquer outra.',
  },
];

const AtestadoReceitaPage = () => {
  const url = `${BRAND.url}/atestado-e-receita-online`;
  return (
    <>
      <Helmet>
        <title>{`Atestado e receita médica online · ${BRAND.name}`}</title>
        <meta
          name="description"
          content="Receita, atestado e pedido de exame emitidos em teleconsulta valem em todo o Brasil. Dependem de avaliação do médico — agende a partir de R$ 40."
        />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`Atestado e receita médica online · ${BRAND.name}`} />
        <meta property="og:url" content={url} />
      </Helmet>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
          Atestado e receita médica online
        </h1>
        <p className="text-lg text-slate-600 mt-4 leading-relaxed">
          Documentos emitidos em teleconsulta têm o mesmo valor dos de uma consulta presencial e
          valem em todo o Brasil. O que muda é só o meio do atendimento.
        </p>

        {/* O aviso vem ANTES de qualquer chamada para agendar, e não no rodapé.
            É a informação que decide se a pessoa certa continua na página. */}
        <div className="mt-8 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900">Não vendemos atestado nem receita</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              O que você agenda aqui é uma consulta. Emitir receita, atestado ou pedido de exame é
              decisão do médico, depois de avaliar o seu caso — e ele pode concluir que não é
              indicado. O pagamento é da consulta, e não do documento.
            </p>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-slate-900 mt-12">Quando a teleconsulta resolve</h2>
        <div className="mt-5 grid sm:grid-cols-3 gap-4">
          {CASOS.map((c) => (
            <div key={c.titulo} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="w-11 h-11 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <c.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-[15px] leading-snug">{c.titulo}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>

        <h2 className="font-display text-xl font-bold text-slate-900 mt-12">Por que o documento vale</h2>
        <p className="text-slate-700 mt-3 leading-relaxed">
          O atendimento a distância está autorizado pela Lei nº 14.510/2022 e regulamentado pela
          Resolução CFM nº 2.314/2022. Os documentos são assinados com certificado digital do padrão
          ICP-Brasil — instituído pela Medida Provisória nº 2.200-2/2001 e reconhecido pela Lei nº
          14.063/2020 —, o que dá a eles a mesma validade jurídica de uma assinatura de próprio punho.
        </p>
        <p className="text-slate-700 mt-3 leading-relaxed">
          Farmácia, empresa e escola podem conferir a autenticidade de graça, em segundos, no
          validador oficial do Governo Federal.{' '}
          <Link to="/documentos-e-validade" className="text-primary font-semibold hover:underline">
            Veja o passo a passo da conferência
          </Link>
          .
        </p>

        <div className="mt-12 rounded-lg border border-brand-200 bg-brand-100 p-6 md:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Agende sua consulta</h2>
              <p className="text-slate-700 mt-2 leading-relaxed">
                Escolha um médico, veja o valor e os horários e agende em minutos. A partir de R$ 40,
                com Pix ou cartão, sem mensalidade e sem convênio.
              </p>
              <Button asChild className="mt-5 h-11 px-6">
                <Link to="/agendamentos">
                  Ver médicos e horários <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AtestadoReceitaPage;
