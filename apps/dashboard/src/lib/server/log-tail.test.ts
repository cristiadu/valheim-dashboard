import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LogTail } from './log-tail';

describe('LogTail', () => {
  let folder: string;
  let path: string;
  let lines: string[];
  let newFiles: number;
  let tail: LogTail;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'log-tail-'));
    path = join(folder, 'logs.txt');
    lines = [];
    newFiles = 0;
    tail = new LogTail(path, { onLine: (line) => lines.push(line), onNewFile: () => newFiles++ });
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('reads only the lines added since the last poll', async () => {
    // GIVEN a log that was read once
    await writeFile(path, 'first\nsecond\n');
    await tail.poll();

    // WHEN a line is added and the log is read again
    await appendFile(path, 'third\n');
    await tail.poll();

    // THEN each line came once, in order
    expect(lines).toEqual(['first', 'second', 'third']);
  });

  it('holds back a line until it is complete', async () => {
    // GIVEN a log whose last line is still being written
    await writeFile(path, 'done\nhalf');
    await tail.poll();

    // WHEN the rest of the line arrives
    await appendFile(path, ' line\r\n');
    await tail.poll();

    // THEN the line comes whole, without the Windows line ending
    expect(lines).toEqual(['done', 'half line']);
  });

  it('starts again from the top when the log is replaced', async () => {
    // GIVEN a long log that was read
    await writeFile(path, 'old run line one\nold run line two\n');
    await tail.poll();

    // WHEN the server starts and writes a new, shorter log
    await writeFile(path, 'new run\n');
    await tail.poll();

    // THEN the listener hears about the new file and gets its line
    expect(newFiles).toBe(1);
    expect(lines).toEqual(['old run line one', 'old run line two', 'new run']);
  });

  it('waits quietly while the log does not exist', async () => {
    // GIVEN no log file
    // WHEN it is polled
    await tail.poll();

    // THEN nothing is read
    expect(lines).toEqual([]);
    expect(newFiles).toBe(0);
  });
});
