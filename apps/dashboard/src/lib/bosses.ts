import { BOSS_NAMES, BOSS_ORDER, type Snapshot } from '#/lib/models';

/** Bosses someone has fought or summoned, in game order. A boss nobody has met yet stays hidden. */
export const seenBosses = (snapshot: Snapshot): string[] => {
  const summoned = snapshot.events.flatMap((event) => (event.type === 'bossSummoned' ? [BOSS_NAMES[event.boss] ?? event.boss] : []));
  return BOSS_ORDER.filter((boss) => snapshot.defeatedBosses.includes(boss) || summoned.includes(boss));
};
