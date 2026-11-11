import { describe, expect, it } from 'vitest';

import { craftCostsOf, fireFuelsOf, foodsOf, gameNamesOf, itemStacksOf, pieceCostsOf } from '#/lib/server/game-data';

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

describe('craftCostsOf', () => {
  it('reads what each craft makes and takes by item and level, keeps the first recipe, and skips lines it does not know', () => {
    // GIVEN a craft costs file with arrows, a sword at two levels, a second arrow recipe and a broken line
    const text =
      'ArrowWood 1 20 Wood x8\r\nSwordBronze 1 1 Bronze x8, Wood x2\r\nSwordBronze 2 1 Bronze x4\r\nArrowWood 1 10 Wood x4\r\nbroken\r\n';

    // WHEN it is read
    const costs = craftCostsOf(text);

    // THEN each item has what one craft makes and takes at each level
    expect(costs).toEqual({
      ArrowWood: { 1: { yields: 20, items: { Wood: 8 } } },
      SwordBronze: { 1: { yields: 1, items: { Bronze: 8, Wood: 2 } }, 2: { yields: 1, items: { Bronze: 4 } } },
    });
  });
});

describe('foodsOf', () => {
  it('reads every food, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN a foods file with two foods, a blank line and a broken line
    const text = 'CookedMeat\r\nHoney\r\n\r\nbroken line\r\n';

    // WHEN it is read
    const foods = foodsOf(text);

    // THEN only the two foods are there
    expect([...foods]).toEqual(['CookedMeat', 'Honey']);
  });
});

describe('fireFuelsOf', () => {
  it('reads what each fire burns, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN a fire fuels file with two fires and a broken line
    const text = 'piece_groundtorch_wood Resin\r\nfire_pit Wood\r\nbroken\r\n';

    // WHEN it is read
    const fuels = fireFuelsOf(text);

    // THEN each fire has its fuel
    expect(fuels).toEqual({ piece_groundtorch_wood: 'Resin', fire_pit: 'Wood' });
  });
});

describe('gameNamesOf', () => {
  it('reads the name the game shows for each thing, with Windows line ends, and skips lines it does not know', () => {
    // GIVEN a game names file with an item, a creature, a raid and a broken line
    const text = 'AtgeirIron Iron atgeir\r\nGreydwarf_Elite Greydwarf brute\r\narmy_theelder The ground is shaking\r\nbroken\r\n';

    // WHEN it is read
    const names = gameNamesOf(text);

    // THEN each thing has its name
    expect(names).toEqual({ AtgeirIron: 'Iron atgeir', Greydwarf_Elite: 'Greydwarf brute', army_theelder: 'The ground is shaking' });
  });
});
