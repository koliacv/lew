/** Framework-free quiz logic. Correct answer indices refer to data, not shuffled labels. */
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createSession(ids, mode, count, now = Date.now(), random = Math.random, previousOrder = '') {
  if (!['learn', 'test', 'exam'].includes(mode)) throw new Error('Invalid mode');
  if (!Number.isInteger(count) || count < 1 || count > ids.length) throw new Error('Invalid question count');
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate question IDs');
  const order = shuffle(ids, random).slice(0, count);
  if (order.length > 1 && order.join(',') === previousOrder) order.push(order.shift());
  return {
    ids: order,
    options: Object.fromEntries(order.map(id => [id, shuffle([0, 1, 2, 3, 4], random)])),
    answers: {}, locked: {}, flags: {}, index: 0, mode,
    started: now, deadline: mode === 'learn' ? null : now + count * 72_000,
    finished: false, elapsed: 0
  };
}

export function summarizeSession(session) {
  const right = session.ids.filter(id => session.answers[id] === 0).length;
  const miss = session.ids.filter(id => session.answers[id] !== 0);
  const blank = session.ids.filter(id => session.answers[id] === undefined).length;
  const total = session.ids.length;
  return { right, miss, blank, total, wrong: total - right - blank,
    pct: Math.round(right / total * 1000) / 10, passed: right / total >= 0.6 };
}

export function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(number => String(number).padStart(2, '0')).join(':');
}

export function validateBank(bank, sources) {
  if (!Array.isArray(bank) || bank.length !== 200) throw new Error('Expected 200 questions');
  if (!Array.isArray(sources) || sources.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid sources');
  const ids = new Set(), stems = new Set(), topics = new Map();
  for (const q of bank) {
    if (!Number.isInteger(q.id) || ids.has(q.id)) throw new Error('Invalid or duplicate ID');
    if (stems.has(q.q)) throw new Error('Duplicate question');
    for (const key of ['topic', 'q', 'pl', 'ua']) {
      if (typeof q[key] !== 'string' || !q[key].trim()) throw new Error(`Missing ${key}`);
    }
    if (!Array.isArray(q.opts) || q.opts.length !== 5 || new Set(q.opts).size !== 5 ||
        q.opts.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid options');
    if (!Array.isArray(q.steps) || q.steps.length !== 3 ||
        q.steps.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid memory map');
    if (!Number.isInteger(q.src) || !sources[q.src]) throw new Error('Unknown source');
    ids.add(q.id); stems.add(q.q); topics.set(q.topic, (topics.get(q.topic) || 0) + 1);
  }
  if (topics.size !== 10 || [...topics.values()].some(n => n !== 20)) throw new Error('Expected 10 topics with 20 questions each');
  return true;
}
