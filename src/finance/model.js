// Sample company + ratio engine.
// Every ratio is computed from ONE set of statements. Nothing is typed in separately.
// Equity is derived as the balancing item (assets - liabilities).

export const DEFAULT_COMPANY = {
  name: 'Northwind Components',
  currency: '€m',
  // Income statement
  revenue: 1000,
  cogs: 640,
  opex: 200, // SG&A and other cash operating costs, excluding D&A
  da: 40,
  interestRate: 6, // % on debt + lease liabilities
  taxRate: 25, // %
  // Balance sheet (year end)
  cash: 100,
  receivables: 164,
  inventory: 123,
  ppe: 330,
  rouAssets: 40, // right-of-use assets (IFRS 16 leases)
  payables: 79,
  debt: 220,
  leaseLiabilities: 40,
};

export const COMPANY_FIELDS = [
  { key: 'revenue', label: 'Revenue', group: 'Income statement' },
  { key: 'cogs', label: 'Cost of goods sold', group: 'Income statement' },
  { key: 'opex', label: 'Operating costs (excl. D&A)', group: 'Income statement' },
  { key: 'da', label: 'Depreciation & amortisation', group: 'Income statement' },
  { key: 'interestRate', label: 'Interest rate on debt and leases (%)', group: 'Income statement' },
  { key: 'taxRate', label: 'Tax rate (%)', group: 'Income statement' },
  { key: 'cash', label: 'Cash', group: 'Balance sheet' },
  { key: 'receivables', label: 'Trade receivables', group: 'Balance sheet' },
  { key: 'inventory', label: 'Inventory', group: 'Balance sheet' },
  { key: 'ppe', label: 'PP&E (net)', group: 'Balance sheet' },
  { key: 'rouAssets', label: 'Right-of-use assets', group: 'Balance sheet' },
  { key: 'payables', label: 'Trade payables', group: 'Balance sheet' },
  { key: 'debt', label: 'Financial debt', group: 'Balance sheet' },
  { key: 'leaseLiabilities', label: 'Lease liabilities', group: 'Balance sheet' },
];

// Build the full statements from the input lines.
export function buildStatements(c) {
  const grossProfit = c.revenue - c.cogs;
  const ebitda = grossProfit - c.opex;
  const ebit = ebitda - c.da;
  const interest = ((c.debt + c.leaseLiabilities) * c.interestRate) / 100;
  const ebt = ebit - interest;
  const tax = ebt > 0 ? (ebt * c.taxRate) / 100 : 0;
  const netIncome = ebt - tax;
  const totalAssets = c.cash + c.receivables + c.inventory + c.ppe + c.rouAssets;
  const totalLiabilities = c.payables + c.debt + c.leaseLiabilities;
  const equity = totalAssets - totalLiabilities;
  return { ...c, grossProfit, ebitda, ebit, interest, ebt, tax, netIncome, totalAssets, totalLiabilities, equity };
}

export function computeRatios(s) {
  const r = {};
  r.grossMargin = s.grossProfit / s.revenue;
  r.opexToSales = (s.opex + s.da) / s.revenue;
  r.ebitdaMargin = s.ebitda / s.revenue;
  r.ebitMargin = s.ebit / s.revenue;
  r.taxInterestBurden = s.netIncome / s.ebit;
  r.interestBurden = s.ebt / s.ebit;
  r.taxBurden = s.ebt !== 0 ? s.netIncome / s.ebt : 0;
  r.netMargin = s.netIncome / s.revenue;
  r.assetTurnover = s.revenue / s.totalAssets;
  r.equityMultiplier = s.totalAssets / s.equity;
  r.roe = s.netIncome / s.equity;
  r.roa = s.netIncome / s.totalAssets;
  r.dso = (s.receivables / s.revenue) * 365;
  r.dio = (s.inventory / s.cogs) * 365;
  r.dpo = (s.payables / s.cogs) * 365;
  r.ccc = r.dso + r.dio - r.dpo;
  r.fixedAssetTurnover = s.revenue / s.ppe;
  r.fixedAssetIntensity = s.ppe / s.revenue;
  r.debtToEquity = (s.debt + s.leaseLiabilities) / s.equity;
  r.netDebt = s.debt + s.leaseLiabilities - s.cash;
  r.netDebtToEbitda = r.netDebt / s.ebitda;
  r.interestCover = s.interest > 0 ? s.ebit / s.interest : Infinity;
  r.currentRatio = (s.cash + s.receivables + s.inventory) / s.payables;
  r.quickRatio = (s.cash + s.receivables) / s.payables;
  r.nwc = s.receivables + s.inventory - s.payables;
  r.investedCapital = r.nwc + s.ppe + s.rouAssets;
  r.cashTaxRate = s.taxRate / 100;
  r.nopat = s.ebit * (1 - r.cashTaxRate);
  r.nopatMargin = r.nopat / s.revenue;
  r.icTurnover = s.revenue / r.investedCapital;
  r.roic = r.nopat / r.investedCapital;
  r.roce = s.ebit / (s.totalAssets - s.payables);
  r.buyback = s.buyback || 0;
  r.leaseLiabilities = s.leaseLiabilities;
  r.equityRaise = s.equityRaise || 0;
  return r;
}

export const NO_SCENARIO = {
  gm: 0, // gross margin, percentage points
  opex: 0, // opex/sales, percentage points
  taxRate: 0, // percentage points
  dso: 0, // days
  dio: 0, // days
  dpo: 0, // days
  fat: 0, // fixed asset turnover, x
  fai: 0, // fixed asset intensity (PP&E / sales), percentage points
  buyback: 0, // currency, funded with debt
  equityRaise: 0, // currency, used to repay debt
  newLeases: 0, // currency, new lease liabilities + right-of-use assets
};

export function isBaseScenario(sc) {
  return Object.keys(NO_SCENARIO).every((k) => !sc[k]);
}

// Apply what-if changes to the base company and rebuild consistent statements.
// Rules (so the balance sheet always balances):
//  - Revenue is held constant.
//  - Working capital lines are rebuilt from days; PP&E from turnover / intensity.
//  - Equity is held at its base value, except buybacks (-) and equity raises (+).
//  - Debt is the balancing item: any extra capital need is funded with debt
//    (and interest is recalculated on the new debt). If debt would go below zero,
//    the surplus sits in cash.
export function applyScenario(company, sc) {
  const base = buildStatements(company);
  if (isBaseScenario(sc)) return base;
  const br = computeRatios(base);
  const c = { ...company };

  const gm = br.grossMargin + sc.gm / 100;
  c.cogs = c.revenue * (1 - gm);
  c.opex = c.revenue * (br.opexToSales + sc.opex / 100) - c.da;
  c.taxRate = company.taxRate + sc.taxRate;

  c.receivables = (c.revenue * (br.dso + sc.dso)) / 365;
  c.inventory = (c.cogs * (br.dio + sc.dio)) / 365;
  c.payables = (c.cogs * (br.dpo + sc.dpo)) / 365;

  if (sc.fai) c.ppe = c.revenue * (br.fixedAssetIntensity + sc.fai / 100);
  else c.ppe = c.revenue / (br.fixedAssetTurnover + sc.fat);

  c.rouAssets = company.rouAssets + sc.newLeases;
  c.leaseLiabilities = company.leaseLiabilities + sc.newLeases;

  const equity = base.equity - sc.buyback + sc.equityRaise;
  const assetsExCash = c.receivables + c.inventory + c.ppe + c.rouAssets;
  let debt = assetsExCash + company.cash - c.payables - c.leaseLiabilities - equity;
  c.cash = company.cash;
  if (debt < 0) {
    c.cash = company.cash - debt;
    debt = 0;
  }
  c.debt = debt;
  const s = buildStatements(c);
  s.buyback = sc.buyback;
  s.equityRaise = sc.equityRaise;
  return s;
}

export function sanitizeCompany(input) {
  const out = { ...DEFAULT_COMPANY };
  for (const f of COMPANY_FIELDS) {
    const v = Number(input?.[f.key]);
    if (Number.isFinite(v)) out[f.key] = v;
  }
  if (typeof input?.name === 'string') out.name = input.name;
  if (typeof input?.currency === 'string') out.currency = input.currency;
  return out;
}

export function validateCompany(c) {
  const s = buildStatements(c);
  const problems = [];
  if (c.revenue <= 0) problems.push('Revenue must be positive.');
  if (c.cogs <= 0 || c.cogs >= c.revenue) problems.push('COGS must be positive and below revenue.');
  if (s.ebit <= 0) problems.push('EBIT must be positive for the trees to make sense.');
  if (s.equity <= 0) problems.push('Equity (assets minus liabilities) must be positive.');
  if (c.ppe <= 0) problems.push('PP&E must be positive.');
  if (c.payables <= 0) problems.push('Payables must be positive.');
  return problems;
}
