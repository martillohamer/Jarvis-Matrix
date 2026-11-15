import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReply, trimHistory, rmsToDbfs, bytesToGB, pct, getDiskPct, percentil10 } from '../public/assets/lib.js';

test('extractReply - OpenAI format', () => {
  const data = { choices: [{ message: { content: 'Hola' } }] };
  assert.equal(extractReply(data), 'Hola');
});

test('extractReply - invalid', () => {
  assert.throws(() => extractReply({}), /Formato de respuesta inválido/);
});

test('getDiskPct', () => {
  assert.equal(getDiskPct(50, 100), 50);
});

test('percentil10', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentil10(data), 2);
});

test('trimHistory - keeps system message', () => {
  const messages = [
    { role: 'system', content: 'S' },
    { role: 'user', content: '1' },
    { role: 'assistant', content: '2' },
    { role: 'user', content: '3' },
    { role: 'assistant', content: '4' }
  ];
  const trimmed = trimHistory(messages, 2);
  assert.equal(trimmed.length, 3);
  assert.equal(trimmed[0].role, 'system');
});

test('rmsToDbfs - silence', () => {
  const data = new Float32Array(100).fill(0);
  assert.equal(rmsToDbfs(data), -Infinity);
});

test('rmsToDbfs - full scale', () => {
  const data = new Float32Array(100).fill(1);
  assert.equal(Math.round(rmsToDbfs(data)), 0);
});

test('bytesToGB', () => {
  assert.equal(bytesToGB(1073741824), 1);
});

test('pct', () => {
  assert.equal(pct(34.218), '34.2');
});
