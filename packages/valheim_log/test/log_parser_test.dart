import 'package:test/test.dart';
import 'package:valheim_log/valheim_log.dart';

import 'common.dart';

void main() {
  late List<LogEvent> crossplay;
  late List<LogEvent> steamOnly;

  setUpAll(() {
    // GIVEN the crossplay and Steam-only sample logs from a server 7 hours behind UTC
    // WHEN they are parsed
    crossplay = parseSample(crossplayLog);
    steamOnly = parseSample(steamOnlyLog);
  });

  test('gives every crossplay line one event, in log order', () {
    // THEN each line maps to its event and nothing is dropped
    expect(crossplay.map((e) => e.runtimeType).toList(), [
      ServerVersionEvent,
      WorldLoadedEvent,
      KnownPlayerEvent,
      GameServerEvent,
      PlayerConnectingEvent,
      PlayerCountEvent,
      SteamLinkedEvent,
      HandshakeEvent,
      CharacterSpawnedEvent,
      PlayerDiedEvent,
      CharacterSpawnedEvent,
      RaidCheckEvent,
      RaidStartedEvent,
      DiskSpaceEvent,
      OtherLineEvent,
      WorldSaveStepEvent,
      WorldSaveStepEvent,
      BackupCreatedEvent,
      PlayerDisconnectingEvent,
      PlayerLeftEvent,
      PlayerLeftEvent,
      OtherLineEvent,
      PlayerCountEvent,
      GameServerEvent,
      ServerStoppedEvent,
    ]);
  });

  test('gives every Steam-only line one event, in log order', () {
    // THEN older and Steam-only lines map to the same events
    expect(steamOnly.map((e) => e.runtimeType).toList(), [
      WorldLoadedEvent,
      PlayerConnectingEvent,
      JoinRefusedEvent,
      SocketClosedEvent,
      PlayerConnectingEvent,
      HandshakeEvent,
      CharacterSpawnedEvent,
      NightSkippedEvent,
      WorldSaveStepEvent,
      PlayerDisconnectingEvent,
      SocketClosedEvent,
      OtherLineEvent,
    ]);
  });

  test('moves server local time to UTC', () {
    // THEN 02:42:15 at UTC-7 is 09:42:15 UTC
    expect(crossplay.first.timeUtc, DateTime.utc(2026, 10, 29, 9, 42, 15));
  });

  test('gives lines without a timestamp the time of the line before', () {
    // THEN the engine line and OnApplicationQuit take the earlier times
    final engineLine = crossplay.whereType<OtherLineEvent>().last;
    expect([engineLine.message, engineLine.isEngineLine], ['ZPlayFabSocket::Dispose. State: CLOSED', true]);
    expect(engineLine.timeUtc, DateTime.utc(2026, 10, 29, 10, 56, 36));
    expect(crossplay.last.timeUtc, DateTime.utc(2026, 10, 29, 23, 19, 51));
  });

  test('reads player IDs and character names', () {
    // THEN the Steam name, Steam ID, PlayFab ID and character come out of their lines
    final known = crossplay.whereType<KnownPlayerEvent>().single;
    expect([known.steamName, known.steamId], ['Tony Example', 'Steam_76561198000000001']);
    final linked = crossplay.whereType<SteamLinkedEvent>().single;
    expect([linked.playFabId, linked.steamId], ['A1B2C3D4E5F60718', 'Steam_76561198000000001']);
    expect(crossplay.whereType<HandshakeEvent>().single.connectionId, 'A1B2C3D4E5F60718');
    final spawned = crossplay.whereType<CharacterSpawnedEvent>().first;
    expect([spawned.character, spawned.peerId], ['Ragnar', '549297305']);
    expect(crossplay.whereType<PlayerLeftEvent>().first.peerId, '549297305');
    expect(crossplay.whereType<PlayerDiedEvent>().single.character, 'Ragnar');
  });

  test('reads Steam-only connection lines with the Steam ID prefix the history uses', () {
    // THEN Steam ID numbers become Steam_ IDs
    final connecting = steamOnly.whereType<PlayerConnectingEvent>().first;
    expect([connecting.connectionId, connecting.steamId], ['76561198000000002', 'Steam_76561198000000002']);
    expect(steamOnly.whereType<HandshakeEvent>().single.connectionId, '76561198000000002');
    expect(steamOnly.whereType<SocketClosedEvent>().first.steamId, 'Steam_76561198000000002');
  });

  test('reads player counts after a join and a leave', () {
    // THEN the counts and the direction match the lines
    final counts = crossplay.whereType<PlayerCountEvent>().toList();
    expect([counts[0].players, counts[0].isJoin], [1, true]);
    expect([counts[1].players, counts[1].isJoin], [0, false]);
  });

  test('reads raids and night skips', () {
    // THEN the raid check, raid name and the day that starts are read
    expect(crossplay.whereType<RaidCheckEvent>().single.possibleRaids, 1);
    expect(crossplay.whereType<RaidStartedEvent>().single.raid, 'army_eikthyr');
    expect(steamOnly.whereType<NightSkippedEvent>().single.day, 3);
  });

  test('reads world save, backup and disk space values', () {
    // THEN the save number, step times, backup name and byte counts are read
    final steps = crossplay.whereType<WorldSaveStepEvent>().toList();
    expect([steps[0].step, steps[0].saveNumber, steps[0].durationMs], [1, 1189, 0]);
    expect([steps[1].step, steps[1].saveNumber, steps[1].durationMs], [5, null, 40]);
    final legacySave = steamOnly.whereType<WorldSaveStepEvent>().single;
    expect([legacySave.step, legacySave.durationMs], [5, 120]);
    expect(crossplay.whereType<BackupCreatedEvent>().single.backup, 'Cotil_backup_auto-20261029-035216');
    final disk = crossplay.whereType<DiskSpaceEvent>().single;
    expect(
      [disk.availableBytes, disk.blockedBelowBytes, disk.warnBelowBytes, disk.isLow],
      [278647042048, 14961108, 29922216, false],
    );
  });

  test('reads server start lines in both world formats', () {
    // THEN version, worlds and Steam link changes are read
    final version = crossplay.whereType<ServerVersionEvent>().single;
    expect([version.version, version.networkVersion], ['1.0.21', 41]);
    final world = crossplay.whereType<WorldLoadedEvent>().single;
    expect([world.world, world.saveNumber], ['Cotil', 1183]);
    final legacyWorld = steamOnly.whereType<WorldLoadedEvent>().single;
    expect([legacyWorld.world, legacyWorld.saveNumber], ['Midgard', null]);
    expect(crossplay.whereType<GameServerEvent>().map((e) => e.isConnected).toList(), [true, false]);
  });

  test('reads every refused join reason', () {
    // GIVEN one message per reason
    const messages = {
      'Peer 76561198000000002 has wrong password': JoinRefusedReason.wrongPassword,
      'Peer 76561198000000002 has incompatible version, mine:41 remote 40': JoinRefusedReason.incompatibleVersion,
      'Peer 76561198000000002 is blacklisted or not in whitelist.': JoinRefusedReason.notPermitted,
      'Peer 76561198000000002 has invalid session ticket': JoinRefusedReason.invalidSessionTicket,
      'Peer 76561198000000002 disconnected due to server is full': JoinRefusedReason.serverFull,
      'The player with the ID 123 is blocked by the server owner (you), disconnecting them!':
          JoinRefusedReason.blockedByHost,
      'Peer A1B2 disconnected because they were not authenticated!': JoinRefusedReason.notAuthenticated,
      'Peer diconnected due to server platform privileges disallowing crossplay. Server platform: Steam':
          JoinRefusedReason.crossplayNotAllowed,
    };
    const parser = LogParser(serverUtcOffset: Duration.zero);

    // WHEN each message is read
    final reasons = messages.keys.map((m) => (parser.parseMessage(m, DateTime.utc(2026)) as JoinRefusedEvent).reason);

    // THEN each gets its reason
    expect(reasons.toList(), messages.values.toList());
  });

  test('keeps an unknown message as another line', () {
    // GIVEN a parser
    const parser = LogParser(serverUtcOffset: Duration.zero);

    // WHEN an upkeep message is read
    final event = parser.parseMessage('Update PlayFab entity token', DateTime.utc(2026)) as OtherLineEvent;

    // THEN it is kept as a timestamped other line
    expect([event.message, event.isEngineLine], ['Update PlayFab entity token', false]);
  });
}
