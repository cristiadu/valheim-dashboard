import type { PlayerSession } from 'valheim-log';

import type { Snapshot } from '#/lib/models/snapshot';
import { BYTES_PER_GB, ONLINE_WINDOW_MS, REFUSED_REASON_TEXTS, type ServerWarning } from '#/lib/models/status';
import { DAY_MS } from '#/lib/models/time';
import { linesAt, serverSource } from '#/lib/sources';
import { clip, clockTime, durationLabel, offsetLabel, offsetMinutesAt } from '#/lib/time';

/** True when the run did not stop and its last log line is recent. The clock alone never makes it online. */
export const isServerOnline = (snapshot: Snapshot, nowMs: number): boolean =>
  snapshot.lastLineUtc !== null &&
  snapshot.stoppedUtc === null &&
  nowMs - Date.parse(snapshot.lastLineUtc) <= ONLINE_WINDOW_MS;

/** Players online now: open sessions, and none while the server is offline. */
export const onlinePlayers = (snapshot: Snapshot, nowMs: number): PlayerSession[] =>
  isServerOnline(snapshot, nowMs) ? snapshot.sessions.filter((session) => session.endUtc === null) : [];

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

/** Free disk space in whole gigabytes, for example `278 GB`. */
export const gigabytesLabel = (bytes: number): string => `${Math.round(bytes / BYTES_PER_GB)} GB`;

/** Problems worth a look, newest first: crashes, lost Steam and crossplay connections, joins turned away and low disk space. */
export const serverWarnings = (snapshot: Snapshot): ServerWarning[] => {
  const crashLines = serverSource(snapshot, 'crashes').lines;
  const steamLines = serverSource(snapshot, 'steam').lines;
  const crashes = snapshot.runs
    .filter((run) => run.endReason === 'crashed')
    .map(
      (run): ServerWarning => ({
        kind: 'crash',
        timeUtc: run.lastLineUtc,
        text: 'Server went down without a clean stop',
        source: linesAt(crashLines, run.lastLineUtc),
      }),
    );
  const drops = snapshot.steamDropsUtc.map(
    (timeUtc): ServerWarning => ({ kind: 'steam', timeUtc, text: 'Server lost its Steam connection', source: linesAt(steamLines, timeUtc) }),
  );
  const crossplayLines = serverSource(snapshot, 'crossplay').lines;
  const crossplayDrops = snapshot.crossplayDropsUtc.map(
    (timeUtc): ServerWarning => ({ kind: 'crossplay', timeUtc, text: 'Crossplay lost its connection', source: linesAt(crossplayLines, timeUtc) }),
  );
  const refusedLines = serverSource(snapshot, 'refused').lines;
  const refused = snapshot.refusedJoins.map(
    ({ timeUtc, player, reason }): ServerWarning => ({
      kind: 'refused',
      timeUtc,
      text: `${player ?? 'Someone'} couldn't join: ${REFUSED_REASON_TEXTS[reason]}`,
      source: linesAt(refusedLines, timeUtc),
    }),
  );
  const disk = snapshot.diskSpace;
  const lowDisk: ServerWarning[] =
    disk !== null && disk.availableBytes < disk.warnBelowBytes
      ? [
          {
            kind: 'disk',
            timeUtc: disk.timeUtc,
            text: `Disk almost full: ${(disk.availableBytes / BYTES_PER_GB).toFixed(1)} GB free`,
            source: linesAt(serverSource(snapshot, 'disk').lines, disk.timeUtc),
          },
        ]
      : [];
  return [...crashes, ...drops, ...crossplayDrops, ...refused, ...lowDisk].sort((a, b) => Date.parse(b.timeUtc) - Date.parse(a.timeUtc));
};

/** Stretches of the last 24 hours when the server was up, from each run's first to last log line. */
export const upStretches = (snapshot: Snapshot, nowMs: number): { startMs: number; endMs: number }[] => {
  const isUp = isServerOnline(snapshot, nowMs);
  return snapshot.runs.flatMap((run) => {
    const endMs = run.endReason === null && isUp ? nowMs : Date.parse(run.lastLineUtc);
    return clip(Date.parse(run.startUtc), endMs, nowMs - DAY_MS, nowMs) ?? [];
  });
};
