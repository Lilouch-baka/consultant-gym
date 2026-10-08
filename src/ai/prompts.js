// The API is used for exactly two things:
//  a) grading written answers (score 0-3, one-line reason, error tag)
//  b) a weekly weakness diagnosis from a SUMMARY of the mentor log (counts only, never raw history)
// Everything else (MCQ, flashcards, numeric answers) is graded locally.
import { LAYER_BY_ID, TOPIC_BY_ID } from '../data/curriculum.js';
import { buildStatements, computeRatios } from '../finance/model.js';

export const ERROR_TAGS = ['Concept', 'Formula', 'Arithmetic', 'Units-format', 'Misread', 'Guessed'];
export const TAG_HELP = {
  Concept: 'misunderstood the idea',
  Formula: 'wrong formula or definition',
  Arithmetic: 'calculation slip',
  'Units-format': 'units, %, sign or scale',
  Misread: 'answered a different question',
  Guessed: 'no real reasoning',
};
export const SCORE_LABEL = ['Wrong', 'Partly right', 'Mostly right', 'Fully right'];

const MAX_ANSWER_CHARS = 2000;

// ---------- a) grading ----------
export const GRADE_SYSTEM = `You grade a finance student's written answer against the expected answer. Be strict and direct; no praise.
Score: 3 = correct and complete; 2 = mostly correct, one minor gap; 1 = partly correct, an important error or omission; 0 = wrong, missing or irrelevant.
reason: one sentence, at most 30 words, naming the specific gap (or why it is complete).
tag: the main error type. Concept = misunderstood the idea; Formula = wrong formula or definition; Arithmetic = calculation slip; Units-format = units, %, sign or scale; Misread = answered a different question; Guessed = no reasoning shown. Use None only when the score is 3.`;

export const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', enum: [0, 1, 2, 3] },
    reason: { type: 'string' },
    tag: { type: 'string', enum: [...ERROR_TAGS, 'None'] },
  },
  required: ['score', 'reason', 'tag'],
  additionalProperties: false,
};

// Only questions about the sample company need its figures.
function usesCompany(q) {
  return q.uses_company || /northwind/i.test(q.prompt);
}

export function companyFigures(company) {
  const s = buildStatements(company);
  const r = computeRatios(s);
  const f = (x) => Math.round(x * 10) / 10;
  return `Northwind (${company.currency}): revenue ${f(s.revenue)}, COGS ${f(s.cogs)}, EBITDA ${f(s.ebitda)}, EBIT ${f(s.ebit)}, interest ${f(s.interest)}, net income ${f(
    s.netIncome,
  )}, total assets ${f(s.totalAssets)}, equity ${f(s.equity)}, net debt ${f(r.netDebt)}; ROE ${f(r.roe * 100)}%, ROIC ${f(r.roic * 100)}%, DSO ${f(r.dso)}d, DIO ${f(
    r.dio,
  )}d, DPO ${f(r.dpo)}d.`;
}

export function gradeContent(q, answer, company) {
  const expected = q.answer?.model_answer || '';
  const points = q.answer?.rubric?.length ? `\nKey points: ${q.answer.rubric.join('; ')}` : '';
  const figures = usesCompany(q) ? `\nFigures: ${companyFigures(company)}` : '';
  const trimmed = answer.length > MAX_ANSWER_CHARS ? answer.slice(0, MAX_ANSWER_CHARS) + ' […]' : answer;
  return `Question: ${q.prompt}\nExpected answer: ${expected}${points}${figures}\nStudent answer: """${trimmed}"""`;
}

export function normalizeGrade(g) {
  const score = Math.max(0, Math.min(3, Math.round(Number(g?.score) || 0)));
  let tag = ERROR_TAGS.includes(g?.tag) ? g.tag : null;
  if (score === 3) tag = null;
  if (score < 3 && !tag) tag = 'Concept';
  return { score, reason: String(g?.reason || '').slice(0, 300), tag };
}

export const ANSWER_LIMIT = MAX_ANSWER_CHARS;

// ---------- b) weekly diagnosis ----------
// Builds a compact summary: counts by topic and tag over the last 7 days. No answers, no prompts.
export function summarizeLog(mentorLog, days = 7, now = Date.now()) {
  const since = now - days * 24 * 60 * 60 * 1000;
  const entries = mentorLog.filter((m) => m.ts >= since && typeof m.score === 'number');
  const byTopic = {};
  const tags = {};
  for (const m of entries) {
    const key = m.topic || 'unknown';
    const t = (byTopic[key] ||= { topic: TOPIC_BY_ID[key]?.name || key, layer: m.layer, n: 0, scoreSum: 0, tags: {} });
    t.n += 1;
    t.scoreSum += m.score;
    if (m.tag) {
      t.tags[m.tag] = (t.tags[m.tag] || 0) + 1;
      tags[m.tag] = (tags[m.tag] || 0) + 1;
    }
  }
  const topics = Object.values(byTopic)
    .map((t) => ({ topic: t.topic, layer: t.layer, n: t.n, avgScore: Math.round((t.scoreSum / t.n) * 10) / 10, tags: t.tags }))
    .sort((a, b) => a.avgScore - b.avgScore || b.n - a.n);
  return { days, graded: entries.length, tags, topics };
}

export const DIAGNOSIS_SYSTEM = `You are a demanding senior CFO coaching a finance student (ACCA, then CFA). You receive only a summary of their graded written answers from the last week: counts by topic, average score (0-3) and error-tag counts. Write at most 150 words, plain text, no headings, no praise. Cover: the 2-3 most important weaknesses, the likely root cause behind the dominant error tags, and exactly what to drill next week (topics and type of practice). If the data is thin, say so in one line and still give a recommendation.`;

export function diagnosisContent(summary) {
  const lines = summary.topics.map(
    (t) => `- L${t.layer} ${LAYER_BY_ID[t.layer]?.short || ''} / ${t.topic}: ${t.n} graded, avg ${t.avgScore}/3, tags ${JSON.stringify(t.tags)}`,
  );
  return `Last ${summary.days} days: ${summary.graded} written answers graded.\nError tags overall: ${JSON.stringify(summary.tags)}\nBy topic (weakest first):\n${lines.join('\n')}`;
}
