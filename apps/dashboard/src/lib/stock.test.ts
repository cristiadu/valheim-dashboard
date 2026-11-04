import { describe, expect, it } from 'vitest';

import { playersOf } from '#/lib/players';
import { bagStock, builderNames, chestStock, craftables, recipeItemName } from '#/lib/stock';
import { sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

describe('recipeItemName', () => {
  it('turns the game item names into the names recipes use', () => {
    // GIVEN prefabs that differ by spaces, a listed exception and one no recipe uses
    const names = ['DeerHide', 'RoundLog', 'TrophyDeer'];

    // WHEN each is turned into a recipe item name
    const recipeNames = names.map(recipeItemName);

    // THEN the first two match recipes and the last has the game's name
    expect(recipeNames).toEqual(['Deer hide', 'Core wood', 'Deer trophy']);
  });
});

describe('bagStock', () => {
  it('names what a bag holds as recipes do', () => {
    // GIVEN a bag with core wood and deer hide by prefab
    const bag = { RoundLog: 4, DeerHide: 2 };

    // WHEN its stock is read
    const stock = bagStock(bag);

    // THEN the items have their recipe names
    expect(stock).toEqual({ 'Core wood': 4, 'Deer hide': 2 });
  });
});

describe('chestStock', () => {
  it("adds up every chest, or only the ones a player's names built", () => {
    // GIVEN Ragnar, known on Steam as Tony Example, built one chest by each name on a square he walked, Bjorn built
    // another there, and nobody has walked to a treasure chest yet
    const timeUtc = '2026-10-29T11:00:00.000Z';
    const snapshot = snapshotWith({
      sessions: [sessionWith({ steamId: 'Steam_1', steamName: 'Tony Example' })],
      explored: { Ragnar: ['0,0'] },
      chests: {
        '1:1': { chest: 'piece_chest_wood', x: 0, z: 0, builder: 'Ragnar', items: { Wood: 10 }, timeUtc },
        '1:2': { chest: 'Cart', x: 5, z: 0, builder: 'Tony Example', items: { Wood: 4, DeerHide: 2 }, timeUtc },
        '1:3': { chest: 'piece_chest', x: 9, z: 0, builder: 'Bjorn', items: { Stone: 7 }, timeUtc },
        '1:4': { chest: 'TreasureChest_meadows', x: 900, z: 900, builder: null, items: { Coins: 20 }, timeUtc },
      },
    });
    const ragnar = playersOf(snapshot, TEST_NOON_MS)[0]!;

    // WHEN all chests and Ragnar's chests are added up
    const all = chestStock(snapshot, null);
    const his = chestStock(snapshot, builderNames(ragnar));

    // THEN the found chests count once each, and his leave out Bjorn's
    expect(all).toEqual({ Wood: 14, 'Deer hide': 2, Stone: 7 });
    expect(his).toEqual({ Wood: 14, 'Deer hide': 2 });
  });
});

describe('craftables', () => {
  it('lists the recipes the stock covers, with how many times', () => {
    // GIVEN 12 wood, 1 resin and 6 stone
    const stock = { Wood: 12, Resin: 1, Stone: 6 };

    // WHEN the craftable recipes are listed
    const listed = craftables(stock).map(({ recipe, times }) => [recipe.name, times]);

    // THEN each counts its scarcest ingredient
    expect(listed).toEqual([
      ['Hammer', 3],
      ['Hoe', 2],
      ['Torch', 1],
      ['Club', 2],
      ['Stone axe', 1],
      ['Wood arrow', 1],
    ]);
  });
});
