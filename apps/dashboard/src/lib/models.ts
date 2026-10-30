import type { LogEvent, PlayerSession } from 'valheim-log';

/** How long after the last log line the server still counts as online. Saves log a line every 10 minutes. */
export const ONLINE_WINDOW_MS = 15 * 60_000;

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60_000;

/** Event types friends see in the story of the server. Joins and leaves come from the sessions. */
export const STORY_EVENT_TYPES = ['playerDied', 'raidStarted', 'nightSkipped', 'worldLoaded', 'serverStopped'] as const;

/** A game event friends see, such as a death or a raid. */
export type StoryEvent = Extract<LogEvent, { type: (typeof STORY_EVENT_TYPES)[number] }>;

/** One finished world save. */
export type SaveRecord = {
  /** When the save finished, as a UTC ISO string. */
  timeUtc: string;
  /** How long the save took. */
  durationMs: number;
  /** Save number from the log, when it has one. */
  saveNumber: number | null;
};

/** One auto backup of the world. */
export type BackupRecord = {
  /** When the backup was written, as a UTC ISO string. */
  timeUtc: string;
  /** Backup folder name. */
  backup: string;
};

/** Free disk space at the last save. */
export type DiskSpace = {
  /** When it was logged, as a UTC ISO string. */
  timeUtc: string;
  /** Bytes free. */
  availableBytes: number;
  /** The game warns below this many bytes. */
  warnBelowBytes: number;
  /** The game stops saving below this many bytes. */
  blockedBelowBytes: number;
};

/** Everything the page knows about the server, read from `logs.txt`. Times are UTC ISO strings. */
export type Snapshot = {
  /** Offset of the server's clock from UTC, in minutes. */
  serverUtcOffsetMinutes: number;
  /** World name of the current run. */
  world: string | null;
  /** Game version of the current run. */
  version: string | null;
  /** First line of the current log. */
  startedUtc: string | null;
  /** Last line of the current log. */
  lastLineUtc: string | null;
  /** Clean stop of the current run, if it stopped. */
  stoppedUtc: string | null;
  /** Whether the server is connected to Steam and PlayFab, when it said so. */
  isGameServerConnected: boolean | null;
  /** Every player session seen since the dashboard started, oldest first. */
  sessions: PlayerSession[];
  /** Latest game events, oldest first. */
  events: StoryEvent[];
  /** Latest world saves, oldest first. */
  saves: SaveRecord[];
  /** Latest backups, oldest first. */
  backups: BackupRecord[];
  /** Free disk space at the last save. */
  diskSpace: DiskSpace | null;
};
