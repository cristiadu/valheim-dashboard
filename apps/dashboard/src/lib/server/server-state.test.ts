import { beforeEach, describe, expect, it } from 'vitest';

import { logLine, readLines, RUN_START, TEST_OFFSET_MINUTES } from '#/src/lib/test-common.ts';
import type { ServerState } from '#/src/lib/server/models.ts';
import { createServerState, startNewLog } from '#/src/lib/server/server-state.ts';

describe('server state', () => {
  let state: ServerState;

  beforeEach(() => {
    state = createServerState(TEST_OFFSET_MINUTES);
  });

  it('groups pieces into stretches per builder, split by long pauses and by destroyed pieces', () => {
    // GIVEN Ragnar builds three pieces, a piece of his is destroyed, and he builds again 20 minutes later
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Piece built: wood_floor_1x1 by Ragnar'),
      logLine('03:01:00', 'Piece built: wood_floor_1x1 by Ragnar'),
      logLine('03:05:00', 'Piece built: wood_fence by Ragnar'),
      logLine('03:06:00', 'Piece destroyed: wood_fence built by Ragnar'),
      logLine('03:25:00', 'Piece built: piece_chest_wood by Ragnar'),
    ]);

    // WHEN the builds are listed
    const { builds } = state.snapshot;

    // THEN pieces within 10 minutes share a stretch and the late chest starts a new one
    expect(builds).toEqual([
      {
        builder: 'Ragnar',
        isDestroyed: false,
        startUtc: '2026-10-29T10:00:00.000Z',
        endUtc: '2026-10-29T10:05:00.000Z',
        pieces: { wood_floor_1x1: 2, wood_fence: 1 },
      },
      {
        builder: 'Ragnar',
        isDestroyed: true,
        startUtc: '2026-10-29T10:06:00.000Z',
        endUtc: '2026-10-29T10:06:00.000Z',
        pieces: { wood_fence: 1 },
      },
      {
        builder: 'Ragnar',
        isDestroyed: false,
        startUtc: '2026-10-29T10:25:00.000Z',
        endUtc: '2026-10-29T10:25:00.000Z',
        pieces: { piece_chest_wood: 1 },
      },
    ]);
  });

  it('reads the run details with times in UTC', () => {
    // GIVEN the start of a run
    // WHEN it is read
    readLines(state, RUN_START);

    // THEN the world, version, start, last line and the open session are known
    expect(state.snapshot).toMatchObject({
      world: 'Cotil',
      version: '1.0.21',
      startedUtc: '2026-10-29T09:42:15.000Z',
      lastLineUtc: '2026-10-29T09:43:13.000Z',
      stoppedUtc: null,
      isGameServerConnected: true,
    });
    expect(state.snapshot.sessions).toMatchObject([{ character: 'Ragnar', steamName: 'Tony Example', endUtc: null }]);
  });

  it('keeps game events and leaves out lines friends do not need', () => {
    // GIVEN a run with a death, a raid and an unknown line
    readLines(state, [
      ...RUN_START,
      logLine('03:10:02', 'Got character ZDOID from Ragnar : 0:0'),
      logLine('03:20:40', 'Random event set:army_eikthyr'),
      logLine('03:21:00', 'Some engine detail nobody needs'),
    ]);

    // WHEN the events are listed
    const types = state.snapshot.events.map((event) => event.type);

    // THEN the world load, death and raid are kept, the unknown line only moved the last line time
    expect(types).toEqual(['worldLoaded', 'playerDied', 'raidStarted']);
    expect(state.snapshot.lastLineUtc).toBe('2026-10-29T10:21:00.000Z');
  });

  it('records a finished save with its number, the backup and disk space', () => {
    // GIVEN a save, its backup and the disk check
    readLines(state, [
      logLine('03:52:15', 'Available space to current user: 278647042048. Saving is blocked if below: 14961108 bytes. Warnings are given if below: 29922216'),
      logLine('03:52:15', 'World save (1/5) Cloud & Backup checks done [0ms] => Save number 1189'),
      logLine('03:52:15', 'World save (5/5) done. Total time [40ms]'),
      logLine('03:52:16', 'Backup created in Cotil_backup_auto-20261029-035216 [23.522ms]'),
    ]);

    // WHEN / THEN each is recorded once
    expect(state.snapshot.saves).toEqual([{ timeUtc: '2026-10-29T10:52:15.000Z', durationMs: 40, saveNumber: 1189 }]);
    expect(state.snapshot.backups).toEqual([
      { timeUtc: '2026-10-29T10:52:16.000Z', backup: 'Cotil_backup_auto-20261029-035216' },
    ]);
    expect(state.snapshot.diskSpace).toMatchObject({ availableBytes: 278647042048, warnBelowBytes: 29922216 });
  });

  it('notes a clean stop and ends the sessions', () => {
    // GIVEN a run with a player inside
    readLines(state, RUN_START);

    // WHEN the server quits
    readLines(state, [logLine('16:19:51', 'Game server disconnected'), 'OnApplicationQuit']);

    // THEN the stop time is known and the session ended with it
    expect(state.snapshot.stoppedUtc).toBe('2026-10-29T23:19:51.000Z');
    expect(state.snapshot.runs).toMatchObject([{ startUtc: '2026-10-29T09:42:15.000Z', endReason: 'stopped' }]);
    expect(state.snapshot.steamDropsUtc).toEqual(['2026-10-29T23:19:51.000Z']);
    expect(state.snapshot.sessions[0]).toMatchObject({ endReason: 'serverStopped' });
  });

  it('ends open sessions as a crash when a new log starts, and keeps history', () => {
    // GIVEN a run with a player inside and no clean stop
    readLines(state, RUN_START);

    // WHEN the server writes a new log
    startNewLog(state);
    readLines(state, [logLine('05:00:00', 'Valheim version: 1.0.21 (network version 41)')]);

    // THEN the old session ended at the old log's last line, and the new run starts fresh
    expect(state.snapshot.sessions).toMatchObject([
      { character: 'Ragnar', endUtc: '2026-10-29T09:43:13.000Z', endReason: 'serverCrashed' },
    ]);
    expect(state.snapshot).toMatchObject({ world: null, startedUtc: '2026-10-29T12:00:00.000Z' });
    expect(state.snapshot.runs.map((run) => run.endReason)).toEqual(['crashed', null]);
    expect(state.snapshot.events.map((event) => event.type)).toEqual(['worldLoaded']);
  });
});
