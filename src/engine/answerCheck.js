export function parseNumber(input) {
  if (input === null || input === undefined) return NaN;
  const cleaned = String(input).trim().replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return NaN;
  return Number(cleaned);
}

export function checkNumeric(q, input) {
  const v = parseNumber(input);
  if (Number.isNaN(v)) return { valid: false, correct: false, value: v };
  const tol = q.answer.tolerance ?? 0;
  const diff = Math.abs(v - q.answer.value);
  return { valid: true, correct: diff <= tol + 1e-9, value: v, diff };
}

export function timerSeconds(q, settings) {
  if (q.timer_s) return q.timer_s;
  return settings.timers[q.difficulty] ?? 60;
}

export function formatNumber(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const s = Number(v.toFixed(digits)).toString();
  if (!unit) return s;
  if (unit === '%') return s + '%';
  if (unit === 'x') return s + 'x';
  return s + ' ' + unit;
}

export function formatMs(ms) {
  if (!ms && ms !== 0) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
