// Journal-entry checking and T-account helpers (all offline).

export function parseAmount(s) {
  if (s === null || s === undefined) return 0;
  const n = Number(String(s).replace(/[\s,]/g, '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function totals(lines) {
  let dr = 0;
  let cr = 0;
  for (const l of lines) {
    dr += parseAmount(l.debit);
    cr += parseAmount(l.credit);
  }
  return { dr, cr, balanced: Math.abs(dr - cr) < 0.005 && dr > 0 };
}

// Net debit (+) / credit (−) per account.
export function netByAccount(lines) {
  const m = {};
  for (const l of lines) {
    if (!l.account) continue;
    m[l.account] = (m[l.account] || 0) + parseAmount(l.debit) - parseAmount(l.credit);
  }
  for (const k of Object.keys(m)) if (Math.abs(m[k]) < 0.005) delete m[k];
  return m;
}

// Compare the user's entry with the expected one, regardless of line order or how lines are split.
export function checkEntry(userLines, expectedLines) {
  const u = netByAccount(userLines);
  const e = netByAccount(expectedLines);
  const accounts = new Set([...Object.keys(u), ...Object.keys(e)]);
  const issues = [];
  for (const a of accounts) {
    const du = u[a] || 0;
    const de = e[a] || 0;
    if (Math.abs(du - de) > 0.5) {
      if (!de) issues.push({ account: a, kind: 'extra' });
      else if (!du) issues.push({ account: a, kind: 'missing' });
      else if (Math.sign(du) !== Math.sign(de)) issues.push({ account: a, kind: 'side' });
      else issues.push({ account: a, kind: 'amount' });
    }
  }
  return { correct: issues.length === 0, issues };
}

export function tAccounts(lines) {
  const m = {};
  for (const l of lines) {
    if (!l.account) continue;
    const t = (m[l.account] ||= { dr: [], cr: [] });
    if (parseAmount(l.debit)) t.dr.push(parseAmount(l.debit));
    if (parseAmount(l.credit)) t.cr.push(parseAmount(l.credit));
  }
  return Object.entries(m).map(([account, t]) => ({ account, ...t, balance: t.dr.reduce((a, b) => a + b, 0) - t.cr.reduce((a, b) => a + b, 0) }));
}

export function fmt(n) {
  const v = Math.round(Math.abs(n) * 100) / 100;
  return v.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export function signed(n) {
  if (!n) return '0';
  return `${n > 0 ? '+' : '−'}${fmt(n)}`;
}
