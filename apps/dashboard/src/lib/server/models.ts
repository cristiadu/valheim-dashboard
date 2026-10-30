import type { LogEvent, LogReader, SessionState } from 'valheim-log';

import type { Snapshot } from '#/lib/models';
import type { LogHistory } from '#/lib/server/log-history';
import type { LogTail } from '#/lib/server/log-tail';

/** Where the server writes its log when no `LOG_FILE` is set. */
export const DEFAULT_LOG_FILE = 'C:\\Valheim Server\\logs.txt';

/**
 * Folder next to the server's log that keeps a copy of every run's log, named by the run's first line, for
 * example `20261030-154344.txt`. The server writes a new `logs.txt` on every start, so this is the history.
 */
export const HISTORY_FOLDER_NAME = 'log-history';

/** How often the log file is checked for new lines. */
export const POLL_INTERVAL_MS = 2_000;

/** How often an idle live stream sends a comment, so proxies keep it open. */
export const KEEP_ALIVE_MS = 25_000;

/** Most game events kept. */
export const MAX_EVENTS = 1_000;

/** Most world saves kept. One every 10 minutes is 144 a day. */
export const MAX_SAVES = 300;

/** Most backups kept. */
export const MAX_BACKUPS = 50;

/** Most server runs and Steam drops kept. */
export const MAX_RUNS = 50;

/** Most stretches of building kept. */
export const MAX_BUILDS = 300;

/** Longest pause between two pieces of one stretch of building. */
export const BUILD_GAP_MS = 10 * 60_000;

/** A piece built or destroyed, from the build log plugin. */
export type PieceEvent = Extract<LogEvent, { type: 'pieceBuilt' | 'pieceDestroyed' }>;

/** Dashboard settings, read from environment variables. */
export type Config = {
  /** Path of the server's `logs.txt`. From `LOG_FILE`. */
  logFile: string;
  /** Offset of the server's clock from UTC, in minutes. From `SERVER_UTC_OFFSET_MINUTES`. */
  serverUtcOffsetMinutes: number;
};

/** What a tail sends to its listener. */
export type TailListener = {
  /** Called with each new complete line, in order. */
  onLine: (line: string) => void;
  /** Called when the file was replaced by a new one, before its first line. */
  onNewFile: () => void;
};

/** What the server knows, built one log line at a time. */
export type ServerState = {
  /** Reads timestamps of the current log. */
  reader: LogReader;
  /** Turns events into player sessions. */
  sessionState: SessionState;
  /** Save number of the save in progress, from its first step. */
  pendingSaveNumber: number | null;
  /** What the page shows. Its `sessions` is the session state's list. */
  snapshot: Snapshot;
};

/** A log being followed and what was read from it. */
export type Follower = {
  /** Path of the log, for error messages. */
  logFile: string;
  /** Reads the new lines. */
  tail: LogTail;
  /** Keeps a copy of the run in the history folder. */
  history: LogHistory;
  /** What the lines built so far. */
  state: ServerState;
  /** True when lines arrived since the listeners were last told. */
  hasNewLines: boolean;
};
