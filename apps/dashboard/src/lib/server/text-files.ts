/** Returns the named groups of each line of [text] that [pattern] matches, skipping the other lines. */
export const matchingLines = (text: string, pattern: RegExp): Record<string, string | undefined>[] =>
  text.split(/\r?\n/).flatMap((line) => {
    const groups = pattern.exec(line)?.groups;
    return groups === undefined ? [] : [groups];
  });
