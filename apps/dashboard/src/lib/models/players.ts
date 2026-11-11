import type { PlayerSession } from 'valheim-log';

import type { ActivityKind } from '#/lib/models';
import type { SourceLines } from '#/lib/models/snapshot';
import type { StoryKind } from '#/lib/models/story';

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
  /** Area the latest character was last in, for example `Swamp`, when the plugin logged one. */
  area: string | null;
  /** Creatures killed by all of the player's characters, counting kills shared with others. */
  kills: number;
  /** Creature the player killed most, when they killed any. */
  topKill: string | null;
  /** Areas any of the player's characters has been to. */
  areas: string[];
  /** Gear the latest character was seen with, newest first. */
  gear: string[];
  /** Prefabs the latest character wears and holds now, or null before the plugin logged it. */
  worn: string[] | null;
  /** How much all of the player's characters did of each activity kind, for example `{ built: 120 }`. */
  activityTotals: Partial<Record<ActivityKind, number>>;
  /** Map squares any of the player's characters walked through. */
  exploredSquares: number;
};

/**
 * One number on a player's card, with the story kind whose rune it shows and the log lines behind it. Land explored
 * has no lines, so its [source] is null and it links to the Map tab instead.
 */
export type PlayerStat = { label: string; value: string; kind: StoryKind; source: SourceLines | null };
