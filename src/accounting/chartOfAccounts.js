// Chart of accounts for the journal-entry builder. IFRS wording first, US GAAP names as aliases (searchable).
// type: asset | contra_asset | liability | equity | contra_equity | revenue | expense | gain | loss | oci
// cash: true marks cash accounts (they drive the cash-flow card).
export const ACCOUNTS = [
  // ----- Assets
  { name: 'Cash', type: 'asset', cash: true, aliases: ['Bank', 'Cash and cash equivalents'] },
  { name: 'Petty cash', type: 'asset', cash: true },
  { name: 'Trade receivables', type: 'asset', aliases: ['Accounts receivable', 'Debtors'] },
  { name: 'Allowance for doubtful accounts', type: 'contra_asset', aliases: ['Loss allowance', 'Allowance for expected credit losses', 'Provision for doubtful debts'] },
  { name: 'Notes receivable', type: 'asset' },
  { name: 'Interest receivable', type: 'asset' },
  { name: 'Contract asset', type: 'asset', aliases: ['Unbilled revenue', 'Accrued revenue'] },
  { name: 'Inventory', type: 'asset', aliases: ['Merchandise inventory', 'Stock'] },
  { name: 'Allowance to reduce inventory to NRV', type: 'contra_asset', aliases: ['Inventory write-down allowance'] },
  { name: 'Prepaid expenses', type: 'asset', aliases: ['Prepaid rent', 'Prepaid insurance', 'Prepayments'] },
  { name: 'Supplies', type: 'asset' },
  { name: 'Land', type: 'asset' },
  { name: 'Buildings', type: 'asset' },
  { name: 'Equipment', type: 'asset', aliases: ['Machinery', 'Plant and equipment'] },
  { name: 'Vehicles', type: 'asset' },
  { name: 'Construction in progress', type: 'asset', aliases: ['CWIP', 'Assets under construction'] },
  { name: 'Accumulated depreciation', type: 'contra_asset' },
  { name: 'Right-of-use asset', type: 'asset', aliases: ['ROU asset', 'Lease asset'] },
  { name: 'Investment property', type: 'asset' },
  { name: 'Intangible assets', type: 'asset', aliases: ['Patents', 'Licences', 'Trademarks', 'Software'] },
  { name: 'Development costs (intangible)', type: 'asset', aliases: ['Capitalised development costs'] },
  { name: 'Accumulated amortisation', type: 'contra_asset', aliases: ['Accumulated amortization'] },
  { name: 'Goodwill', type: 'asset' },
  { name: 'Investments at amortised cost', type: 'asset', aliases: ['Held-to-maturity securities', 'Debt investments'] },
  { name: 'Investments at FVOCI', type: 'asset', aliases: ['Available-for-sale securities'] },
  { name: 'Investments at FVTPL', type: 'asset', aliases: ['Trading securities'] },
  { name: 'Investment in associate', type: 'asset', aliases: ['Equity-method investment'] },
  { name: 'Deferred tax asset', type: 'asset' },
  { name: 'Assets held for sale', type: 'asset' },
  { name: 'Biological assets', type: 'asset' },
  { name: 'Derivative asset', type: 'asset' },
  { name: 'Net defined benefit asset', type: 'asset' },

  // ----- Liabilities
  { name: 'Trade payables', type: 'liability', aliases: ['Accounts payable', 'Creditors'] },
  { name: 'Notes payable', type: 'liability' },
  { name: 'Accrued expenses', type: 'liability', aliases: ['Accrued liabilities', 'Accruals'] },
  { name: 'Salaries and wages payable', type: 'liability', aliases: ['Wages payable'] },
  { name: 'Interest payable', type: 'liability' },
  { name: 'Dividends payable', type: 'liability' },
  { name: 'Unearned revenue', type: 'liability', aliases: ['Contract liability', 'Deferred revenue', 'Customer advances'] },
  { name: 'Sales tax payable', type: 'liability', aliases: ['VAT payable'] },
  { name: 'Income tax payable', type: 'liability', aliases: ['Current tax payable'] },
  { name: 'Payroll taxes payable', type: 'liability', aliases: ['Withholding taxes payable'] },
  { name: 'Refund liability', type: 'liability' },
  { name: 'Warranty provision', type: 'liability', aliases: ['Warranty liability'] },
  { name: 'Provision', type: 'liability', aliases: ['Litigation provision', 'Restructuring provision', 'Decommissioning provision', 'Asset retirement obligation'] },
  { name: 'Loans payable', type: 'liability', aliases: ['Bank loan', 'Borrowings'] },
  { name: 'Bonds payable', type: 'liability', aliases: ['Debentures'] },
  { name: 'Discount on bonds payable', type: 'contra_liability' },
  { name: 'Premium on bonds payable', type: 'liability' },
  { name: 'Lease liability', type: 'liability' },
  { name: 'Deferred tax liability', type: 'liability' },
  { name: 'Net defined benefit liability', type: 'liability', aliases: ['Pension liability'] },
  { name: 'Derivative liability', type: 'liability' },

  // ----- Equity
  { name: 'Share capital', type: 'equity', aliases: ['Common stock', 'Ordinary shares'] },
  { name: 'Preference share capital', type: 'equity', aliases: ['Preferred stock'] },
  { name: 'Share premium', type: 'equity', aliases: ['Additional paid-in capital', 'Paid-in capital in excess of par'] },
  { name: 'Retained earnings', type: 'equity' },
  { name: 'Treasury shares', type: 'contra_equity', aliases: ['Treasury stock', 'Own shares'] },
  { name: 'Revaluation surplus', type: 'oci', aliases: ['Revaluation reserve'] },
  { name: 'Other comprehensive income reserve', type: 'oci', aliases: ['Accumulated other comprehensive income', 'AOCI', 'FVOCI reserve'] },
  { name: 'Share-based payment reserve', type: 'equity', aliases: ['Paid-in capital — stock options', 'Share option reserve'] },
  { name: 'Equity component of convertible bond', type: 'equity', aliases: ['Paid-in capital — conversion option'] },
  { name: 'Dividends declared', type: 'contra_equity', aliases: ['Dividends'] },

  // ----- Income
  { name: 'Sales revenue', type: 'revenue', aliases: ['Revenue', 'Sales'] },
  { name: 'Service revenue', type: 'revenue', aliases: ['Fee revenue'] },
  { name: 'Sales returns and allowances', type: 'contra_revenue' },
  { name: 'Sales discounts', type: 'contra_revenue' },
  { name: 'Interest income', type: 'revenue', aliases: ['Interest revenue', 'Finance income'] },
  { name: 'Dividend income', type: 'revenue', aliases: ['Dividend revenue'] },
  { name: 'Rent income', type: 'revenue', aliases: ['Rent revenue', 'Lease income'] },
  { name: 'Share of profit of associate', type: 'revenue', aliases: ['Equity-method income'] },
  { name: 'Gain on disposal', type: 'gain', aliases: ['Gain on sale of equipment', 'Gain on sale of assets'] },
  { name: 'Gain on fair value', type: 'gain', aliases: ['Unrealised holding gain', 'Fair value gain'] },
  { name: 'Gain on debt extinguishment', type: 'gain' },
  { name: 'Foreign exchange gain', type: 'gain' },

  // ----- Expenses and losses
  { name: 'Cost of sales', type: 'expense', aliases: ['Cost of goods sold', 'COGS'] },
  { name: 'Purchases', type: 'expense' },
  { name: 'Salaries and wages expense', type: 'expense', aliases: ['Wages expense', 'Staff costs'] },
  { name: 'Rent expense', type: 'expense' },
  { name: 'Insurance expense', type: 'expense' },
  { name: 'Supplies expense', type: 'expense' },
  { name: 'Utilities expense', type: 'expense' },
  { name: 'Advertising expense', type: 'expense' },
  { name: 'Depreciation expense', type: 'expense' },
  { name: 'Amortisation expense', type: 'expense', aliases: ['Amortization expense'] },
  { name: 'Impairment loss', type: 'loss', aliases: ['Loss on impairment'] },
  { name: 'Bad debt expense', type: 'expense', aliases: ['Impairment of receivables', 'Expected credit loss expense'] },
  { name: 'Inventory write-down', type: 'expense', aliases: ['Loss due to decline of inventory to NRV'] },
  { name: 'Warranty expense', type: 'expense' },
  { name: 'Research expense', type: 'expense', aliases: ['Research and development expense'] },
  { name: 'Interest expense', type: 'expense', aliases: ['Finance costs'] },
  { name: 'Income tax expense', type: 'expense', aliases: ['Tax expense'] },
  { name: 'Payroll tax expense', type: 'expense' },
  { name: 'Pension expense', type: 'expense', aliases: ['Employee benefit expense', 'Service cost'] },
  { name: 'Share-based payment expense', type: 'expense', aliases: ['Compensation expense'] },
  { name: 'Litigation expense', type: 'expense', aliases: ['Legal expense'] },
  { name: 'Restructuring expense', type: 'expense' },
  { name: 'Loss on disposal', type: 'loss', aliases: ['Loss on sale of equipment', 'Loss on sale of assets'] },
  { name: 'Loss on fair value', type: 'loss', aliases: ['Unrealised holding loss', 'Fair value loss'] },
  { name: 'Loss on debt extinguishment', type: 'loss' },
  { name: 'Foreign exchange loss', type: 'loss' },
  { name: 'Lease expense', type: 'expense', aliases: ['Short-term lease expense'] },
];

export const ACCOUNT_BY_NAME = Object.fromEntries(ACCOUNTS.map((a) => [a.name, a]));

// Which statement an account sits on.
export function statementOf(name) {
  const a = ACCOUNT_BY_NAME[name];
  if (!a) return null;
  if (['revenue', 'contra_revenue', 'expense', 'gain', 'loss'].includes(a.type)) return 'IS';
  return 'BS';
}

export function searchAccounts(text, limit = 8) {
  const t = text.trim().toLowerCase();
  if (!t) return ACCOUNTS.slice(0, limit).map((a) => a.name);
  const hits = [];
  for (const a of ACCOUNTS) {
    const names = [a.name, ...(a.aliases || [])];
    const best = names.find((n) => n.toLowerCase().startsWith(t)) ? 0 : names.find((n) => n.toLowerCase().includes(t)) ? 1 : -1;
    if (best >= 0) hits.push({ name: a.name, best, alias: names.find((n) => n.toLowerCase().includes(t) && n !== a.name) });
  }
  return hits
    .sort((x, y) => x.best - y.best || x.name.length - y.name.length)
    .slice(0, limit)
    .map((h) => h.name);
}

export function aliasHint(name, text) {
  const a = ACCOUNT_BY_NAME[name];
  const t = text.trim().toLowerCase();
  if (!a || !t || a.name.toLowerCase().includes(t)) return '';
  return (a.aliases || []).find((x) => x.toLowerCase().includes(t)) || '';
}
