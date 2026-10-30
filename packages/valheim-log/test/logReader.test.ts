import { beforeAll, describe, expect, it } from 'vitest';

import { createLogReader, parseMessage, readLine } from '#/src/logReader.ts';
import type { LogEvent } from '#/src/models.ts';
import { CROSSPLAY_LOG, ofType, parseSample, STEAM_ONLY_LOG } from '#/test/common.ts';

describe('parseLog', () => {
  let crossplay: LogEvent[];
  let steamOnly: LogEvent[];

  beforeAll(() => {
    // GIVEN the crossplay and Steam-only sample logs from a server 7 hours behind UTC
    // WHEN they are parsed
    crossplay = parseSample(CROSSPLAY_LOG);
    steamOnly = parseSample(STEAM_ONLY_LOG);
  });

  it('gives every crossplay line one event, in log order', () => {
    // THEN each line maps to its event and nothing is dropped
    expect(crossplay.map((e) => e.type)).toEqual([
      'serverVersion',
      'worldLoaded',
      'knownPlayer',
      'gameServer',
      'playerConnecting',
      'playerCount',
      'steamLinked',
      'handshake',
      'characterSpawned',
      'playerDied',
      'characterSpawned',
      'raidCheck',
      'raidStarted',
      'diskSpace',
      'otherLine',
      'worldSaveStep',
      'worldSaveStep',
      'backupCreated',
      'playerDisconnecting',
      'playerLeft',
      'playerLeft',
      'otherLine',
      'playerCount',
      'gameServer',
      'serverStopped',
    ]);
  });

  it('gives every Steam-only line one event, in log order', () => {
    // THEN older and Steam-only lines map to the same events
    expect(steamOnly.map((e) => e.type)).toEqual([
      'worldLoaded',
      'playerConnecting',
      'joinRefused',
      'socketClosed',
      'playerConnecting',
      'handshake',
      'characterSpawned',
      'nightSkipped',
      'worldSaveStep',
      'playerDisconnecting',
      'socketClosed',
      'otherLine',
    ]);
  });

  it('moves server local time to UTC', () => {
    // THEN 02:42:15 at UTC-7 is 09:42:15 UTC
    expect(crossplay[0]!.timeUtc).toBe('2026-10-29T09:42:15.000Z');
  });

  it('gives lines without a timestamp the time of the line before', () => {
    // THEN the engine line and OnApplicationQuit take the earlier times
    expect(ofType(crossplay, 'otherLine')[1]).toEqual({
      type: 'otherLine',
      timeUtc: '2026-10-29T10:56:36.000Z',
      message: 'ZPlayFabSocket::Dispose. State: CLOSED',
      isEngineLine: true,
    });
    expect(crossplay.at(-1)).toEqual({ type: 'serverStopped', timeUtc: '2026-10-29T23:19:51.000Z' });
  });

  it('reads player IDs and character names', () => {
    // THEN the Steam name, Steam ID, PlayFab ID and character come out of their lines
    expect(ofType(crossplay, 'knownPlayer')[0]).toMatchObject({
      steamName: 'Tony Example',
      steamId: 'Steam_76561198000000001',
    });
    expect(ofType(crossplay, 'steamLinked')[0]).toMatchObject({
      playFabId: 'A1B2C3D4E5F60718',
      steamId: 'Steam_76561198000000001',
    });
    expect(ofType(crossplay, 'handshake')[0]!.connectionId).toBe('A1B2C3D4E5F60718');
    expect(ofType(crossplay, 'characterSpawned')[0]).toMatchObject({ character: 'Ragnar', peerId: '549297305' });
    expect(ofType(crossplay, 'playerLeft')[0]!.peerId).toBe('549297305');
    expect(ofType(crossplay, 'playerDied')[0]!.character).toBe('Ragnar');
  });

  it('reads Steam-only connection lines with the Steam ID prefix the history uses', () => {
    // THEN Steam ID numbers become Steam_ IDs
    expect(ofType(steamOnly, 'playerConnecting')[0]).toMatchObject({
      connectionId: '76561198000000002',
      steamId: 'Steam_76561198000000002',
    });
    expect(ofType(steamOnly, 'handshake')[0]!.connectionId).toBe('76561198000000002');
    expect(ofType(steamOnly, 'socketClosed')[0]!.steamId).toBe('Steam_76561198000000002');
  });

  it('reads player counts, disconnects and timeouts', () => {
    // THEN the counts, the direction and the timeout flag match the lines
    expect(ofType(crossplay, 'playerCount').map((e) => [e.players, e.isJoin])).toEqual([
      [1, true],
      [0, false],
    ]);
    expect(ofType(crossplay, 'playerDisconnecting')[0]!.isTimeout).toBe(false);
    expect(ofType(steamOnly, 'playerDisconnecting')[0]!.isTimeout).toBe(true);
  });

  it('reads raids and night skips', () => {
    // THEN the raid check, raid name and the day that starts are read
    expect(ofType(crossplay, 'raidCheck')[0]!.possibleRaids).toBe(1);
    expect(ofType(crossplay, 'raidStarted')[0]!.raid).toBe('army_eikthyr');
    expect(ofType(steamOnly, 'nightSkipped')[0]!.day).toBe(3);
  });

  it('reads world save, backup and disk space values', () => {
    // THEN the save number, step times, backup name and byte counts are read
    expect(ofType(crossplay, 'worldSaveStep').map((e) => [e.step, e.saveNumber, e.durationMs])).toEqual([
      [1, 1189, 0],
      [5, null, 40],
    ]);
    expect(ofType(steamOnly, 'worldSaveStep')[0]).toMatchObject({ step: 5, durationMs: 120, saveNumber: null });
    expect(ofType(crossplay, 'backupCreated')[0]!.backup).toBe('Cotil_backup_auto-20261029-035216');
    expect(ofType(crossplay, 'diskSpace')[0]).toMatchObject({
      availableBytes: 278647042048,
      blockedBelowBytes: 14961108,
      warnBelowBytes: 29922216,
    });
  });

  it('reads server start lines in both world formats', () => {
    // THEN version, worlds and Steam link changes are read
    expect(ofType(crossplay, 'serverVersion')[0]).toMatchObject({ version: '1.0.21', networkVersion: 41 });
    expect(ofType(crossplay, 'worldLoaded')[0]).toMatchObject({ world: 'Cotil', saveNumber: 1183 });
    expect(ofType(steamOnly, 'worldLoaded')[0]).toMatchObject({ world: 'Midgard', saveNumber: null });
    expect(ofType(crossplay, 'gameServer').map((e) => e.isConnected)).toEqual([true, false]);
  });
});

describe('parseMessage', () => {
  it('reads every refused join reason', () => {
    // GIVEN one message per reason
    const messages = [
      ['Peer 76561198000000002 has wrong password', 'wrongPassword'],
      ['Peer 76561198000000002 has incompatible version, mine:41 remote 40', 'incompatibleVersion'],
      ['Peer 76561198000000002 is blacklisted or not in whitelist.', 'notPermitted'],
      ['Peer 76561198000000002 has invalid session ticket', 'invalidSessionTicket'],
      ['Peer 76561198000000002 disconnected due to server is full', 'serverFull'],
      ['The player with the ID 123 is blocked by the server owner (you), disconnecting them!', 'blockedByHost'],
      ['Peer A1B2 disconnected because they were not authenticated!', 'notAuthenticated'],
      ['Peer diconnected due to server platform privileges disallowing crossplay. Server platform: Steam', 'crossplayNotAllowed'],
    ];

    // WHEN each message is read
    const events = messages.map(([message]) => parseMessage(message!, '2026-01-01T00:00:00.000Z'));

    // THEN each gets its reason
    expect(events.map((e) => (e.type === 'joinRefused' ? e.reason : e.type))).toEqual(messages.map(([, r]) => r));
  });

  it('reads build log plugin lines, with null for an unknown builder', () => {
    // GIVEN a built piece and two destroyed pieces, one by an unknown builder
    const messages = [
      'Piece built: wood_floor_1x1 by Ragnar',
      'Piece destroyed: piece_groundtorch_wood built by Ragnar',
      'Piece destroyed: stake_wall built by an unknown player',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN the piece and the builder come out of each line
    expect(events).toEqual([
      { type: 'pieceBuilt', timeUtc: '2026-01-01T00:00:00.000Z', piece: 'wood_floor_1x1', builder: 'Ragnar' },
      { type: 'pieceDestroyed', timeUtc: '2026-01-01T00:00:00.000Z', piece: 'piece_groundtorch_wood', builder: 'Ragnar' },
      { type: 'pieceDestroyed', timeUtc: '2026-01-01T00:00:00.000Z', piece: 'stake_wall', builder: null },
    ]);
  });

  it('keeps an unknown message as another line', () => {
    // WHEN an upkeep message is read
    const event = parseMessage('Update PlayFab entity token', '2026-01-01T00:00:00.000Z');

    // THEN it is kept as a timestamped other line
    expect(event).toEqual({
      type: 'otherLine',
      timeUtc: '2026-01-01T00:00:00.000Z',
      message: 'Update PlayFab entity token',
      isEngineLine: false,
    });
  });
});

describe('readLine', () => {
  it('skips lines before the first timestamp and empty lines', () => {
    // GIVEN a new reader
    const reader = createLogReader(0);

    // WHEN an engine line, a timestamped line and an empty line arrive one at a time
    const events = ['Mono path[0] = C:/Valheim', '10/29/2026 02:42:23: Game server connected', ''].map((line) =>
      readLine(reader, line),
    );

    // THEN only the timestamped line gives an event
    expect(events).toEqual([null, { type: 'gameServer', timeUtc: '2026-10-29T02:42:23.000Z', isConnected: true }, null]);
  });
});
