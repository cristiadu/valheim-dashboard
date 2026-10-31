import { describe, expect, it } from 'vitest';

import { PICKER_RECIPES, movedIndex } from '#/lib/picker';

describe('PICKER_RECIPES', () => {
  it('lists every recipe once, Meadows first and Plains last', () => {
    // GIVEN the recipe list
    // WHEN the picker orders it
    const ids = PICKER_RECIPES.map((recipe) => recipe.id);

    // THEN all 74 recipes are there once, from the Hammer to a Plains recipe
    expect(new Set(ids).size).toBe(74);
    expect(ids[0]).toBe('hammer');
    expect(PICKER_RECIPES.at(-1)!.biome).toBe('Plains');
  });
});

describe('movedIndex', () => {
  it('moves one step with the arrows', () => {
    // GIVEN option 3 of 10 is highlighted
    // WHEN Down and Up are pressed
    const moves = [movedIndex(3, 'ArrowDown', 10), movedIndex(3, 'ArrowUp', 10)];

    // THEN the highlight goes to 4 and 2
    expect(moves).toEqual([4, 2]);
  });

  it('stops at the first and last option', () => {
    // GIVEN the first and the last of 10 options
    // WHEN Up is pressed on the first and Down on the last
    const moves = [movedIndex(0, 'ArrowUp', 10), movedIndex(9, 'ArrowDown', 10)];

    // THEN the highlight stays at 0 and 9
    expect(moves).toEqual([0, 9]);
  });

  it('jumps to the ends with Home and End', () => {
    // GIVEN option 5 of 10 is highlighted
    // WHEN Home and End are pressed
    const moves = [movedIndex(5, 'Home', 10), movedIndex(5, 'End', 10)];

    // THEN the highlight goes to 0 and 9
    expect(moves).toEqual([0, 9]);
  });

  it('ignores other keys', () => {
    // GIVEN option 5 of 10 is highlighted
    // WHEN the letter a is pressed
    // THEN the highlight does not move
    expect(movedIndex(5, 'a', 10)).toBeUndefined();
  });
});
