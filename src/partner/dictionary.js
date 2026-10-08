// Ratio dictionary for the Translate step's autocomplete.
// Built from every key_ratio in the playbook (whole ratios and their measures) plus the app's standard measures.

const BASE_MEASURES = [
  'Revenue', 'Revenue growth', 'Volume growth', 'Price growth', 'COGS', 'Materials', 'Gross profit', 'Gross margin', 'Opex', 'Staff costs', 'Selling & distribution costs',
  'EBITDA', 'EBITDA margin', 'EBIT', 'EBIT margin', 'NOPAT', 'NOPAT margin', 'NOPAT growth', 'Net income', 'Net margin', 'EPS', 'Depreciation', 'D&A',
  'Total assets', 'Invested capital', 'Capital employed', 'Net PPE', 'PPE', 'Right-of-use assets', 'CWIP', 'Goodwill', 'Working capital', 'Receivables', 'Inventory', 'Payables',
  'DSO', 'DIO', 'DPO', 'Cash conversion cycle', 'Capital turnover', 'Asset turnover', 'Fixed asset turnover', 'Capex', 'Maintenance capex', 'Growth capex',
  'ROC', 'ROIC', 'ROE', 'ROA', 'ROCE', 'WACC', 'Cost of equity', 'Cost of debt', 'Equity', 'Total debt', 'Net debt', 'Lease liabilities', 'Cash',
  'Interest expense', 'Interest cover', 'Net debt ÷ EBITDA', 'Debt ÷ equity', 'CFO', 'Free cash flow', 'FCF ÷ net income', 'Dividends', 'Payout ratio',
  'Reinvestment rate', 'Tax rate', 'Effective tax rate', 'Market share', 'Segment revenue', 'Segment EBIT',
];

const OPS = /\s*(?:÷|\/|−|-(?=\s)|×|\bvs\b)\s*/;

export function buildRatioDictionary(playbook) {
  const set = new Map();
  const add = (s) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length >= 2 && t.length <= 70 && !set.has(t.toLowerCase())) set.set(t.toLowerCase(), t);
  };
  BASE_MEASURES.forEach(add);
  for (const q of playbook.questions) {
    for (const kr of q.key_ratio) {
      const formula = kr.includes('=') ? kr.split('=').slice(1).join('=') : kr;
      if (kr.includes('=')) add(kr.split('=')[0]);
      add(formula);
      formula.split(OPS).forEach((part) => add(part.replace(/[()^]/g, ' ')));
    }
  }
  return [...set.values()];
}

export function suggest(dictionary, text, limit = 6) {
  const t = text.trim().toLowerCase();
  if (!t) return [];
  const starts = [];
  const contains = [];
  for (const d of dictionary) {
    const l = d.toLowerCase();
    if (l === t) continue;
    if (l.startsWith(t)) starts.push(d);
    else if (l.includes(t)) contains.push(d);
  }
  return [...starts.sort((a, b) => a.length - b.length), ...contains.sort((a, b) => a.length - b.length)].slice(0, limit);
}
