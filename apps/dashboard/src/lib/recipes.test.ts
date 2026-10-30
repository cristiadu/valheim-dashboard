import { describe, expect, it } from 'vitest';

import { RECIPES, iconUrl, madeAt, recipeById } from '#/src/lib/recipes.ts';

describe('RECIPES', () => {
  it('gives every recipe its own id', () => {
    // GIVEN the recipe list
    // WHEN the ids are collected
    const ids = new Set(RECIPES.map((recipe) => recipe.id));

    // THEN none repeats
    expect(ids.size).toBe(RECIPES.length);
  });

  it('uses whole positive amounts', () => {
    // GIVEN the recipe list
    // WHEN every yield and ingredient amount is collected
    const amounts = RECIPES.flatMap((recipe) => [recipe.yields, ...recipe.ingredients.map((line) => line.amount)]);

    // THEN each is a whole number above 0
    expect(amounts.filter((amount) => !Number.isInteger(amount) || amount < 1)).toEqual([]);
  });
});

describe('recipeById', () => {
  it('finds a recipe with its ingredients', () => {
    // GIVEN the Fire arrow id
    // WHEN it is looked up
    const recipe = recipeById('fire-arrow');

    // THEN it is the Fire arrow recipe
    expect(recipe).toEqual({
      id: 'fire-arrow',
      name: 'Fire arrow',
      biome: 'Meadows',
      station: 'Workbench',
      yields: 20,
      ingredients: [
        { item: 'Wood', amount: 8 },
        { item: 'Resin', amount: 8 },
        { item: 'Feathers', amount: 2 },
      ],
    });
  });

  it('returns undefined for an unknown id', () => {
    // GIVEN an id with no recipe
    // WHEN it is looked up
    const recipe = recipeById('golden-hammer');

    // THEN nothing is found
    expect(recipe).toBeUndefined();
  });
});

describe('iconUrl', () => {
  it('turns the item name into a wiki file address', () => {
    // GIVEN an item with a space in its name
    // WHEN its icon address is made
    const url = iconUrl('Deer hide');

    // THEN it points at the wiki file with an underscore
    expect(url).toBe('https://valheim.fandom.com/wiki/Special:FilePath/Deer_hide.png');
  });

  it('uses the wiki file name when it differs from the item name', () => {
    // GIVEN Fine wood, whose wiki file is Finewood.png
    // WHEN its icon address is made
    const url = iconUrl('Fine wood');

    // THEN it points at Finewood.png
    expect(url).toBe('https://valheim.fandom.com/wiki/Special:FilePath/Finewood.png');
  });
});

describe('madeAt', () => {
  it('names the station', () => {
    // GIVEN the Forge
    // WHEN the sentence is made
    // THEN it names the Forge
    expect(madeAt('Forge')).toBe('Made at the Forge.');
  });

  it('says by hand when there is no station', () => {
    // GIVEN no station
    // WHEN the sentence is made
    // THEN it says by hand
    expect(madeAt('Hand')).toBe('Made by hand.');
  });
});
