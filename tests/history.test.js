import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectQuestions, selectExamQuestions, recordSeen, parseHistory, createSession } from '../src/quiz.js';

const bank = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url)));
const ids = bank.map(q => q.id);
// Repeatable randomness makes failures reproducible without fixing presentation order.
function seeded(seed = 173) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('expanded bank retains ten topics with at least fifty questions each', () => {
  const topics = [...new Set(bank.map(q => q.topic))];
  assert.equal(bank.length, 634);
  assert.equal(topics.length, 10);
  for (const topic of topics) assert.ok(bank.filter(q => q.topic === topic).length >= 50);
  for (const q of bank.filter(q => q.id > 200)) assert.ok(q.sourceRef.trim());
});

test('five ten-question thematic sessions exhaust fifty questions before any repetition', () => {
  const pool = bank.filter(q => q.topic === bank[0].topic).map(q => q.id);
  const random = seeded();
  let history = {};
  for (let session = 0; session < 5; session++) {
    const selected = selectQuestions(pool, 10, history, random);
    assert.equal(new Set(selected).size, 10);
    assert.ok(selected.every(id => !history[id]), 'unseen questions must be exhausted first');
    history = recordSeen(history, selected, 1000 + session);
    // Emulate closing and reopening the page between sessions.
    history = parseHistory(JSON.stringify({ version: 1, items: history }), ids);
  }
  assert.equal(Object.keys(history).length, 50);
  assert.ok(Object.values(history).every(item => item.shown === 1));
});

test('two completed 200-question exams have no overlap and cover all topics', () => {
  let history = {};
  const first = selectExamQuestions(bank, 200, history, seeded(1));
  history = recordSeen(history, first, 1000);
  const second = selectExamQuestions(bank, 200, history, seeded(2));
  assert.ok(second.every(id => !first.includes(id)));
  for (const selected of [first, second]) {
    assert.equal(new Set(selected).size, 200);
    for (const topic of new Set(bank.map(q => q.topic))) {
      assert.equal(selected.filter(id => bank.find(q => q.id === id).topic === topic).length, 20);
    }
  }
  history = recordSeen(history, second, 2000);
  const third = selectExamQuestions(bank, 200, history, seeded(3));
  const expectedNew=[...new Set(bank.map(q=>q.topic))].reduce((sum,topic)=>sum+Math.min(20,bank.filter(q=>q.topic===topic&&!history[q.id]).length),0);
  assert.equal(third.filter(id => !history[id]).length, expectedNew);
  assert.equal(third.filter(id => first.includes(id)).length, 200 - expectedNew);
  assert.equal(third.filter(id => second.includes(id)).length, 0);
});

test('unseen questions win; cooldown prevents immediate reuse despite uneven exposure counts', () => {
  const history = { 1: { shown: 2, lastSeen: 1 }, 2: { shown: 1, lastSeen: 20 }, 3: { shown: 1, lastSeen: 10 } };
  assert.deepEqual(selectQuestions([1, 2, 3, 4], 1, history, seeded()), [4]);
  assert.deepEqual(selectQuestions([1, 2, 3], 1, history, seeded()), [3]);
  assert.deepEqual(selectQuestions([1, 2], 1, history, seeded()), [1]);
});

test('new additions to a heavily practiced topic do not immediately repeat next session', () => {
  const pool = Array.from({ length: 50 }, (_, i) => i + 1);
  let history = {};
  for (const id of pool.slice(0, 40)) history[id] = { shown: 8, lastSeen: 100 };
  const first = selectQuestions(pool, 20, history, seeded(11));
  assert.equal(first.filter(id => id > 40).length, 10);
  history = recordSeen(history, first, 1000);
  const second = selectQuestions(pool, 20, history, seeded(12));
  assert.ok(second.every(id => !first.includes(id)));
});

test('old questions with lower exposure counts win inside the eligible pool', () => {
  const history = {
    1: { shown: 10, lastSeen: 1 }, 2: { shown: 2, lastSeen: 2 },
    3: { shown: 1, lastSeen: 10 }, 4: { shown: 1, lastSeen: 20 }, 5: { shown: 1, lastSeen: 30 }
  };
  assert.deepEqual(selectQuestions([1,2,3,4,5], 1, history, seeded()), [3]);
});

test('history remains ordered if the device clock moves backwards', () => {
  const history = recordSeen({}, [1], 2000);
  const next = recordSeen(history, [2], 1000);
  assert.ok(next[2].lastSeen > next[1].lastSeen);
});

test('incomplete sessions only count questions actually shown', () => {
  const session = createSession(ids, 'topic', 20, 1000, seeded());
  const viewed = session.ids.slice(0, 3);
  const history = recordSeen({}, viewed, 2000);
  assert.equal(Object.keys(history).length, 3);
  assert.ok(session.ids.slice(3).every(id => !history[id]));
  const next = selectQuestions(ids, 20, history, seeded());
  assert.ok(next.every(id => !viewed.includes(id)));
});

test('sessions keep answers shuffled and prioritize unseen questions', () => {
  const history = recordSeen({}, ids.slice(0, ids.length - 50), 1000);
  const session = createSession(ids, 'topic', 50, 2000, seeded(), '', history);
  assert.deepEqual([...session.ids].sort((a,b) => a-b), ids.slice(-50));
  for (const options of Object.values(session.options)) assert.deepEqual([...options].sort(), [0,1,2,3,4]);
});

test('selecting the complete pool necessarily includes already seen questions', () => {
  const selected = selectQuestions([1, 2, 3], 3, recordSeen({}, [1, 2, 3]), seeded());
  assert.deepEqual([...selected].sort(), [1, 2, 3]);
});

test('selection does not mutate the source pool or the saved history', () => {
  const pool = [1, 2, 3];
  const history = recordSeen({}, [1], 1000);
  const snapshot = JSON.stringify(history);
  selectQuestions(pool, 2, history, seeded());
  assert.deepEqual(pool, [1, 2, 3]);
  assert.equal(JSON.stringify(history), snapshot);
  const next = recordSeen(history, [2, 2], 2000);
  assert.equal(next[2].shown, 1);
  assert.equal(history[2], undefined);
});

test('malformed, foreign-version and stale history are safely discarded', () => {
  for (const raw of [null, '', '{broken', '{}', 'null', '{"version":2,"items":{}}']) assert.deepEqual(parseHistory(raw, ids), {});
  const raw = JSON.stringify({ version: 1, items: {
    1: { shown: 3, lastSeen: 1000, answers: 'must not survive' },
    2: { shown: -1, lastSeen: 1000 },
    3: { shown: 1.5, lastSeen: 1000 },
    4: { shown: 2, lastSeen: -1 },
    999999: { shown: 1, lastSeen: 1000 }
  }, results: 'must not survive' });
  assert.deepEqual(parseHistory(raw, ids), { 1: { shown: 3, lastSeen: 1000 } });
});

test('adding new questions automatically gives them priority over the old bank', () => {
  const history = recordSeen({}, ids.slice(0, 200), 1000);
  const selected = selectQuestions(ids, 200, history, seeded());
  assert.ok(selected.every(id => id > 200));
});

test('different seeds vary the first selection and presentation order', () => {
  assert.notDeepEqual(selectQuestions(ids, 20, {}, seeded(1)), selectQuestions(ids, 20, {}, seeded(2)));
});

test('invalid selections and insufficient exam coverage are rejected', () => {
  assert.throws(() => selectQuestions([1], 2));
  assert.throws(() => selectQuestions([1, 1], 1));
  assert.throws(() => selectQuestions([1], 0));
  assert.throws(() => selectExamQuestions([], 200));
  assert.throws(() => selectExamQuestions(bank, 199));
  assert.throws(() => selectExamQuestions(bank.slice(0, 10), 200));
});

test('long-run exposure stays even and sessions never duplicate their own questions', () => {
  const random = seeded(9);
  let history = {};
  for (let i = 0; i < 150; i++) {
    const selected = selectQuestions(ids, 20, history, random);
    assert.equal(new Set(selected).size, 20);
    history = recordSeen(history, selected, 1000+i);
  }
  assert.equal(Object.keys(history).length, bank.length);
  const counts = Object.values(history).map(item => item.shown);
  assert.equal(counts.reduce((sum,n)=>sum+n,0), 150*20);
  assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
});
