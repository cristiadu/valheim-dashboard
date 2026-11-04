import { describe, expect, it } from 'vitest';

import { itemStacksOf } from '#/lib/server/item-stacks';

describe('itemStacksOf', () => {
  it('reads the most of each item one slot holds, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN an item stacks file with two items, a blank line and a broken line
    const text = 'Wood 50\r\nSpearFlint 1\r\n\r\nbroken line\r\n';

    // WHEN it is read
    const stacks = itemStacksOf(text);

    // THEN only the two items are there
    expect(stacks).toEqual({ Wood: 50, SpearFlint: 1 });
  });
});
