import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight } from '@/components/ui/icones';
import { Instagram, Facebook } from '@/components/ui/redes';
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
// Ícone que leva a página inexistente é pior que ícone ausente — o link quebrado
// custa mais confiança do que o ícone ausente economiza.
//
// A ordem é a do peso que cada rede tem para a aviDoc hoje. O TikTok ficou de
// fora por decisão, não por esquecimento — o glifo existe em ui/redes.jsx e
// entra com uma linha aqui mais uma chave em brand.js, quando for a hora.
const REDES = [
  { nome: 'Instagram', icone: Instagram, url: BRAND.social?.urls?.instagram },
  { nome: 'Facebook', icone: Facebook, url: BRAND.social?.urls?.facebook },
].filter((r) => r.url);

const LINKS_ACESSO = [
  { to: '/agendamentos', label: 'Agendar Consulta' },
  { to: '/quem-somos', label: 'Quem somos' },
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/perguntas-frequentes', label: 'Perguntas frequentes' },
  { to: '/atestado-e-receita-online', label: 'Atestado e receita online' },
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
 *  - pág. 13: a redução máxima do símbolo em digital é 24 px, E A MEDIDA DE
 *    REFERÊNCIA É A DO COMPRIMENTO, não a da altura. O símbolo ocupa 26 dos 48
 *    do canvas, ou seja 54% dele; o canvas de 46 px deixa o Pix em 24,9 px.
 *    Abaixo de 45 px o piso é rompido.
 *
 *    ESTE NÚMERO JÁ FOI 42, e quebrou quando o zoom global de 120% saiu do
 *    site: com o zoom, 42 px de canvas rendiam 27 px na tela; sem ele, rendem
 *    22,8 e ficam abaixo do mínimo. É o tipo de regressão que não aparece em
 *    teste nenhum — a peça continua desenhando, só passa a estar fora do
 *    manual. Se alguém mexer na escala do site de novo, refaça esta conta.
 *  - pág. 15: proibido gradiente, contorno, sombra ou distorção no símbolo.
 *
 * A MASTERCARD FICA EM COR CHEIA, e agora isso está verificado na fonte, não
 * lembrado. O Brand Center deles diz as duas coisas:
 *
 *   "On white or light backgrounds, use the positive artwork. On black or dark
 *    backgrounds, use the reverse artwork."
 *   "The Mastercard Symbol must be used in full-color only. However, Mastercard
 *    permits the grayscale and solid Mastercard Brand Mark to be used at
 *    merchant locations to signal acceptance when full-color printing is not
 *    available."
 *
 * A brecha do monocromático é para o BRAND MARK (símbolo + palavra "mastercard")
 * e só quando não há impressão colorida disponível. O símbolo sozinho em branco,
 * que é o que caberia aqui ao lado dos outros dois, fica justamente fora dela —
 * no digital a cor cheia está sempre disponível.
 *
 * SEM PLACA BRANCA. As marcas ficam direto sobre o rodapé escuro, e é o próprio
 * manual que abre essa porta — pág. 13: "São permitidos os usos das versões em
 * verde Pix e em preto. Em fundos escuros, é permitido o uso da versão em
 * branco (negativo)". Por isso Pix e Visa usam os arquivos `-negativo`, que são
 * os mesmos desenhos com o preenchimento em branco. Os positivos continuam na
 * pasta: são os canônicos, e voltam a ser necessários se alguma tela clara
 * passar a listar as bandeiras.
 *
 * Sobra uma tensão, e ela não tem saída limpa: a paridade do Pix pede
 * "igualdade de cores" entre as marcas, e aqui duas são brancas e uma é
 * colorida. Não é descuido — é o único arranjo em que nenhum dos dois manuais é
 * contrariado.
 *
 * A MASTERCARD REVERSA BRANCA JÁ FOI TENTADA E DESCARTADA. Chegou a ser
 * desenhada (dois círculos brancos com a lente vazada por fill-rule="evenodd",
 * que dá o entrelaçamento certo) e testada a 46 px. Saiu ao ler a regra acima:
 * resolveria a paridade quebrando a regra da outra marca, o que é trocar um
 * problema por outro. Se alguém for tentar de novo, o caminho é este e ele já
 * foi percorrido.
 *
 * NÃO TROQUE ESTES ARQUIVOS POR ÍCONES DE BIBLIOTECA. São marcas registradas com
 * manual próprio, e nenhuma biblioteca de ícones de interface entrega as três: a
 * família de marcas do Flaticon, que o resto do projeto usa, tem Visa e não tem
 * Pix nem Mastercard. Um glifo monocromático quebraria a exigência de cor cheia
 * da Mastercard e a cor exata que o manual do Pix fixa.
 *
 * A COR DO PIX É #77B6A8 E ESTÁ CERTA. Ela parece lavada ao lado do vermelho da
 * Mastercard, e é fácil confundir com erro — eu mesmo achei que fosse, e fui
 * conferir. A tabela de paleta do manual v1.6 diz, literalmente:
 *
 *     Verde Pix · Pantone 7472 C · CMYK 70·0·40·0 · RGB 119·182·168 · # 77B6A8
 *
 * O #32BCAD que aparece em banco de logotipo por aí é de uma versão anterior da
 * marca. Se alguém "corrigir" para ele, estará saindo do manual, não entrando.
 */
/**
 * Selo do Asaas — o PROCESSADOR, não uma bandeira.
 *
 * ISTO NÃO É ENFEITE, É OBRIGAÇÃO. A central do Asaas (artigo "O que é o Selo
 * Asaas e como deve ser utilizado?", atualizado em 15/04/2026) descreve a regra
 * de transparência de marca do BaaS:
 *
 *   "Com as novas regras, se torna proibido esconder a marca da Instituição
 *    Prestadora. O seu cliente final deve saber com quem está contratando."
 *
 *   "Transparência Mandatória (Art. 14 e Art. 20): A Instituição Prestadora
 *    deve aparecer de forma visível e acessível nas interfaces (app/site) da
 *    Tomadora, nos contratos ou termos de uso com os clientes e nos
 *    comprovantes."
 *
 * São TRÊS lugares, e só um está cumprido hoje: o comprovante que o paciente
 * baixa já traz "Asaas (Pix / cartão)" (ver PatientConsultations). Faltam o site
 * e os termos de uso.
 *
 * O ARQUIVO AINDA NÃO EXISTE, e é de propósito que não foi improvisado. O mesmo
 * artigo diz: "Para ter acesso aos selos, entre em contato com o suporte do
 * Asaas." O selo não é público — não está no site deles nem em banco de
 * logotipo. Desenhar uma versão parecida derrotaria o objetivo da norma, que é
 * o cliente reconhecer com quem está contratando.
 *
 * Assim que o suporte enviar, salve em public/pagamento/asaas.svg e o selo
 * aparece sozinho: o bloco abaixo já testa a existência do arquivo, do mesmo
 * jeito que o rodapé faz com as redes sociais.
 */
const SELO_PROCESSADOR = {
  src: '/pagamento/asaas.svg',
  nome: 'Asaas',
};

const BANDEIRAS = [
  { nome: 'Pix', src: '/pagamento/pix-negativo.svg' },
  { nome: 'Visa', src: '/pagamento/visa-negativo.svg' },
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
            que o manual do Pix exige, e as três marcas dividem o mesmo canvas —
            "igualdade de proporções" vale para as três, não só para o Pix. */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Formas de pagamento
          </span>
          {/* gap-4 e não gap-2.5: sem a placa branca em volta, as marcas ficam
              soltas no escuro e 10 px de respiro as encostava umas nas outras —
              o manual pede espaçamento respeitado e proíbe "aproximação
              demasiada". O canvas de 46 px é comum às três, então a paridade de
              proporções continua embutida no desenho, sem depender de CSS. */}
          <div className="flex items-center gap-4">
            {BANDEIRAS.map((b) => (
              <img
                key={b.nome}
                src={b.src}
                alt={b.nome}
                title={b.nome}
                width="46"
                height="29"
                className="w-[46px] h-auto"
              />
            ))}
          </div>

          {/* O TEXTO É A OBRIGAÇÃO; a imagem é o acabamento. Por isso ele fica
              sempre visível e só a imagem some quando o arquivo não existe — o
              `onError` esconde apenas o <img>, e não o bloco inteiro. Numa
              versão anterior o onError derrubava os dois juntos, o que teria
              escondido justamente aquilo que a norma exige.

              Salve o selo oficial em public/pagamento/asaas.svg e ele aparece
              ao lado do nome, sem tocar em código. */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-[11px] text-slate-500">
              Processados por <span className="font-semibold text-slate-400">Asaas</span> — Instituição de Pagamento
            </span>
            <img
              src={SELO_PROCESSADOR.src}
              alt={SELO_PROCESSADOR.nome}
              className="h-[22px] w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
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
