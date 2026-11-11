import { describe, expect, it } from 'vitest';

import { matchingLines } from '#/lib/server/text-files';

describe('matchingLines', () => {
  it('keeps the named groups of the matching lines, with Windows line ends', () => {
    // GIVEN two item lines around one the pattern does not match
    const text = 'Wood 50\r\nnot an item\r\nStone 30\r\n';

    // WHEN the lines are matched
    const lines = matchingLines(text, /^(?<item>\S+) (?<stack>\d+)$/);

    // THEN only the item lines come back, by group name
    expect(lines).toEqual([
      { item: 'Wood', stack: '50' },
      { item: 'Stone', stack: '30' },
    ]);
  });
});
