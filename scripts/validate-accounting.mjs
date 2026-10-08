// Validates the Financial accounting track: src/data/accounting/*.json
// - schema (same as the fundamentals bank, plus chapter and book_ref)
// - journal entries: debits = credits, every account exists in the chart of accounts, effects present
// - mental math answers re-computed from their "check" formula
// - checks the partner playbook is intact (70 questions)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'src', 'data', 'accounting');
const { ACCOUNT_BY_NAME } = await import('../src/accounting/chartOfAccounts.js');
const { totals } = await import('../src/accounting/journal.js');
const { BOOKS, CHAPTERS } = await import('../src/accounting/chapters.js');

const FORMATS = ['mcq', 'flashcard', 'written', 'mental_math', 'journal_entry'];
const STYLES = ['definition', 'logical', 'rhetorical', 'walkthrough', 'calculation', 'diagnosis'];
const DIFFS = ['easy', 'medium', 'hard'];
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

const errors = [];
const warnings = [];
const all = [];

if (existsSync(dir)) {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      if (!Array.isArray(data)) errors.push(`${file}: must be a JSON array`);
      else for (const q of data) all.push({ q, file });
    } catch (e) {
      errors.push(`${file}: invalid JSON (${e.message})`);
    }
  }
}

const seen = new Set();
for (const { q, file } of all) {
  const err = (m) => errors.push(`${file} ${q.id || '(no id)'}: ${m}`);
  if (!nonEmpty(q.id) || !q.id.startsWith('A:')) err('id must start with "A:"');
  if (seen.has(q.id)) err('duplicate id');
  seen.add(q.id);
  if (!CHAPTERS.some((c) => c.n === q.chapter)) err(`unknown chapter ${q.chapter}`);
  if (!DIFFS.includes(q.difficulty)) err('difficulty');
  if (!FORMATS.includes(q.format)) err(`format "${q.format}"`);
  if (!STYLES.includes(q.style)) err(`style "${q.style}"`);
  if (!nonEmpty(q.prompt)) err('prompt');
  if (!nonEmpty(q.why_it_matters)) err('why_it_matters (analyst lens)');
  if (!nonEmpty(q.common_trap)) err('common_trap');
  if (!q.explanation || !Array.isArray(q.explanation.reasoning)) err('explanation.reasoning');
  if (!Array.isArray(q.interactions)) err('interactions');
  const br = q.book_ref;
  if (!br || !BOOKS[br.book] || br.chapter !== q.chapter || !nonEmpty(br.section) || !nonEmpty(br.page)) err('book_ref {book, chapter, section, page}');
  if (q.ifrs_gaap && (!nonEmpty(q.ifrs_gaap.ifrs) || !nonEmpty(q.ifrs_gaap.us_gaap))) err('ifrs_gaap needs ifrs and us_gaap');

  if (q.format === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options).size !== 4) err('mcq needs 4 distinct options');
    if (!Number.isInteger(q.answer?.index) || q.answer.index < 0 || q.answer.index > 3) err('mcq answer.index');
  }
  if (q.format === 'flashcard' && !nonEmpty(q.answer?.meaning)) err('flashcard meaning');
  if (q.format === 'written' && !nonEmpty(q.answer?.model_answer)) err('written model_answer');
  if (q.format === 'mental_math') {
    if (typeof q.answer?.value !== 'number') err('mental_math value');
    if (!nonEmpty(q.explanation?.shortcut)) err('mental_math shortcut');
    if (nonEmpty(q.check)) {
      // eslint-disable-next-line no-new-func
      const v = Function('Math', `"use strict"; return (${q.check});`)(Math);
      if (Math.abs(v - q.answer.value) > Math.max(0.011, (q.answer.tolerance || 0) * 0.25)) err(`check gives ${v} but value is ${q.answer.value}`);
    } else warnings.push(`${q.id}: mental_math without check`);
  }
  if (q.format === 'journal_entry') {
    const lines = q.answer?.lines;
    if (!Array.isArray(lines) || lines.length < 2) err('journal_entry needs answer.lines (2+)');
    else {
      for (const l of lines) {
        if (!ACCOUNT_BY_NAME[l.account]) err(`unknown account "${l.account}"`);
        if (!!l.debit === !!l.credit) err(`line "${l.account}" needs exactly one of debit/credit`);
      }
      const t = totals(lines);
      if (!t.balanced) err(`debits ${t.dr} ≠ credits ${t.cr}`);
    }
    const fx = q.answer?.effects;
    if (!fx || !Array.isArray(fx.IS) || !Array.isArray(fx.BS) || !Array.isArray(fx.CFS)) err('journal_entry needs answer.effects {IS, BS, CFS}');
    else {
      // Balance sheet effects must balance: assets = liabilities + equity changes.
      const a = fx.BS.filter((e) => e[2] === 'A').reduce((s, e) => s + e[1], 0);
      const le = fx.BS.filter((e) => e[2] === 'L' || e[2] === 'E').reduce((s, e) => s + e[1], 0);
      if (fx.BS.some((e) => !['A', 'L', 'E'].includes(e[2]))) err('BS effects need a third element A, L or E');
      else if (Math.abs(a - le) > 0.5) err(`BS effects do not balance: assets ${a} vs L+E ${le}`);
    }
  }
}

// Partner playbook intact.
const pb = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'playbook.json'), 'utf8'));
if (!Array.isArray(pb.questions) || pb.questions.length !== 70) errors.push(`playbook.json should hold 70 questions, found ${pb.questions?.length}`);

const by = (k) => all.reduce((m, { q }) => ((m[q[k]] = (m[q[k]] || 0) + 1), m), {});
console.log(`\nAccounting items: ${all.length}`);
console.log('By chapter:   ', by('chapter'));
console.log('By format:    ', by('format'));
console.log('By difficulty:', by('difficulty'));
console.log(`Playbook: ${pb.questions.length} partner questions`);
if (warnings.length) console.log(`${warnings.length} warning(s):\n  - ` + warnings.join('\n  - '));
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error('  x ' + e);
  process.exit(1);
}
console.log('All accounting items valid.');
