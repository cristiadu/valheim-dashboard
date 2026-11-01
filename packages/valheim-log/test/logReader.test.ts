import { beforeAll, describe, expect, it } from 'vitest';

import { createLogReader, parseMessage, readLine, runKeyOf } from '#/logReader';
import type { LogEvent } from '#/models';
import { CROSSPLAY_LOG, ofType, parseSample, STEAM_ONLY_LOG } from '#test/common';

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
    expect(crossplay.map((event) => event.type)).toEqual([
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
    expect(steamOnly.map((event) => event.type)).toEqual([
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
    expect(ofType(crossplay, 'playerCount').map((event) => [event.players, event.isJoin])).toEqual([
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
    expect(ofType(crossplay, 'worldSaveStep').map((event) => [event.step, event.saveNumber, event.durationMs])).toEqual([
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
    expect(ofType(crossplay, 'gameServer').map((event) => event.isConnected)).toEqual([true, false]);
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
    expect(events.map((event) => (event.type === 'joinRefused' ? event.reason : event.type))).toEqual(messages.map(([, r]) => r));
  });

  it('reads piece lines, with null for an unknown builder', () => {
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

  it('reads event log plugin lines, with null for an unknown player', () => {
    // GIVEN one line of each kind the event log plugin writes
    const messages = [
      'Chat: Ragnar shouted: Troll at the gate!',
      'Chat: Ragnar said: hello',
      'Chat: Ragnar whispered: psst',
      'Ping: Ragnar at 120 -340',
      'Global key set: defeated_eikthyr',
      'Global key removed: nomap',
      'Raid ended: army_eikthyr',
      'Boss summoned: Eikthyr by Ragnar',
      'Boss summoned: gd_king by an unknown player',
      'Day started: 42',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event and values
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'chatMessage', timeUtc, character: 'Ragnar', kind: 'shouted', text: 'Troll at the gate!' },
      { type: 'chatMessage', timeUtc, character: 'Ragnar', kind: 'said', text: 'hello' },
      { type: 'chatMessage', timeUtc, character: 'Ragnar', kind: 'whispered', text: 'psst' },
      { type: 'ping', timeUtc, character: 'Ragnar', x: 120, z: -340 },
      { type: 'globalKey', timeUtc, key: 'defeated_eikthyr', isSet: true },
      { type: 'globalKey', timeUtc, key: 'nomap', isSet: false },
      { type: 'raidEnded', timeUtc, raid: 'army_eikthyr' },
      { type: 'bossSummoned', timeUtc, boss: 'Eikthyr', summoner: 'Ragnar' },
      { type: 'bossSummoned', timeUtc, boss: 'gd_king', summoner: null },
      { type: 'dayStarted', timeUtc, day: 42 },
    ]);
  });

  it('reads player lines from the event log plugin', () => {
    // GIVEN one line of each player event, with and without optional parts
    const messages = [
      'Player died: Ragnar in BlackForest while fighting Troll, Greydwarf',
      'Player died: Ragnar in Ocean',
      'Area entered: Ragnar Swamp',
      'Teleported: Ragnar to Home base',
      'Teleported: Ragnar to an unnamed portal',
      'PvP turned on: Ragnar',
      'Went to bed: Ragnar',
      'Gear: Ragnar SwordIron quality 2',
      'Gear: Ragnar ArmorBronzeChest',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event and values
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'deathDetails', timeUtc, character: 'Ragnar', area: 'BlackForest', fighting: ['Troll', 'Greydwarf'] },
      { type: 'deathDetails', timeUtc, character: 'Ragnar', area: 'Ocean', fighting: [] },
      { type: 'areaEntered', timeUtc, character: 'Ragnar', area: 'Swamp' },
      { type: 'teleported', timeUtc, character: 'Ragnar', portal: 'Home base' },
      { type: 'teleported', timeUtc, character: 'Ragnar', portal: null },
      { type: 'pvpChanged', timeUtc, character: 'Ragnar', isOn: true },
      { type: 'wentToBed', timeUtc, character: 'Ragnar' },
      { type: 'gearSeen', timeUtc, character: 'Ragnar', item: 'SwordIron', quality: 2 },
      { type: 'gearSeen', timeUtc, character: 'Ragnar', item: 'ArmorBronzeChest', quality: 1 },
    ]);
  });

  it('reads creature, tame, sign and item stand lines from the event log plugin', () => {
    // GIVEN one line of each kind, with and without optional parts
    const messages = [
      'Creature killed: Troll level 2 by Ragnar, Bjorn',
      'Tamed: Wolf',
      'Tame born: Wolf_cub',
      'Tame grew up: Wolf',
      'Tame died: Wolf Fluffy',
      'Pet named: Wolf Fluffy',
      'Sign written: Ragnar: Keep out: trolls',
      'Sign written: an unknown player: Hi',
      'Item hung: TrophyDeer by Ragnar',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event and values
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'creatureKilled', timeUtc, creature: 'Troll', level: 2, attackers: ['Ragnar', 'Bjorn'] },
      { type: 'tameChanged', timeUtc, creature: 'Wolf', change: 'tamed', name: null },
      { type: 'tameChanged', timeUtc, creature: 'Wolf_cub', change: 'born', name: null },
      { type: 'tameChanged', timeUtc, creature: 'Wolf', change: 'grewUp', name: null },
      { type: 'tameChanged', timeUtc, creature: 'Wolf', change: 'died', name: 'Fluffy' },
      { type: 'petNamed', timeUtc, creature: 'Wolf', name: 'Fluffy' },
      { type: 'signWritten', timeUtc, author: 'Ragnar', text: 'Keep out: trolls' },
      { type: 'signWritten', timeUtc, author: null, text: 'Hi' },
      { type: 'itemHung', timeUtc, item: 'TrophyDeer', player: 'Ragnar' },
    ]);
  });

  it('reads item, chest, harvest and tombstone lines from the event log plugin', () => {
    // GIVEN one line of each kind
    const messages = [
      'Picked up: Wood x20 by Ragnar',
      'Picked up again: Wood x3 by Bjorn',
      'Stored: Wood x20 in piece_chest_wood by Ragnar',
      'Taken: Coins x5 from piece_chest_wood by an unknown player',
      'Harvested: RaspberryBush by Ragnar',
      'Tombstone emptied: Ragnar by Bjorn',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event and values
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'itemPickedUp', timeUtc, item: 'Wood', count: 20, player: 'Ragnar', isFirstPickup: true },
      { type: 'itemPickedUp', timeUtc, item: 'Wood', count: 3, player: 'Bjorn', isFirstPickup: false },
      { type: 'chestChanged', timeUtc, item: 'Wood', count: 20, chest: 'piece_chest_wood', player: 'Ragnar', isStored: true },
      { type: 'chestChanged', timeUtc, item: 'Coins', count: 5, chest: 'piece_chest_wood', player: null, isStored: false },
      { type: 'harvested', timeUtc, plant: 'RaspberryBush', player: 'Ragnar' },
      { type: 'tombstoneEmptied', timeUtc, owner: 'Ragnar', player: 'Bjorn' },
    ]);
  });

  it('reads positions, chest contents and tombstones from the event log plugin', () => {
    // GIVEN a position, a full chest, an empty cart, a removed chest and a tombstone
    const messages = [
      'Position: Ragnar 120 -340',
      'Chest: 52731986:1203 piece_chest_wood at 118 -336 built by Ragnar holds Wood x20, Stone x3',
      'Chest: 52731986:1300 Cart at -5 12 built by Tony Example holds nothing',
      'Chest removed: 52731986:1203',
      'Tombstone: Ragnar at 410 -77 holds SwordBronze x1, Coins x55',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event, with items counted by name
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'position', timeUtc, character: 'Ragnar', x: 120, z: -340 },
      {
        type: 'chestContents',
        timeUtc,
        id: '52731986:1203',
        chest: 'piece_chest_wood',
        x: 118,
        z: -336,
        builder: 'Ragnar',
        items: { Wood: 20, Stone: 3 },
      },
      { type: 'chestContents', timeUtc, id: '52731986:1300', chest: 'Cart', x: -5, z: 12, builder: 'Tony Example', items: {} },
      { type: 'chestRemoved', timeUtc, id: '52731986:1203' },
      { type: 'tombstoneContents', timeUtc, owner: 'Ragnar', x: 410, z: -77, items: { SwordBronze: 1, Coins: 55 } },
    ]);
  });

  it('reads planting, eating, smelting, trees and rocks from the event log plugin', () => {
    // GIVEN one line of each kind
    const messages = [
      'Planted: sapling_carrot by Ragnar',
      'Ate: Ragnar CookedMeat',
      'Smelting: CopperOre x3 in smelter by Bjorn',
      'Tree cut: Beech1 by Ragnar',
      'Rock mined: rock4_copper by an unknown player',
    ];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN each line gives its event and values
    const timeUtc = '2026-01-01T00:00:00.000Z';
    expect(events).toEqual([
      { type: 'planted', timeUtc, plant: 'sapling_carrot', player: 'Ragnar' },
      { type: 'ate', timeUtc, character: 'Ragnar', item: 'CookedMeat' },
      { type: 'smelting', timeUtc, item: 'CopperOre', count: 3, station: 'smelter', player: 'Bjorn' },
      { type: 'depleted', timeUtc, kind: 'tree', thing: 'Beech1', player: 'Ragnar' },
      { type: 'depleted', timeUtc, kind: 'rock', thing: 'rock4_copper', player: null },
    ]);
  });

  it('reads chat as chat even when its text looks like another line', () => {
    // GIVEN chat that holds text other patterns look for
    const messages = ['Chat: Ragnar said: the server is full', 'Chat: Ragnar said: day:3 OnApplicationQuit'];

    // WHEN each message is read
    const events = messages.map((message) => parseMessage(message, '2026-01-01T00:00:00.000Z'));

    // THEN both stay chat messages
    expect(events.map((event) => event.type)).toEqual(['chatMessage', 'chatMessage']);
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

describe('runKeyOf', () => {
  it('names a timestamped line by its server-local time, and gives null without a timestamp', () => {
    // GIVEN a timestamped line and an engine line
    // WHEN / THEN only the timestamped line has a key, in sortable form
    expect(runKeyOf('10/30/2026 15:43:44: Valheim version: 1.0.21 (network version 41)')).toBe('20261030-154344');
    expect(runKeyOf('Mono path[0] = C:/Valheim')).toBeNull();
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
