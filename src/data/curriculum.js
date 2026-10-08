// The five layers and their topics. Topic ids are what questions use in their "topic" field.
export const LAYERS = [
  {
    id: 1,
    name: 'Mechanics',
    short: 'Mechanics',
    topics: [
      { id: 'three_statements', name: 'How the statements link' },
      { id: 'accruals', name: 'Accrual vs cash' },
      { id: 'working_capital', name: 'Working capital' },
      { id: 'd_and_a', name: 'D&A' },
      { id: 'capex', name: 'Capex' },
      { id: 'deferred_revenue', name: 'Deferred revenue' },
      { id: 'inventory', name: 'Inventory' },
      { id: 'debt_interest', name: 'Debt and interest' },
      { id: 'dividends', name: 'Dividends' },
      { id: 'buybacks', name: 'Buybacks' },
      { id: 'impairments', name: 'Impairments' },
      { id: 'leases', name: 'Leases' },
    ],
  },
  {
    id: 2,
    name: 'Ratio families',
    short: 'Ratios',
    topics: [
      { id: 'profitability', name: 'Profitability' },
      { id: 'efficiency', name: 'Efficiency' },
      { id: 'liquidity', name: 'Liquidity' },
      { id: 'solvency', name: 'Solvency' },
      { id: 'growth', name: 'Growth' },
      { id: 'valuation', name: 'Market and valuation' },
    ],
  },
  {
    id: 3,
    name: 'Interactions',
    short: 'Interactions',
    topics: [
      { id: 'dupont', name: 'DuPont' },
      { id: 'roic_tree', name: 'ROIC tree' },
      { id: 'growth_reinvestment', name: 'Growth vs returns vs reinvestment' },
      { id: 'operating_leverage', name: 'Operating leverage' },
      { id: 'financial_leverage', name: 'Financial leverage' },
      { id: 'margin_turnover', name: 'Margin vs turnover' },
    ],
  },
  {
    id: 4,
    name: 'Decisions & returns',
    short: 'Returns',
    topics: [
      { id: 'capital_decisions', name: 'Operating, investing, financing decisions' },
      { id: 'npv', name: 'NPV' },
      { id: 'irr', name: 'IRR' },
      { id: 'moic', name: 'MOIC' },
      { id: 'payback', name: 'Payback' },
      { id: 'wacc', name: 'WACC' },
      { id: 'leverage_returns', name: 'Leverage and returns' },
      { id: 'lbo_bridge', name: 'LBO return bridge' },
    ],
  },
  {
    id: 5,
    name: 'Diagnosis',
    short: 'Diagnosis',
    topics: [
      { id: 'ratio_patterns', name: 'Ratio patterns' },
      { id: 'cash_vs_profit', name: 'Cash vs profit stories' },
      { id: 'statement_extracts', name: 'Statement extracts' },
      { id: 'value_impact', name: 'Value impact' },
    ],
  },
];

export const ALL_TOPICS = LAYERS.flatMap((l) => l.topics.map((t) => ({ ...t, layer: l.id, layerName: l.name, layerShort: l.short })));

export const TOPIC_BY_ID = Object.fromEntries(ALL_TOPICS.map((t) => [t.id, t]));

export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

export const FORMATS = ['mcq', 'flashcard', 'written', 'mental_math'];
export const STYLES = ['definition', 'logical', 'rhetorical', 'walkthrough', 'calculation', 'diagnosis'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];

export const FORMAT_LABEL = {
  mcq: 'Multiple choice',
  flashcard: 'Flashcard',
  written: 'Written',
  mental_math: 'Mental math',
};

export function topicLabel(q) {
  const t = TOPIC_BY_ID[q.topic];
  return `L${q.layer} · ${t ? t.name : q.topic}`;
}
