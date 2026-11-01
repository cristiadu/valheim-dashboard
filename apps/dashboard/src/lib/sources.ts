import type { LogLineRecord, Player, ServerSourceKind, Snapshot, SourceKind, SourceLines } from '#/lib/models';

/** Key of the log lines of [kind], then who and what they are about, for example `killed:Ragnar:Troll` or `saves`. */
export const sourceKey = (kind: SourceKind | ServerSourceKind, ...parts: string[]): string => [kind, ...parts].join(':');

/** Log lines of [kind] for the whole server, about [thing] when given, for example `boss` lines about `Eikthyr`. */
export const serverSource = (snapshot: Snapshot, kind: ServerSourceKind, thing?: string): SourceLines =>
  snapshot.sources[thing === undefined ? sourceKey(kind) : sourceKey(kind, thing)] ?? { total: 0, lines: [] };

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
  const keys = characters.map((character) => (thing === undefined ? sourceKey(kind, character) : sourceKey(kind, character, thing)));
  return mergedSource(keys.map((key) => snapshot.sources[key] ?? { total: 0, lines: [] }));
};
