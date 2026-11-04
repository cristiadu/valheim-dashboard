import { describe, expect, it } from 'vitest';

import { chestName, containerGrid, itemName, itemSlots, slotsUsed, stackSlots, stockOf } from '#/lib/items';
import { mapOf } from '#/lib/map';
import { playersOf } from '#/lib/players';
import { snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

describe('itemName', () => {
  it('names gear, listed items and other items as the game shows them', () => {
    // GIVEN a piece of gear, two listed items and one that only needs spaces
    const prefabs = ['SpearFlint', 'TrophyDeer', 'RawMeat', 'GreydwarfEye'];

    // WHEN each is named
    const names = prefabs.map(itemName);

    // THEN each has the name the game shows
    expect(names).toEqual(['Flint spear', 'Deer trophy', 'Boar meat', 'Greydwarf eye']);
  });
});

describe('chestName', () => {
  it('names chests, ships and the chests the world came with', () => {
    // GIVEN a built chest, a ship, a treasure chest and an unknown container
    const prefabs = ['piece_chest_wood', 'VikingShip', 'TreasureChest_blackforest', 'piece_chest_odd'];

    // WHEN each is named
    const names = prefabs.map(chestName);

    // THEN each has the name the game shows, and the unknown one its prefab in plain words
    expect(names).toEqual(['Wood chest', 'Longship', 'Treasure chest', 'Chest odd']);
  });
});

describe('containerGrid', () => {
  it("uses the game's grid, adds rows when the items need them, and has a grid for unknown containers", () => {
    // GIVEN a wood chest with 3 kinds, a cart with 20 kinds and an unknown container with 1 kind
    // WHEN their grids are made
    const grids = [containerGrid('piece_chest_wood', 3), containerGrid('Cart', 20), containerGrid('piece_odd', 1), containerGrid('Player', 3)];

    // THEN the wood chest is 5 by 2, the cart holds 18 but grows a fourth row of 6, the unknown one is 5 by 2, and a
    // player's bag is 8 by 4
    expect(grids).toEqual([
      { columns: 5, capacity: 10, slots: 10 },
      { columns: 6, capacity: 18, slots: 24 },
      { columns: 5, capacity: 10, slots: 10 },
      { columns: 8, capacity: 32, slots: 32 },
    ]);
  });
});

describe('itemSlots', () => {
  it('lists every item once, most first, and by name when the counts match', () => {
    // GIVEN a chest with wood, coins and a deer trophy
    const items = { Wood: 20, TrophyDeer: 2, Coins: 20 };

    // WHEN its slots are listed
    const slots = itemSlots(items);

    // THEN coins and wood share the top by name, then the trophy
    expect(slots).toEqual([
      { prefab: 'Coins', name: 'Coins', count: 20 },
      { prefab: 'Wood', name: 'Wood', count: 20 },
      { prefab: 'TrophyDeer', name: 'Deer trophy', count: 2 },
    ]);
  });
});

describe('stackSlots', () => {
  it('splits each item into full stacks and the rest, and gives an item with no known stack one slot', () => {
    // GIVEN 120 wood that stacks to 50, one spear that stacks to 1, and 7 resin with no known stack
    const items = { Wood: 120, SpearFlint: 1, Resin: 7 };
    const stacks = { Wood: 50, SpearFlint: 1 };

    // WHEN its slots are listed
    const slots = stackSlots(items, stacks);

    // THEN wood takes three slots, then resin and the spear one each
    expect(slots.map((slot) => `${slot.prefab} ${slot.count}`)).toEqual(['Wood 50', 'Wood 50', 'Wood 20', 'Resin 7', 'SpearFlint 1']);
  });
});

describe('slotsUsed', () => {
  it('counts full and part stacks, and one slot for an item with no known stack', () => {
    // WHEN 120 wood that stacks to 50 and 7 resin with no known stack are counted
    const slots = slotsUsed({ Wood: 120, Resin: 7 }, { Wood: 50 });

    // THEN wood takes 3 slots and resin 1
    expect(slots).toBe(4);
  });
});

describe('stockOf', () => {
  it('adds each item up across the chests and lists the chests that hold most first', () => {
    // GIVEN a chest and a cart on a square Ragnar walked, both with wood and the cart with stone
    const timeUtc = '2026-10-29T11:00:00.000Z';
    const snapshot = snapshotWith({
      explored: { Ragnar: ['0,0'] },
      chests: {
        '1:1': { chest: 'piece_chest_wood', x: 0, z: 0, builder: 'Ragnar', items: { Wood: 5 }, timeUtc },
        '1:2': { chest: 'Cart', x: 10, z: 0, builder: 'Ragnar', items: { Wood: 30, Stone: 4 }, timeUtc },
      },
    });
    const chests = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS))!.chests;

    // WHEN the stock is added up
    const stock = stockOf(chests);

    // THEN wood counts both chests, the cart first, and stone comes after
    expect(stock.map((row) => [row.name, row.count, row.chests.map(({ chest, count }) => [chest.id, count])])).toEqual([
      ['Wood', 35, [['1:2', 30], ['1:1', 5]]],
      ['Stone', 4, [['1:2', 4]]],
    ]);
  });
});
