import { shuffle } from './answerCheck.js';
import { LAYERS } from '../data/curriculum.js';

const DAY = 24 * 60 * 60 * 1000;
export const NEW_PER_DAY = 10;
export const DAILY_CAP = 25;

// Rough seconds per question, used for time estimates.
export const SECONDS_PER_FORMAT = { mcq: 40, flashcard: 20, mental_math: 45, written: 180, journal_entry: 90, partner: 480 };

export const MODES = {
  mix: { title: 'Today’s mix' },
  partner: { title: 'Partner analysis' },
  accounting: { title: 'Financial accounting' },
  review: { title: 'Review' },
  daily: { title: 'Daily review' },
  layer: { title: 'Layer drill' },
  topic: { title: 'Topic drill' },
  mixed: { title: 'Mixed exam' },
  hard: { title: 'Hard mode' },
  speed: { title: 'Speed round' },
};

// Lower = study sooner. Overdue first, then never-seen, then the ones due soonest.
function priority(q, reviews, now) {
  const r = reviews[q.id];
  if (!r || r.reps + r.lapses === 0) return 1 + Math.random() * 0.5;
  if (r.due <= now) return Math.random() * 0.5;
  return 2 + (r.due - now) / DAY + Math.random() * 0.5;
}

function byPriority(list, reviews, now) {
  return [...list].sort((a, b) => priority(a, reviews, now) - priority(b, reviews, now));
}

export function dailyQueue(questions, reviews, now = Date.now()) {
  const due = [];
  const fresh = [];
  for (const q of questions) {
    const r = reviews[q.id];
    if (!r || r.reps + r.lapses === 0) fresh.push(q);
    else if (r.due <= now) due.push(q);
  }
  due.sort((a, b) => reviews[a.id].due - reviews[b.id].due);
  // New cards: favour foundations first (lower layer, easier), with some variety.
  const rank = { easy: 0, medium: 1, hard: 2 };
  const newOnes = shuffle(fresh)
    .sort((a, b) => a.layer + rank[a.difficulty] - (b.layer + rank[b.difficulty]))
    .slice(0, Math.max(0, Math.min(NEW_PER_DAY, DAILY_CAP - due.length)));
  return shuffle([...due.slice(0, DAILY_CAP), ...newOnes]).slice(0, DAILY_CAP);
}

function seen(r) {
  return r && r.reps + r.lapses > 0;
}

// Due first (oldest first), then unseen in file order.
function dueThenNew(items, reviews, now, n) {
  const due = items.filter((q) => seen(reviews[q.id]) && reviews[q.id].due <= now).sort((a, b) => reviews[a.id].due - reviews[b.id].due);
  const fresh = items.filter((q) => !seen(reviews[q.id]));
  return [...due, ...fresh].slice(0, n);
}

// Today's mix: fundamentals review, a few accounting items and one partner question (~20 min).
export function mixQueue({ fundamentals, accounting = [], partner = [], reviews, now = Date.now() }) {
  const fund = dailyQueue(fundamentals, reviews, now).slice(0, 12);
  const acc = dueThenNew(accounting, reviews, now, 5);
  const part = dueThenNew(partner, reviews, now, 1);
  // Interleave accounting into the fundamentals cards; partner question last (it is the long one).
  const mixed = [...fund];
  acc.forEach((q, i) => mixed.splice(Math.min(mixed.length, (i + 1) * 3), 0, q));
  return [...mixed, ...part];
}

export function buildSession(mode, { questions, reviews, layer, topic, difficulty, accounting = [], partner = [], lens, now = Date.now() }) {
  switch (mode) {
    case 'mix':
      return mixQueue({ fundamentals: questions, accounting, partner, reviews, now });
    case 'partner':
      return dueThenNew(lens ? partner.filter((q) => q.lens === lens) : partner, reviews, now, 3);
    case 'accounting':
      return dueThenNew(accounting.filter((q) => !topic || q.chapter === Number(topic)), reviews, now, 10);
    case 'daily':
      return dailyQueue(questions, reviews, now);
    case 'layer':
      return byPriority(questions.filter((q) => q.layer === Number(layer)), reviews, now).slice(0, 15);
    case 'topic': {
      let pool = questions.filter((q) => q.topic === topic);
      if (difficulty) pool = pool.filter((q) => q.difficulty === difficulty);
      return byPriority(pool, reviews, now).slice(0, 12);
    }
    case 'hard':
      return byPriority(questions.filter((q) => q.difficulty === 'hard' && (!layer || q.layer === Number(layer))), reviews, now).slice(0, 12);
    case 'speed':
      return byPriority(questions.filter((q) => q.format === 'mental_math' && (!layer || q.layer === Number(layer))), reviews, now).slice(0, 10);
    case 'mixed': {
      const picked = [];
      for (const l of LAYERS) {
        const pool = shuffle(questions.filter((q) => q.layer === l.id && q.format !== 'flashcard'));
        picked.push(...pool.slice(0, 4));
      }
      return shuffle(picked);
    }
    default:
      return [];
  }
}

export function estimateMinutes(queue) {
  const s = queue.reduce((sum, q) => sum + (SECONDS_PER_FORMAT[q.format] || 45), 0);
  return Math.max(1, Math.round(s / 60));
}
