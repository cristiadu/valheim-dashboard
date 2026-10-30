/// Why the server refused a join.
enum JoinRefusedReason {
  /// The password did not match.
  wrongPassword,

  /// The player's game version differs from the server's.
  incompatibleVersion,

  /// The player is banned or not on the permitted list.
  notPermitted,

  /// Steam could not verify the player.
  invalidSessionTicket,

  /// The server already has 10 players.
  serverFull,

  /// Crossplay: the host blocked this player.
  blockedByHost,

  /// Crossplay: the player was not signed in to PlayFab.
  notAuthenticated,

  /// Crossplay: the host's platform does not allow the player's platform.
  crossplayNotAllowed,
}

/// How a player session ended.
enum SessionEndReason {
  /// The player disconnected.
  left,

  /// The player's connection timed out.
  timedOut,

  /// The server stopped cleanly while the player was online.
  serverStopped,

  /// The log ended without a clean stop and a new one started, so the server crashed or was killed.
  serverCrashed,
}

/// One event read from `logs.txt`. [timeUtc] is the log time moved to UTC.
sealed class LogEvent {
  /// Creates an event that happened at [timeUtc].
  const LogEvent(this.timeUtc);

  /// When it happened, in UTC.
  final DateTime timeUtc;
}

/// A player the server knew at startup, from its player history.
final class KnownPlayerEvent extends LogEvent {
  /// Creates the event for a Steam account.
  const KnownPlayerEvent(super.timeUtc, {required this.steamName, required this.steamId});

  /// Steam profile name, for example `Tony Example`.
  final String steamName;

  /// Steam ID, for example `Steam_76561198000000001`.
  final String steamId;
}

/// A new connection opened. On a Steam-only server the line also gives the Steam ID.
final class PlayerConnectingEvent extends LogEvent {
  /// Creates the event for [connectionId].
  const PlayerConnectingEvent(super.timeUtc, {required this.connectionId, this.steamId});

  /// PlayFab ID on crossplay, the Steam ID number on Steam-only servers.
  final String connectionId;

  /// Steam ID, for example `Steam_76561198000000001`, when the line has it.
  final String? steamId;
}

/// Crossplay: a connection told the server its Steam ID.
final class SteamLinkedEvent extends LogEvent {
  /// Creates the event linking [playFabId] to [steamId].
  const SteamLinkedEvent(super.timeUtc, {required this.playFabId, required this.steamId});

  /// ID of this one connection.
  final String playFabId;

  /// Steam ID of the player behind it.
  final String steamId;
}

/// A connection finished its handshake. The next character spawn belongs to it.
final class HandshakeEvent extends LogEvent {
  /// Creates the event for [connectionId].
  const HandshakeEvent(super.timeUtc, {required this.connectionId});

  /// PlayFab ID on crossplay, the Steam ID number on Steam-only servers.
  final String connectionId;
}

/// A character spawned in the world: a join or a respawn.
final class CharacterSpawnedEvent extends LogEvent {
  /// Creates the event for [character] on connection [peerId].
  const CharacterSpawnedEvent(super.timeUtc, {required this.character, required this.peerId});

  /// In-game character name, for example `Ragnar`.
  final String character;

  /// ID of the connection in the world, used to match the leave.
  final String peerId;
}

/// A character died.
final class PlayerDiedEvent extends LogEvent {
  /// Creates the event for [character].
  const PlayerDiedEvent(super.timeUtc, {required this.character});

  /// In-game character name.
  final String character;
}

/// A player left: the server removed the objects owned by [peerId].
final class PlayerLeftEvent extends LogEvent {
  /// Creates the event for connection [peerId].
  const PlayerLeftEvent(super.timeUtc, {required this.peerId});

  /// ID of the connection that left.
  final String peerId;
}

/// Crossplay: player count after someone joined or left.
final class PlayerCountEvent extends LogEvent {
  /// Creates the event with the new count.
  const PlayerCountEvent(super.timeUtc, {required this.players, required this.isJoin});

  /// Players online after the change.
  final int players;

  /// True after a join, false after a leave.
  final bool isJoin;
}

/// A player is disconnecting. The line does not name the player; the leave that follows does.
final class PlayerDisconnectingEvent extends LogEvent {
  /// Creates the event.
  const PlayerDisconnectingEvent(super.timeUtc, {required this.isTimeout});

  /// True when the connection timed out instead of the player leaving.
  final bool isTimeout;
}

/// Steam only: a player's connection closed.
final class SocketClosedEvent extends LogEvent {
  /// Creates the event for [steamId].
  const SocketClosedEvent(super.timeUtc, {required this.steamId});

  /// Steam ID, for example `Steam_76561198000000001`.
  final String steamId;
}

/// The server refused a join.
final class JoinRefusedEvent extends LogEvent {
  /// Creates the event for [reason].
  const JoinRefusedEvent(super.timeUtc, {required this.reason, required this.message});

  /// Why the join was refused.
  final JoinRefusedReason reason;

  /// The whole log message, which names the player in some versions.
  final String message;
}

/// The server checked which raids could start. `0` means none can start yet.
final class RaidCheckEvent extends LogEvent {
  /// Creates the event with [possibleRaids].
  const RaidCheckEvent(super.timeUtc, {required this.possibleRaids});

  /// How many raids could start.
  final int possibleRaids;
}

/// A raid started.
final class RaidStartedEvent extends LogEvent {
  /// Creates the event for [raid].
  const RaidStartedEvent(super.timeUtc, {required this.raid});

  /// Raid name, for example `army_eikthyr`.
  final String raid;
}

/// Players slept through the night.
final class NightSkippedEvent extends LogEvent {
  /// Creates the event for in-game [day].
  const NightSkippedEvent(super.timeUtc, {required this.day});

  /// In-game day that starts, counting from 1.
  final int day;
}

/// One step of a world save. Servers before 1.0 log only step 5.
final class WorldSaveStepEvent extends LogEvent {
  /// Creates the event for [step] of 5.
  const WorldSaveStepEvent(super.timeUtc, {required this.step, required this.durationMs, this.saveNumber});

  /// Step from 1 to 5. Step 5 means the save is done.
  final int step;

  /// Time of this step, or of the whole save on step 5, in milliseconds.
  final int durationMs;

  /// Save number, only on step 1.
  final int? saveNumber;
}

/// An auto backup of the world was written.
final class BackupCreatedEvent extends LogEvent {
  /// Creates the event for the [backup] folder.
  const BackupCreatedEvent(super.timeUtc, {required this.backup});

  /// Backup folder name, for example `Cotil_backup_auto-20261029-171221`.
  final String backup;
}

/// Free disk space before a save.
final class DiskSpaceEvent extends LogEvent {
  /// Creates the event with the free space and its limits, in bytes.
  const DiskSpaceEvent(
    super.timeUtc, {
    required this.availableBytes,
    required this.blockedBelowBytes,
    required this.warnBelowBytes,
  });

  /// Free space in bytes.
  final int availableBytes;

  /// Saving stops under this many bytes.
  final int blockedBelowBytes;

  /// The server warns under this many bytes.
  final int warnBelowBytes;

  /// True when the server warns about free space.
  bool get isLow => availableBytes < warnBelowBytes;
}

/// Game version, written at startup.
final class ServerVersionEvent extends LogEvent {
  /// Creates the event for [version].
  const ServerVersionEvent(super.timeUtc, {required this.version, required this.networkVersion});

  /// Game version, for example `1.0.21`.
  final String version;

  /// Network version, for example `41`.
  final int networkVersion;
}

/// World loaded at startup. A new server run starts here.
final class WorldLoadedEvent extends LogEvent {
  /// Creates the event for [world].
  const WorldLoadedEvent(super.timeUtc, {required this.world, this.saveNumber});

  /// World name, for example `Cotil`.
  final String world;

  /// Save number the world was loaded from. Older servers do not log it.
  final int? saveNumber;
}

/// The server's link to Steam went up or down.
final class GameServerEvent extends LogEvent {
  /// Creates the event.
  const GameServerEvent(super.timeUtc, {required this.isConnected});

  /// True when the link came up.
  final bool isConnected;
}

/// The server stopped cleanly.
final class ServerStoppedEvent extends LogEvent {
  /// Creates the event.
  const ServerStoppedEvent(super.timeUtc);
}

/// Any other line, kept so nothing in the log is lost.
final class OtherLineEvent extends LogEvent {
  /// Creates the event for [message].
  const OtherLineEvent(super.timeUtc, {required this.message, required this.isEngineLine});

  /// The message, without the timestamp.
  final String message;

  /// True for Unity engine lines, which have no timestamp and take the time of the line before.
  final bool isEngineLine;
}

/// One stay of a player on the server, from character spawn to leave.
final class PlayerSession {
  /// Creates a session for [character] that started at [startUtc].
  PlayerSession({required this.character, required this.peerId, required this.startUtc, this.steamId, this.steamName});

  /// In-game character name.
  final String character;

  /// ID of the connection in the world.
  final String peerId;

  /// When the character spawned, in UTC.
  final DateTime startUtc;

  /// Steam ID, when the log linked the connection to one.
  final String? steamId;

  /// Steam profile name, when the player is in the server's player history.
  final String? steamName;

  /// Deaths during this session.
  int deaths = 0;

  /// When the session ended, in UTC. Null while the player is online.
  DateTime? endUtc;

  /// Why the session ended. Null while the player is online.
  SessionEndReason? endReason;
}
