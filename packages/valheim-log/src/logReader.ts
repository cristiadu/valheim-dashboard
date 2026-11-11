import { ANYWHERE_MATCHERS } from '#/matchers/anywhere';
import { BUILDING_MATCHERS } from '#/matchers/building';
import { CONNECTION_MATCHERS } from '#/matchers/connections';
import { CREATURE_MATCHERS } from '#/matchers/creatures';
import { ITEM_MATCHERS } from '#/matchers/items';
import { PLAYER_MATCHERS } from '#/matchers/players';
import { WORLD_MATCHERS } from '#/matchers/world';
import type { LogEvent, LogReader, Matcher } from '#/models';
import { MS_PER_MINUTE, SERVER_STOPPED_PATTERN, TIMESTAMP_PATTERN } from '#/patterns';

/**
 * Every known message. Each one but the last group starts with its own words, so their order does not matter; the
 * messages found anywhere in a line come last.
 */
const MATCHERS: readonly Matcher[] = [
  ...CONNECTION_MATCHERS,
  ...WORLD_MATCHERS,
  ...PLAYER_MATCHERS,
  ...BUILDING_MATCHERS,
  ...ITEM_MATCHERS,
  ...CREATURE_MATCHERS,
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
