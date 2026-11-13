import { beforeEach, describe, expect, it } from 'vitest';

import type { ServerState } from '#/lib/server/models';
import { createServerState } from '#/lib/server/server-state';
import { logLine, readLines, RUN_START, TEST_OFFSET_MINUTES } from '#/lib/test-common';

describe('updateBags', () => {
  let state: ServerState;

  beforeEach(() => {
    state = createServerState(TEST_OFFSET_MINUTES);
  });

  it('adds pickups and chest takes, and takes out what is stored, smelted or eaten', () => {
    // GIVEN Ragnar picks up wood and ore, picks wood up again after dropping it, takes meat from a chest, stores
    // some wood, smelts the ore and eats one meat
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Wood x10 by Ragnar'),
      logLine('03:00:01', 'Picked up again: Wood x2 by Ragnar'),
      logLine('03:00:02', 'Picked up: CopperOre x4 by Ragnar'),
      logLine('03:00:03', 'Taken: RawMeat x3 from piece_chest_wood by Ragnar'),
      logLine('03:00:04', 'Stored: Wood x6 in piece_chest_wood by Ragnar'),
      logLine('03:00:05', 'Smelting: CopperOre x4 in smelter by Ragnar'),
      logLine('03:00:06', 'Ate: Ragnar RawMeat'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN he has the wood he did not store and the meat he did not eat, and no ore
    expect(bag).toEqual({ Wood: 4, RawMeat: 2 });
  });

  it('takes out food put on to cook and mead bases put in a fermenter', () => {
    // GIVEN Inge Dragonchow takes meat and a mead base from a chest, cooks two meats and fills a fermenter
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Taken: RawMeat x3 from piece_chest_wood by Inge Dragonchow'),
      logLine('03:00:01', 'Taken: MeadBaseHealthMinor x1 from piece_chest_wood by Inge Dragonchow'),
      logLine('03:00:02', 'Cooking: RawMeat on piece_cookingstation by Inge Dragonchow'),
      logLine('03:00:03', 'Cooking: RawMeat on piece_cookingstation by Inge Dragonchow'),
      logLine('03:00:04', 'Fermenting: MeadBaseHealthMinor in fermenter by Inge Dragonchow'),
    ]);

    // WHEN her bag is read
    const bag = state.snapshot.bags['Inge Dragonchow'];

    // THEN only the meat she did not cook is left
    expect(bag).toEqual({ RawMeat: 1 });
  });

  it('empties the bag into the tombstone on death and fills it again when the tombstone is emptied', () => {
    // GIVEN Ragnar carries stone, dies with a sword and coins, then empties his tombstone
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Stone x5 by Ragnar'),
      logLine('03:01:00', 'Tombstone: Ragnar at 70 20 holds SwordBronze x1, Coins x55'),
    ]);
    const afterDeath = structuredClone(state.snapshot.bags['Ragnar']);
    readLines(state, [logLine('03:02:00', 'Tombstone emptied: Ragnar by Ragnar')]);

    // WHEN his bag is read
    const afterTombstone = state.snapshot.bags['Ragnar'];

    // THEN the bag was empty after death and holds the tombstone's items after it
    expect(afterDeath).toEqual({});
    expect(afterTombstone).toEqual({ SwordBronze: 1, Coins: 55 });
  });

  it('keeps gear seen worn or held in the bag, once, until it is stored', () => {
    // GIVEN Ragnar is seen with a spear, then wears a helmet and the spear, then stores the helmet
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Gear: Ragnar SpearFlint quality 4'),
      logLine('03:00:01', 'Wearing: Ragnar has HelmetLeather, SpearFlint'),
      logLine('03:00:02', 'Stored: HelmetLeather x1 in piece_chest_wood by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN only the spear is left, once
    expect(bag).toEqual({ SpearFlint: 1 });
  });

  it('takes what building and planting cost out of the bag', () => {
    // GIVEN a floor costs 2 wood and a carrot costs one seed, and Ragnar picks up wood and seeds, then builds and plants
    state.pieceCosts = { wood_floor: { Wood: 2 }, sapling_carrot: { CarrotSeeds: 1 } };
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Wood x10 by Ragnar'),
      logLine('03:00:01', 'Picked up: CarrotSeeds x3 by Ragnar'),
      logLine('03:00:02', 'Piece built: wood_floor by Ragnar'),
      logLine('03:00:03', 'Piece built: wood_floor by Ragnar'),
      logLine('03:00:04', 'Planted: sapling_carrot by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN 4 wood and one seed were used
    expect(bag).toEqual({ Wood: 6, CarrotSeeds: 2 });
  });

  it('keeps the bag within 32 slots by taking slots from the biggest pile of material, never gear or what is worn', () => {
    // GIVEN wood stacks to 50, trophies to 20 and a hammer to 1, Ragnar wears a spear and was seen with a hammer,
    // picks up 28 kinds of trophies, then 130 wood, one slot more than he has
    const trophies = Array.from({ length: 28 }, (_, index) => `Trophy${index}`);
    state.snapshot.itemStacks = { Wood: 50, Hammer: 1, ...Object.fromEntries(trophies.map((trophy) => [trophy, 20])) };
    readLines(state, [
      ...RUN_START,
      logLine('02:58:00', 'Gear: Ragnar Hammer quality 3'),
      logLine('02:59:00', 'Wearing: Ragnar has SpearFlint'),
      ...trophies.map((trophy) => logLine('03:00:00', `Picked up: ${trophy} x1 by Ragnar`)),
      logLine('03:01:00', 'Picked up: Wood x130 by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar']!;

    // THEN the part-filled wood slot of 30 is gone, and the hammer, the spear and every trophy stay
    expect(bag['Wood']).toBe(100);
    expect(bag['Hammer']).toBe(1);
    expect(bag['SpearFlint']).toBe(1);
    expect(bag['Trophy0']).toBe(1);
    expect(Object.keys(bag)).toHaveLength(31);
  });

  it('moves a dropped item to whoever picks it up, and counts each item ID once', () => {
    // GIVEN Ragnar carries 30 wood and drops 20, Bjorn picks them up, and the same pickup line is read twice
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Wood x30 by Ragnar (item 52731986:1400)'),
      logLine('03:00:01', 'Dropped: Wood x20 by Ragnar (item 52731986:1420)'),
      logLine('03:00:02', 'Picked up again: Wood x20 by Bjorn (item 52731986:1420)'),
      logLine('03:00:03', 'Picked up again: Wood x20 by Bjorn (item 52731986:1420)'),
    ]);

    // WHEN their bags are read
    const { bags } = state.snapshot;

    // THEN Ragnar has the 10 he kept and Bjorn the 20 he picked up
    expect(bags['Ragnar']).toEqual({ Wood: 10 });
    expect(bags['Bjorn']).toEqual({ Wood: 20 });
  });

  it('takes what crafting and upgrading cost out of the crafter\'s bag', () => {
    // GIVEN 20 wood arrows take 8 wood, upgrading a club to level 2 takes 3 wood, and Ragnar picks up 40 wood, then
    // makes 40 arrows and upgrades a club
    state.craftCosts = {
      ArrowWood: { 1: { yields: 20, items: { Wood: 8 } } },
      Club: { 2: { yields: 1, items: { Wood: 3 } } },
    };
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Wood x40 by Ragnar'),
      logLine('03:00:01', 'Made: ArrowWood x40 by Ragnar'),
      logLine('03:00:02', 'Upgraded: Club to level 2 by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN two crafts took 16 wood and the upgrade 3
    expect(bag).toEqual({ Wood: 21 });
  });

  it('puts worn gear back after a spare is stored, but not gear stored and taken off', () => {
    // GIVEN Ragnar wears a sword and a helmet, stores a spare sword, picks up stone, then stores the helmet and takes it off
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Wearing: Ragnar has HelmetLeather, SwordBronze'),
      logLine('03:00:01', 'Stored: SwordBronze x1 in piece_chest_wood by Ragnar'),
      logLine('03:00:02', 'Picked up: Stone x2 by Ragnar'),
      logLine('03:00:03', 'Stored: HelmetLeather x1 in piece_chest_wood by Ragnar'),
      logLine('03:00:04', 'Wearing: Ragnar has SwordBronze'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN the worn sword is there and the helmet is not
    expect(bag).toEqual({ SwordBronze: 1, Stone: 2 });
  });

  it('takes off worn gear on death, so the emptied tombstone does not bring it back twice', () => {
    // GIVEN Ragnar holds a hammer, dies with it, builds a floor in the same second, then empties his tombstone
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Wearing: Ragnar has Hammer'),
      logLine('03:01:00', 'Tombstone: Ragnar at 70 20 holds Hammer x1, Wood x10'),
      logLine('03:01:00', 'Piece built: wood_floor by Ragnar'),
      logLine('03:01:00', 'Wearing: Ragnar has nothing'),
      logLine('03:02:00', 'Tombstone emptied: Ragnar by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN the hammer is there once
    expect(bag).toEqual({ Hammer: 1, Wood: 10 });
  });

  it('takes out the food carried most when the log does not say which, but not one still in effect', () => {
    // GIVEN cooked meat and honey are foods, and Ragnar carries 5 meat and 3 honey, eats three times in a row, then
    // once more 25 minutes later
    state.foods = new Set(['CookedMeat', 'Honey']);
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: CookedMeat x5 by Ragnar'),
      logLine('03:00:01', 'Picked up: Honey x3 by Ragnar'),
      logLine('03:00:02', 'Picked up: Wood x10 by Ragnar'),
      logLine('03:10:00', 'Ate something: Ragnar'),
      logLine('03:10:05', 'Ate something: Ragnar'),
      logLine('03:10:10', 'Ate something: Ragnar'),
      logLine('03:35:00', 'Ate something: Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN one meat and one honey went in the first meal, the third bite found no food that was not in effect, and
    // one more meat went later
    expect(bag).toEqual({ CookedMeat: 3, Honey: 2, Wood: 10 });
  });

  it('takes out what a fire burns each time it is fueled', () => {
    // GIVEN a ground torch burns resin, and Ragnar picks up 5 resin and puts 2 in a torch
    state.fireFuels = { piece_groundtorch_wood: 'Resin' };
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Resin x5 by Ragnar'),
      logLine('03:00:01', 'Fueled: piece_groundtorch_wood by Ragnar'),
      logLine('03:00:01', 'Fueled: piece_groundtorch_wood by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar'];

    // THEN 3 resin are left
    expect(bag).toEqual({ Resin: 3 });
  });
});
