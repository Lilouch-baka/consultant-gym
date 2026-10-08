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

export function pct(x) {
  if (x === null || x === undefined) return '–';
  return `${Math.round(x * 100)}%`;
}
