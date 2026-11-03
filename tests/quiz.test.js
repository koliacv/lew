import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSession, summarizeSession, shuffle, formatDuration, validateBank } from '../src/quiz.js';
const bank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url)));
const sources = JSON.parse(await readFile(new URL('../data/sources.json', import.meta.url)));

test('bank has 200 distinct bilingual questions and valid provenance', () => assert.equal(validateBank(bank, sources), true));
test('malformed questions are rejected', () => {
  const broken = structuredClone(bank); broken[0].opts.pop();
  assert.throws(() => validateBank(broken, sources), /options/);
  const noTranslation = structuredClone(bank); noTranslation[0].ua = '';
  assert.throws(() => validateBank(noTranslation, sources), /ua/);
});
test('shuffle preserves every item without mutating input', () => {
  const ids = [1, 2, 3, 4, 5]; const result = shuffle(ids, () => 0);
  assert.deepEqual(ids, [1, 2, 3, 4, 5]);
  assert.deepEqual([...result].sort(), ids); assert.notDeepEqual(result, ids);
});
test('new sessions reset responses and shuffle labels without losing the correct option', () => {
  const ids = bank.map(q => q.id);
  const first = createSession(ids, 'exam', 200, 1000, () => 0);
  first.answers[first.ids[0]] = 0;
  const second = createSession(ids, 'exam', 200, 1000, () => 0, first.ids.join(','));
  assert.notDeepEqual(first.ids, second.ids); assert.deepEqual(second.answers, {});
  for (const options of Object.values(second.options)) assert.deepEqual([...options].sort(), [0, 1, 2, 3, 4]);
});
test('LEW is four hours; thematic tests use 72 seconds per question', () => {
  assert.equal(createSession(bank.map(q => q.id), 'exam', 200, 1000).deadline, 14401000);
  assert.equal(createSession([1, 2], 'test', 2, 1000).deadline, 145000);
  assert.equal(createSession([1], 'learn', 1, 1000).deadline, null);
});
test('LEW pass boundary uses the exact score, not the rounded percentage', () => {
  const session = createSession(bank.map(q => q.id), 'exam', 200);
  for (const id of session.ids.slice(0, 119)) session.answers[id] = 0;
  const fail = summarizeSession(session);
  assert.equal(fail.pct, 59.5); assert.equal(fail.passed, false);
  session.answers[session.ids[119]] = 0;
  assert.equal(summarizeSession(session).passed, true);
});
test('wrong answers and skipped questions both enter repetition, with separate counts', () => {
  const session = createSession([1, 2, 3], 'learn', 3);
  session.answers[1] = 0; session.answers[2] = 2;
  const result = summarizeSession(session);
  assert.equal(result.right, 1); assert.equal(result.wrong, 1); assert.equal(result.blank, 1);
  assert.deepEqual([...result.miss].sort(), [2, 3]);
});
test('timer clamps expired sessions to zero and displays four hours correctly', () => {
  assert.equal(formatDuration(14400000), '04:00:00');
  assert.equal(formatDuration(-1000), '00:00:00');
  assert.equal(formatDuration(61000), '00:01:01');
});
test('invalid session parameters cannot start empty or duplicate tests', () => {
  assert.throws(() => createSession([], 'learn', 0));
  assert.throws(() => createSession([1, 1], 'learn', 2));
  assert.throws(() => createSession([1], 'unknown', 1));
});
