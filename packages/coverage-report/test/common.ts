/** Returns the start of a Cobertura file as Vitest writes it, with the given line and branch totals. */
export const coberturaWith = (linesCovered: number, linesTotal: number, branchesCovered: number, branchesTotal: number): string =>
  `<?xml version="1.0" ?>
<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">
<coverage lines-valid="${linesTotal}" lines-covered="${linesCovered}" line-rate="0.6128" branches-valid="${branchesTotal}" branches-covered="${branchesCovered}" branch-rate="0.634" timestamp="1793938495656" complexity="0" version="0.1">
  <sources>
    <source>/home/runner/work/valheim-dashboard/valheim-dashboard/apps/dashboard</source>
  </sources>
</coverage>
`;
