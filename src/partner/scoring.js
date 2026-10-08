// Offline checks and scoring for partner answers. The AI critique (when online) can refine
// the ratio match and add error patterns; everything here works without a network.

export const PYRAMID_FIELDS = [
  { key: 'answer', label: 'Answer', hint: 'one sentence, with a number' },
  { key: 'reasons', label: 'Reasons', hint: '2–3 causes, each sized' },
  { key: 'evidence', label: 'Evidence', hint: 'the ratios and notes that prove each reason', collapsible: true },
  { key: 'sowhat', label: 'So what', hint: 'ROC, growth, risk, value' },
  { key: 'decision', label: 'Decision', hint: 'what the client should do' },
];

export const ERROR_PATTERNS = ['Wrong lens', 'No prediction', 'Two firms, one answer', 'No so what', 'Unsized reason', 'Circular answer'];

const filled = (s) => !!s && s.trim().length >= 3;

// Live chips under the pyramid.
export function liveChecks(draft) {
  const p = draft.pyramid || {};
  return [
    { id: 'number', label: 'has a number', ok: /\d/.test(p.answer || '') },
    { id: 'lens', label: 'lens picked', ok: !!draft.lens },
    { id: 'sized', label: 'reasons sized', ok: /\d\s*(%|pts?\b|pp\b|bps\b)|\bpts?\b|\bpoints?\b/i.test(p.reasons || '') },
    { id: 'sowhat', label: 'has a so-what', ok: /\b(roc|roic|growth|risk|value)\b/i.test(p.sowhat || '') },
    { id: 'decision', label: 'has a decision', ok: filled(p.decision) },
  ];
}

export function pyramidLayers(draft) {
  const p = draft.pyramid || {};
  return PYRAMID_FIELDS.filter((f) => filled(p[f.key])).length;
}

// Companies named in the company mode, e.g. "Almarai vs SADAFCO · FY2025" -> ["Almarai", "SADAFCO"].
export function companiesFrom(companyMode) {
  const head = (companyMode || '').split('·')[0];
  return head
    .split(/\s+vs\.?\s+|\s*,\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function offlinePatterns(draft, item, companyMode, quick) {
  const out = [];
  if (draft.lens && draft.lens !== item.lens) out.push('Wrong lens');
  if (draft.prediction === null || draft.prediction === undefined) out.push('No prediction');
  if (!quick) {
    const p = draft.pyramid || {};
    const text = `${p.answer || ''} ${p.reasons || ''}`.toLowerCase();
    const firms = companiesFrom(companyMode);
    if (firms.length >= 2 && text.trim() && firms.some((f) => !text.includes(f.toLowerCase().split(' ')[0]))) out.push('Two firms, one answer');
    const checks = Object.fromEntries(liveChecks(draft).map((c) => [c.id, c.ok]));
    if (!checks.sowhat) out.push('No so what');
    if (!checks.sized) out.push('Unsized reason');
  }
  return out;
}

// ---------- ratio match (offline keyword version) ----------
const STOP = new Set(['of', 'the', 'a', 'an', 'to', 'in', 'on', 'per', 'and', 'by', 'for', 'over', 'as', 'at', 'is', 'its', 'with']);
const SYN = { sales: 'revenue', turnover: 'turnover', 'pp&e': 'ppe', 'd&a': 'depreciation', profit: 'income', earnings: 'income', capexes: 'capex' };

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[÷/−\-×()^=≈~,.:;]/g, ' ')
    .split(/\s+/)
    .map((w) => SYN[w] || w)
    .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
}

function overlap(user, ref) {
  const r = tokens(ref);
  if (!r.length) return 0;
  const u = new Set(tokens(user));
  return r.filter((w) => u.has(w)).length / r.length;
}

const OP_OF = (s) => (/÷|\//.test(s) ? '÷' : /\s[−-]\s|−/.test(s) ? '−' : /×/.test(s) ? '×' : /trend|growth|cagr|change|years/i.test(s) ? 'trend' : null);

function splitRatio(kr) {
  const f = kr.includes('=') ? kr.split('=').slice(1).join('=') : kr;
  const m = f.split(/\s*(?:÷|\/|\s−\s|\s-\s|×)\s*/);
  return { a: m[0] || f, b: m[1] || '', op: OP_OF(f), whole: kr };
}

export function ratioMatch(draft, item) {
  const user = `${draft.measureA || ''} ${draft.measureB || ''}`.trim();
  if (!user) return { match: 'wrong', best: item.q.key_ratio[0] };
  let best = { score: -1, kr: item.q.key_ratio[0] };
  for (const kr of item.q.key_ratio) {
    const r = splitRatio(kr);
    const parts = r.b ? (overlap(draft.measureA, r.a) + overlap(draft.measureB, r.b)) / 2 : overlap(user, r.a);
    const whole = overlap(user, kr);
    const score = Math.max(parts, whole * 0.9) + (r.op && r.op === draft.op ? 0.1 : 0);
    if (score > best.score) best = { score, kr, r };
  }
  const opOk = !best.r?.op || best.r.op === draft.op;
  const match = best.score >= 0.75 && opOk ? 'exact' : best.score >= 0.35 ? 'close' : 'wrong';
  return { match, best: best.kr };
}
