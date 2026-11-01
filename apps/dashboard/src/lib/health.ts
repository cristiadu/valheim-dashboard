import { clip } from '#/lib/day';
import { BYTES_PER_GB, DAY_MS, type ServerWarning, type Snapshot } from '#/lib/models';
import { linesAt, serverSource } from '#/lib/sources';
import { isServerOnline } from '#/lib/status';

/** Free disk space in whole gigabytes, for example `278 GB`. */
export const gigabytesLabel = (bytes: number): string => `${Math.round(bytes / BYTES_PER_GB)} GB`;

/** Problems worth a look, newest first: crashes, lost Steam connections and low disk space. */
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
  return [...crashes, ...drops, ...lowDisk].sort((a, b) => Date.parse(b.timeUtc) - Date.parse(a.timeUtc));
};

/** Stretches of the last 24 hours when the server was up, from each run's first to last log line. */
export const upStretches = (snapshot: Snapshot, nowMs: number): { startMs: number; endMs: number }[] => {
  const isUp = isServerOnline(snapshot, nowMs);
  return snapshot.runs.flatMap((run) => {
    const endMs = run.endReason === null && isUp ? nowMs : Date.parse(run.lastLineUtc);
    return clip(Date.parse(run.startUtc), endMs, nowMs - DAY_MS, nowMs) ?? [];
  });
};
