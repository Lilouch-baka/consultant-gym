// The three tracks. Each track's content loads lazily as its own chunk.
// Every study item, whatever the track, has: id (unique across tracks), track, format, prompt.
// Spaced repetition is keyed by id, so fundamentals ids are unchanged (history preserved)
// and the new tracks use prefixes: "P:" for partner, "A:" for accounting.
export { loadFundamentals } from './questions.js';

export const TRACKS = [
  { id: 'fundamentals', name: 'Finance fundamentals', blurb: 'Ratios · 3 statements · returns · ratio tree' },
  { id: 'accounting', name: 'Financial accounting', blurb: 'Chapter by chapter · journal entries · concepts' },
  { id: 'partner', name: 'Partner analysis', blurb: '70 partner questions · four lenses' },
];

export const TRACK_BY_ID = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

// Partner lenses, in the playbook's order.
export const LENSES = [
  { id: 'BM', name: 'Business model' },
  { id: 'OP', name: 'Operating' },
  { id: 'INV', name: 'Investment' },
  { id: 'FIN', name: 'Financing' },
];
export const LENS_BY_NAME = Object.fromEntries(LENSES.map((l) => [l.name, l.id]));
export const LENS_BY_ID = Object.fromEntries(LENSES.map((l) => [l.id, l]));

export const DEFAULT_COMPANY_MODE = 'Almarai vs SADAFCO · FY2025';

// playbook.json is used exactly as provided; this only wraps each question for the engine.
export async function loadPartner() {
  const playbook = (await import('./playbook.json')).default;
  const items = playbook.questions.map((q) => ({
    id: `P:${q.id}`,
    pid: q.id,
    track: 'partner',
    format: 'partner',
    difficulty: 'hard',
    lens: LENS_BY_NAME[q.layer],
    theme: q.theme,
    prompt: q.question,
    q,
  }));
  return { playbook, items };
}

// Financial accounting: one JSON file per chapter in ./accounting/, merged in chapter order.
const accountingFiles = import.meta.glob('./accounting/*.json', { import: 'default' });

export async function loadAccounting() {
  const keys = Object.keys(accountingFiles).sort();
  const parts = await Promise.all(keys.map((k) => accountingFiles[k]()));
  return parts
    .flat()
    .map((q) => ({ track: 'accounting', topic: `ch${String(q.chapter).padStart(2, '0')}`, ...q }))
    .sort((a, b) => a.chapter - b.chapter);
}
