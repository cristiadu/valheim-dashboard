import type { LogEvent, LogReader } from '#/models';
import {
  BACKUP_PATTERN,
  CHARACTER_PATTERN,
  DISCONNECT_PATTERN,
  DISK_SPACE_PATTERN,
  GAME_SERVER_PATTERN,
  HANDSHAKE_PATTERN,
  KNOWN_PLAYER_PATTERN,
  LEGACY_WORLD_SAVED_PATTERN,
  MS_PER_MINUTE,
  NIGHT_SKIPPED_PATTERN,
  OBJECTS_REMOVED_PATTERN,
  PIECE_BUILT_PATTERN,
  PIECE_DESTROYED_PATTERN,
  PLAYER_COUNT_PATTERN,
  PLAYFAB_CONNECTED_PATTERN,
  POSSIBLE_RAIDS_PATTERN,
  RAID_PATTERN,
  REFUSED_JOIN_PATTERN,
  REFUSED_JOIN_REASONS,
  SERVER_STOPPED_PATTERN,
  SOCKET_CLOSED_PATTERN,
  STEAM_CONNECTED_PATTERN,
  STEAM_ID_PREFIX,
  STEAM_LINKED_PATTERN,
  TIMESTAMP_PATTERN,
  UNKNOWN_BUILDER,
  VERSION_PATTERN,
  WORLD_LOADED_PATTERN,
  WORLD_SAVE_STEP_PATTERN,
} from '#/patterns';

/** Named groups of a pattern match. Optional groups that did not match are `undefined` at runtime. */
type Groups = Record<string, string | undefined>;

/** One pattern and how to turn its match into an event. Checked in order; the first match wins. */
type Matcher = {
  pattern: RegExp;
  toEvent: (groups: Groups, timeUtc: string, message: string) => LogEvent;
};

/** Reads an optional number group, or null when it did not match. */
const optionalNumber = (value: string | undefined): number | null => (value === undefined ? null : Number(value));

/** Reads a builder from the build log plugin, or null when the plugin did not know who built the piece. */
const builderOf = (builder: string | undefined): string | null => (builder === UNKNOWN_BUILDER ? null : builder!);

/** Every known message, in the order it is checked. */
const MATCHERS: readonly Matcher[] = [
  {
    pattern: KNOWN_PLAYER_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'knownPlayer', timeUtc, steamName: g.steamName!, steamId: g.steamId! }),
  },
  {
    pattern: PLAYFAB_CONNECTED_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'playerConnecting', timeUtc, connectionId: g.playFabId!, steamId: null }),
  },
  {
    pattern: STEAM_CONNECTED_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'playerConnecting',
      timeUtc,
      connectionId: g.steamId!,
      steamId: `${STEAM_ID_PREFIX}${g.steamId}`,
    }),
  },
  {
    pattern: STEAM_LINKED_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'steamLinked', timeUtc, playFabId: g.playFabId!, steamId: g.steamId! }),
  },
  {
    pattern: HANDSHAKE_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'handshake', timeUtc, connectionId: g.connectionId! }),
  },
  {
    pattern: CHARACTER_PATTERN,
    toEvent: (g, timeUtc) =>
      g.peerId === '0' && g.objectId === '0'
        ? { type: 'playerDied', timeUtc, character: g.character! }
        : { type: 'characterSpawned', timeUtc, character: g.character!, peerId: g.peerId! },
  },
  {
    pattern: OBJECTS_REMOVED_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'playerLeft', timeUtc, peerId: g.peerId! }),
  },
  {
    pattern: PLAYER_COUNT_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'playerCount',
      timeUtc,
      players: Number(g.players),
      isJoin: g.change === 'joined',
    }),
  },
  {
    pattern: DISCONNECT_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'playerDisconnecting', timeUtc, isTimeout: g.timeout !== undefined }),
  },
  {
    pattern: SOCKET_CLOSED_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'socketClosed', timeUtc, steamId: `${STEAM_ID_PREFIX}${g.steamId}` }),
  },
  {
    pattern: POSSIBLE_RAIDS_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'raidCheck', timeUtc, possibleRaids: Number(g.count) }),
  },
  {
    pattern: RAID_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'raidStarted', timeUtc, raid: g.raid! }),
  },
  {
    pattern: PIECE_BUILT_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'pieceBuilt', timeUtc, piece: g.piece!, builder: builderOf(g.builder) }),
  },
  {
    pattern: PIECE_DESTROYED_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'pieceDestroyed', timeUtc, piece: g.piece!, builder: builderOf(g.builder) }),
  },
  {
    pattern: WORLD_SAVE_STEP_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: Number(g.step),
      durationMs: Number(g.ms),
      saveNumber: optionalNumber(g.saveNumber),
    }),
  },
  {
    pattern: LEGACY_WORLD_SAVED_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: 5,
      durationMs: Math.round(Number(g.ms)),
      saveNumber: null,
    }),
  },
  {
    pattern: BACKUP_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'backupCreated', timeUtc, backup: g.backup! }),
  },
  {
    pattern: DISK_SPACE_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'diskSpace',
      timeUtc,
      availableBytes: Number(g.available),
      blockedBelowBytes: Number(g.blockedBelow),
      warnBelowBytes: Number(g.warnBelow),
    }),
  },
  {
    pattern: VERSION_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'serverVersion',
      timeUtc,
      version: g.version!,
      networkVersion: Number(g.network),
    }),
  },
  {
    pattern: WORLD_LOADED_PATTERN,
    toEvent: (g, timeUtc) => ({
      type: 'worldLoaded',
      timeUtc,
      world: g.world!,
      saveNumber: optionalNumber(g.saveNumber),
    }),
  },
  {
    pattern: GAME_SERVER_PATTERN,
    toEvent: (g, timeUtc) => ({ type: 'gameServer', timeUtc, isConnected: g.state === 'connected' }),
  },
  {
    pattern: SERVER_STOPPED_PATTERN,
    toEvent: (_, timeUtc) => ({ type: 'serverStopped', timeUtc }),
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
    toEvent: (g, timeUtc) => ({ type: 'nightSkipped', timeUtc, day: Number(g.day) + 1 }),
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
