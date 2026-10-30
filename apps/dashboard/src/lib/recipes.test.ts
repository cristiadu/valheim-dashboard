import { describe, expect, it } from 'vitest';

import { RECIPES, recipeById } from './recipes';

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
