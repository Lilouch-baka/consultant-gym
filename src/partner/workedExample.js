// Turns a playbook worked example into a small table when it compares two companies.
// Returns { caption, columns, rows } for a label/value table, { caption, rows } for a company/text
// table, or null when the text should stay as a paragraph.
import { companiesFrom } from './scoring.js';

const PAIR = /([A-Za-z][A-Za-z&/() ]{1,30}?)\s+([+−-]?~?\d[\d.,]*\s?(?:%|×|x\b|m\b|bn\b|pts\b|days\b)?)/g;

// Words that are not real metric labels (units, currencies, connectors).
const NOT_LABELS = new Set(['vs', 'per', 'sar', 'usd', 'eur', 'from', 'to', 'in', 'of', 'and', 'by', 'at', 'about', 'around', 'c', 'fy', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4']);

function pairs(text) {
  const out = [];
  for (const m of text.matchAll(PAIR)) {
    const label = m[1].trim().toLowerCase();
    if (NOT_LABELS.has(label) || label.length < 3) return [];
    out.push({ label, value: m[2].trim() });
  }
  return out;
}

export function parseWorkedExample(text, companyMode) {
  const firms = companiesFrom(companyMode);
  if (firms.length < 2 || !text) return null;
  const pos = firms.map((f) => text.toLowerCase().indexOf(f.toLowerCase()));
  if (pos.some((p) => p < 0)) return null;

  const order = firms.map((f, i) => ({ f, p: pos[i] })).sort((a, b) => a.p - b.p);
  const caption = text.slice(0, order[0].p).replace(/[:\s]+$/, '').trim();
  const rows = order.map((o, i) => {
    const end = i + 1 < order.length ? order[i + 1].p : text.length;
    const body = text
      .slice(o.p + o.f.length, end)
      .replace(/^[\s:,]+/, '')
      .replace(/[\s.;]+$/, '')
      .trim();
    return { name: o.f, text: body };
  });

  // Same labels in the same order for both companies -> a proper column table.
  const parsed = rows.map((r) => pairs(r.text));
  const labels = parsed[0].map((p) => p.label);
  const same = labels.length >= 1 && labels.length <= 4 && parsed.every((ps) => ps.length === labels.length && ps.every((p, i) => p.label === labels[i]));
  if (same) {
    return { caption, columns: labels, rows: rows.map((r, i) => ({ name: r.name, values: parsed[i].map((p) => p.value) })) };
  }
  return { caption, rows };
}

export function relatedIds(related) {
  return [...new Set((related || '').match(/\b(?:BM|OP|INV|FIN)-\d{2}\b/g) || [])];
}
