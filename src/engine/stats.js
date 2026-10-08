import { ALL_TOPICS, LAYERS } from '../data/curriculum.js';

const DAY = 24 * 60 * 60 * 1000;

// Mastery of one question, 0..1. Long intervals + recent accuracy = mastered.
export function questionMastery(review) {
  if (!review || !review.history || review.history.length === 0) return 0;
  const recent = review.history.slice(-5);
  const acc = recent.filter((h) => h.correct).length / recent.length;
  const spacing = Math.min(1, review.interval / 21);
  return spacing * 0.7 + acc * 0.3;
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function computeStats(questions, reviews, now = Date.now()) {
  const qById = Object.fromEntries(questions.map((q) => [q.id, q]));
  const since = now - 30 * DAY;

  const attempts = [];
  for (const r of Object.values(reviews)) {
    const q = qById[r.qid];
    if (!q) continue;
    for (const h of r.history || []) {
      if (h.ts >= since) attempts.push({ ...h, q });
    }
  }

  const accuracy = attempts.length ? attempts.filter((a) => a.correct).length / attempts.length : null;
  const mental = attempts.filter((a) => a.q.format === 'mental_math' && a.ms);
  const avgMentalMs = mental.length ? mean(mental.map((a) => a.ms)) : null;

  const byDifficulty = {};
  for (const d of ['easy', 'medium', 'hard']) {
    const xs = attempts.filter((a) => a.q.difficulty === d);
    byDifficulty[d] = xs.length ? xs.filter((a) => a.correct).length / xs.length : null;
  }

  const topicMastery = {};
  const topicAttempts = {};
  for (const t of ALL_TOPICS) {
    const qs = questions.filter((q) => q.topic === t.id);
    topicMastery[t.id] = qs.length ? mean(qs.map((q) => questionMastery(reviews[q.id]))) : 0;
    topicAttempts[t.id] = qs.reduce((n, q) => n + ((reviews[q.id] && reviews[q.id].history.length) || 0), 0);
  }

  const layerMastery = {};
  for (const l of LAYERS) {
    const qs = questions.filter((q) => q.layer === l.id);
    layerMastery[l.id] = qs.length ? mean(qs.map((q) => questionMastery(reviews[q.id]))) : 0;
  }

  // Weakest: topics you've practised, lowest mastery first; then untouched ones.
  const practised = ALL_TOPICS.filter((t) => topicAttempts[t.id] > 0).sort((a, b) => topicMastery[a.id] - topicMastery[b.id]);
  const untouched = ALL_TOPICS.filter((t) => topicAttempts[t.id] === 0);
  const weakest = [...practised, ...untouched].slice(0, 5).map((t) => ({ ...t, mastery: topicMastery[t.id], attempts: topicAttempts[t.id] }));

  const totalAnswered = Object.values(reviews).reduce((n, r) => n + (r.history ? r.history.length : 0), 0);

  return { attempts: attempts.length, accuracy, avgMentalMs, byDifficulty, topicMastery, layerMastery, weakest, totalAnswered };
}

export function trackMastery(items, reviews) {
  return items.length ? mean(items.map((q) => questionMastery(reviews[q.id]))) : 0;
}

export function attemptedCount(items, reviews) {
  return items.filter((q) => reviews[q.id] && reviews[q.id].history && reviews[q.id].history.length).length;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Most frequent error this week: partner error patterns first, then written-answer tags.
export function weeklyTopError(partnerAttempts, mentorLog, now = Date.now()) {
  const since = now - 7 * DAY_MS;
  const recent = partnerAttempts.filter((a) => a.ts >= since);
  const count = {};
  for (const a of recent) for (const p of a.patterns || []) count[p] = (count[p] || 0) + 1;
  let source = 'partner';
  let total = recent.length;
  if (!Object.keys(count).length) {
    const graded = mentorLog.filter((m) => m.ts >= since && typeof m.score === 'number');
    for (const m of graded) if (m.tag) count[m.tag] = (count[m.tag] || 0) + 1;
    source = 'written';
    total = graded.length;
  }
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return top ? { label: top[0], n: top[1], total, source } : null;
}

// Weekly error report: the top error with the items that produced it, and the weakest theme
// across all three tracks (practised this week if possible), each with a drill.
export function weeklyReport({ partnerAttempts, mentorLog, reviews, fundamentals, accounting, partnerItems, chapterTitle }, now = Date.now()) {
  const since = now - 7 * DAY_MS;
  const top = weeklyTopError(partnerAttempts, mentorLog, now);
  let error = null;
  if (top) {
    const idByPid = Object.fromEntries(partnerItems.map((p) => [p.pid, p.id]));
    const ids =
      top.source === 'partner'
        ? partnerAttempts.filter((a) => a.ts >= since && (a.patterns || []).includes(top.label)).map((a) => idByPid[a.pid])
        : mentorLog.filter((m) => m.ts >= since && m.tag === top.label).map((m) => m.qid);
    error = { ...top, ids: [...new Set(ids.filter(Boolean))] };
  }

  const groups = [];
  const add = (label, track, items, drill) => groups.push({ label, track, items, drill });
  const byTopic = {};
  for (const q of fundamentals) (byTopic[q.topic] ||= []).push(q);
  for (const t of ALL_TOPICS) if (byTopic[t.id]) add(t.name, 'Fundamentals', byTopic[t.id], { mode: 'topic', topic: t.id });
  const byChapter = {};
  for (const q of accounting) (byChapter[q.chapter] ||= []).push(q);
  for (const [n, items] of Object.entries(byChapter)) add(`Ch ${n} · ${chapterTitle(Number(n))}`, 'Accounting', items, { mode: 'accounting', topic: n });
  const byTheme = {};
  for (const q of partnerItems) (byTheme[q.theme] ||= []).push(q);
  for (const [theme, items] of Object.entries(byTheme)) add(theme, 'Partner', items, { mode: 'review', ids: items.map((q) => q.id).join(',') });

  const touched = (items, from) => items.some((q) => (reviews[q.id]?.history || []).some((h) => h.ts >= from));
  const pool = groups.filter((g) => touched(g.items, since));
  const candidates = (pool.length ? pool : groups.filter((g) => touched(g.items, 0))).map((g) => {
    const tried = g.items.filter((q) => reviews[q.id]?.history?.length);
    const hist = tried.flatMap((q) => reviews[q.id].history.slice(-5));
    return { ...g, mastery: mean(tried.map((q) => questionMastery(reviews[q.id]))), accuracy: hist.filter((h) => h.correct).length / hist.length };
  });
  // Weakest = lowest recent accuracy, ties broken by mastery.
  const weakest = candidates.sort((a, b) => a.accuracy - b.accuracy || a.mastery - b.mastery)[0] || null;
  return { error, weakest, thisWeek: pool.length > 0 };
}

export function pct(x) {
  if (x === null || x === undefined) return '–';
  return `${Math.round(x * 100)}%`;
}
