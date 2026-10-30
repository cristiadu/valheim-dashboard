import { clip } from './day';
import { DAY_MS, type ServerWarning, type Snapshot } from './models';
import { isServerOnline } from './status';

/** Bytes in a gigabyte, as disks count them. */
export const BYTES_PER_GB = 1e9;

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
