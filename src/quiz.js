/** Framework-free quiz logic. Correct answer indices refer to data, not shuffled labels. */
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Exhaust unseen questions, then keep a recent portion of the pool out of rotation.
export function selectQuestions(ids, count, history = {}, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > ids.length || new Set(ids).size !== ids.length) {
    throw new Error('Invalid question selection');
  }
  const fresh = shuffle(ids.filter(id => !history[id]?.shown), random);
  if (fresh.length >= count) return shuffle(fresh.slice(0, count), random);
  const needed = count - fresh.length;
  const seen = shuffle(ids.filter(id => history[id]?.shown), random)
    .sort((a, b) => history[b].lastSeen - history[a].lastSeen);
  // Always leave enough eligible items to fill the requested session.
  const cooldown = Math.min(seen.length - needed, Math.max(count, Math.floor(ids.length * 0.4)));
  const ranked = seen.slice(cooldown).sort((a, b) => {
    const left = history[a], right = history[b];
    return (left?.shown || 0) - (right?.shown || 0) || (left?.lastSeen || 0) - (right?.lastSeen || 0);
  });
  return shuffle([...fresh, ...ranked.slice(0, needed)], random);
}

export function selectExamQuestions(bank, count = 200, history = {}, random = Math.random) {
  const groups = [...new Set(bank.map(q => q.topic))].map(topic => bank.filter(q => q.topic === topic).map(q => q.id));
  if (!groups.length || !Number.isInteger(count) || count < 1 || count % groups.length || groups.some(ids => ids.length < count / groups.length)) throw new Error('Insufficient exam coverage');
  return shuffle(groups.flatMap(ids => selectQuestions(ids, count / groups.length, history, random)), random);
}

export const HISTORY_KEY = 'lew-question-history-v1';

export function parseHistory(raw, knownIds) {
  const allowed = new Set(knownIds);
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.items || typeof data.items !== 'object' || Array.isArray(data.items)) return {};
    return Object.fromEntries(Object.entries(data.items).filter(([id, value]) =>
      allowed.has(Number(id)) && String(Number(id)) === id && value &&
      Number.isSafeInteger(value.shown) && value.shown > 0 && value.shown < Number.MAX_SAFE_INTEGER &&
      Number.isSafeInteger(value.lastSeen) && value.lastSeen >= 0
    ).map(([id, value]) => [id, { shown: value.shown, lastSeen: value.lastSeen }]));
  } catch { return {}; }
}

export function recordSeen(history, ids, now = Date.now()) {
  const next = { ...history };
  const lastSeen = Math.max(now, ...Object.values(history).map(item => item.lastSeen + 1));
  for (const id of new Set(ids)) next[id] = { shown: (next[id]?.shown || 0) + 1, lastSeen };
  return next;
}

export function createSession(ids, mode, count, now = Date.now(), random = Math.random, previousOrder = '', history = {}, optionCounts = {}) {
  if (!['topic', 'exam'].includes(mode)) throw new Error('Invalid mode');
  if (!Number.isInteger(count) || count < 1 || count > ids.length) throw new Error('Invalid question count');
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate question IDs');
  const order = selectQuestions(ids, count, history, random);
  const options = Object.fromEntries(order.map(id => {
    const length = optionCounts[id] ?? 5;
    if (!Number.isInteger(length) || length < 2 || length > 5) throw new Error('Invalid option count');
    return [id, shuffle(Array.from({ length }, (_, i) => i), random)];
  }));
  if (order.length > 1 && order.join(',') === previousOrder) order.push(order.shift());
  return {
    ids: order,
    options,
    answers: {}, responseTimes: {}, seen: [], index: 0, mode,
    started: now, questionStarted: now,
    finished: false, elapsed: 0
  };
}

export const TARGET_RESPONSE_MS = 70_000;

// The clock stops on submission, before the learner reads the explanation.
export function submitAnswer(session, option, now = Date.now()) {
  const id = session.ids[session.index];
  if (session.finished || session.answers[id] !== undefined) return false;
  if (!Number.isInteger(option) || !session.options[id].includes(option)) throw new Error('Invalid answer');
  session.answers[id] = option;
  session.responseTimes[id] = Math.max(0, now - session.questionStarted);
  return true;
}

export function nextQuestion(session, now = Date.now()) {
  if (session.finished || session.answers[session.ids[session.index]] === undefined || session.index >= session.ids.length - 1) return false;
  session.index++;
  session.questionStarted = now;
  return true;
}

export function summarizeSession(session) {
  const submitted = session.ids.filter(id => session.answers[id] !== undefined);
  const right = submitted.filter(id => session.answers[id] === 0).length;
  const responseTime = submitted.reduce((sum, id) => sum + session.responseTimes[id], 0);
  return { right, answered: submitted.length, total: session.ids.length,
    wrong: submitted.length - right, blank: session.ids.length - submitted.length,
    pct: submitted.length ? Math.round(right / submitted.length * 1000) / 10 : 0,
    responseTime, averageTime: submitted.length ? responseTime / submitted.length : 0,
    withinTarget: submitted.filter(id => session.responseTimes[id] <= TARGET_RESPONSE_MS).length };
}

export function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(number => String(number).padStart(2, '0')).join(':');
}

export function validateBank(bank, sources) {
  if (!Array.isArray(bank) || bank.length < 200) throw new Error('Expected at least 200 questions');
  if (!Array.isArray(sources) || sources.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid sources');
  const ids = new Set(), stems = new Set(), topics = new Map(), objectives = new Set();
  for (const q of bank) {
    if (!Number.isInteger(q.id) || ids.has(q.id)) throw new Error('Invalid or duplicate ID');
    if (stems.has(q.q)) throw new Error('Duplicate question');
    for (const key of ['topic', 'q', 'pl', 'ua']) {
      if (typeof q[key] !== 'string' || !q[key].trim()) throw new Error(`Missing ${key}`);
    }
    if (!Array.isArray(q.opts) || q.opts.length < (q.provenance ? 2 : 5) || q.opts.length > 5 || new Set(q.opts).size !== q.opts.length ||
        q.opts.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid options');
    if (!Array.isArray(q.steps) || q.steps.length !== 3 ||
        q.steps.some(s => typeof s !== 'string' || !s.trim())) throw new Error('Invalid memory map');
    if (!Number.isInteger(q.src) || !sources[q.src]) throw new Error('Unknown source');
    if (q.id > 200 && (typeof q.sourceRef !== 'string' || !q.sourceRef.trim())) throw new Error('Missing source locator');
    if (q.generation) {
      const g=q.generation, loc=g.locator;
      if (q.provenance || g.kind!=='source-derived' || g.examPrediction!==false ||
          typeof g.batch!=='string' || !g.batch.trim() || typeof g.objective!=='string' || !g.objective.trim() || objectives.has(g.objective) ||
          !Number.isInteger(g.materialId) || g.materialId<1 || typeof g.file!=='string' || !g.file.trim() ||
          !/^[a-f0-9]{64}$/.test(g.sha256) || !loc ||
          !((Number.isInteger(loc.page)&&loc.page>0) || (Number.isInteger(loc.paragraph)&&loc.paragraph>0) ||
          (typeof loc.section==='string'&&loc.section.trim()))) throw new Error('Invalid generated question provenance');
      objectives.add(g.objective);
    }
    if (q.provenance) {
      const p=q.provenance;
      const displayed=p.translatedOptions ?? p.originalOptions;
      if (!['source-question','source-adapted'].includes(p.kind) || !/^[a-f0-9]{64}$/.test(p.sha256) ||
          !Number.isInteger(p.page) || p.page<1 || !p.file || !p.originalQuestion || !p.answerEvidence ||
          !Array.isArray(p.originalOptions) || p.originalOptions.length!==q.opts.length ||
          p.originalOptions.some(o=>typeof o!=='string'||!o.trim()) ||
          !Array.isArray(displayed) || displayed.length!==p.originalOptions.length ||
          new Set(displayed).size!==displayed.length ||
          (p.translatedOptions && (p.kind!=='source-adapted'||!p.adaptationNote)) ||
          !Number.isInteger(p.correctOriginalIndex) || p.correctOriginalIndex<0 || p.correctOriginalIndex>=displayed.length ||
          displayed[p.correctOriginalIndex]!==q.opts[0] ||
          displayed.some(o=>!q.opts.includes(o))) throw new Error('Invalid source provenance');
    }
    if (q.references !== undefined && (!Array.isArray(q.references) || q.references.some(ref =>
      typeof ref.title !== 'string' || !ref.title.trim() || typeof ref.url !== 'string' || !/^https:\/\//.test(ref.url)
    ))) throw new Error('Invalid clinical reference');
    ids.add(q.id); stems.add(q.q); topics.set(q.topic, (topics.get(q.topic) || 0) + 1);
  }
  if (topics.size !== 10 || [...topics.values()].some(n => n < 20)) throw new Error('Expected 10 topics with at least 20 questions each');
  return true;
}
