import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { main } from '#/main';
import { coberturaWith } from '#test/common';

describe('main', () => {
  let folder: string;

  beforeAll(async () => {
    // GIVEN a repository where the dashboard has both kinds of coverage, the parser only unit coverage, and one
    // file that is not Cobertura
    folder = await mkdtemp(join(tmpdir(), 'coverage-report-'));
    await mkdir(join(folder, 'apps/dashboard/coverage/unit'), { recursive: true });
    await mkdir(join(folder, 'apps/dashboard/coverage/integration'), { recursive: true });
    await mkdir(join(folder, 'packages/valheim-log/coverage/unit'), { recursive: true });
    await mkdir(join(folder, 'packages/broken/coverage/unit'), { recursive: true });
    await writeFile(join(folder, 'apps/dashboard/coverage/unit/cobertura-coverage.xml'), coberturaWith(1225, 1999, 660, 1041));
    await writeFile(join(folder, 'apps/dashboard/coverage/integration/cobertura-coverage.xml'), coberturaWith(500, 1999, 200, 1041));
    await writeFile(join(folder, 'packages/valheim-log/coverage/unit/cobertura-coverage.xml'), coberturaWith(237, 238, 72, 77));
    await writeFile(join(folder, 'packages/broken/coverage/unit/cobertura-coverage.xml'), 'not xml');
  });

  afterAll(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('reads each app folder into one table', async () => {
    // WHEN the table is made for the dashboard and the parser
    const table = await main([join(folder, 'apps/dashboard'), join(folder, 'packages/valheim-log')]);

    // THEN both rows show, and the parser's missing integration coverage reads as no tests
    expect(table.split('\n').slice(6, 8)).toEqual([
      `| \`${folder}/apps/dashboard\` | 61.3% of 1,999 lines, 63.4% of 1,041 branches | 25.0% of 1,999 lines, 19.2% of 1,041 branches |`,
      `| \`${folder}/packages/valheim-log\` | 99.6% of 238 lines, 93.5% of 77 branches | No tests |`,
    ]);
  });

  it('names the file it could not read', async () => {
    // WHEN the table is made for an app whose coverage file is broken, THEN the error names that file
    await expect(main([join(folder, 'packages/broken')])).rejects.toThrow(
      `Could not read the coverage in ${folder}/packages/broken/coverage/unit/cobertura-coverage.xml`,
    );
  });

  it('asks for an app folder when none is given', async () => {
    // WHEN no folder is given, THEN it says what to pass
    await expect(main([])).rejects.toThrow('Name at least one app folder, for example apps/dashboard.');
  });
});
