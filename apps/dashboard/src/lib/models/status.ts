import type { SourceLines } from '#/lib/models/snapshot';
import { MS_PER_MINUTE } from '#/lib/models/time';

/** How long after the last log line the server still counts as online. Saves log a line every 10 minutes. */
export const ONLINE_WINDOW_MS = 15 * MS_PER_MINUTE;

/** Bytes in a gigabyte, as disks count them. */
export const BYTES_PER_GB = 1e9;

/** How many saves, and how many backups, the Server tab lists. */
export const LATEST_SAVE_COUNT = 5;

/** Kind of problem on the Server tab: the server crashed, lost Steam, or is low on disk. */
export type WarningKind = 'crash' | 'steam' | 'disk';

/** One problem on the Server tab. */
export type ServerWarning = {
  /** What went wrong, shown as a pill. */
  kind: WarningKind;
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** Plain sentence, for example `Server went down without a clean stop`. */
  text: string;
  /** Log lines that show it. */
  source: SourceLines;
};

/**
 * Color of a pill. `good` is green (online, ready), `bad` is red (offline, crashed),
 * `gold` marks a win or something to watch (boss defeated, low disk), `quiet` is grey (not yet, unknown).
 */
export type PillTone = 'good' | 'bad' | 'gold' | 'quiet';

/** A status or state in a word or two, shown as a rounded pill, for example `Online` in green. */
export type Pill = {
  /** Word or two on the pill. */
  text: string;
  /** Color of the pill. */
  tone: PillTone;
};
