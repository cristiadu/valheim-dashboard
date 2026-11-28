import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { logLine } from '#/lib/test-common';
import { firstRunKey, readHistory } from '#/lib/server/log-history';

describe('log history', () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'log-history-'));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('reads past runs oldest first and skips the run the live log has', async () => {
    // GIVEN three runs in the history, the last of which is the live one
    const runFolder = join(folder, 'log-history');
    await mkdir(runFolder);
    await writeFile(join(runFolder, '20261029-030000.txt'), 'second\n');
    await writeFile(join(runFolder, '20261029-024215.txt'), 'first\n');
    await writeFile(join(runFolder, '20261029-040000.txt'), 'live\n');
    const read: string[] = [];

    // WHEN the history is read
    await readHistory(runFolder, '20261029-040000', {
      onLine: (line) => read.push(line),
      onNewFile: () => read.push('(new run)'),
    });

    // THEN the past runs come in time order, with a new run between them
    expect(read).toEqual(['first', '', '(new run)', 'second', '']);
  });

  it('reads the first run key of a log, or null when it is missing', async () => {
    // GIVEN a log that starts with an engine line
    const logFile = join(folder, 'logs.txt');
    await writeFile(logFile, `Mono path[0] = C:/Valheim\n${logLine('02:42:15', 'Game server connected')}\n`);

    // WHEN / THEN the first timestamped line names the run
    expect(await firstRunKey(logFile)).toBe('20261029-024215');
    expect(await firstRunKey(join(folder, 'missing.txt'))).toBeNull();
  });
});
