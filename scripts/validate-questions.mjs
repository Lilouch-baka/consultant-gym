// Validates every question file in src/data/questions/.
// Run with: npm run check
// - checks the schema of every question
// - re-computes mental-math answers that carry a "check" formula
// - prints the distribution by layer, format, difficulty and topic
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'src', 'data', 'questions');
const { LAYERS, FORMATS, STYLES, DIFFICULTIES } = await import('../src/data/curriculum.js');

const topicLayer = {};
for (const l of LAYERS) for (const t of l.topics) topicLayer[t.id] = l.id;

const errors = [];
const warnings = [];
const all = [];

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${file}: must contain a JSON array of questions`);
    continue;
  }
  for (const q of data) all.push({ q, file });
}

const seen = new Set();
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

for (const { q, file } of all) {
  const where = `${file} ${q.id || '(no id)'}`;
  const err = (m) => errors.push(`${where}: ${m}`);
  if (!nonEmpty(q.id)) err('missing id');
  if (seen.has(q.id)) err('duplicate id');
  seen.add(q.id);
  if (![1, 2, 3, 4, 5].includes(q.layer)) err('layer must be 1-5');
  if (!(q.topic in topicLayer)) err(`unknown topic "${q.topic}"`);
  else if (topicLayer[q.topic] !== q.layer) err(`topic "${q.topic}" belongs to layer ${topicLayer[q.topic]}`);
  if (!DIFFICULTIES.includes(q.difficulty)) err(`difficulty "${q.difficulty}"`);
  if (!FORMATS.includes(q.format)) err(`format "${q.format}"`);
  if (!STYLES.includes(q.style)) err(`style "${q.style}"`);
  if (!nonEmpty(q.prompt)) err('missing prompt');
  if (!q.answer || typeof q.answer !== 'object') err('missing answer');
  if (!q.explanation || !Array.isArray(q.explanation.reasoning)) err('explanation.reasoning must be an array');
  else if (q.format !== 'flashcard' && q.explanation.reasoning.length === 0) err('reasoning is empty');
  if (!nonEmpty(q.why_it_matters)) err('missing why_it_matters');
  if (!nonEmpty(q.common_trap)) err('missing common_trap');
  if (!Array.isArray(q.interactions)) err('interactions must be an array');
  else for (const i of q.interactions) if (!nonEmpty(i.label) || !['up', 'down', 'mixed'].includes(i.dir)) err(`bad interaction ${JSON.stringify(i)}`);

  if (q.format === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length !== 4) err('mcq needs exactly 4 options');
    else if (new Set(q.options).size !== 4) err('mcq options must be distinct');
    if (!Number.isInteger(q.answer?.index) || q.answer.index < 0 || q.answer.index > 3) err('mcq answer.index must be 0-3');
  }
  if (q.format === 'flashcard') {
    if (!nonEmpty(q.answer?.meaning)) err('flashcard needs answer.meaning');
    if (!nonEmpty(q.answer?.high_signals) || !nonEmpty(q.answer?.low_signals)) warnings.push(`${where}: flashcard without high/low signals`);
  }
  if (q.format === 'written') {
    if (!nonEmpty(q.answer?.model_answer)) err('written needs answer.model_answer');
  }
  if (q.format === 'mental_math') {
    const a = q.answer || {};
    if (typeof a.value !== 'number' || !Number.isFinite(a.value)) err('mental_math needs numeric answer.value');
    if (typeof a.tolerance !== 'number' || a.tolerance < 0) err('mental_math needs answer.tolerance >= 0');
    if (!nonEmpty(q.explanation?.shortcut)) err('mental_math needs explanation.shortcut');
    if (nonEmpty(q.check)) {
      let v;
      try {
        // eslint-disable-next-line no-new-func
        v = Function('Math', `"use strict"; return (${q.check});`)(Math);
      } catch (e) {
        err(`check formula failed: ${e.message}`);
      }
      if (typeof v === 'number') {
        const slack = Math.max(0.011, (a.tolerance || 0) * 0.25);
        if (Math.abs(v - a.value) > slack) err(`check formula gives ${v.toFixed(4)} but answer.value is ${a.value}`);
      }
    } else {
      warnings.push(`${where}: mental_math without a "check" formula`);
    }
  }
  if (q.needs_review) warnings.push(`${where}: flagged needs_review`);
}

// Distribution report
const count = (key) => all.reduce((m, { q }) => ((m[q[key]] = (m[q[key]] || 0) + 1), m), {});
console.log(`\nQuestions: ${all.length}`);
console.log('By layer:     ', count('layer'));
console.log('By format:    ', count('format'));
const diff = count('difficulty');
console.log(
  'By difficulty:',
  Object.fromEntries(Object.entries(diff).map(([k, v]) => [k, `${v} (${Math.round((v / all.length) * 100)}%)`])),
);
console.log('By style:     ', count('style'));
const byTopic = count('topic');
const empty = Object.keys(topicLayer).filter((t) => !byTopic[t]);
if (empty.length) warnings.push(`Topics with no questions: ${empty.join(', ')}`);
console.log('By topic:     ', byTopic);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  x ' + e);
  process.exit(1);
}
console.log('\nAll questions valid.');
