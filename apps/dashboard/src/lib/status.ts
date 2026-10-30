import type { PlayerSession } from 'valheim-log';

import { MINUTES_PER_HOUR, MONTHS, MS_PER_MINUTE, ONLINE_WINDOW_MS, type Snapshot } from './models';

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

/** Clock time `HH:MM` of [timeUtc] in the zone at [offsetMinutes] from UTC. */
export const clockTime = (timeUtc: string, offsetMinutes: number): string =>
  new Date(Date.parse(timeUtc) + offsetMinutes * MS_PER_MINUTE).toISOString().slice(11, 16);

/** Length of time as `3h 12m`, or `12m` under an hour. */
export const durationLabel = (ms: number): string => {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  return hours > 0 ? `${hours}h ${totalMinutes % MINUTES_PER_HOUR}m` : `${totalMinutes}m`;
};

/** Steam link of the server in a word: `Connected`, `Disconnected`, or `–` when the log has not said. */
export const steamLabel = (isConnected: boolean | null): string => {
  if (isConnected === null) {
    return '–';
  }
  return isConnected ? 'Connected' : 'Disconnected';
};

/**
 * One line about the server for the header, with times in the viewer's zone at [viewerOffsetMinutes].
 * For example `Online · up 3h 12m · 2 online · times in UTC−7`.
 */
export const statusLine = (snapshot: Snapshot, nowMs: number, viewerOffsetMinutes: number): string => {
  const zone = `times in ${offsetLabel(viewerOffsetMinutes)}`;
  if (snapshot.lastLineUtc === null) {
    return `No server log yet · ${zone}`;
  }
  if (!isServerOnline(snapshot, nowMs)) {
    return `Offline · last log line ${clockTime(snapshot.lastLineUtc, viewerOffsetMinutes)} · ${zone}`;
  }
  const uptime = durationLabel(nowMs - Date.parse(snapshot.startedUtc ?? snapshot.lastLineUtc));
  return `Online · up ${uptime} · ${onlinePlayers(snapshot, nowMs).length} online · ${zone}`;
};

/** Time of [timeUtc] in the zone at [offsetMinutes]: `HH:MM` on the same day as [nowMs], else `Oct 29 HH:MM`. */
export const whenLabel = (timeUtc: string, offsetMinutes: number, nowMs: number): string => {
  const local = new Date(Date.parse(timeUtc) + offsetMinutes * MS_PER_MINUTE);
  const today = new Date(nowMs + offsetMinutes * MS_PER_MINUTE);
  const time = local.toISOString().slice(11, 16);
  return local.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    ? time
    : `${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()} ${time}`;
};
