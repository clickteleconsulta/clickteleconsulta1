/**
 * De onde veio o paciente.
 *
 * O identificador de clique (`ttclid` no TikTok, `fbclid` no Meta, `gclid` no
 * Google) só existe na URL da PRIMEIRA página que a pessoa abre depois de tocar
 * no anúncio. Um clique em qualquer link interno já o apaga da barra de
 * endereços. Se não for capturado nesse instante, não há como recuperá-lo — e
 * sem ele o TikTok não sabe qual anúncio gerou a consulta paga.
 *
 * Por isso este módulo roda cedo e guarda o que achou. O consumo vem depois:
 * o agendamento carrega essa origem junto, e o servidor a devolve ao TikTok
 * quando o pagamento é confirmado.
 *
 * POR QUE NÃO BASTA O PIXEL DO NAVEGADOR
 * O pagamento acontece FORA do site, no checkout do Asaas. O paciente pode
 * fechar a aba, e o Pix pode ser pago horas depois, de outro aparelho. Um
 * evento de compra disparado no navegador só chega quando a pessoa volta para a
 * página de confirmação — e boa parte não volta. A origem gravada no
 * agendamento é o que permite contar a venda no servidor, onde ela é certa.
 */

const CHAVE = 'avidoc_atribuicao_v1';

// 30 dias. O identificador de clique não vale para sempre: guardá-lo por tempo
// demais faz uma compra de dois meses depois ser creditada a um anúncio que não
// teve nada a ver com ela — e aí a campanha parece melhor do que é, e o dinheiro
// vai para o lugar errado.
const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

const IDS_DE_CLIQUE = ['ttclid', 'fbclid', 'gclid'];
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const ler = () => {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (!dados?.capturado_em) return null;
    if (Date.now() - dados.capturado_em > VALIDADE_MS) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return dados;
  } catch {
    return null;
  }
};

const gravar = (dados) => {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch { /* storage indisponível */ }
};

/** Apaga a origem guardada. Chamado quando a pessoa RECUSA o consentimento. */
export const limparAtribuicao = () => {
  try { localStorage.removeItem(CHAVE); } catch { /* ignore */ }
};

/**
 * Lê a URL atual e guarda a origem, se houver.
 *
 * ÚLTIMO CLIQUE PAGO VENCE, e visita orgânica não apaga nada. Se a pessoa clica
 * num anúncio hoje, some, e amanhã chega digitando o endereço direto, a venda
 * continua sendo do anúncio — foi ele que trouxe. Mas se ela clica num segundo
 * anúncio, esse passa a valer: é o toque mais recente que de fato a trouxe de
 * volta.
 */
export const capturarAtribuicao = () => {
  if (typeof window === 'undefined') return null;

  let params;
  try { params = new URLSearchParams(window.location.search); } catch { return ler(); }

  const achado = {};
  for (const chave of [...IDS_DE_CLIQUE, ...UTMS]) {
    const valor = params.get(chave);
    // `trim` porque link colado em rede social às vezes chega com espaço no fim,
    // e um ttclid com espaço não casa com nada do lado do TikTok.
    if (valor && valor.trim()) achado[chave] = valor.trim().slice(0, 512);
  }

  const temIdDeClique = IDS_DE_CLIQUE.some((k) => achado[k]);
  if (!temIdDeClique && !achado.utm_source) return ler();

  const dados = {
    ...achado,
    capturado_em: Date.now(),
    // Guardado porque a Events API do TikTok aceita a página de entrada como
    // sinal de correspondência, e porque ajuda a depurar de qual criativo veio.
    pagina_de_entrada: `${window.location.pathname}${window.location.search}`.slice(0, 512),
  };
  gravar(dados);
  return dados;
};

/** A origem guardada, ou null. Já respeita a validade. */
export const getAtribuicao = () => ler();

/**
 * O que vai para a coluna `atribuicao` do agendamento.
 *
 * Devolve `null`, e não `{}`, quando não há origem: um objeto vazio no banco
 * mente, faz parecer que a consulta veio de campanha sem nenhum dado. Nulo diz
 * a verdade — orgânico ou desconhecido.
 */
export const atribuicaoParaAgendamento = () => {
  const a = ler();
  if (!a) return null;
  const { capturado_em, ...resto } = a;
  return { ...resto, capturado_em: new Date(capturado_em).toISOString() };
};
