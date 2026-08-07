/**
 * O preço "a partir de" que o site anuncia.
 *
 * POR QUE ISTO EXISTE
 * Este número aparecia escrito à mão em 11 arquivos — texto do site, artigos do
 * blog, descrição da busca, cartão de compartilhamento, manifesto do aplicativo
 * e as peças de anúncio. Onze cópias do mesmo número é como um site passa a
 * anunciar um preço que ele não pratica mais: alguém corrige três, esquece oito,
 * e o Google continua mostrando o valor velho por semanas.
 *
 * O QUE ELE PRECISA SER
 * O MENOR preço de paciente entre os profissionais ativos e visíveis — não o
 * menor repasse. São coisas diferentes: o paciente paga o repasse com a taxa da
 * plataforma por cima, arredondado para o próximo R$ 0,50 (ver src/lib/price.js).
 * A coluna "Valor da consulta" da tela Profissionais mostra os dois lado a lado;
 * é de lá que se confere qual é o menor de verdade.
 *
 * COMO MUDAR
 * Troque o número aqui e rode `npm test`. O teste percorre os arquivos que não
 * podem importar este módulo — index.html, o manifesto e os geradores em Python
 * — e falha dizendo exatamente qual deles ficou para trás.
 *
 * ⚠️ Anunciar um valor abaixo do praticado não é só erro de texto: é propaganda
 * enganosa, e o paciente que chega pelo anúncio de R$ 40 e encontra R$ 65
 * abandona a página. Errar para cima é preferível a errar para baixo.
 */
export const PRECO_A_PARTIR_DE = 65;

/** "R$ 65" — como aparece no corpo dos textos. */
export const precoAPartirDe = `R$ ${PRECO_A_PARTIR_DE}`;

/** "R$ 65,00" — para peças gráficas, onde o centavo alinha melhor. */
export const precoAPartirDeCheio = `R$ ${PRECO_A_PARTIR_DE.toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
})}`;
