import type { PlayerSession } from 'valheim-log';

import {
  MINUTES_PER_HOUR,
  MONTHS,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  ONLINE_WINDOW_MS,
  type Snapshot,
  ZONE_CLOCK_OPTIONS,
} from '#/lib/models';

/** One clock reader per time zone, built on first use. */
const zoneClocks = new Map<string, Intl.DateTimeFormat>();

/** True when the run did not stop and its last log line is recent. The clock alone never makes it online. */
export const isServerOnline = (snapshot: Snapshot, nowMs: number): boolean =>
  snapshot.lastLineUtc !== null &&
  snapshot.stoppedUtc === null &&
  nowMs - Date.parse(snapshot.lastLineUtc) <= ONLINE_WINDOW_MS;

/** Players online now: open sessions, and none while the server is offline. */
export const onlinePlayers = (snapshot: Snapshot, nowMs: number): PlayerSession[] =>
  isServerOnline(snapshot, nowMs) ? snapshot.sessions.filter((session) => session.endUtc === null) : [];

/** Time zone name for an offset in minutes, for example `UTC−7` or `UTC+5:30`. */
export const offsetLabel = (offsetMinutes: number): string => {
  if (offsetMinutes === 0) {
    return 'UTC';
  }
  const hours = Math.floor(Math.abs(offsetMinutes) / MINUTES_PER_HOUR);
  const minutes = Math.abs(offsetMinutes) % MINUTES_PER_HOUR;
  return `UTC${offsetMinutes < 0 ? '−' : '+'}${hours}${minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`}`;
};

/** The viewer's time zone from the browser, for example `America/Los_Angeles`. */
export const viewerTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Offset of [timeZone] from UTC in minutes at [ms], for example `-420` for `America/Los_Angeles` in October
 * and `-480` in December. Follows daylight saving time.
 */
export const offsetMinutesAt = (ms: number, timeZone: string): number => {
  const clock = zoneClocks.get(timeZone) ?? new Intl.DateTimeFormat('en-US', { ...ZONE_CLOCK_OPTIONS, timeZone });
  zoneClocks.set(timeZone, clock);
  const parts = Object.fromEntries(clock.formatToParts(ms).map((part) => [part.type, Number(part.value)]));
  const wallClockMs = Date.UTC(parts.year!, parts.month! - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((wallClockMs - Math.floor(ms / MS_PER_SECOND) * MS_PER_SECOND) / MS_PER_MINUTE);
};

/** [timeUtc] moved to the wall clock of [timeZone], as a date whose UTC fields read like that clock. */
const wallClock = (timeUtc: string, timeZone: string): Date => {
  const ms = Date.parse(timeUtc);
  return new Date(ms + offsetMinutesAt(ms, timeZone) * MS_PER_MINUTE);
};

/** Clock time `HH:MM` of [timeUtc] in [timeZone]. */
export const clockTime = (timeUtc: string, timeZone: string): string =>
  wallClock(timeUtc, timeZone).toISOString().slice(11, 16);

/** Length of time as `3h 12m`, or `12m` under an hour. */
export const durationLabel = (ms: number): string => {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  return hours > 0 ? `${hours}h ${totalMinutes % MINUTES_PER_HOUR}m` : `${totalMinutes}m`;
};

/**
 * Details about the server for the header, beside its Online or Offline pill, with times in the
 * viewer's [timeZone]. For example `Up 3h 12m · 2 online · times in UTC−7`.
 */
export const statusLine = (snapshot: Snapshot, nowMs: number, timeZone: string): string => {
  const zone = `times in ${offsetLabel(offsetMinutesAt(nowMs, timeZone))}`;
  if (snapshot.lastLineUtc === null) {
    return `No server log yet · ${zone}`;
  }
  if (!isServerOnline(snapshot, nowMs)) {
    return `Last log line ${clockTime(snapshot.lastLineUtc, timeZone)} · ${zone}`;
  }
  const uptime = durationLabel(nowMs - Date.parse(snapshot.startedUtc ?? snapshot.lastLineUtc));
  return `Up ${uptime} · ${onlinePlayers(snapshot, nowMs).length} online · ${zone}`;
};

/** Time of [timeUtc] in [timeZone]: `HH:MM` on the same day as [nowMs], else `Oct 29 HH:MM`. */
export const whenLabel = (timeUtc: string, timeZone: string, nowMs: number): string => {
  const local = wallClock(timeUtc, timeZone);
  const today = wallClock(new Date(nowMs).toISOString(), timeZone);
  const time = local.toISOString().slice(11, 16);
  return local.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    ? time
    : `${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()} ${time}`;
};

