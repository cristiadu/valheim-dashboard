import 'models.dart';

/// Text in a refused join line, mapped to its reason.
const refusedJoinReasons = {
  'has wrong password': JoinRefusedReason.wrongPassword,
  'has incompatible version': JoinRefusedReason.incompatibleVersion,
  'is blacklisted or not in whitelist': JoinRefusedReason.notPermitted,
  'has invalid session ticket': JoinRefusedReason.invalidSessionTicket,
  'server is full': JoinRefusedReason.serverFull,
  'is blocked by the server owner': JoinRefusedReason.blockedByHost,
  'were not authenticated': JoinRefusedReason.notAuthenticated,
  'disallowing crossplay': JoinRefusedReason.crossplayNotAllowed,
};

/// Start of a timestamped line: `10/29/2026 02:43:13: message`. Month comes first.
final timestampPattern = RegExp(
  r'^(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}): (?<message>.*)$',
);

/// A player the server knew at startup.
final knownPlayerPattern = RegExp(
  r'^Player history entry with index \d+:\s+(?<steamName>.+) \((?<steamId>\w+_\d+), [0-9A-F]+\)$',
);

/// Crossplay: a new connection opened.
final playFabConnectedPattern = RegExp(
  r'^PlayFab listen socket child connected to remote player (?<playFabId>[0-9A-F]+)$',
);

/// Crossplay: links a connection's PlayFab ID to a Steam ID.
final steamLinkedPattern = RegExp(
  r'^PlayFab socket with remote ID playfab/(?<playFabId>[0-9A-F]+) received local Platform ID (?<steamId>\w+_\d+)$',
);

/// Steam only: a new connection opened.
final steamConnectedPattern = RegExp(r'^Got connection SteamID (?<steamId>\d+)$');

/// A connection finished its handshake: `playfab/<PlayFab ID>` or a Steam ID.
final handshakePattern = RegExp(r'^Got handshake from client (?:playfab/)?(?<connectionId>\S+)$');

/// A character spawned. Peer ID `0` and object ID `0` mean the character died.
final characterPattern = RegExp(r'^Got character ZDOID from (?<character>.+) : (?<peerId>-?\d+):(?<objectId>\d+)$');

/// A player's objects were removed after they left.
final objectsRemovedPattern = RegExp(r'^Destroying abandoned non persistent zdo -?\d+:\d+ owner (?<peerId>-?\d+)$');

/// Crossplay: player count after a join or a leave.
final playerCountPattern = RegExp(
  r'^Player (?<change>joined|connection lost) server ".+" that has join code \d*, now (?<players>\d+) player\(s\)$',
);

/// A player is disconnecting: a request, or a timeout when `ZRpc timeout detected`.
final disconnectPattern = RegExp(r'^(?:RPC_Disconnect$|(?<timeout>ZRpc timeout detected))');

/// Steam only: a connection closed. Socket `0` is not a player.
final socketClosedPattern = RegExp(r'^Closing socket (?<steamId>[1-9]\d*)$');

/// A join the server refused, matched by the text that gives the reason.
final refusedJoinPattern = RegExp(refusedJoinReasons.keys.map(RegExp.escape).join('|'));

/// How many raids can start at this check.
final possibleRaidsPattern = RegExp(r'^Possible events:(?<count>\d+)$');

/// A raid started.
final raidPattern = RegExp(r'^Random event set:(?<raid>\w+)$');

/// Players slept through the night. The day counts from 0.
final nightSkippedPattern = RegExp(r'day:(?<day>\d+)');

/// One step of a world save. Step 1 has the save number, step 5 the total time.
final worldSaveStepPattern = RegExp(
  r'^World save \((?<step>\d)/5\) (?:.+? )?done(?:\. Total time)? \[(?<ms>\d+)ms\](?: => Save number (?<saveNumber>\d+))?$',
);

/// A finished world save before version 1.0.
final legacyWorldSavedPattern = RegExp(r'^World saved \( ?(?<ms>[\d.]+)ms ?\)$');

/// An auto backup was written.
final backupPattern = RegExp(r'^Backup created in (?<backup>\S+) \[[\d.]+ms\]$');

/// Free disk space, checked before each save.
final diskSpacePattern = RegExp(
  r'^Available space to current user: (?<available>\d+)\. Saving is blocked if below: (?<blockedBelow>\d+) bytes\. Warnings are given if below: (?<warnBelow>\d+)$',
);

/// Game version, written at startup.
final versionPattern = RegExp(r'^Valheim version: ?(?<version>[\d.]+) \(network version (?<network>\d+)\)$');

/// World loaded at startup: `ZNet.LoadWorld` since 1.0.7, `Load world` before.
final worldLoadedPattern = RegExp(
  r'^(?:ZNet\.LoadWorld|Load world): (?<world>.+?) \(.+?\)(?:, save number (?<saveNumber>\d+))?$',
);

/// The server's link to Steam went up or down.
final gameServerPattern = RegExp(r'^Game server (?<state>connected|disconnected)$');

/// The server stopped cleanly. This line may have no timestamp.
final serverStoppedPattern = RegExp(r'OnApplicationQuit');
