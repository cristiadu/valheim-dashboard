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

  it('keeps the bag within 32 slots by taking out what was touched longest ago, never what is worn', () => {
    // GIVEN wood stacks to 50, Ragnar wears a spear, picks up 30 kinds of trophies, then 150 wood
    state.snapshot.itemStacks = { Wood: 50 };
    readLines(state, [
      ...RUN_START,
      logLine('02:59:00', 'Wearing: Ragnar has SpearFlint'),
      ...Array.from({ length: 30 }, (_, index) => logLine('03:00:00', `Picked up: Trophy${index} x1 by Ragnar`)),
      logLine('03:01:00', 'Picked up: Wood x150 by Ragnar'),
    ]);

    // WHEN his bag is read
    const bag = state.snapshot.bags['Ragnar']!;

    // THEN the spear and the wood stay, and the two oldest trophies are gone to make room
    expect(Object.keys(bag)).toHaveLength(30);
    expect(bag['SpearFlint']).toBe(1);
    expect(bag['Wood']).toBe(150);
    expect(bag['Trophy0']).toBeUndefined();
    expect(bag['Trophy1']).toBeUndefined();
    expect(bag['Trophy2']).toBe(1);
  });
});
