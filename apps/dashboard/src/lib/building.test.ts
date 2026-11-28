import { describe, expect, it } from 'vitest';

import { BUILDING_RECIPES, sourcesFor } from '#/lib/building';
import { RECIPES } from '#/lib/recipes';
import { STATION_RECIPES } from '#/lib/stations';

describe('BUILDING_RECIPES', () => {
  it('gives every piece and material its own id, distinct from the tools', () => {
    // GIVEN the tools and the building list
    const ids = [...RECIPES, ...BUILDING_RECIPES, ...STATION_RECIPES].map((recipe) => recipe.id);

    // WHEN the ids are collected
    // THEN none repeats
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the forge with the crafting stations, at the same cost', () => {
    // GIVEN the crafting stations
    const forge = STATION_RECIPES.find((recipe) => recipe.id === 'forge');
    const workbench = STATION_RECIPES.find((recipe) => recipe.id === 'workbench');

    // THEN the forge still takes stone, coal, wood and copper, and a workbench takes 10 wood
    expect(forge).toMatchObject({
      kind: 'station',
      station: 'Workbench',
      ingredients: [
        { item: 'Stone', amount: 4 },
        { item: 'Coal', amount: 4 },
        { item: 'Wood', amount: 10 },
        { item: 'Copper', amount: 6 },
      ],
    });
    expect(workbench).toMatchObject({ kind: 'station', station: 'None', ingredients: [{ item: 'Wood', amount: 10 }] });
  });

  it('costs a wood wall 2 wood', () => {
    // GIVEN the building list
    const wall = BUILDING_RECIPES.find((recipe) => recipe.id === 'wood-wall');

    // WHEN the wood wall is read
    // THEN it is built at a workbench from 2 wood
    expect(wall).toMatchObject({
      name: 'Wood wall',
      kind: 'build',
      biome: 'Meadows',
      station: 'Workbench',
      ingredients: [{ item: 'Wood', amount: 2 }],
    });
  });
});

describe('sourcesFor', () => {
  it('names what one beech gives, and nothing for a piece', () => {
    // GIVEN wood and a wood wall
    const wood = sourcesFor('Wood');
    const wall = sourcesFor('Wood wall');

    // THEN a beech gives 22 wood, and a wall is not gathered
    expect(wood).toContainEqual({ name: 'Beech', amount: 22, iconItem: 'Beech sapling' });
    expect(wall).toEqual([]);
  });
});
