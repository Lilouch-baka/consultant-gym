// Glossary for long-press definitions: one-line meaning + French term.
// `match` lists extra spellings found in question text (case-insensitive, whole words).
export const GLOSSARY = [
  { term: 'Accrual', fr: 'Régularisation / comptabilité d’engagement', def: 'Recording revenue or expense when earned or incurred, not when cash moves.', match: ['accruals', 'accrued'] },
  { term: 'Amortised cost', fr: 'Coût amorti', def: 'Initial amount adjusted by effective-interest amortisation and repayments; no fair-value changes.', match: ['amortized cost'] },
  { term: 'Asset turnover', fr: 'Rotation de l’actif', def: 'Revenue ÷ total assets: how much sales each unit of assets generates.' },
  { term: 'Balance sheet', fr: 'Bilan', def: 'Statement of assets, liabilities and equity at one date.', match: ['statement of financial position'] },
  { term: 'Bill-and-hold', fr: 'Facturé non livré', def: 'The seller invoices but keeps the goods at the customer’s request.' },
  { term: 'CAGR', fr: 'TCAM (taux de croissance annuel moyen)', def: 'Compound annual growth rate: the constant yearly rate linking a start and end value.' },
  { term: 'Capex', fr: 'Investissements (CAPEX)', def: 'Cash spent on long-term assets such as property, plant and equipment.', match: ['capital expenditure'] },
  { term: 'Capitalise', fr: 'Immobiliser / activer', def: 'Record a cost as an asset and expense it over time instead of immediately.', match: ['capitalised', 'capitalized', 'capitalising', 'capitalization', 'capitalisation'] },
  { term: 'Cash conversion', fr: 'Conversion en trésorerie', def: 'How much profit turns into operating cash (e.g. CFO ÷ net income).' },
  { term: 'Cash conversion cycle', fr: 'Cycle de conversion de trésorerie', def: 'DSO + DIO − DPO: days cash is tied up in working capital.' },
  { term: 'CFO', fr: 'Flux de trésorerie d’exploitation', def: 'Cash flow from operating activities.', match: ['cash from operations', 'operating cash flow'] },
  { term: 'Consignment', fr: 'Dépôt-vente', def: 'Goods held by a dealer who sells them for the owner; the owner keeps control until sale.' },
  { term: 'Contingent liability', fr: 'Passif éventuel', def: 'A possible obligation, or one not probable or measurable; disclosed, not recognised.', match: ['contingent liabilities'] },
  { term: 'Contract asset', fr: 'Actif sur contrat', def: 'A right to payment for work done that still depends on more than the passage of time.', match: ['contract assets'] },
  { term: 'Contract liability', fr: 'Passif sur contrat', def: 'Payment received or due before the seller has performed.', match: ['contract liabilities'] },
  { term: 'Contra account', fr: 'Compte de contrepartie / compte correcteur', def: 'An account that reduces a related balance, like accumulated depreciation.', match: ['contra-asset', 'contra asset'] },
  { term: 'Cost of sales', fr: 'Coût des ventes', def: 'Direct cost of the goods or services sold in the period.', match: ['COGS', 'cost of goods sold'] },
  { term: 'Covenant', fr: 'Clause restrictive (covenant)', def: 'A loan condition, such as a maximum net debt ÷ EBITDA.', match: ['covenants'] },
  { term: 'Deferred revenue', fr: 'Produits constatés d’avance', def: 'Cash received for goods or services not yet delivered; a liability.', match: ['unearned revenue'] },
  { term: 'Deferred tax', fr: 'Impôt différé', def: 'Future tax effects of differences between carrying amounts and tax bases.', match: ['deferred tax asset', 'deferred tax liability', 'DTA', 'DTL'] },
  { term: 'Depreciation', fr: 'Amortissement (corporel)', def: 'Spreading the cost of a tangible asset over its useful life.' },
  { term: 'Derecognise', fr: 'Décomptabiliser', def: 'Remove an asset or liability from the balance sheet.', match: ['derecognised', 'derecognition'] },
  { term: 'DIO', fr: 'Délai de rotation des stocks', def: 'Days inventory outstanding: inventory ÷ cost of sales × 365.' },
  { term: 'Discount rate', fr: 'Taux d’actualisation', def: 'The rate used to bring future cash flows to present value.' },
  { term: 'Dividend', fr: 'Dividende', def: 'A distribution of profit to shareholders.', match: ['dividends'] },
  { term: 'DPO', fr: 'Délai de paiement fournisseurs', def: 'Days payables outstanding: payables ÷ cost of sales × 365.' },
  { term: 'DSO', fr: 'Délai de recouvrement clients', def: 'Days sales outstanding: receivables ÷ revenue × 365.' },
  { term: 'DuPont', fr: 'Décomposition DuPont', def: 'Splitting ROE into margin × asset turnover × leverage.' },
  { term: 'EBIT', fr: 'Résultat d’exploitation (EBIT)', def: 'Earnings before interest and tax: operating profit.' },
  { term: 'EBITDA', fr: 'EBITDA / EBE', def: 'Earnings before interest, tax, depreciation and amortisation.' },
  { term: 'Effective interest', fr: 'Intérêt effectif', def: 'Interest at the rate that discounts all contractual cash flows to the initial carrying amount.', match: ['effective interest rate', 'effective-interest'] },
  { term: 'Effective tax rate', fr: 'Taux effectif d’impôt', def: 'Total tax expense ÷ profit before tax.', match: ['ETR'] },
  { term: 'Enterprise value', fr: 'Valeur d’entreprise', def: 'Value of the whole business to all capital providers: equity + net debt + other claims.', match: ['EV'] },
  { term: 'EPS', fr: 'Bénéfice par action (BPA)', def: 'Earnings per share: profit to ordinary shareholders ÷ weighted shares.' },
  { term: 'Equity method', fr: 'Mise en équivalence', def: 'Investment carried at cost plus the investor’s share of the investee’s profits, less dividends.' },
  { term: 'Fair value', fr: 'Juste valeur', def: 'The price to sell an asset or transfer a liability between market participants today.' },
  { term: 'FCF', fr: 'Flux de trésorerie disponible', def: 'Free cash flow: operating cash flow minus capex (and lease payments).', match: ['free cash flow'] },
  { term: 'FIFO', fr: 'PEPS (premier entré, premier sorti)', def: 'First in, first out: oldest inventory costs go to cost of sales first.' },
  { term: 'FVOCI', fr: 'Juste valeur par OCI', def: 'Fair value through other comprehensive income: value changes go to equity, not profit.' },
  { term: 'FVTPL', fr: 'Juste valeur par résultat', def: 'Fair value through profit or loss: value changes go straight to profit.' },
  { term: 'Going concern', fr: 'Continuité d’exploitation', def: 'The assumption the business will keep operating for the foreseeable future.' },
  { term: 'Goodwill', fr: 'Écart d’acquisition (goodwill)', def: 'Price paid in an acquisition above the fair value of net identifiable assets.' },
  { term: 'Gross margin', fr: 'Marge brute', def: 'Gross profit ÷ revenue.' },
  { term: 'IFRS', fr: 'Normes IFRS', def: 'International Financial Reporting Standards, issued by the IASB.' },
  { term: 'Impairment', fr: 'Dépréciation', def: 'Writing an asset down when its carrying amount exceeds what can be recovered.', match: ['impaired', 'impairments'] },
  { term: 'Incremental borrowing rate', fr: 'Taux d’emprunt marginal', def: 'The rate a lessee would pay to borrow over a similar term with similar security.' },
  { term: 'Intangible asset', fr: 'Immobilisation incorporelle', def: 'A non-physical asset such as a patent, licence or software.', match: ['intangible assets', 'intangibles'] },
  { term: 'Interest cover', fr: 'Couverture des intérêts', def: 'EBIT ÷ interest expense: how many times profit covers interest.' },
  { term: 'Invested capital', fr: 'Capitaux investis', def: 'Operating assets financed by debt and equity: net PP&E + working capital (+ goodwill).' },
  { term: 'Inventory', fr: 'Stocks', def: 'Goods held for sale or for use in production.' },
  { term: 'Journal entry', fr: 'Écriture comptable', def: 'A record of a transaction with equal debits and credits.', match: ['journal entries'] },
  { term: 'Lease liability', fr: 'Dette locative', def: 'Present value of the lease payments still to be made.', match: ['lease liabilities'] },
  { term: 'Leverage', fr: 'Effet de levier / endettement', def: 'Use of debt to finance assets; often net debt ÷ EBITDA.' },
  { term: 'Liquidity', fr: 'Liquidité', def: 'Ability to meet short-term obligations as they fall due.' },
  { term: 'Materiality', fr: 'Importance relative (seuil de signification)', def: 'Information is material if leaving it out could change users’ decisions.' },
  { term: 'Net debt', fr: 'Dette nette', def: 'Borrowings (and usually lease liabilities) minus cash.' },
  { term: 'Net realisable value', fr: 'Valeur nette de réalisation', def: 'Expected selling price minus costs to complete and sell.', match: ['NRV', 'net realizable value'] },
  { term: 'NOPAT', fr: 'Résultat d’exploitation après impôt', def: 'Net operating profit after tax: EBIT × (1 − tax rate).' },
  { term: 'OCI', fr: 'Autres éléments du résultat global', def: 'Other comprehensive income: gains and losses recorded in equity, outside profit.', match: ['other comprehensive income'] },
  { term: 'Payables', fr: 'Dettes fournisseurs', def: 'Amounts owed to suppliers.', match: ['trade payables', 'accounts payable'] },
  { term: 'Performance obligation', fr: 'Obligation de prestation', def: 'A promise to transfer a distinct good or service to a customer.', match: ['performance obligations'] },
  { term: 'Present value', fr: 'Valeur actuelle', def: 'Today’s value of future cash flows, discounted at a rate.', match: ['PV'] },
  { term: 'Provision', fr: 'Provision', def: 'A liability of uncertain timing or amount, recognised when an outflow is probable.', match: ['provisions'] },
  { term: 'Receivables', fr: 'Créances clients', def: 'Amounts customers owe for sales already made.', match: ['trade receivables', 'accounts receivable'] },
  { term: 'Recoverable amount', fr: 'Valeur recouvrable', def: 'The higher of fair value less costs of disposal and value in use.' },
  { term: 'Retained earnings', fr: 'Résultats non distribués / report à nouveau', def: 'Cumulative profits kept in the business after dividends.' },
  { term: 'Revenue', fr: 'Chiffre d’affaires / produits', def: 'Income from ordinary activities, such as sales of goods and services.' },
  { term: 'Right-of-use asset', fr: 'Droit d’utilisation', def: 'A lessee’s right to use a leased asset for the lease term.', match: ['ROU asset', 'right-of-use assets'] },
  { term: 'ROE', fr: 'Rentabilité des capitaux propres', def: 'Return on equity: net income ÷ shareholders’ equity.' },
  { term: 'ROIC', fr: 'Rentabilité des capitaux investis', def: 'Return on invested capital: NOPAT ÷ invested capital.' },
  { term: 'Segment', fr: 'Secteur opérationnel', def: 'A part of the business whose results management reviews separately.', match: ['segments'] },
  { term: 'Share capital', fr: 'Capital social', def: 'Nominal value of shares issued to shareholders.' },
  { term: 'Stand-alone selling price', fr: 'Prix de vente spécifique', def: 'The price at which a good or service would be sold separately.', match: ['SSP', 'stand-alone selling prices'] },
  { term: 'Tax base', fr: 'Base fiscale', def: 'The amount attributed to an asset or liability for tax purposes.' },
  { term: 'Treasury shares', fr: 'Actions propres (autodétention)', def: 'A company’s own shares bought back and held; a deduction from equity.', match: ['treasury stock'] },
  { term: 'Useful life', fr: 'Durée d’utilité', def: 'The period over which an asset is expected to be used.', match: ['useful lives'] },
  { term: 'Variable consideration', fr: 'Contrepartie variable', def: 'Parts of the price that depend on future events: bonuses, rebates, returns.' },
  { term: 'WACC', fr: 'Coût moyen pondéré du capital (CMPC)', def: 'Weighted average cost of capital: blended required return of debt and equity holders.' },
  { term: 'Working capital', fr: 'Besoin en fonds de roulement', def: 'Receivables + inventory − payables: cash tied up in daily operations.' },
  { term: 'Write-down', fr: 'Dépréciation / réduction de valeur', def: 'Reducing an asset’s carrying amount to a lower recoverable value.', match: ['write-downs', 'written down'] },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LOOKUP = new Map();
for (const g of GLOSSARY) for (const k of [g.term, ...(g.match || [])]) LOOKUP.set(k.toLowerCase(), g);

// Longest spellings first so "deferred tax liability" wins over "deferred tax".
// No lookbehind (older iOS Safari): group 1 captures the boundary character instead.
const PATTERN = new RegExp(
  `(^|[^\\w-])(${[...LOOKUP.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\w-])`,
  'gi',
);

// Split text into plain strings and {text, entry} pieces. Each term is marked once per text.
export function glossSplit(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const word = m[2];
    const start = m.index + m[1].length;
    const entry = LOOKUP.get(word.toLowerCase());
    // Abbreviations only count when written in capitals ("EV", not "ev").
    if ((/^[A-Z]{2,4}$/.test(entry.term) || word.length <= 3) && word !== word.toUpperCase()) continue;
    if (seen.has(entry.term)) continue;
    seen.add(entry.term);
    if (start > last) out.push(text.slice(last, start));
    out.push({ text: word, entry });
    last = start + word.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
