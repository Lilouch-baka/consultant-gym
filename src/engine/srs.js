// Simplified SM-2 spaced repetition.
// Ratings: 0 Again, 1 Hard, 2 Good, 3 Easy.
export const RATINGS = ['Again', 'Hard', 'Good', 'Easy'];

const DAY = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function newReview(qid) {
  return { qid, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, history: [] };
}

export function schedule(prev, rating, now = Date.now()) {
  const r = { ...prev };
  if (rating === 0) {
    // Forgotten: start again, come back in 10 minutes.
    r.reps = 0;
    r.lapses += 1;
    r.ease = Math.max(MIN_EASE, r.ease - 0.2);
    r.interval = 0;
    r.due = now + 10 * 60 * 1000;
    return r;
  }
  if (rating === 1) {
    r.ease = Math.max(MIN_EASE, r.ease - 0.15);
    r.interval = r.reps === 0 ? 1 : Math.max(1, Math.round(r.interval * 1.2));
  } else if (rating === 2) {
    r.interval = r.reps === 0 ? 1 : r.reps === 1 ? 3 : Math.round(r.interval * r.ease);
  } else {
    r.ease = r.ease + 0.15;
    r.interval = r.reps === 0 ? 4 : r.reps === 1 ? 6 : Math.round(r.interval * r.ease * 1.3);
  }
  r.reps += 1;
  r.due = startOfDay(now) + r.interval * DAY;
  return r;
}

// The highest rating an answer is allowed to receive.
// Wrong answers can only be "Again"; correct-but-slow mental math at most "Hard".
export function ratingCap({ correct, ms, limitMs }) {
  if (!correct) return 0;
  if (limitMs && ms > 0.75 * limitMs) return 1;
  return 3;
}

// Mentor correctness score (1-5) -> highest allowed rating.
export function capFromScore(correctness) {
  if (correctness <= 2) return 0;
  if (correctness === 3) return 1;
  if (correctness === 4) return 2;
  return 3;
}

export function isDue(review, now = Date.now()) {
  return review && review.reps + review.lapses > 0 && review.due <= now;
}
