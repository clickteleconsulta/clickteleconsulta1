// Roda com: node --test src/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataBrParaISO, isoParaDataBr } from './masks.js';

test('converte data brasileira para ISO', () => {
  assert.equal(dataBrParaISO('12/06/1985'), '1985-06-12');
  assert.equal(dataBrParaISO('01/01/2000'), '2000-01-01');
  assert.equal(dataBrParaISO('29/02/2024'), '2024-02-29');   // ano bissexto existe
});

test('recusa data que não existe, em vez de deslizar para o mês seguinte', () => {
  // É o ponto do teste: `new Date('2023-02-31')` vira 3 de março sem reclamar.
  // Se passasse, viraria idade errada — e a barreira de 18 anos é uma regra
  // de negócio, não um detalhe de formulário.
  assert.equal(dataBrParaISO('31/02/2023'), '');
  assert.equal(dataBrParaISO('29/02/2023'), '');   // 2023 não é bissexto
  assert.equal(dataBrParaISO('31/04/2020'), '');   // abril tem 30
  assert.equal(dataBrParaISO('00/01/2000'), '');
  assert.equal(dataBrParaISO('12/13/1990'), '');
});

test('recusa entrada incompleta ou fora de faixa', () => {
  assert.equal(dataBrParaISO(''), '');
  assert.equal(dataBrParaISO('12/06/198'), '');
  assert.equal(dataBrParaISO('12/06/1899'), '');
  assert.equal(dataBrParaISO(`12/06/${new Date().getFullYear() + 1}`), '');
});

test('volta de ISO para exibição', () => {
  assert.equal(isoParaDataBr('1985-06-12'), '12/06/1985');
  assert.equal(isoParaDataBr(''), '');
  assert.equal(isoParaDataBr('12/06/1985'), '');
});
