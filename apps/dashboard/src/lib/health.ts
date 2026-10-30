import { clip } from '#/src/lib/day.ts';
import { BYTES_PER_GB, DAY_MS, type ServerWarning, type Snapshot } from '#/src/lib/models.ts';
import { isServerOnline } from '#/src/lib/status.ts';

/** Free disk space in whole gigabytes, for example `278 GB`. */
export const gigabytesLabel = (bytes: number): string => `${Math.round(bytes / BYTES_PER_GB)} GB`;

/** Problems worth a look, newest first: crashes, lost Steam connections and low disk space. */
export const serverWarnings = (snapshot: Snapshot): ServerWarning[] => {
  const crashes = snapshot.runs
    .filter((run) => run.endReason === 'crashed')
    .map((run) => ({ timeUtc: run.lastLineUtc, text: 'Server went down without a clean stop' }));
  const drops = snapshot.steamDropsUtc.map((timeUtc) => ({ timeUtc, text: 'Server lost its Steam connection' }));
  const disk = snapshot.diskSpace;
  const lowDisk =
    disk !== null && disk.availableBytes < disk.warnBelowBytes
      ? [{ timeUtc: disk.timeUtc, text: `Disk almost full: ${(disk.availableBytes / BYTES_PER_GB).toFixed(1)} GB free` }]
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
