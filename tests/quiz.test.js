import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSession, summarizeSession, shuffle, formatDuration, validateBank, submitAnswer, nextQuestion, TARGET_RESPONSE_MS } from '../src/quiz.js';
const bank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url)));
const sources = JSON.parse(await readFile(new URL('../data/sources.json', import.meta.url)));

test('bank has valid distinct bilingual questions and valid provenance', () => assert.equal(validateBank(bank, sources), true));
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
for (const mode of ['topic', 'exam']) {
  test(`${mode}: feedback submission records time and locks the answer`, () => {
    const s = createSession([1, 2], mode, 2, 1000);
    const id = s.ids[0];
    assert.equal(nextQuestion(s, 2000), false);
    assert.equal(submitAnswer(s, 0, 71000), true);
    assert.equal(s.answers[id], 0);
    assert.equal(s.responseTimes[id], TARGET_RESPONSE_MS);
    assert.equal(submitAnswer(s, 2, 90000), false);
    assert.equal(s.answers[id], 0);
    assert.equal(s.responseTimes[id], 70000);
    // A long explanation-reading break is excluded from the next response.
    assert.equal(nextQuestion(s, 300000), true);
    assert.equal(submitAnswer(s, 3, 305000), true);
    assert.equal(s.responseTimes[s.ids[1]], 5000);
    assert.equal(nextQuestion(s, 306000), false);
    const result = summarizeSession(s);
    assert.equal(result.right, 1);
    assert.equal(result.wrong, 1);
    assert.equal(result.pct, 50);
    assert.equal(result.averageTime, 37500);
    assert.equal(result.withinTarget, 2);
  });
  test(`${mode}: 70 seconds is a target, never an answer cutoff`, () => {
    const s = createSession([1], mode, 1, 0);
    assert.equal(submitAnswer(s, 2, 71001), true);
    assert.equal(s.responseTimes[1], 71001);
    assert.equal(s.finished, false);
    assert.equal(summarizeSession(s).withinTarget, 0);
    assert.equal(s.deadline, undefined);
  });
}
test('early finish summaries use submitted answers only and handle zero answers', () => {
  const s = createSession([1, 2, 3], 'topic', 3, 0);
  assert.equal(summarizeSession(s).pct, 0);
  assert.equal(summarizeSession(s).averageTime, 0);
  submitAnswer(s, 0, 10000);
  const result = summarizeSession(s);
  assert.equal(result.pct, 100);
  assert.equal(result.answered, 1);
  assert.equal(result.blank, 2);
  s.finished = true;
  assert.equal(nextQuestion(s, 11000), false);
  assert.equal(submitAnswer(s, 1, 12000), false);
});
test('invalid answers do not change the session', () => {
  const s = createSession([1], 'topic', 1, 1000);
  for (const answer of [-1, 5, undefined, 1.5]) assert.throws(() => submitAnswer(s, answer, 2000));
  assert.deepEqual(s.answers, {});
  assert.deepEqual(s.responseTimes, {});
});
test('duration formatting supports long elapsed times and clamps negative input', () => {
  assert.equal(formatDuration(14400000), '04:00:00');
  assert.equal(formatDuration(-1000), '00:00:00');
  assert.equal(formatDuration(61000), '00:01:01');
});
test('invalid session parameters cannot start empty or duplicate tests', () => {
  assert.throws(() => createSession([], 'topic', 0));
  assert.throws(() => createSession([1, 1], 'topic', 2));
  assert.throws(() => createSession([1], 'unknown', 1));
});
