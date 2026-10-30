import type { JoinRefusedReason } from '#/models';

/** Start of a timestamped line: `10/29/2026 02:43:13: message`. Month comes first. */
export const TIMESTAMP_PATTERN =
  /^(?<month>\d{2})\/(?<day>\d{2})\/(?<year>\d{4}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}): (?<message>.*)$/;

/** A player the server knew at startup. */
export const KNOWN_PLAYER_PATTERN =
  /^Player history entry with index \d+:\s+(?<steamName>.+) \((?<steamId>\w+_\d+), [0-9A-F]+\)$/;

/** Crossplay: a new connection opened. */
export const PLAYFAB_CONNECTED_PATTERN = /^PlayFab listen socket child connected to remote player (?<playFabId>[0-9A-F]+)$/;

/** Crossplay: links a connection's PlayFab ID to a Steam ID. */
export const STEAM_LINKED_PATTERN =
  /^PlayFab socket with remote ID playfab\/(?<playFabId>[0-9A-F]+) received local Platform ID (?<steamId>\w+_\d+)$/;

/** Steam only: a new connection opened. */
export const STEAM_CONNECTED_PATTERN = /^Got connection SteamID (?<steamId>\d+)$/;

/** A connection finished its handshake: `playfab/<PlayFab ID>` or a Steam ID. */
export const HANDSHAKE_PATTERN = /^Got handshake from client (?:playfab\/)?(?<connectionId>\S+)$/;

/** A character spawned. Peer ID `0` and object ID `0` mean the character died. */
export const CHARACTER_PATTERN = /^Got character ZDOID from (?<character>.+) : (?<peerId>-?\d+):(?<objectId>\d+)$/;

/** A player's objects were removed after they left. */
export const OBJECTS_REMOVED_PATTERN = /^Destroying abandoned non persistent zdo -?\d+:\d+ owner (?<peerId>-?\d+)$/;

/** Crossplay: player count after a join or a leave. */
export const PLAYER_COUNT_PATTERN =
  /^Player (?<change>joined|connection lost) server ".+" that has join code \d*, now (?<players>\d+) player\(s\)$/;

/** A player is disconnecting: a request, or a timeout when `ZRpc timeout detected`. */
export const DISCONNECT_PATTERN = /^(?:RPC_Disconnect$|(?<timeout>ZRpc timeout detected))/;

/** Steam only: a connection closed. Socket `0` is not a player. */
export const SOCKET_CLOSED_PATTERN = /^Closing socket (?<steamId>[1-9]\d*)$/;

/** Text in a refused join line, mapped to its reason. */
export const REFUSED_JOIN_REASONS: ReadonlyMap<string, JoinRefusedReason> = new Map([
  ['has wrong password', 'wrongPassword'],
  ['has incompatible version', 'incompatibleVersion'],
  ['is blacklisted or not in whitelist', 'notPermitted'],
  ['has invalid session ticket', 'invalidSessionTicket'],
  ['server is full', 'serverFull'],
  ['is blocked by the server owner', 'blockedByHost'],
  ['were not authenticated', 'notAuthenticated'],
  ['disallowing crossplay', 'crossplayNotAllowed'],
]);

/** A join the server refused, matched by the text that gives the reason. */
export const REFUSED_JOIN_PATTERN = new RegExp([...REFUSED_JOIN_REASONS.keys()].join('|'));

/** How many raids can start at this check. */
export const POSSIBLE_RAIDS_PATTERN = /^Possible events:(?<count>\d+)$/;

/** A raid started. */
export const RAID_PATTERN = /^Random event set:(?<raid>\w+)$/;

/** A player built a piece. Written by the event log plugin in `plugins/event-log`. */
export const PIECE_BUILT_PATTERN = /^Piece built: (?<piece>\S+) by (?<builder>.+)$/;

/** A built piece was destroyed or removed. Written by the event log plugin in `plugins/event-log`. */
export const PIECE_DESTROYED_PATTERN = /^Piece destroyed: (?<piece>\S+) built by (?<builder>.+)$/;

/** Player the event log plugin writes when it does not know who it was. */
export const UNKNOWN_PLAYER = 'an unknown player';

/** A chat message. Checked first, since the text can hold anything. Written by the event log plugin. */
export const CHAT_PATTERN = /^Chat: (?<character>.+?) (?<kind>said|shouted|whispered): (?<text>.*)$/;

/** A player pinged the map at a spot in world coordinates. Written by the event log plugin. */
export const PING_PATTERN = /^Ping: (?<character>.+) at (?<x>-?\d+) (?<z>-?\d+)$/;

/** A global key was set or removed, such as `defeated_eikthyr` when a boss dies. Written by the event log plugin. */
export const GLOBAL_KEY_PATTERN = /^Global key (?<change>set|removed): (?<key>.+)$/;

/** A raid ended. Written by the event log plugin. */
export const RAID_ENDED_PATTERN = /^Raid ended: (?<raid>\w+)$/;

/** A player summoned a boss. Written by the event log plugin. */
export const BOSS_SUMMONED_PATTERN = /^Boss summoned: (?<boss>\S+) by (?<summoner>.+)$/;

/** A new in-game day started, numbered as the game shows it. Written by the event log plugin. */
export const DAY_STARTED_PATTERN = /^Day started: (?<day>\d+)$/;

/** Players slept through the night. The day counts from 0. */
export const NIGHT_SKIPPED_PATTERN = /day:(?<day>\d+)/;

/** One step of a world save. Step 1 has the save number, step 5 the total time. */
export const WORLD_SAVE_STEP_PATTERN =
  /^World save \((?<step>\d)\/5\) (?:.+? )?done(?:\. Total time)? \[(?<ms>\d+)ms\](?: => Save number (?<saveNumber>\d+))?$/;

/** A finished world save before version 1.0. */
export const LEGACY_WORLD_SAVED_PATTERN = /^World saved \( ?(?<ms>[\d.]+)ms ?\)$/;

/** An auto backup was written. */
export const BACKUP_PATTERN = /^Backup created in (?<backup>\S+) \[[\d.]+ms\]$/;

/** Free disk space, checked before each save. */
export const DISK_SPACE_PATTERN =
  /^Available space to current user: (?<available>\d+)\. Saving is blocked if below: (?<blockedBelow>\d+) bytes\. Warnings are given if below: (?<warnBelow>\d+)$/;

/** Game version, written at startup. */
export const VERSION_PATTERN = /^Valheim version: ?(?<version>[\d.]+) \(network version (?<network>\d+)\)$/;

/** World loaded at startup: `ZNet.LoadWorld` since 1.0.7, `Load world` before. */
export const WORLD_LOADED_PATTERN =
  /^(?:ZNet\.LoadWorld|Load world): (?<world>.+?) \(.+?\)(?:, save number (?<saveNumber>\d+))?$/;

/** The server's link to Steam went up or down. */
export const GAME_SERVER_PATTERN = /^Game server (?<state>connected|disconnected)$/;

/** The server stopped cleanly. This line may have no timestamp. */
export const SERVER_STOPPED_PATTERN = /OnApplicationQuit/;

/** Prefix the game uses for Steam IDs in crossplay lines and the player history. */
export const STEAM_ID_PREFIX = 'Steam_';

/** Milliseconds in one minute, to apply the server's UTC offset. */
export const MS_PER_MINUTE = 60_000;
