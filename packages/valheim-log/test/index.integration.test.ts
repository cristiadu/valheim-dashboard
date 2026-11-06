import { createReadStream } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyEvent, createLogReader, createSessionState, onlineSessions, readLine, runKeyOf } from '#/index';
import type { LogEvent, PlayerSession, SessionState } from '#/index';
import { CROSSPLAY_LOG, SAMPLE_SERVER_UTC_OFFSET_MINUTES } from '#test/common';

describe('reading a logs.txt file line by line through the package entry', () => {
  let folder: string;
  let runKey: string | null;
  let events: LogEvent[];
  let onlineAtDeath: PlayerSession[];
  let state: SessionState;

  beforeAll(async () => {
    // GIVEN the crossplay sample saved the way the Windows server writes it, with CRLF line ends
    folder = await mkdtemp(join(tmpdir(), 'valheim-log-'));
    const path = join(folder, 'logs.txt');
    await writeFile(path, CROSSPLAY_LOG.replaceAll('\n', '\r\n'));

    // WHEN each line streamed from disk is read into an event and the event into the sessions
    const reader = createLogReader(SAMPLE_SERVER_UTC_OFFSET_MINUTES);
    state = createSessionState();
    events = [];
    onlineAtDeath = [];
    runKey = null;
    for await (const line of createInterface({ input: createReadStream(path), crlfDelay: Infinity })) {
      runKey ??= runKeyOf(line);
      const event = readLine(reader, line);
      if (event !== null) {
        applyEvent(state, event);
        events.push(event);
      }
      if (event?.type === 'playerDied') {
        onlineAtDeath = structuredClone(onlineSessions(state));
      }
    }
  });

  afterAll(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('names the run after its first timestamped line', () => {
    // THEN the run is named for 10/29/2026 02:42:15, server time
    expect(runKey).toBe('20261029-024215');
  });

  it('shows the player online while playing', () => {
    // THEN Ragnar was online when he died, with his Steam name linked
    expect(onlineAtDeath.map((session) => [session.character, session.steamName, session.endUtc])).toEqual([
      ['Ragnar', 'Tony Example', null],
    ]);
  });

  it('ends with one finished session that counts the death', () => {
    // THEN the session ended when Ragnar left, and nobody is online after the server stopped
    expect(state.sessions).toEqual([
      {
        character: 'Ragnar',
        peerId: '549297305',
        steamId: 'Steam_76561198000000001',
        steamName: 'Tony Example',
        startUtc: '2026-10-29T09:43:13.000Z',
        endUtc: '2026-10-29T10:56:36.000Z',
        endReason: 'left',
        deaths: 1,
      },
    ]);
    expect(onlineSessions(state)).toEqual([]);
  });

  it('keeps the CRLF line ends out of the event text', () => {
    // THEN no event message ends with a carriage return
    expect(events.filter((event) => JSON.stringify(event).includes('\\r'))).toEqual([]);
  });
});
