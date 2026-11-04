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
});
