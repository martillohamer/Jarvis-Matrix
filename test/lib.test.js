import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractReply, trimHistory, rmsToDbfs, bytesToGB, pct } from '../public/assets/lib.js';

test('extractReply - OpenAI format', () => {
  const data = { choices: [{ message: { content: 'Hola' } }] };
  assert.equal(extractReply(data), 'Hola');
});

test('extractReply - degraded', () => {
  const data = { choices: [{ message: { content: 'Hola' } }], _degraded: true };
  assert.equal(extractReply(data), 'Hola');
});

test('extractReply - direct format', () => {
  assert.equal(extractReply({ reply: 'Test' }), 'Test');
  assert.equal(extractReply({ response: 'Test2' }), 'Test2');
});

test('extractReply - invalid', () => {
  assert.throws(() => extractReply({}), /Formato de respuesta inválido/);
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
