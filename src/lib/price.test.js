// Regras de dinheiro. São o único lugar do projeto onde um erro não aparece na
// tela: aparece no extrato do médico, semanas depois.
//
// Roda com o executor embutido do Node (`npm test`), sem dependência nenhuma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundUpToHalf, patientPriceFromRepasse } from './price.js';

test('roundUpToHalf sobe até o próximo múltiplo de R$ 0,50', () => {
  assert.equal(roundUpToHalf(53.33), 53.5);
  assert.equal(roundUpToHalf(53.51), 54);
  assert.equal(roundUpToHalf(53.01), 53.5);
});

test('roundUpToHalf não mexe em valor que já é múltiplo de 0,50', () => {
  assert.equal(roundUpToHalf(53.5), 53.5);
  assert.equal(roundUpToHalf(53), 53);
  assert.equal(roundUpToHalf(40), 40);
});

test('roundUpToHalf absorve o erro de ponto flutuante', () => {
  // 53,50 representado como 53,5000000001 não pode virar 54,00. Sem o epsilon
  // dentro da função, este caso cobra R$ 0,50 a mais do paciente.
  assert.equal(roundUpToHalf(53.5000000001), 53.5);
});

test('roundUpToHalf trata entrada inválida como zero, sem explodir', () => {
  assert.equal(roundUpToHalf(0), 0);
  assert.equal(roundUpToHalf(-10), 0);
  assert.equal(roundUpToHalf(null), 0);
  assert.equal(roundUpToHalf(undefined), 0);
  assert.equal(roundUpToHalf('abc'), 0);
});

test('sem taxa, o paciente paga o repasse do médico', () => {
  assert.equal(patientPriceFromRepasse(40, 0), 40);
  assert.equal(patientPriceFromRepasse(40), 40);
});

test('a taxa é aplicada POR DENTRO: o médico recebe o repasse cheio', () => {
  // 40 com 20% de taxa não é 48. O preço tem de ser tal que, tirados 20% dele,
  // sobrem os 40 do médico: 40 / 0,8 = 50.
  assert.equal(patientPriceFromRepasse(40, 20), 50);
  // 40 / 0,9 = 44,44… → arredonda para 44,50
  assert.equal(patientPriceFromRepasse(40, 10), 44.5);
});

test('o preço do paciente nunca sai quebrado', () => {
  for (let repasse = 20; repasse <= 300; repasse += 7) {
    for (const taxa of [0, 5, 10, 12.5, 20, 30]) {
      const p = patientPriceFromRepasse(repasse, taxa);
      assert.equal(p * 100 % 50, 0, `${repasse} com ${taxa}% deu ${p}`);
    }
  }
});

test('o preço do paciente nunca fica abaixo do repasse do médico', () => {
  // Se ficasse, a plataforma pagaria para trabalhar.
  for (let repasse = 20; repasse <= 300; repasse += 13) {
    for (const taxa of [0, 5, 10, 20, 30]) {
      assert.ok(patientPriceFromRepasse(repasse, taxa) >= repasse);
    }
  }
});

test('repasse ausente ou inválido não vira preço', () => {
  assert.equal(patientPriceFromRepasse(0, 20), 0);
  assert.equal(patientPriceFromRepasse(null, 20), 0);
  assert.equal(patientPriceFromRepasse(undefined, 20), 0);
});
