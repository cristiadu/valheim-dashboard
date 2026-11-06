/** Kinds of tests each app runs, in the order the table shows them. */
export const TEST_KINDS = ['unit', 'integration'] as const;

/** Folder inside each app that holds one coverage folder per test kind. */
export const COVERAGE_FOLDER_NAME = 'coverage';

/** Cobertura file Vitest and Pester write into each test kind's coverage folder. */
export const COBERTURA_FILE_NAME = 'cobertura-coverage.xml';

/** Table cell for an app without tests of that kind. */
export const NO_TESTS = 'No tests';

/** Unit tests check one file at a time; integration tests run several parts together on real files. */
export type TestKind = (typeof TEST_KINDS)[number];

/** How much of an app's code one kind of tests ran. */
export type Coverage = {
  /** Lines the tests ran. */
  linesCovered: number;
  /** Lines that can run. */
  linesTotal: number;
  /** Branches, such as both sides of an if, the tests took. */
  branchesCovered: number;
  /** Branches that can be taken. */
  branchesTotal: number;
};

/** Coverage of one app per test kind, null for a kind the app has no tests of. */
export type AppCoverage = {
  /** App folder from the repository root, for example `apps/dashboard`. */
  app: string;
  /** Coverage by test kind. */
  byKind: Record<TestKind, Coverage | null>;
};
