import { appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { constants, gunzipSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Snapshot } from '#/lib/models/snapshot';
import { currentSnapshot } from '#/lib/server/live';
import { logLine, RUN_START, TEST_OFFSET_MINUTES } from '#/lib/test-common';
import { GET as getStatus } from '#/routes/api/status/+server';
import { GET as getStream } from '#/routes/api/stream/+server';

/** A past run kept in the history folder: Astrid plays for an hour on Oct 28 and leaves. Names are made up. */
const PAST_RUN = [
  '10/28/2026 20:00:00: ZNet.LoadWorld: Cotil (Cotil), save number 1180',
  '10/28/2026 20:05:00: Got character ZDOID from Astrid : 1921561820:1',
  '10/28/2026 21:05:00: RPC_Disconnect',
  '10/28/2026 21:05:00: Destroying abandoned non persistent zdo 1921561820:1 owner 1921561820',
  '10/28/2026 21:05:00: Player connection lost server "FlanServer" that has join code 123456, now 0 player(s)',
];

/**
 * Reads [reader] into [chunks] until the unzipped text holds [expected], and returns all text read so far. The
 * chunks carry over between calls, since the stream is one gzip file.
 */
const readStreamUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  chunks: Buffer[],
  expected: string,
): Promise<string> => {
  let text = gunzipSync(Buffer.concat(chunks), { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');
  while (!text.includes(expected)) {
    const { value } = await reader.read();
    chunks.push(Buffer.from(value!));
    text = gunzipSync(Buffer.concat(chunks), { finishFlush: constants.Z_SYNC_FLUSH }).toString('utf8');
  }
  return text;
};

describe('following a real log folder', () => {
  let folder: string;
  let logFile: string;
  let snapshot: Snapshot;

  beforeAll(async () => {
    // GIVEN a server folder with one past run in the history and the live log of the current run
    folder = await mkdtemp(join(tmpdir(), 'live-'));
    logFile = join(folder, 'logs.txt');
    await mkdir(join(folder, 'log-history'));
    await writeFile(join(folder, 'log-history', '20261028-200000.txt'), `${PAST_RUN.join('\r\n')}\r\n`);
    await writeFile(logFile, `${RUN_START.join('\r\n')}\r\n`);
    vi.stubEnv('LOG_FILE', logFile);
    vi.stubEnv('SERVER_UTC_OFFSET_MINUTES', String(TEST_OFFSET_MINUTES));

    // WHEN the dashboard reads it the first time
    snapshot = await currentSnapshot();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(folder, { recursive: true, force: true });
  });

  it('reads the past run from the history and the current run from the live log', () => {
    // THEN Astrid's session from Oct 28 is over and Ragnar is online now
    expect(snapshot.sessions.map((session) => [session.character, session.startUtc, session.endUtc])).toEqual([
      ['Astrid', '2026-10-29T03:05:00.000Z', '2026-10-29T04:05:00.000Z'],
      ['Ragnar', '2026-10-29T09:43:13.000Z', null],
    ]);
  });

  it('copies the live run into the history folder', async () => {
    // WHEN the history copy of the current run is read
    const copy = await readFile(join(folder, 'log-history', '20261029-024215.txt'), 'utf8');

    // THEN it holds the live log's lines
    expect(copy).toBe(`${RUN_START.join('\n')}\n`);
  });

  it('serves the snapshot as JSON', async () => {
    // WHEN the status endpoint is called
    const response = await getStatus();

    // THEN it answers with the same sessions
    expect(response.status).toBe(200);
    expect(((await response.json()) as Snapshot).sessions.map((session) => session.character)).toEqual(['Astrid', 'Ragnar']);
  });

  it('streams the whole snapshot first, then a change when a new line arrives', async () => {
    // GIVEN an open live stream
    const response = await getStream();
    const reader = response.body!.getReader();
    const chunks: Buffer[] = [];
    const first = await readStreamUntil(reader, chunks, '\n\n');

    // WHEN Ragnar dies in the live log
    await appendFile(logFile, `${logLine('03:10:02', 'Got character ZDOID from Ragnar : 0:0')}\r\n`);
    const all = await readStreamUntil(reader, chunks, 'event: change');
    await reader.cancel();

    // THEN the stream started with the snapshot, then sent a change, and the snapshot counts the death
    expect(first.startsWith('data: {"serverUtcOffsetMinutes":-420,"world":"Cotil"')).toBe(true);
    expect(all.slice(first.length).startsWith('event: change\ndata: ')).toBe(true);
    expect((await currentSnapshot()).sessions.map((session) => [session.character, session.deaths])).toEqual([
      ['Astrid', 0],
      ['Ragnar', 1],
    ]);
  });
});
