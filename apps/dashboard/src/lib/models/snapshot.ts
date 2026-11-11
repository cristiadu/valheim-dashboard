import type { ChatKind, LogEvent, PlayerSession } from 'valheim-log';

import type { ActivityKind, ActivityRecord, ChestRecord, DeathItems, MapPoint, StoryKind } from '#/lib/models';

/**
 * Event types friends see in the story of the server. Joins and leaves come from the sessions, and building,
 * kills and items from the activities. Areas, gear and global keys are kept only when they are news.
 */
export const STORY_EVENT_TYPES = [
  'playerDied',
  'deathDetails',
  'raidStarted',
  'raidEnded',
  'nightSkipped',
  'wentToBed',
  'worldLoaded',
  'serverStopped',
  'bossSummoned',
  'globalKey',
  'areaEntered',
  'teleported',
  'pvpChanged',
  'gearSeen',
  'tameChanged',
  'petNamed',
  'signWritten',
  'itemHung',
  'tombstoneEmptied',
  'bedClaimed',
  'portalNamed',
  'wardChanged',
  'locationRevealed',
  'saddled',
  'tameFollowing',
  'wardAccess',
  'mapShared',
] as const;

/** A game event friends see, such as a death or a raid. */
export type StoryEvent = Extract<LogEvent, { type: (typeof STORY_EVENT_TYPES)[number] }> & {
  /** The log line it was read from. */
  line: string;
};

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
  /** Latest stretches of building, kills and items, from the event log plugin, oldest first. */
  activities: ActivityRecord[];
  /** Latest chat messages and map pings, oldest first. */
  chat: ChatRecord[];
  /** Areas each character has been to, by character name, in the order they first went. */
  visitedAreas: Record<string, string[]>;
  /** Gear each character was seen with, by character name, for example `SwordIron quality 2`. */
  gear: Record<string, string[]>;
  /** Prefabs each character wears, holds or carries on the back now, by character name, once the plugin logged it. */
  worn: Record<string, string[]>;
  /** Area each character was last in, by character name, for example `Swamp`. */
  currentAreas: Record<string, string>;
  /** Creatures each character helped kill, by character name, then how many of each creature. */
  kills: Record<string, Record<string, number>>;
  /** How much each character did of each activity kind since the dashboard started, by character name, for example `{ built: 120 }`. */
  activityTotals: Record<string, Partial<Record<ActivityKind, number>>>;
  /** In-game day, as the game shows it, when the plugin has logged one. */
  day: number | null;
  /** Bosses defeated, by the name the game shows, in the order of their first defeat. */
  defeatedBosses: string[];
  /** Log lines behind each number and item, by [sourceKey], for example `deaths:Ragnar`. */
  sources: Record<string, SourceLines>;
  /** Map squares each character has walked through, by character name, as `x,z` square numbers. */
  explored: Record<string, string[]>;
  /** Where each character was last seen, by character name. */
  positions: Record<string, MapPoint>;
  /** Every chest, cart and ship of the current run, by the ID the plugin logs. */
  chests: Record<string, ChestRecord>;
  /** What each character carried at their last death, by character name. */
  deathItems: Record<string, DeathItems>;
  /** Every Leviathan of the current run, by the ID the plugin logs. */
  leviathans: Record<string, MapPoint>;
  /** Prefabs of every item a player picked up, stored, took, wore, ate, smelted or left in a tombstone, such as `CopperOre`. */
  seenItems: string[];
  /**
   * A guess of what each character carries, by character name and item prefab, from pickups, chest moves, smelting,
   * eating and tombstones. Crafting, building and dropping are not in the log.
   */
  bags: Record<string, Record<string, number>>;
  /** Most of each item that fits in one slot, by prefab, from the plugin's item stacks file, for example `{ Wood: 50 }`. */
  itemStacks: Record<string, number>;
  /** Terrain letter of each explored square, by `x,z` square number, once the plugin's terrain file was read. */
  terrain: Record<string, string>;
  /** Health, stamina and eitr each character had when the plugin last saw them, by character name. */
  vitals: Record<string, Vitals>;
};

/** How a character was doing when the plugin last saw them, in whole points as the game shows them. */
export type Vitals = {
  /** Health now. */
  health: number;
  /** Most health they can have now, from base health and the food they ate. */
  maxHealth: number;
  /** Stamina now. The game sends no max stamina to the server. */
  stamina: number;
  /** Eitr now, which stays 0 until they eat food that gives it. */
  eitr: number;
  /** When the plugin wrote these numbers, as a UTC ISO string. */
  timeUtc: string;
};

/**
 * What a group of log lines counts, for a character: `visits` are joins and leaves, `deaths` are deaths,
 * `kills` are all kills, `killed` are kills of one creature, `area` is going into one area, `gear` is one
 * piece of gear first seen, at each level, and `activity` is one activity kind, such as `built`.
 */
export type SourceKind = 'visits' | 'deaths' | 'kills' | 'killed' | 'area' | 'gear' | 'activity';

/**
 * What a group of server log lines counts: `runs` are starts and clean stops, `version` the game version,
 * `day` new in-game days, `saves` finished saves, `backups` auto backups, `disk` free disk space, `steam` the
 * Steam connection going up or down, `boss` one boss defeated, `latest` the newest line, and `crashes` the last
 * line before each crash.
 */
export type ServerSourceKind = 'runs' | 'version' | 'day' | 'saves' | 'backups' | 'disk' | 'steam' | 'boss' | 'latest' | 'crashes';

/** One line of `logs.txt`, as written. */
export type LogLineRecord = {
  /** When it was written, as a UTC ISO string. */
  timeUtc: string;
  /** The whole line, for example `10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1`. */
  line: string;
  /** What happened in it, which picks its rune, color and label as on the Saga tab. */
  kind: StoryKind;
};

/** Log lines behind one number or item. */
export type SourceLines = {
  /** How many lines there were in all, also counting the old ones no longer kept. */
  total: number;
  /** Latest lines, oldest first. */
  lines: LogLineRecord[];
};

/** One chat message or map ping. */
export type ChatRecord = {
  /** When it was sent, as a UTC ISO string. */
  timeUtc: string;
  /** Character who sent it. */
  character: string;
  /** How it was sent, or `ping` for a map ping. */
  kind: ChatKind | 'ping';
  /** What they wrote. Empty for a ping. */
  text: string;
  /** The log line it was read from. */
  line: string;
};

/** Longest time between the game's death line and the plugin's details of the same death. */
export const DEATH_DETAILS_WINDOW_MS = 60_000;
