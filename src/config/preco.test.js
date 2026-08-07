// Roda com: node --test src/
//
// O QUE ESTE TESTE PROTEGE
// O preço anunciado existe em dois mundos. O código importa a constante e nunca
// erra. Mas há arquivos que NÃO conseguem importar nada — o index.html, o
// manifesto do aplicativo — e neles o número está escrito à mão.
//
// É exatamente aí que a divergência aparece, e é a mais cara de todas: a
// descrição do index.html é o que o Google mostra no resultado da busca e o que
// o WhatsApp mostra no compartilhamento. Um número velho ali sobrevive semanas
// no índice, anunciando um preço que a plataforma não pratica.
//
// Por isso o teste falha dizendo QUAL arquivo ficou para trás, e não só que
// algo está errado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PRECO_A_PARTIR_DE, precoAPartirDe, precoAPartirDeCheio } from './preco.js';

const RAIZ = new URL('../../', import.meta.url);
const ler = (caminho) => readFileSync(new URL(caminho, RAIZ), 'utf8');

// Arquivos sem acesso ao módulo: o número vive neles como texto.
const ESCRITOS_A_MAO = ['index.html', 'public/manifest.webmanifest'];

// "a partir de R$ 40" / "A partir de R$ 65,00" — pega as duas grafias.
const ANUNCIO = /[Aa] partir de R\$ ?(\d+)(?:,(\d{2}))?/g;

test('o preço anunciado é um número positivo e redondo', () => {
  assert.ok(Number.isFinite(PRECO_A_PARTIR_DE), 'PRECO_A_PARTIR_DE precisa ser número');
  assert.ok(PRECO_A_PARTIR_DE > 0, 'preço anunciado não pode ser zero ou negativo');
  assert.equal(precoAPartirDe, `R$ ${PRECO_A_PARTIR_DE}`);
  assert.match(precoAPartirDeCheio, /^R\$ \d+,\d{2}$/);
});

test('os arquivos escritos à mão anunciam o mesmo preço da constante', () => {
  const divergentes = [];
  for (const arquivo of ESCRITOS_A_MAO) {
    const texto = ler(arquivo);
    const achados = [...texto.matchAll(ANUNCIO)];
    assert.ok(
      achados.length > 0,
      `${arquivo} não anuncia preço nenhum — ou o texto mudou, ou a expressão deste teste ficou obsoleta`
    );
    for (const [trecho, reais] of achados) {
      if (Number(reais) !== PRECO_A_PARTIR_DE) {
        divergentes.push(`${arquivo}: "${trecho}" (constante: ${PRECO_A_PARTIR_DE})`);
      }
    }
  }
  assert.deepEqual(
    divergentes,
    [],
    `Preço desatualizado em:\n  ${divergentes.join('\n  ')}\n` +
      `Troque o número nesses arquivos para ${PRECO_A_PARTIR_DE}.`
  );
});

test('os geradores em Python leem a constante em vez de copiá-la', () => {
  // Se alguém reescrever o número à mão numa peça de anúncio, o site e o
  // anúncio passam a dizer coisas diferentes — e o anúncio é o que a pessoa vê
  // primeiro.
  for (const arquivo of ['tools/gerar-anuncios.py', 'tools/gerar-marca.py']) {
    const texto = ler(arquivo);
    assert.match(
      texto,
      /preco_a_partir_de\(\)/,
      `${arquivo} deveria ler o preço de src/config/preco.js`
    );
    const literais = [...texto.matchAll(/R\$ ?\d+/g)].map((m) => m[0]);
    assert.deepEqual(
      literais,
      [],
      `${arquivo} voltou a ter preço escrito à mão: ${literais.join(', ')}`
    );
  }
});
