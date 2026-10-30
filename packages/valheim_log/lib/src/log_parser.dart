import 'models.dart';
import 'patterns.dart';

/// Prefix the game uses for Steam IDs in crossplay lines and the player history.
const _steamIdPrefix = 'Steam_';

/// Reads the server's `logs.txt` into events.
///
/// Log times have no time zone: they are the server machine's local time. [serverUtcOffset] is that
/// machine's offset from UTC, for example `Duration(hours: -7)`, and is used to store times as UTC.
class LogParser {
  /// Creates a parser for a server whose clock is [serverUtcOffset] from UTC.
  const LogParser({required this.serverUtcOffset});

  /// Offset of the server's clock from UTC.
  final Duration serverUtcOffset;

  /// Reads every line of [log] and returns one event per line, in log order.
  ///
  /// Lines without a timestamp take the time of the line before them. Empty lines and lines before
  /// the first timestamp are skipped.
  List<LogEvent> parse(String log) {
    final events = <LogEvent>[];
    DateTime? lastTimeUtc;
    for (final line in log.split(RegExp(r'\r?\n'))) {
      final match = timestampPattern.firstMatch(line);
      if (match != null) {
        lastTimeUtc = _toUtc(match);
        events.add(parseMessage(match.namedGroup('message')!, lastTimeUtc));
      } else if (lastTimeUtc != null && line.trim().isNotEmpty) {
        events.add(
          serverStoppedPattern.hasMatch(line)
              ? ServerStoppedEvent(lastTimeUtc)
              : OtherLineEvent(lastTimeUtc, message: line, isEngineLine: true),
        );
      }
    }
    return events;
  }

  /// Returns the event for one log [message] at [timeUtc].
  LogEvent parseMessage(String message, DateTime timeUtc) {
    if (knownPlayerPattern.firstMatch(message) case final m?) {
      return KnownPlayerEvent(timeUtc, steamName: m.namedGroup('steamName')!, steamId: m.namedGroup('steamId')!);
    }
    if (playFabConnectedPattern.firstMatch(message) case final m?) {
      return PlayerConnectingEvent(timeUtc, connectionId: m.namedGroup('playFabId')!);
    }
    if (steamConnectedPattern.firstMatch(message) case final m?) {
      final steamNumber = m.namedGroup('steamId')!;
      return PlayerConnectingEvent(timeUtc, connectionId: steamNumber, steamId: '$_steamIdPrefix$steamNumber');
    }
    if (steamLinkedPattern.firstMatch(message) case final m?) {
      return SteamLinkedEvent(timeUtc, playFabId: m.namedGroup('playFabId')!, steamId: m.namedGroup('steamId')!);
    }
    if (handshakePattern.firstMatch(message) case final m?) {
      return HandshakeEvent(timeUtc, connectionId: m.namedGroup('connectionId')!);
    }
    if (characterPattern.firstMatch(message) case final m?) {
      final character = m.namedGroup('character')!;
      final peerId = m.namedGroup('peerId')!;
      final isDeath = peerId == '0' && m.namedGroup('objectId') == '0';
      return isDeath
          ? PlayerDiedEvent(timeUtc, character: character)
          : CharacterSpawnedEvent(timeUtc, character: character, peerId: peerId);
    }
    if (objectsRemovedPattern.firstMatch(message) case final m?) {
      return PlayerLeftEvent(timeUtc, peerId: m.namedGroup('peerId')!);
    }
    if (playerCountPattern.firstMatch(message) case final m?) {
      return PlayerCountEvent(
        timeUtc,
        players: int.parse(m.namedGroup('players')!),
        isJoin: m.namedGroup('change') == 'joined',
      );
    }
    if (disconnectPattern.firstMatch(message) case final m?) {
      return PlayerDisconnectingEvent(timeUtc, isTimeout: m.namedGroup('timeout') != null);
    }
    if (socketClosedPattern.firstMatch(message) case final m?) {
      return SocketClosedEvent(timeUtc, steamId: '$_steamIdPrefix${m.namedGroup('steamId')!}');
    }
    if (refusedJoinPattern.firstMatch(message) case final m?) {
      return JoinRefusedEvent(timeUtc, reason: refusedJoinReasons[m[0]]!, message: message);
    }
    if (possibleRaidsPattern.firstMatch(message) case final m?) {
      return RaidCheckEvent(timeUtc, possibleRaids: int.parse(m.namedGroup('count')!));
    }
    if (raidPattern.firstMatch(message) case final m?) {
      return RaidStartedEvent(timeUtc, raid: m.namedGroup('raid')!);
    }
    if (worldSaveStepPattern.firstMatch(message) case final m?) {
      final saveNumber = m.namedGroup('saveNumber');
      return WorldSaveStepEvent(
        timeUtc,
        step: int.parse(m.namedGroup('step')!),
        durationMs: int.parse(m.namedGroup('ms')!),
        saveNumber: saveNumber == null ? null : int.parse(saveNumber),
      );
    }
    if (legacyWorldSavedPattern.firstMatch(message) case final m?) {
      return WorldSaveStepEvent(timeUtc, step: 5, durationMs: double.parse(m.namedGroup('ms')!).round());
    }
    if (backupPattern.firstMatch(message) case final m?) {
      return BackupCreatedEvent(timeUtc, backup: m.namedGroup('backup')!);
    }
    if (diskSpacePattern.firstMatch(message) case final m?) {
      return DiskSpaceEvent(
        timeUtc,
        availableBytes: int.parse(m.namedGroup('available')!),
        blockedBelowBytes: int.parse(m.namedGroup('blockedBelow')!),
        warnBelowBytes: int.parse(m.namedGroup('warnBelow')!),
      );
    }
    if (versionPattern.firstMatch(message) case final m?) {
      return ServerVersionEvent(
        timeUtc,
        version: m.namedGroup('version')!,
        networkVersion: int.parse(m.namedGroup('network')!),
      );
    }
    if (worldLoadedPattern.firstMatch(message) case final m?) {
      final saveNumber = m.namedGroup('saveNumber');
      return WorldLoadedEvent(
        timeUtc,
        world: m.namedGroup('world')!,
        saveNumber: saveNumber == null ? null : int.parse(saveNumber),
      );
    }
    if (gameServerPattern.firstMatch(message) case final m?) {
      return GameServerEvent(timeUtc, isConnected: m.namedGroup('state') == 'connected');
    }
    if (serverStoppedPattern.hasMatch(message)) {
      return ServerStoppedEvent(timeUtc);
    }
    if (nightSkippedPattern.firstMatch(message) case final m?) {
      return NightSkippedEvent(timeUtc, day: int.parse(m.namedGroup('day')!) + 1);
    }
    return OtherLineEvent(timeUtc, message: message, isEngineLine: false);
  }

  /// Reads the timestamp in [match] as server local time and returns it in UTC.
  DateTime _toUtc(RegExpMatch match) {
    final serverLocalTime = DateTime.utc(
      int.parse(match.namedGroup('year')!),
      int.parse(match.namedGroup('month')!),
      int.parse(match.namedGroup('day')!),
      int.parse(match.namedGroup('hour')!),
      int.parse(match.namedGroup('minute')!),
      int.parse(match.namedGroup('second')!),
    );
    return serverLocalTime.subtract(serverUtcOffset);
  }
}
