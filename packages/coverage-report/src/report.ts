import { NO_TESTS, TEST_KINDS, type AppCoverage, type Coverage } from '#/models';

/** Root element of a Cobertura file, which carries the totals. */
const COVERAGE_ELEMENT_PATTERN = /<coverage\s[^>]*>/;

/** Returns the whole-number attribute [name] of [element], or throws when it is missing. */
const numberAttribute = (element: string, name: string): number => {
  const value = new RegExp(`\\s${name}="(\\d+)"`).exec(element)?.[1];
  if (value === undefined) {
    throw new Error(`The coverage element has no ${name} attribute: ${element}`);
  }
  return Number(value);
};

/** Reads the line and branch totals from a Cobertura file's text, [xml]. */
export const parseCobertura = (xml: string): Coverage => {
  const element = COVERAGE_ELEMENT_PATTERN.exec(xml)?.[0];
  if (element === undefined) {
    throw new Error('The file has no <coverage> element, so it is not a Cobertura report.');
  }
  return {
    linesCovered: numberAttribute(element, 'lines-covered'),
    linesTotal: numberAttribute(element, 'lines-valid'),
    branchesCovered: numberAttribute(element, 'branches-covered'),
    branchesTotal: numberAttribute(element, 'branches-valid'),
  };
};

/** Returns [covered] of [total] [things] as a percent with one decimal, for example `61.3% of 1,999 lines`. */
const measured = (covered: number, total: number, things: string): string =>
  total === 0 ? `no ${things}` : `${((covered / total) * 100).toFixed(1)}% of ${total.toLocaleString('en-US')} ${things}`;

/** Returns the table cell for [coverage], for example `61.3% of 1,999 lines, 63.4% of 1,041 branches`. */
const cell = (coverage: Coverage | null): string =>
  coverage === null
    ? NO_TESTS
    : `${measured(coverage.linesCovered, coverage.linesTotal, 'lines')}, ${measured(coverage.branchesCovered, coverage.branchesTotal, 'branches')}`;

/** Returns the Markdown table of [apps], one row per app and one column per test kind. */
export const coverageTable = (apps: readonly AppCoverage[]): string => {
  const rows = apps.map((app) => `| \`${app.app}\` | ${TEST_KINDS.map((kind) => cell(app.byKind[kind])).join(' | ')} |`);
  return [
    '## Test coverage',
    '',
    'Unit tests check one file at a time. Integration tests run several parts together on real files.',
    '',
    '| App | Unit tests | Integration tests |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
};
