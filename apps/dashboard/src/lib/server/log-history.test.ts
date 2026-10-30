import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { logLine } from '#/src/lib/test-common.ts';
import { firstRunKey, LogHistory, readHistory } from '#/src/lib/server/log-history.ts';

describe('log history', () => {
  let folder: string;
  let history: LogHistory;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'log-history-'));
    history = new LogHistory(join(folder, 'log-history'));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('copies each run to a file named by its first timestamped line', async () => {
    // GIVEN a run that starts with an engine line, then a second run after a restart
    history.record('Mono path[0] = C:/Valheim');
    history.record(logLine('02:42:15', 'Valheim version: 1.0.21 (network version 41)'));
    await history.flush();
    history.record(logLine('02:50:00', 'Game server connected'));
    await history.flush();
    history.startNewRun();
    history.record(logLine('03:00:00', 'Valheim version: 1.0.21 (network version 41)'));

    // WHEN the lines are written
    await history.flush();

    // THEN each run has its own file with all of its lines
    const runFolder = join(folder, 'log-history');
    expect(await readdir(runFolder)).toEqual(['20261029-024215.txt', '20261029-030000.txt']);
    expect(await readFile(join(runFolder, '20261029-024215.txt'), 'utf8')).toBe(
      [
        'Mono path[0] = C:/Valheim',
        logLine('02:42:15', 'Valheim version: 1.0.21 (network version 41)'),
        logLine('02:50:00', 'Game server connected'),
        '',
      ].join('\n'),
    );
  });

  it('replaces an older copy of the same run when the dashboard starts again', async () => {
    // GIVEN a copy of the run from before the dashboard restarted
    const runFolder = join(folder, 'log-history');
    await mkdir(runFolder);
    await writeFile(join(runFolder, '20261029-024215.txt'), 'old copy\n');

    // WHEN the run is read again from the start of logs.txt
    history.record(logLine('02:42:15', 'Game server connected'));
    await history.flush();

    // THEN the copy holds the run once
    expect(await readFile(join(runFolder, '20261029-024215.txt'), 'utf8')).toBe(
      `${logLine('02:42:15', 'Game server connected')}\n`,
    );
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
