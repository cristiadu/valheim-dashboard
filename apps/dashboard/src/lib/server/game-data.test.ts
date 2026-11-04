import { describe, expect, it } from 'vitest';

import { itemStacksOf, pieceCostsOf } from '#/lib/server/game-data';

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

describe('pieceCostsOf', () => {
  it('reads what each piece takes, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN a piece costs file with two pieces and a broken line
    const text = 'wood_floor Wood x2\r\nportal_wood FineWood x20, GreydwarfEye x10, SurtlingCore x2\r\nbroken\r\n';

    // WHEN it is read
    const costs = pieceCostsOf(text);

    // THEN each piece has its items
    expect(costs).toEqual({
      wood_floor: { Wood: 2 },
      portal_wood: { FineWood: 20, GreydwarfEye: 10, SurtlingCore: 2 },
    });
  });
});
