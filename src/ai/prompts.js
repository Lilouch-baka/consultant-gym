import { LAYER_BY_ID, TOPIC_BY_ID } from '../data/curriculum.js';

export const MENTOR_SYSTEM = `You are the mentor inside Consultant Gym, a training app used by Leila, an ACCA student (moving on to the CFA) who is training to become a top-tier corporate finance consultant and, later, a CFO.

Who you are: a demanding senior CFO and strategy consultant with decades of experience across audit, M&A, private equity and turnarounds. You have trained many analysts. You are critical, direct and never flattering. You do not pad answers with praise, reassurance or filler.

How you judge reasoning:
- Grade the structure of the reasoning, not only the final number. Name the specific missing step, e.g. "you never proved the balance sheet balances", "you ignored the tax shield", "you stated a conclusion without a driver".
- For three-statement questions, expect the order IS → CFS → BS and an explicit check that the balance sheet balances.
- For ratios, expect: definition → what moved → why it moved (driver) → what it means for cash, risk and value.
- For diagnosis, expect: the pattern → the most likely business story → how to confirm it (which data to ask for) → value impact → what a CFO would do.
- Push beyond the obvious (second-order effects, what would change your mind), but always inside a rigorous structure.

Accuracy matters more than anything. If a number is uncertain, say what you would need to know. Use IFRS terminology by default and mention US GAAP differences only when they matter.

Style: plain text, no markdown headings, no bullet symbols other than "-" at the start of a line, short paragraphs, use "→" for causal chains. British English spelling.`;

function describeQuestion(q) {
  const lines = [
    `Layer ${q.layer} (${LAYER_BY_ID[q.layer]?.name || ''}), topic: ${TOPIC_BY_ID[q.topic]?.name || q.topic}, difficulty: ${q.difficulty}, style: ${q.style}.`,
    `Question: ${q.prompt}`,
  ];
  if (q.format === 'written' && q.answer?.model_answer) lines.push(`Reference answer: ${q.answer.model_answer}`);
  if (q.format === 'written' && q.answer?.rubric?.length) lines.push(`Key points expected: ${q.answer.rubric.join('; ')}`);
  if (q.format === 'mcq') lines.push(`Correct option: ${q.options[q.answer.index]}`);
  if (q.format === 'mental_math') lines.push(`Correct answer: ${q.answer.value}${q.answer.unit || ''}`);
  if (q.format === 'flashcard') lines.push(`Card back: ${q.answer.meaning} Formula: ${q.answer.formula || 'n/a'}.`);
  if (q.explanation?.reasoning?.length) lines.push(`Reasoning in the app: ${q.explanation.reasoning.join(' ')}`);
  if (q.why_it_matters) lines.push(`Why it matters: ${q.why_it_matters}`);
  return lines.join('\n');
}

// ---------- Grading ----------
export const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        correctness: { type: 'integer', description: '1 to 5' },
        structure: { type: 'integer', description: '1 to 5' },
        depth: { type: 'integer', description: '1 to 5' },
      },
      required: ['correctness', 'structure', 'depth'],
      additionalProperties: false,
    },
    right: { type: 'string', description: 'What the answer got right. Empty string if nothing.' },
    wrong: { type: 'string', description: 'What is wrong or missing, specific and direct.' },
    model_answer: { type: 'string', description: 'A tight model answer.' },
    grid: {
      type: 'object',
      description: 'For three-statement walkthroughs only, otherwise empty strings.',
      properties: { IS: { type: 'string' }, CFS: { type: 'string' }, BS: { type: 'string' } },
      required: ['IS', 'CFS', 'BS'],
      additionalProperties: false,
    },
    follow_up: { type: 'string', description: 'One sharper follow-up question that pushes one level deeper.' },
  },
  required: ['scores', 'right', 'wrong', 'model_answer', 'grid', 'follow_up'],
  additionalProperties: false,
};

export function gradeMessages(q, userAnswer, extraContext) {
  const content = `Grade my written answer.

${describeQuestion(q)}
${extraContext ? `\nContext: ${extraContext}\n` : ''}
My answer:
"""
${userAnswer}
"""

Score correctness, structure and depth from 1 (poor) to 5 (partner-ready). Be strict: 5 means nothing important is missing. "right" and "wrong" are short paragraphs addressed to me ("you"). If this is a three-statement walkthrough, fill grid with one line each for IS, CFS and BS (with the balance check in BS); otherwise leave the grid fields as empty strings. End with one sharper follow-up question.`;
  return [{ role: 'user', content }];
}

export function normalizeGrade(g) {
  const clamp = (n) => Math.max(1, Math.min(5, Math.round(Number(n) || 1)));
  return {
    scores: { correctness: clamp(g?.scores?.correctness), structure: clamp(g?.scores?.structure), depth: clamp(g?.scores?.depth) },
    right: g?.right || '',
    wrong: g?.wrong || '',
    model_answer: g?.model_answer || '',
    grid: g?.grid && (g.grid.IS || g.grid.CFS || g.grid.BS) ? g.grid : null,
    follow_up: g?.follow_up || '',
  };
}

// ---------- Go deeper ----------
export function deeperMessages(contextText, history, question) {
  const intro = `Context from the app:\n${contextText}\n\nAnswer my follow-up as my mentor. Be precise and concise (under 220 words unless a calculation needs more). If my question rests on a wrong assumption, say so first.`;
  const msgs = [{ role: 'user', content: `${intro}\n\nMy question: ${history.length ? history[0].q : question}` }];
  history.forEach((h, i) => {
    msgs.push({ role: 'assistant', content: h.a });
    msgs.push({ role: 'user', content: i + 1 < history.length ? history[i + 1].q : question });
  });
  return msgs;
}

export function questionContext(q) {
  return describeQuestion(q) + (q.common_trap ? `\nCommon trap: ${q.common_trap}` : '');
}

// ---------- Ask me more (question generation) ----------
export const GENERATE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['mcq', 'flashcard', 'written', 'mental_math'] },
          style: { type: 'string', enum: ['definition', 'logical', 'rhetorical', 'walkthrough', 'calculation', 'diagnosis'] },
          prompt: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: 'mcq only: exactly 4 options; otherwise empty' },
          correct_index: { type: 'integer', description: 'mcq only: 0-3; otherwise 0' },
          numeric_answer: { type: 'number', description: 'mental_math only; otherwise 0' },
          unit: { type: 'string', description: 'mental_math only: "%", "x", "days", "years" or ""' },
          tolerance: { type: 'number', description: 'mental_math only: acceptable +/- band' },
          shortcut: { type: 'string', description: 'mental_math: the fast mental shortcut; otherwise empty' },
          card_meaning: { type: 'string', description: 'flashcard only' },
          card_formula: { type: 'string', description: 'flashcard only' },
          card_interpretation: { type: 'string', description: 'flashcard only' },
          card_high: { type: 'string', description: 'flashcard only: what a high value signals' },
          card_low: { type: 'string', description: 'flashcard only: what a low value signals' },
          model_answer: { type: 'string', description: 'written only: model answer' },
          reasoning: { type: 'array', items: { type: 'string' }, description: 'step-by-step reasoning' },
          why_it_matters: { type: 'string' },
          interactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: { label: { type: 'string' }, dir: { type: 'string', enum: ['up', 'down', 'mixed'] } },
              required: ['label', 'dir'],
              additionalProperties: false,
            },
          },
          common_trap: { type: 'string' },
        },
        required: [
          'format', 'style', 'prompt', 'options', 'correct_index', 'numeric_answer', 'unit', 'tolerance', 'shortcut',
          'card_meaning', 'card_formula', 'card_interpretation', 'card_high', 'card_low', 'model_answer',
          'reasoning', 'why_it_matters', 'interactions', 'common_trap',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

export function generateMessages({ layer, topic, difficulty, format, count }) {
  const t = TOPIC_BY_ID[topic];
  const content = `Write ${count} new practice question(s) for my bank.
Layer ${layer} (${LAYER_BY_ID[layer]?.name}), topic: ${t?.name || topic}, difficulty: ${difficulty}${format ? `, format: ${format}` : ', mix the formats'}.

Difficulty guide: easy = define/identify/single-step; medium = interpret, link two concepts, two-step reasoning; hard = multi-step interactions, counter-intuitive cases, judgment with incomplete information, interview-style.
Rules:
- Every number must be correct. Double-check arithmetic and three-statement links (IS → CFS → BS, and the balance sheet must balance).
- mcq: exactly 4 options and every wrong option is a realistic misconception.
- mental_math: one numeric answer, a sensible tolerance, and the fast mental shortcut (rule of 72, approximations), not just the formula.
- Always give step-by-step reasoning, why it matters for a consultant or CFO, which ratios or lines move with it (interactions), and the most common student trap.
- Fill fields that don't apply to the format with empty strings, empty arrays or 0.`;
  return [{ role: 'user', content }];
}

let genCounter = 0;
export function toBankQuestion(g, { layer, topic, difficulty }) {
  genCounter += 1;
  const id = `AI-L${layer}-${topic}-${Date.now().toString(36)}${genCounter}`;
  const base = {
    id,
    layer: Number(layer),
    topic,
    difficulty,
    format: g.format,
    style: g.style,
    prompt: g.prompt,
    options: null,
    explanation: { reasoning: g.reasoning || [] },
    why_it_matters: g.why_it_matters || '',
    interactions: (g.interactions || []).filter((i) => i.label),
    common_trap: g.common_trap || '',
    needs_review: false,
    source: 'ai',
  };
  if (g.format === 'mcq') {
    const opts = (g.options || []).slice(0, 4);
    if (opts.length !== 4) return null;
    return { ...base, options: opts, answer: { index: Math.max(0, Math.min(3, g.correct_index | 0)) } };
  }
  if (g.format === 'mental_math') {
    return {
      ...base,
      answer: { value: Number(g.numeric_answer), unit: g.unit || '', tolerance: Math.abs(Number(g.tolerance)) || 0.5 },
      explanation: { reasoning: g.reasoning || [], shortcut: g.shortcut || '' },
    };
  }
  if (g.format === 'flashcard') {
    return {
      ...base,
      answer: { meaning: g.card_meaning, formula: g.card_formula, interpretation: g.card_interpretation, high_signals: g.card_high, low_signals: g.card_low },
    };
  }
  return { ...base, format: 'written', answer: { model_answer: g.model_answer, rubric: [] } };
}

// ---------- Challenge me ----------
export const CASE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    context: { type: 'string', description: '3-5 sentences describing the company and situation' },
    figures: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, value: { type: 'string' } },
        required: ['label', 'value'],
        additionalProperties: false,
      },
    },
    question: { type: 'string', description: 'What I must diagnose in one paragraph' },
  },
  required: ['title', 'context', 'figures', 'question'],
  additionalProperties: false,
};

export function caseMessages(focus) {
  return [
    {
      role: 'user',
      content: `Give me a mini-case to diagnose. A short, realistic company description plus 6-10 key figures (two years where relevant: margins, growth, working-capital days, leverage, cash flow, returns). The figures must be internally consistent. Hide the story in the numbers: there should be one main root cause and at least one red herring. ${
        focus ? `Focus area: ${focus}.` : 'Pick any sector.'
      } Ask me for a one-paragraph diagnosis: the business story, the root cause, and the value impact.`,
    },
  ];
}

export function caseAsQuestion(c) {
  const figures = c.figures.map((f) => `${f.label}: ${f.value}`).join('\n');
  return {
    id: 'challenge',
    layer: 5,
    topic: 'ratio_patterns',
    difficulty: 'hard',
    format: 'written',
    style: 'diagnosis',
    prompt: `${c.title}\n${c.context}\n\nKey figures:\n${figures}\n\n${c.question}`,
    answer: { model_answer: '', rubric: ['business story', 'root cause', 'evidence from the figures', 'value impact', 'what to check next'] },
    explanation: { reasoning: [] },
  };
}
