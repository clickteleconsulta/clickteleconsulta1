import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, Instagram, Facebook } from '@/components/ui/icones';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { BRAND, EMPRESA } from '@/config/brand';

/**
 * Rodapé em fundo escuro.
 *
 * Era claro (brand-50) e ficava colado no branco do conteúdo: o site terminava
 * sem terminar, e o aviso legal — que é a parte mais importante daqui, porque
 * diz que somos marketplace e não plataforma de teleconsulta — se dissolvia num
 * cinza sobre bege.
 *
 * O escuro é #141A24, o MESMO da faixa "Cuide da sua saúde" da home, não um
 * preto novo. E é preto, não cobalto: o rodapé é a maior superfície contínua do
 * site, e em cobalto ele viraria um bloco de cor que rouba a atenção do único
 * cobalto que precisa ser visto, o dos botões.
 */

// Só entra ícone de rede que tenha URL configurada em src/config/brand.js.
// Ícone que leva a página inexistente é pior que ícone ausente.
const REDES = [
  { nome: 'Instagram', icone: Instagram, url: BRAND.social?.urls?.instagram },
  { nome: 'Facebook', icone: Facebook, url: BRAND.social?.urls?.facebook },
].filter((r) => r.url);

const LINKS_ACESSO = [
  { to: '/agendamentos', label: 'Agendar Consulta' },
  { to: '/quem-somos', label: 'Quem somos' },
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/perguntas-frequentes', label: 'Perguntas frequentes' },
  { to: '/documentos-e-validade', label: 'Documentos e validade' },
  { to: '/blog', label: 'Blog' },
  { to: '/acesso-cliente', label: 'Entrar' },
];

const linkClasse = 'text-[15px] text-slate-400 hover:text-white transition-colors';

/**
 * Bandeiras aceitas. Os três SVGs vivem em public/pagamento/ e compartilham o
 * MESMO canvas 48x30 — não é detalhe de arquivo, é o que faz a regra de
 * paridade valer sozinha (ver abaixo).
 *
 * O Manual de Uso da Marca Pix do Banco Central (v1.6, 14/05/2025) impõe
 * condições quando o símbolo aparece ao lado de outras bandeiras:
 *
 *  - pág. 19, Paridade: proporções, cores e frequência iguais às demais marcas,
 *    alinhamento centralizado, e A ALTURA DAS OUTRAS NÃO PODE SUPERAR A DO PIX.
 *    Por isso, no canvas comum, o Pix ocupa 26 de altura, a Mastercard 22 e a
 *    Visa ~12: a hierarquia está embutida no desenho, não depende de CSS.
 *  - pág. 13: redução máxima do símbolo em digital é 24 px. As placas de 34 px
 *    deixam o Pix em ~28 px, acima do piso.
 *  - pág. 15: proibido gradiente, contorno, sombra ou distorção no símbolo.
 *
 * A Mastercard, por sua vez, exige o símbolo SOMENTE em cores cheias — daí os
 * dois círculos e a lente, e não a silhueta monocromática.
 *
 * As placas são brancas porque o rodapé é escuro e o azul da Visa (#1A1F71)
 * sumiria nele. Placa branca preserva cada marca na cor oficial, que é o que
 * as três exigem.
 */
const BANDEIRAS = [
  { nome: 'Pix', src: '/pagamento/pix.svg' },
  { nome: 'Visa', src: '/pagamento/visa.svg' },
  { nome: 'Mastercard', src: '/pagamento/mastercard.svg' },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#141A24] mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Link to="/" className="inline-flex">
              {/* `dark` troca o cobalto por azul-claro e o jade por menta: sobre
                  este fundo as cores de fundo claro sumiriam. */}
              <Wordmark size={TAMANHOS.padrao} dark />
            </Link>
            <p className="text-[15px] text-slate-400 leading-relaxed max-w-xs">
              Democratizar o acesso à saúde: agende sua consulta sem deslocamento, sem fila e com preço acessível.
            </p>
            <Link
              to="/acesso-profissional"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-300 hover:text-white transition-colors group"
            >
              <Stethoscope className="w-4 h-4 text-brand-300" /> Acesso Sistema Profissionais
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <p className="font-semibold text-white text-[15px]">Legal</p>
            <nav className="flex flex-col gap-2.5">
              <Link to="/legal?doc=terms_of_service" target="_blank" rel="noopener noreferrer" className={linkClasse}>Termos de Serviço</Link>
              <Link to="/legal?doc=privacy_policy" target="_blank" rel="noopener noreferrer" className={linkClasse}>Política de Privacidade (LGPD)</Link>
            </nav>
          </div>

          {/* Acesso */}
          <div className="space-y-4">
            <p className="font-semibold text-white text-[15px]">Acesso</p>
            <nav className="flex flex-col gap-2.5">
              {LINKS_ACESSO.map((l) => (
                <Link key={l.to} to={l.to} className={linkClasse}>{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <p className="font-semibold text-white text-[15px]">Contato e Suporte</p>
            <a href={`mailto:${BRAND.emails.suporte}`} className={`${linkClasse} block break-all`}>
              {BRAND.emails.suporte}
            </a>
          </div>
        </div>

        {/* Formas de pagamento. `items-center` cumpre o alinhamento centralizado
            que o manual do Pix exige, e as placas têm todas o mesmo tamanho —
            "igualdade de proporções" vale para as três, não só para o Pix. */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Formas de pagamento
          </span>
          <div className="flex items-center gap-2.5">
            {BANDEIRAS.map((b) => (
              <span
                key={b.nome}
                className="w-[58px] h-[36px] rounded-md bg-white flex items-center justify-center"
                title={b.nome}
              >
                {/* 48 px de canvas = 26 px de símbolo Pix. O piso do manual é
                    24; com os 46 px que tentei antes dava 24,9 e ficava na
                    dependência de arredondamento do navegador. */}
                <img src={b.src} alt={b.nome} width="48" height="30" className="w-[48px] h-auto" />
              </span>
            ))}
          </div>
        </div>

        {/* Aviso legal — o texto é o mesmo de antes, palavra por palavra. */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-[13px] text-slate-400 leading-relaxed">
            A {BRAND.name} é um <strong className="font-semibold text-slate-200">marketplace de agendamentos</strong>: fazemos apenas a intermediação do agendamento e do pagamento entre pacientes e médicos. <strong className="font-semibold text-slate-200">Não somos uma plataforma de teleconsulta</strong> — a teleconsulta e o ato médico são de responsabilidade exclusiva do profissional que realiza o atendimento. Pague somente quando usar, sem assinaturas ou mensalidades; não trabalhamos com planos de saúde, apenas atendimentos particulares avulsos.
          </p>
        </div>
      </div>

      {/* Faixa final: identificação legal à esquerda, redes à direita. */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-5">
          <div className="text-[12.5px] text-slate-500 text-center sm:text-left space-y-1">
            <p>&copy; {year} {BRAND.name}. Todos os direitos reservados.</p>
            <p>{EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj} · {EMPRESA.endereco}</p>
          </div>

          {REDES.length > 0 && (
            <div className="flex items-center gap-2.5 shrink-0">
              {REDES.map((r) => (
                <a
                  key={r.nome}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${BRAND.name} no ${r.nome}`}
                  title={r.nome}
                  className="w-10 h-10 rounded-md border border-white/15 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/40 transition-colors"
                >
                  <r.icone className="w-[18px] h-[18px]" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
