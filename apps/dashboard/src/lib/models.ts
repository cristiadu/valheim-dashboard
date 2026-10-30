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

/** One server run: from the first line of a `logs.txt` to its last. */
export type RunRecord = {
  /** First line of the log, as a UTC ISO string. */
  startUtc: string;
  /** Last line of the log so far, as a UTC ISO string. */
  lastLineUtc: string;
  /** How it ended: a clean stop, a new log without a stop (a crash), or null while it is the latest run. */
  endReason: 'stopped' | 'crashed' | null;
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
  /** Server runs seen since the dashboard started, oldest first. */
  runs: RunRecord[];
  /** Times the server lost its Steam connection, oldest first. */
  steamDropsUtc: string[];
  /** Latest stretches of building and of destroyed pieces, from the build log plugin, oldest first. */
  builds: BuildRecord[];
};

/** Pieces one character built, or pieces of theirs that were destroyed, with pauses under a few minutes. */
export type BuildRecord = {
  /** Character who built the pieces, or null when the build log did not know. */
  builder: string | null;
  /** True for destroyed pieces, false for built ones. */
  isDestroyed: boolean;
  /** First piece of the stretch, as a UTC ISO string. */
  startUtc: string;
  /** Last piece of the stretch, as a UTC ISO string. */
  endUtc: string;
  /** How many of each piece, by prefab name, for example `{ wood_floor_1x1: 14 }`. */
  pieces: Record<string, number>;
};

/** Most kinds of pieces a story line names. */
export const LISTED_PIECE_KINDS = 3;

/** Milliseconds in one day. */
export const DAY_MS = 24 * 60 * MS_PER_MINUTE;

/** How many events the Hall shows. */
export const LATEST_EVENT_COUNT = 5;

/**
 * Player colors, in the order players were first seen. Gold, frost, ember, green keeps neighbors apart for
 * color-blind viewers. Names always sit next to the color, so color is never the only clue.
 */
export const PLAYER_COLORS = ['var(--gold)', 'var(--frost)', 'var(--ember)', 'var(--good)'] as const;

/** Color for players past the fourth. */
export const OTHER_PLAYER_COLOR = 'var(--muted)';

/** One person: every session with the same Steam ID, or the same character when there is no Steam ID. */
export type Player = {
  /** Steam ID, or the character name when the log never linked one. */
  key: string;
  /** Latest character name. */
  character: string;
  /** Steam profile name, when known. */
  steamName: string | null;
  /** Color that marks this player on charts. */
  color: string;
  /** Sessions, oldest first. */
  sessions: PlayerSession[];
  /** Whether the player is online now. */
  isOnline: boolean;
  /** Start of the session in progress, when online. */
  sinceUtc: string | null;
  /** End of the last session, when offline. */
  lastSeenUtc: string | null;
  /** Total time in all sessions. */
  totalMs: number;
  /** Deaths in all sessions. */
  deaths: number;
};

/** What kind of thing happened, which picks its rune and color. */
export type StoryKind = 'joined' | 'left' | 'died' | 'raid' | 'night' | 'world' | 'stopped' | 'built' | 'wrecked';

/** One line in the story of the server. */
export type StoryItem = {
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** What kind of thing it is. */
  kind: StoryKind;
  /** Plain sentence, for example `Ragnar died`. */
  text: string;
};

/** Rune and color for each story kind. */
export const STORY_STYLES: Record<StoryKind, { rune: string; color: string }> = {
  joined: { rune: 'ᛖ', color: 'var(--good)' },
  left: { rune: 'ᛚ', color: 'var(--muted)' },
  died: { rune: 'ᛞ', color: 'var(--blood)' },
  raid: { rune: 'ᚦ', color: 'var(--ember)' },
  night: { rune: 'ᛜ', color: 'var(--frost)' },
  world: { rune: 'ᛃ', color: 'var(--gold)' },
  stopped: { rune: 'ᚾ', color: 'var(--muted)' },
  built: { rune: 'ᛒ', color: 'var(--good)' },
  wrecked: { rune: 'ᚺ', color: 'var(--ember)' },
};

/** Filters on the Saga tab and the story kinds each one shows. */
export const SAGA_FILTERS: readonly { label: string; kinds: readonly StoryKind[] }[] = [
  { label: 'All', kinds: ['joined', 'left', 'died', 'raid', 'night', 'world', 'stopped', 'built', 'wrecked'] },
  { label: 'Joins and leaves', kinds: ['joined', 'left'] },
  { label: 'Deaths', kinds: ['died'] },
  { label: 'Raids', kinds: ['raid'] },
  { label: 'Building', kinds: ['built', 'wrecked'] },
  { label: 'Nights and server', kinds: ['night', 'world', 'stopped'] },
];

/** How many saves the World tab lists. */
export const LATEST_SAVE_COUNT = 10;

/** One problem on the Server tab. */
export type ServerWarning = {
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** Plain sentence, for example `Server went down without a clean stop`. */
  text: string;
};
