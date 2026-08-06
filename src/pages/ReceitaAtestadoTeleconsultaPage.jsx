import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileCheck2, ShieldCheck, Clock, AlertTriangle, ArrowRight, Stethoscope } from '@/components/ui/icones';

/**
 * Página INFORMATIVA sobre como receita e atestado funcionam depois de uma
 * teleconsulta.
 *
 * NÃO É PÁGINA DE OFERTA, E O TÍTULO IMPORTA.
 * A primeira versão se chamava "Atestado e receita médica online" e vivia no
 * rodapé com esse rótulo. Ficava parecendo vitrine de documento — e a aviDoc
 * vende consulta, não documento. Num eventual questionamento, um título desses
 * é a primeira coisa que se lê contra a plataforma, por mais que a letra miúda
 * dissesse o contrário.
 *
 * Agora o nome descreve o assunto ("como funcionam"), não um produto, e o
 * primeiro bloco da página diz o que o serviço é. O aviso de que documento
 * depende de avaliação clínica continua onde estava, antes de qualquer botão:
 * ele deixou de ser a ressalva de uma oferta e passou a ser a explicação
 * principal, que é o que ele sempre deveria ter sido.
 *
 * NADA AQUI FOI ESCRITO DE CABEÇA PRÓPRIA: as normas citadas vêm de DOCUMENTOS
 * em siteContent.js, já publicado em /documentos-e-validade.
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

const ReceitaAtestadoTeleconsultaPage = () => {
  const url = `${BRAND.url}/receita-e-atestado-na-teleconsulta`;
  return (
    <>
      <Helmet>
        <title>{`Como funcionam receita e atestado na teleconsulta · ${BRAND.name}`}</title>
        <meta
          name="description"
          content="Como receita, atestado e pedido de exame funcionam depois de uma consulta online: quem emite, de que depende e por que valem em todo o Brasil."
        />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`Como funcionam receita e atestado na teleconsulta · ${BRAND.name}`} />
        <meta property="og:url" content={url} />
      </Helmet>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
          Como funcionam receita e atestado na teleconsulta
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
            <p className="font-semibold text-slate-900">O que você contrata é a consulta</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">
              A aviDoc é um marketplace de agendamentos: o que você contrata e paga é o
              atendimento com o médico. Emitir receita, atestado ou pedido de exame é decisão
              exclusiva do profissional, depois de avaliar o seu caso, e ele pode concluir que não é
              indicado. Nenhum documento é vendido, prometido ou garantido aqui.
            </p>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-slate-900 mt-12">Situações em que o documento costuma surgir</h2>
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

export default ReceitaAtestadoTeleconsultaPage;
