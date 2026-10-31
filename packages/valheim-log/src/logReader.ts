import type { ChatKind, LogEvent, LogReader, Matcher } from '#/models';
import {
  BACKUP_PATTERN,
  BOSS_SUMMONED_PATTERN,
  CHAT_PATTERN,
  DAY_STARTED_PATTERN,
  CHARACTER_PATTERN,
  DISCONNECT_PATTERN,
  DISK_SPACE_PATTERN,
  GAME_SERVER_PATTERN,
  GLOBAL_KEY_PATTERN,
  HANDSHAKE_PATTERN,
  KNOWN_PLAYER_PATTERN,
  LEGACY_WORLD_SAVED_PATTERN,
  MS_PER_MINUTE,
  NIGHT_SKIPPED_PATTERN,
  OBJECTS_REMOVED_PATTERN,
  PIECE_BUILT_PATTERN,
  PIECE_DESTROYED_PATTERN,
  PING_PATTERN,
  PLAYER_COUNT_PATTERN,
  PLAYFAB_CONNECTED_PATTERN,
  POSSIBLE_RAIDS_PATTERN,
  RAID_ENDED_PATTERN,
  RAID_PATTERN,
  REFUSED_JOIN_PATTERN,
  REFUSED_JOIN_REASONS,
  SERVER_STOPPED_PATTERN,
  SOCKET_CLOSED_PATTERN,
  STEAM_CONNECTED_PATTERN,
  STEAM_ID_PREFIX,
  STEAM_LINKED_PATTERN,
  TIMESTAMP_PATTERN,
  UNKNOWN_PLAYER,
  VERSION_PATTERN,
  WORLD_LOADED_PATTERN,
  WORLD_SAVE_STEP_PATTERN,
} from '#/patterns';

/** Reads an optional number group, or null when it did not match. */
const optionalNumber = (value: string | undefined): number | null => (value === undefined ? null : Number(value));

/** Reads a player from the event log plugin, or null when the plugin did not know who it was. */
const playerOf = (player: string | undefined): string | null => (player === UNKNOWN_PLAYER ? null : player!);

/** Every known message, in the order it is checked. */
const MATCHERS: readonly Matcher[] = [
  {
    pattern: CHAT_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chatMessage',
      timeUtc,
      character: groups.character!,
      kind: groups.kind as ChatKind,
      text: groups.text!,
    }),
  },
  {
    pattern: KNOWN_PLAYER_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'knownPlayer', timeUtc, steamName: groups.steamName!, steamId: groups.steamId! }),
  },
  {
    pattern: PLAYFAB_CONNECTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerConnecting', timeUtc, connectionId: groups.playFabId!, steamId: null }),
  },
  {
    pattern: STEAM_CONNECTED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'playerConnecting',
      timeUtc,
      connectionId: groups.steamId!,
      steamId: `${STEAM_ID_PREFIX}${groups.steamId}`,
    }),
  },
  {
    pattern: STEAM_LINKED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'steamLinked', timeUtc, playFabId: groups.playFabId!, steamId: groups.steamId! }),
  },
  {
    pattern: HANDSHAKE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'handshake', timeUtc, connectionId: groups.connectionId! }),
  },
  {
    pattern: CHARACTER_PATTERN,
    toEvent: (groups, timeUtc) =>
      groups.peerId === '0' && groups.objectId === '0'
        ? { type: 'playerDied', timeUtc, character: groups.character! }
        : { type: 'characterSpawned', timeUtc, character: groups.character!, peerId: groups.peerId! },
  },
  {
    pattern: OBJECTS_REMOVED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerLeft', timeUtc, peerId: groups.peerId! }),
  },
  {
    pattern: PLAYER_COUNT_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'playerCount',
      timeUtc,
      players: Number(groups.players),
      isJoin: groups.change === 'joined',
    }),
  },
  {
    pattern: DISCONNECT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerDisconnecting', timeUtc, isTimeout: groups.timeout !== undefined }),
  },
  {
    pattern: SOCKET_CLOSED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'socketClosed', timeUtc, steamId: `${STEAM_ID_PREFIX}${groups.steamId}` }),
  },
  {
    pattern: POSSIBLE_RAIDS_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidCheck', timeUtc, possibleRaids: Number(groups.count) }),
  },
  {
    pattern: RAID_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidStarted', timeUtc, raid: groups.raid! }),
  },
  {
    pattern: PIECE_BUILT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceBuilt', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: PIECE_DESTROYED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceDestroyed', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: WORLD_SAVE_STEP_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: Number(groups.step),
      durationMs: Number(groups.ms),
      saveNumber: optionalNumber(groups.saveNumber),
    }),
  },
  {
    pattern: LEGACY_WORLD_SAVED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: 5,
      durationMs: Math.round(Number(groups.ms)),
      saveNumber: null,
    }),
  },
  {
    pattern: BACKUP_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'backupCreated', timeUtc, backup: groups.backup! }),
  },
  {
    pattern: DISK_SPACE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'diskSpace',
      timeUtc,
      availableBytes: Number(groups.available),
      blockedBelowBytes: Number(groups.blockedBelow),
      warnBelowBytes: Number(groups.warnBelow),
    }),
  },
  {
    pattern: VERSION_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'serverVersion',
      timeUtc,
      version: groups.version!,
      networkVersion: Number(groups.network),
    }),
  },
  {
    pattern: WORLD_LOADED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldLoaded',
      timeUtc,
      world: groups.world!,
      saveNumber: optionalNumber(groups.saveNumber),
    }),
  },
  {
    pattern: GAME_SERVER_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'gameServer', timeUtc, isConnected: groups.state === 'connected' }),
  },
  {
    pattern: SERVER_STOPPED_PATTERN,
    toEvent: (_, timeUtc) => ({ type: 'serverStopped', timeUtc }),
  },
  {
    pattern: PING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'ping',
      timeUtc,
      character: groups.character!,
      x: Number(groups.x),
      z: Number(groups.z),
    }),
  },
  {
    pattern: GLOBAL_KEY_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'globalKey', timeUtc, key: groups.key!, isSet: groups.change === 'set' }),
  },
  {
    pattern: RAID_ENDED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidEnded', timeUtc, raid: groups.raid! }),
  },
  {
    pattern: BOSS_SUMMONED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'bossSummoned',
      timeUtc,
      boss: groups.boss!,
      summoner: playerOf(groups.summoner),
    }),
  },
  {
    pattern: DAY_STARTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'dayStarted', timeUtc, day: Number(groups.day) }),
  },
  {
    pattern: REFUSED_JOIN_PATTERN,
    toEvent: (_, timeUtc, message) => ({
      type: 'joinRefused',
      timeUtc,
      reason: REFUSED_JOIN_REASONS.get(REFUSED_JOIN_PATTERN.exec(message)![0])!,
      message,
    }),
  },
  {
    pattern: NIGHT_SKIPPED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'nightSkipped', timeUtc, day: Number(groups.day) + 1 }),
  },
];

/**
 * Returns the event for one log [message] at [timeUtc]. A message that matches no pattern becomes an
 * `otherLine` event, so nothing in the log is lost.
 */
export const parseMessage = (message: string, timeUtc: string): LogEvent => {
  for (const { pattern, toEvent } of MATCHERS) {
    const match = pattern.exec(message);
    if (match) {
      return toEvent(match.groups ?? {}, timeUtc, message);
    }
  }
  return { type: 'otherLine', timeUtc, message, isEngineLine: false };
};

/**
 * Creates a reader for a server whose clock is [serverUtcOffsetMinutes] from UTC, for example `-420`.
 * Log times have no time zone: they are the server machine's local time.
 */
export const createLogReader = (serverUtcOffsetMinutes: number): LogReader => ({
  serverUtcOffsetMinutes,
  lastTimeUtc: null,
});

/**
 * Reads one line of `logs.txt` and returns its event, or null for an empty line or a line before the first
 * timestamp. Lines without a timestamp take the time of the line before them.
 */
export const readLine = (reader: LogReader, line: string): LogEvent | null => {
  const match = TIMESTAMP_PATTERN.exec(line);
  if (match) {
    const { year, month, day, hour, minute, second, message } = match.groups!;
    const serverLocalMs = Date.UTC(+year!, +month! - 1, +day!, +hour!, +minute!, +second!);
    reader.lastTimeUtc = new Date(serverLocalMs - reader.serverUtcOffsetMinutes * MS_PER_MINUTE).toISOString();
    return parseMessage(message!, reader.lastTimeUtc);
  }
  if (reader.lastTimeUtc === null || line.trim() === '') {
    return null;
  }
  return SERVER_STOPPED_PATTERN.test(line)
    ? { type: 'serverStopped', timeUtc: reader.lastTimeUtc }
    : { type: 'otherLine', timeUtc: reader.lastTimeUtc, message: line, isEngineLine: true };
};

/**
 * Returns the server-local time a timestamped [line] was written, as `20261030-154344`, or null for a line
 * without a timestamp. The first one names a server run, and names sort in time order.
 */
export const runKeyOf = (line: string): string | null => {
  const groups = TIMESTAMP_PATTERN.exec(line)?.groups;
  if (groups === undefined) {
    return null;
  }
  const { year, month, day, hour, minute, second } = groups;
  return `${year}${month}${day}-${hour}${minute}${second}`;
};

/** Reads all of [log] and returns one event per line, in log order. */
export const parseLog = (log: string, serverUtcOffsetMinutes: number): LogEvent[] => {
  const reader = createLogReader(serverUtcOffsetMinutes);
  return log.split(/\r?\n/).flatMap((line) => readLine(reader, line) ?? []);
};
