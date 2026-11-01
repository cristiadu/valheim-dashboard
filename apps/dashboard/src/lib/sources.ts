import type { Player, Snapshot, SourceKind, SourceLines } from '#/lib/models';

/** Key of the log lines of [kind] for [character], with the [thing] they are about, for example `killed:Ragnar:Troll`. */
export const sourceKey = (kind: SourceKind, character: string, thing?: string): string =>
  thing === undefined ? `${kind}:${character}` : `${kind}:${character}:${thing}`;

/**
 * Log lines of [kind] for every character of [player], with the [thing] they are about, merged and oldest
 * first. Gear is kept for the latest character only, as on the card.
 */
export const playerSource = (snapshot: Snapshot, player: Player, kind: SourceKind, thing?: string): SourceLines => {
  const characters = kind === 'gear' ? [player.character] : [...new Set(player.sessions.map((session) => session.character))];
  const sources = characters.map((character) => snapshot.sources[sourceKey(kind, character, thing)] ?? { total: 0, lines: [] });
  return {
    total: sources.reduce((sum, source) => sum + source.total, 0),
    lines: sources.flatMap((source) => source.lines).toSorted((first, second) => first.timeUtc.localeCompare(second.timeUtc)),
  };
};
