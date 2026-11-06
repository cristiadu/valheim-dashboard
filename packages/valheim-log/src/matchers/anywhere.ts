import type { Matcher } from '#/models';
import { NIGHT_SKIPPED_PATTERN, REFUSED_JOIN_PATTERN, REFUSED_JOIN_REASONS, SERVER_STOPPED_PATTERN } from '#/patterns';

/**
 * Messages found anywhere in a line instead of at its start: the server stopping, a refused join and a skipped night.
 * They are checked last, so a chat line or a name that happens to hold their words keeps its own meaning.
 */
export const ANYWHERE_MATCHERS: readonly Matcher[] = [
  {
    pattern: SERVER_STOPPED_PATTERN,
    toEvent: (_, timeUtc) => ({ type: 'serverStopped', timeUtc }),
  },
  {
    pattern: REFUSED_JOIN_PATTERN,
    toEvent: (_, timeUtc, message) => ({
      type: 'joinRefused',
      timeUtc,
      reason: REFUSED_JOIN_REASONS.get(REFUSED_JOIN_PATTERN.exec(message)![0])!,
      message,
    }),
  },
  {
    pattern: NIGHT_SKIPPED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'nightSkipped', timeUtc, day: Number(groups.day) + 1 }),
  },
];
