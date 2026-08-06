import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentualDeReembolso, horasAte, HORAS_REEMBOLSO_INTEGRAL } from './reembolso.js';

test('2h ou mais de antecedência: reembolso integral', () => {
  assert.equal(percentualDeReembolso(48), 100);
  assert.equal(percentualDeReembolso(2.5), 100);
  assert.equal(percentualDeReembolso(2), 100);   // exatamente 2h ainda é integral
});

test('menos de 2h: metade', () => {
  assert.equal(percentualDeReembolso(1.99), 50);
  assert.equal(percentualDeReembolso(0.5), 50);
  assert.equal(percentualDeReembolso(0.01), 50);
});

test('horário já passou: sem reembolso', () => {
  assert.equal(percentualDeReembolso(0), 0);
  assert.equal(percentualDeReembolso(-1), 0);
});

test('consulta não paga não gera estorno, mesmo com muita antecedência', () => {
  assert.equal(percentualDeReembolso(48, false), 0);
});

test('entrada inválida não vira reembolso', () => {
  assert.equal(percentualDeReembolso(NaN), 0);
  assert.equal(percentualDeReembolso(undefined), 0);
  assert.equal(percentualDeReembolso('daqui a pouco'), 0);
});

test('a fronteira das 2h é a constante, não um número solto', () => {
  assert.equal(HORAS_REEMBOLSO_INTEGRAL, 2);
  assert.equal(percentualDeReembolso(HORAS_REEMBOLSO_INTEGRAL), 100);
  assert.equal(percentualDeReembolso(HORAS_REEMBOLSO_INTEGRAL - 0.001), 50);
});

test('horasAte mede a distância até a consulta sem depender do relógio', () => {
  const agora = Date.parse('2026-08-06T12:00:00Z');
  assert.equal(horasAte('2026-08-06T15:00:00Z', agora), 3);
  assert.equal(horasAte('2026-08-06T13:30:00Z', agora), 1.5);
  assert.equal(horasAte('2026-08-06T11:00:00Z', agora), -1);
});

test('o caminho completo: consulta de amanhã cancelada hoje devolve tudo', () => {
  const agora = Date.parse('2026-08-06T12:00:00Z');
  const amanha = '2026-08-07T09:00:00Z';
  assert.equal(percentualDeReembolso(horasAte(amanha, agora)), 100);

  const daqui90min = '2026-08-06T13:30:00Z';
  assert.equal(percentualDeReembolso(horasAte(daqui90min, agora)), 50);
});
