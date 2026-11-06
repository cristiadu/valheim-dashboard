import type { LogLineRecord, Player, ServerSourceKind, Snapshot, SourceKind, SourceLines } from '#/lib/models';

/**
 * Key of the log lines of [kind], then who and what they are about, for example `killed:Ragnar:Troll` or `saves`.
 * Parts that are not given are left out.
 */
export const sourceKey = (kind: SourceKind | ServerSourceKind, ...parts: (string | undefined)[]): string =>
  [kind, ...parts.filter((part) => part !== undefined)].join(':');

/** Returns a group with no log lines yet. */
export const emptySource = (): SourceLines => ({ total: 0, lines: [] });

/** Log lines of [kind] for the whole server, about [thing] when given, for example `boss` lines about `Eikthyr`. */
export const serverSource = (snapshot: Snapshot, kind: ServerSourceKind, thing?: string): SourceLines =>
  snapshot.sources[sourceKey(kind, thing)] ?? emptySource();

/** The lines among [lines] written at [timeUtc], as their own group, for example one save among all saves. */
export const linesAt = (lines: LogLineRecord[], timeUtc: string): SourceLines => {
  const atTime = lines.filter((record) => record.timeUtc === timeUtc);
  return { total: atTime.length, lines: atTime };
};

/** [sources] merged into one group, oldest first. */
export const mergedSource = (sources: SourceLines[]): SourceLines => ({
  total: sources.reduce((sum, source) => sum + source.total, 0),
  lines: sources.flatMap((source) => source.lines).toSorted((first, second) => first.timeUtc.localeCompare(second.timeUtc)),
});

/**
 * Log lines of [kind] for every character of [player], with the [thing] they are about, merged and oldest
 * first. Gear is kept for the latest character only, as on the card.
 */
export const playerSource = (snapshot: Snapshot, player: Player, kind: SourceKind, thing?: string): SourceLines => {
  const characters = kind === 'gear' ? [player.character] : [...new Set(player.sessions.map((session) => session.character))];
  return mergedSource(characters.map((character) => snapshot.sources[sourceKey(kind, character, thing)] ?? emptySource()));
};
