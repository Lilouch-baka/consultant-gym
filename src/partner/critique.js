// AI critique of a partner-pyramid answer (one small call per reveal, full mode only).
import { ERROR_PATTERNS, PYRAMID_FIELDS } from './scoring.js';
import { LENS_BY_ID } from '../data/tracks.js';

export const CRITIQUE_SYSTEM = `You are a demanding senior partner at a strategy consultancy reviewing a junior's answer to a client question. Harsh, direct, never flattering; no greetings.
Grade the answer pyramid (Answer with a number, sized Reasons, Evidence, So what for ROC/growth/risk/value, Decision) against the partner answer structure and the worked example.
ratio_match: is the junior's ratio the right one for the question? exact = same ratio; close = right idea, wrong form or denominator; wrong = not the ratio that answers it.
patterns: name only the error patterns actually present, from: Wrong lens, No prediction, Two firms, one answer (answers one company or blends them), No so what, Unsized reason (a cause without how much of the gap it explains), Circular answer (explains a ratio with itself).
critique: at most 60 words, quantify what is missing using the worked example's figures.
follow_up: one sharper question, at most 25 words.`;

export const CRITIQUE_SCHEMA = {
  type: 'object',
  properties: {
    ratio_match: { type: 'string', enum: ['exact', 'close', 'wrong'] },
    patterns: { type: 'array', items: { type: 'string', enum: ERROR_PATTERNS } },
    critique: { type: 'string' },
    follow_up: { type: 'string' },
  },
  required: ['ratio_match', 'patterns', 'critique', 'follow_up'],
  additionalProperties: false,
};

const clip = (s, n = 600) => (s || '').trim().slice(0, n);

export function critiqueContent(item, draft, companyMode, hypotheses) {
  const q = item.q;
  const pyr = PYRAMID_FIELDS.map((f) => `${f.label}: ${clip(draft.pyramid?.[f.key], 500) || '(empty)'}`).join('\n');
  const pred = draft.prediction !== null && draft.prediction !== undefined ? hypotheses[draft.prediction] : '(none)';
  return `Company: ${companyMode}
Question (${item.pid}, ${q.layer} / ${q.theme}): ${q.question}
Key ratio(s): ${q.key_ratio.join(' | ')}
Partner answer structure: ${q.answer_structure}
Worked example: ${q.worked_example}

Junior's work:
Lens: ${LENS_BY_ID[draft.lens]?.name || '(none)'}; theme: ${draft.theme || '(none)'}
Ratio: ${clip(draft.measureA, 80) || '?'} ${draft.op || '?'} ${clip(draft.measureB, 80) || '?'}
Prediction: ${pred}${draft.reason ? ` because ${clip(draft.reason, 200)}` : ''}
${pyr}`;
}

export function normalizeCritique(r) {
  return {
    ratio_match: ['exact', 'close', 'wrong'].includes(r?.ratio_match) ? r.ratio_match : null,
    patterns: Array.isArray(r?.patterns) ? r.patterns.filter((p) => ERROR_PATTERNS.includes(p)) : [],
    critique: String(r?.critique || '').slice(0, 600),
    follow_up: String(r?.follow_up || '').slice(0, 300),
  };
}
