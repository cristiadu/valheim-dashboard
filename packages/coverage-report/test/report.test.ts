import { describe, expect, it } from 'vitest';

import { coverageTable, parseCobertura } from '#/report';
import { coberturaWith } from '#test/common';

describe('parseCobertura', () => {
  it('reads the line and branch totals from the root element', () => {
    // GIVEN a Cobertura file with 1,225 of 1,999 lines and 660 of 1,041 branches covered
    const xml = coberturaWith(1225, 1999, 660, 1041);

    // WHEN it is parsed
    const coverage = parseCobertura(xml);

    // THEN the totals are read as numbers
    expect(coverage).toEqual({ linesCovered: 1225, linesTotal: 1999, branchesCovered: 660, branchesTotal: 1041 });
  });

  it('rejects a file that is not a Cobertura report', () => {
    // GIVEN an Istanbul JSON summary instead
    const json = '{"total":{"lines":{"total":10}}}';

    // WHEN it is parsed, THEN it says what is wrong
    expect(() => parseCobertura(json)).toThrow('The file has no <coverage> element, so it is not a Cobertura report.');
  });

  it('rejects a root element without a total', () => {
    // GIVEN a root element without branches-valid
    const xml = '<coverage lines-valid="4" lines-covered="2" branches-covered="0">';

    // WHEN it is parsed, THEN it names the missing attribute
    expect(() => parseCobertura(xml)).toThrow('The coverage element has no branches-valid attribute');
  });
});

describe('coverageTable', () => {
  it('shows one row per app with the percent and size of each test kind', () => {
    // GIVEN an app with both kinds and one with only unit tests and no branches
    const apps = [
      {
        app: 'apps/dashboard',
        byKind: {
          unit: { linesCovered: 1225, linesTotal: 1999, branchesCovered: 660, branchesTotal: 1041 },
          integration: { linesCovered: 400, linesTotal: 1999, branchesCovered: 100, branchesTotal: 1041 },
        },
      },
      { app: 'scripts', byKind: { unit: { linesCovered: 8, linesTotal: 10, branchesCovered: 0, branchesTotal: 0 }, integration: null } },
    ];

    // WHEN the table is made
    const table = coverageTable(apps);

    // THEN each cell reads plainly, and a missing kind says so
    expect(table).toBe(`## Test coverage

Unit tests check one file at a time. Integration tests run several parts together on real files.

| App | Unit tests | Integration tests |
| --- | --- | --- |
| \`apps/dashboard\` | 61.3% of 1,999 lines, 63.4% of 1,041 branches | 20.0% of 1,999 lines, 9.6% of 1,041 branches |
| \`scripts\` | 80.0% of 10 lines, no branches | No tests |
`);
  });
});
