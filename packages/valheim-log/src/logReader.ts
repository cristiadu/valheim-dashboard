import { heldItemsOf, playerOf } from '#/fields';
import { ANYWHERE_MATCHERS } from '#/matchers/anywhere';
import { CONNECTION_MATCHERS } from '#/matchers/connections';
import { PLAYER_MATCHERS } from '#/matchers/players';
import { WORLD_MATCHERS } from '#/matchers/world';
import type { LogEvent, LogReader, Matcher } from '#/models';
import {
  ATE_PATTERN,
  ATE_SOMETHING_PATTERN,
  CHEST_CONTENTS_PATTERN,
  CHEST_LABEL_PATTERN,
  CHEST_PATTERN,
  CHEST_REMOVED_PATTERN,
  CHEST_UNLABELED_PATTERN,
  CREATURE_KILLED_PATTERN,
  DEPLETED_PATTERN,
  DROPPED_PATTERN,
  FOOD_STARTED_PATTERN,
  FUELED_PATTERN,
  HARVESTED_PATTERN,
  ITEM_HUNG_PATTERN,
  LEVIATHAN_GONE_PATTERN,
  LEVIATHAN_PATTERN,
  MADE_PATTERN,
  MS_PER_MINUTE,
  OBLITERATED_PATTERN,
  PET_NAMED_PATTERN,
  PICKED_UP_PATTERN,
  PIECE_BUILT_PATTERN,
  PIECE_DESTROYED_PATTERN,
  PLANTED_PATTERN,
  PORTAL_NAMED_PATTERN,
  REPAIRED_PATTERN,
  SADDLED_PATTERN,
  SERVER_STOPPED_PATTERN,
  SMELTING_PATTERN,
  TAME_CHANGES,
  TAME_FOLLOWING_PATTERN,
  TAME_PATTERN,
  TIMESTAMP_PATTERN,
  TOMBSTONE_EMPTIED_PATTERN,
  TOMBSTONE_PATTERN,
  UPGRADED_PATTERN,
  WARD_ACCESS_PATTERN,
  WARD_PATTERN,
} from '#/patterns';

/**
 * Every known message. Each one but the last group starts with its own words, so their order does not matter; the
 * messages found anywhere in a line come last.
 */
const MATCHERS: readonly Matcher[] = [
  ...CONNECTION_MATCHERS,
  ...WORLD_MATCHERS,
  ...PLAYER_MATCHERS,
  {
    pattern: PIECE_BUILT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceBuilt', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: PIECE_DESTROYED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceDestroyed', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: PORTAL_NAMED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'portalNamed', timeUtc, portal: groups.portal!, player: playerOf(groups.player) }),
  },
  {
    pattern: WARD_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wardChanged',
      timeUtc,
      ward: groups.ward!,
      builder: playerOf(groups.builder),
      isOn: groups.state === 'on',
    }),
  },
  {
    pattern: WARD_ACCESS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wardAccess',
      timeUtc,
      player: groups.player!,
      ward: groups.ward!,
      builder: playerOf(groups.builder),
      isGiven: groups.change === 'given',
    }),
  },
  {
    pattern: REPAIRED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'repaired', timeUtc, piece: groups.piece!, player: playerOf(groups.player) }),
  },
  {
    pattern: FUELED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'fueled', timeUtc, fire: groups.fire!, player: playerOf(groups.player) }),
  },
  {
    pattern: CHEST_CONTENTS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chestContents',
      timeUtc,
      id: groups.id!,
      chest: groups.chest!,
      x: Number(groups.x),
      z: Number(groups.z),
      builder: playerOf(groups.builder),
      items: heldItemsOf(groups.items!),
    }),
  },
  {
    pattern: CHEST_REMOVED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'chestRemoved', timeUtc, id: groups.id! }),
  },
  {
    pattern: PICKED_UP_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemPickedUp',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
      isFirstPickup: groups.again === undefined,
      itemId: groups.id ?? null,
    }),
  },
  {
    pattern: DROPPED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemDropped',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
      itemId: groups.id!,
    }),
  },
  {
    pattern: ITEM_HUNG_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'itemHung', timeUtc, item: groups.item!, player: playerOf(groups.player) }),
  },
  {
    pattern: CHEST_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chestChanged',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      chest: groups.chest!,
      player: playerOf(groups.player),
      isStored: groups.change === 'Stored',
    }),
  },
  {
    pattern: HARVESTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'harvested', timeUtc, plant: groups.plant!, player: playerOf(groups.player) }),
  },
  {
    pattern: PLANTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'planted', timeUtc, plant: groups.plant!, player: playerOf(groups.player) }),
  },
  {
    pattern: DEPLETED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'depleted',
      timeUtc,
      kind: groups.kind === 'Tree cut' ? 'tree' : 'rock',
      thing: groups.thing!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: ATE_SOMETHING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'ate', timeUtc, character: groups.character!, item: null }),
  },
  {
    pattern: ATE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'ate', timeUtc, character: groups.character!, item: groups.item! }),
  },
  {
    pattern: SMELTING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'smelting',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      station: groups.station!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: FOOD_STARTED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'foodStarted',
      timeUtc,
      kind: groups.kind === 'Cooking' ? 'cooking' : 'fermenting',
      item: groups.item!,
      station: groups.station!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: MADE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemMade',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      level: 1,
      crafter: groups.crafter!,
    }),
  },
  {
    pattern: UPGRADED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemMade',
      timeUtc,
      item: groups.item!,
      count: 1,
      level: Number(groups.level),
      crafter: groups.crafter!,
    }),
  },
  {
    pattern: OBLITERATED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'obliterated',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: FUELED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'fueled', timeUtc, fire: groups.fire!, player: playerOf(groups.player) }),
  },
  {
    pattern: REPAIRED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'repaired', timeUtc, piece: groups.piece!, player: playerOf(groups.player) }),
  },
  {
    pattern: MAP_SHARED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'mapShared', timeUtc, player: playerOf(groups.player), table: groups.table! }),
  },
  {
    pattern: WARD_ACCESS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wardAccess',
      timeUtc,
      player: groups.player!,
      ward: groups.ward!,
      builder: playerOf(groups.builder),
      isGiven: groups.change === 'given',
    }),
  },
  {
    pattern: DEPLETED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'depleted',
      timeUtc,
      kind: groups.kind === 'Tree cut' ? 'tree' : 'rock',
      thing: groups.thing!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: POSITION_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'position',
      timeUtc,
      character: groups.character!,
      x: Number(groups.x),
      z: Number(groups.z),
    }),
  },
  {
    pattern: CHEST_CONTENTS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chestContents',
      timeUtc,
      id: groups.id!,
      chest: groups.chest!,
      x: Number(groups.x),
      z: Number(groups.z),
      builder: playerOf(groups.builder),
      items: heldItemsOf(groups.items!),
    }),
  },
  {
    pattern: CHEST_REMOVED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'chestRemoved', timeUtc, id: groups.id! }),
  },
  {
    pattern: CHEST_LABEL_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'chestLabeled', timeUtc, id: groups.id!, label: groups.label! }),
  },
  {
    pattern: CHEST_UNLABELED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'chestUnlabeled', timeUtc, id: groups.id! }),
  },
  {
    pattern: LEVIATHAN_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathan', timeUtc, id: groups.id!, x: Number(groups.x), z: Number(groups.z) }),
  },
  {
    pattern: LEVIATHAN_GONE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathanGone', timeUtc, id: groups.id! }),
  },
  {
    pattern: TOMBSTONE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tombstoneContents',
      timeUtc,
      owner: playerOf(groups.owner),
      x: Number(groups.x),
      z: Number(groups.z),
      items: heldItemsOf(groups.items!),
    }),
  },
  {
    pattern: TOMBSTONE_EMPTIED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tombstoneEmptied',
      timeUtc,
      owner: playerOf(groups.owner),
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: CREATURE_KILLED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'creatureKilled',
      timeUtc,
      creature: groups.creature!,
      level: Number(groups.level),
      attackers: groups.attackers!.split(', '),
    }),
  },
  {
    pattern: TAME_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tameChanged',
      timeUtc,
      creature: groups.creature!,
      change: TAME_CHANGES.get(groups.change!)!,
      name: groups.name ?? null,
    }),
  },
  {
    pattern: PET_NAMED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'petNamed', timeUtc, creature: groups.creature!, name: groups.name! }),
  },
  {
    pattern: SADDLED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'saddled', timeUtc, creature: groups.creature!, player: playerOf(groups.player) }),
  },
  {
    pattern: TAME_FOLLOWING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'tameFollowing', timeUtc, creature: groups.creature!, player: groups.player! }),
  },
  {
    pattern: LEVIATHAN_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathan', timeUtc, id: groups.id!, x: Number(groups.x), z: Number(groups.z) }),
  },
  {
    pattern: LEVIATHAN_GONE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathanGone', timeUtc, id: groups.id! }),
  },
  ...ANYWHERE_MATCHERS,
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
