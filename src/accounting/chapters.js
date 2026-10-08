// Financial accounting track: the chapter list (in the book's order) and short book references.
// Only references are stored here (book, chapter, section, page), never book text.
export const BOOKS = {
  IA17: { short: 'Kieso IA 17e', title: 'Kieso, Weygandt & Warfield, Intermediate Accounting, 17th edition (Wiley)' },
};

export const CHAPTERS = [
  { n: 1, title: 'Financial Accounting and Accounting Standards' },
  { n: 2, title: 'Conceptual Framework for Financial Reporting' },
  { n: 3, title: 'The Accounting Information System' },
  { n: 4, title: 'Income Statement and Related Information' },
  { n: 5, title: 'Balance Sheet and Statement of Cash Flows' },
  { n: 6, title: 'Accounting and the Time Value of Money' },
  { n: 7, title: 'Cash and Receivables' },
  { n: 8, title: 'Valuation of Inventories: A Cost-Basis Approach' },
  { n: 9, title: 'Inventories: Additional Valuation Issues' },
  { n: 10, title: 'Acquisition and Disposition of Property, Plant, and Equipment' },
  { n: 11, title: 'Depreciation, Impairments, and Depletion' },
  { n: 12, title: 'Intangible Assets' },
  { n: 13, title: 'Current Liabilities and Contingencies' },
  { n: 14, title: 'Long-Term Liabilities' },
  { n: 15, title: 'Stockholders’ Equity' },
  { n: 16, title: 'Dilutive Securities and Earnings per Share' },
  { n: 17, title: 'Investments' },
  { n: 18, title: 'Revenue Recognition' },
  { n: 19, title: 'Accounting for Income Taxes' },
  { n: 20, title: 'Accounting for Pensions and Postretirement Benefits' },
  { n: 21, title: 'Accounting for Leases' },
  { n: 22, title: 'Accounting Changes and Error Analysis' },
  { n: 23, title: 'Statement of Cash Flows' },
  { n: 24, title: 'Full Disclosure in Financial Reporting' },
];

export const CHAPTER_BY_N = Object.fromEntries(CHAPTERS.map((c) => [c.n, c]));

export function bookRefLabel(br) {
  if (!br) return '';
  const b = BOOKS[br.book];
  return `${b ? b.short : br.book} · Ch ${br.chapter} · ${br.section} · p. ${br.page}`;
}
