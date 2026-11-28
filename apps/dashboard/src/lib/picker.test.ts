import { describe, expect, it } from 'vitest';

import { BUILDING_PICKER, MATERIAL_PICKER, PICKER_RECIPES, STATION_PICKER, TOOL_PICKER, knownOf, knownRecipes, movedIndex } from '#/lib/picker';

describe('PICKER_RECIPES', () => {
  it('lists every recipe once, Meadows first and Plains last', () => {
    // GIVEN the recipe list
    // WHEN the picker orders it
    const ids = PICKER_RECIPES.map((recipe) => recipe.id);

    // THEN all 73 recipes are there once, from the Hammer to a Plains recipe. The forge is a crafting station.
    expect(new Set(ids).size).toBe(73);
    expect(ids[0]).toBe('hammer');
    expect(PICKER_RECIPES.at(-1)!.biome).toBe('Plains');
  });
});

describe('knownRecipes', () => {
  it('offers only recipes whose every ingredient someone has found', () => {
    // GIVEN players found wood, stone and a deer hide, but no resin
    const seenItems = ['Wood', 'Stone', 'DeerHide'];

    // WHEN the known recipes are listed
    const ids = knownRecipes(seenItems).map((recipe) => recipe.id);

    // THEN the hammer and hoe are offered, and the torch, which needs resin, is not
    expect(ids).toContain('hammer');
    expect(ids).toContain('hoe');
    expect(ids).not.toContain('torch');
  });

  it('offers nothing before anyone has found anything', () => {
    // GIVEN no item found yet
    // WHEN the known recipes are listed
    // THEN there are none
    expect(knownRecipes([])).toEqual([]);
  });

  it('offers a wood wall once wood is found, and hides anything that needs stone', () => {
    // GIVEN players have found wood and nothing else
    // WHEN the building list is filtered
    const ids = knownOf(BUILDING_PICKER, ['Wood']).map((recipe) => recipe.id);

    // THEN a wood wall is offered, and wood itself and a stone wall are not in this list
    expect(ids).toContain('wood-wall');
    expect(ids).not.toContain('wood');
    expect(ids).not.toContain('stone-wall-1x1');
  });

  it('keeps axes, stations, pieces and materials in their own lists', () => {
    // GIVEN the four lists
    const tools = TOOL_PICKER.map((recipe) => recipe.id);
    const stations = STATION_PICKER.map((recipe) => recipe.id);
    const pieces = BUILDING_PICKER.map((recipe) => recipe.id);
    const materials = MATERIAL_PICKER.map((recipe) => recipe.id);

    // THEN an axe is a tool, the forge is a station, a wall is a piece, and wood and bronze are materials
    expect(tools).toContain('stone-axe');
    expect(tools).not.toContain('forge');
    expect(stations).toContain('workbench');
    expect(stations).toContain('forge');
    expect(pieces).toContain('wood-wall');
    expect(pieces).not.toContain('wood');
    expect(materials).toContain('wood');
    expect(materials).toContain('bronze');
    expect(materials).not.toContain('wood-wall');
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
