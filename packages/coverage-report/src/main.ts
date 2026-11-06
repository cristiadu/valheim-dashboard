import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { COBERTURA_FILE_NAME, COVERAGE_FOLDER_NAME, TEST_KINDS, type AppCoverage, type Coverage, type TestKind } from '#/models';
import { coverageTable, parseCobertura } from '#/report';

/** Reads the coverage of [kind] tests in [app], or null when the app has no such tests. */
const readCoverage = async (app: string, kind: TestKind): Promise<Coverage | null> => {
  const path = join(app, COVERAGE_FOLDER_NAME, kind, COBERTURA_FILE_NAME);
  try {
    return parseCobertura(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Could not read the coverage in ${path}: ${String(error)}`, { cause: error });
  }
};

/** Reads the coverage of every test kind in [app]. */
const readApp = async (app: string): Promise<AppCoverage> => {
  const kinds = await Promise.all(TEST_KINDS.map(async (kind) => [kind, await readCoverage(app, kind)] as const));
  return { app, byKind: Object.fromEntries(kinds) as Record<TestKind, Coverage | null> };
};

/** Returns the coverage table of the app folders [apps], for example `apps/dashboard`. The command prints it. */
export const main = async (apps: readonly string[]): Promise<string> => {
  if (apps.length === 0) {
    throw new Error('Name at least one app folder, for example apps/dashboard.');
  }
  return coverageTable(await Promise.all(apps.map(readApp)));
};

if (import.meta.main) {
  process.stdout.write(await main(process.argv.slice(2)));
}
