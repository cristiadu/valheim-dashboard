import { playerOf } from '#/fields';
import type { Matcher } from '#/models';
import {
  CREATURE_KILLED_PATTERN,
  LEVIATHAN_GONE_PATTERN,
  LEVIATHAN_PATTERN,
  PET_NAMED_PATTERN,
  SADDLED_PATTERN,
  TAME_CHANGES,
  TAME_FOLLOWING_PATTERN,
  TAME_PATTERN,
} from '#/patterns';

/** Messages about creatures killed and tamed, and the Leviathans at sea. */
export const CREATURE_MATCHERS: readonly Matcher[] = [
  {
    pattern: CREATURE_KILLED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'creatureKilled',
      timeUtc,
      creature: groups.creature!,
      level: Number(groups.level),
      attackers: groups.attackers!.split(', '),
    }),
  },
  {
    pattern: TAME_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tameChanged',
      timeUtc,
      creature: groups.creature!,
      change: TAME_CHANGES.get(groups.change!)!,
      name: groups.name ?? null,
    }),
  },
  {
    pattern: PET_NAMED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'petNamed', timeUtc, creature: groups.creature!, name: groups.name! }),
  },
  {
    pattern: SADDLED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'saddled', timeUtc, creature: groups.creature!, player: playerOf(groups.player) }),
  },
  {
    pattern: TAME_FOLLOWING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'tameFollowing', timeUtc, creature: groups.creature!, player: groups.player! }),
  },
  {
    pattern: LEVIATHAN_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathan', timeUtc, id: groups.id!, x: Number(groups.x), z: Number(groups.z) }),
  },
  {
    pattern: LEVIATHAN_GONE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'leviathanGone', timeUtc, id: groups.id! }),
  },
];
