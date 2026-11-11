import type { Player, PlayerStat } from '#/lib/models/players';
import type { SourceLines } from '#/lib/models/snapshot';

/** How many of a player's most done activities the Hall shows for the last 24 hours, next to deaths and kills. */
export const DAY_ACTIVITY_COUNT = 4;

/** One fact about the world on the Hall, such as the in-game day, with the log lines behind it when there are any. */
export type WorldFact = {
  /** What the fact is, for example `Bosses defeated`. */
  label: string;
  /** The fact, for example `2`. */
  value: string;
  /** Log lines behind it. */
  source?: SourceLines;
};

/** What one player did in the last 24 hours. */
export type PlayerDay = {
  /** The player. */
  player: Player;
  /** Time they were online in the last 24 hours. */
  playedMs: number;
  /** Deaths, kills and their most done activities in the last 24 hours, each with its log lines. */
  stats: PlayerStat[];
};
