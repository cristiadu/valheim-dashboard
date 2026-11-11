import { describe, expect, it } from 'vitest';

import { chestMarkKindOf, chestSpotsOf, foundChests, mapOf, spotLabelOf, squareKeyOf, squareOf } from '#/lib/map';
import { playersOf } from '#/lib/players';
import { sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

describe('mapOf', () => {
  it('draws nothing before the plugin logged a position, chest or death', () => {
    // GIVEN a snapshot with a player but no map data
    const snapshot = snapshotWith({ sessions: [sessionWith({})] });

    // WHEN the map is made
    const map = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS));

    // THEN there is nothing to draw
    expect(map).toBeNull();
  });

  it('draws land, trails, chests, the online player and a death with north up, fitted with a margin', () => {
    // GIVEN Ragnar is online and explored two squares, one of known Meadows terrain, with a chest and his last death nearby
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      sessions: [sessionWith({})],
      explored: { Ragnar: ['0,0', '1,-1'] },
      positions: { Ragnar: { x: 40, z: -10, timeUtc: '2026-10-29T11:59:00.000Z' } },
      chests: {
        '1:10': { chest: 'piece_chest_wood', x: 12, z: 18, builder: 'Ragnar', items: {}, timeUtc: '2026-10-29T11:00:00.000Z' },
      },
      deathItems: { Ragnar: { x: 50, z: -20, items: { Coins: 5 }, timeUtc: '2026-10-29T11:30:00.000Z' } },
      terrain: { '0,0': 'M' },
    });

    // WHEN the map is made
    const map = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS));

    // THEN each thing sits at its spot with z turned into y, in Ragnar's color
    expect(map).toEqual({
      box: { x: -64, y: -96, width: 192, height: 192 },
      land: [
        { key: '0,0', x: 0, y: -32, color: '#5f7a3a' },
        { key: '1,-1', x: 32, y: 0, color: 'var(--line)' },
      ],
      trails: [
        { key: 'Ragnar:0,0', x: 10, y: -22, color: 'var(--gold)' },
        { key: 'Ragnar:1,-1', x: 42, y: 10, color: 'var(--gold)' },
      ],
      chests: [{ id: '1:10', x: 12, y: -18, kind: 'chest', record: snapshot.chests['1:10'] }],
      marks: [
        { key: 'player:Ragnar', kind: 'player', label: 'Ragnar', x: 40, y: 10, color: 'var(--gold)' },
        { key: 'death:Ragnar', kind: 'death', label: 'Ragnar died here', x: 50, y: 20, color: 'var(--gold)' },
      ],
    });
  });
});

describe('mapOf chest builders', () => {
  it("names a chest built under a Steam name by that player's character", () => {
    // GIVEN Ragnar plays as Steam name Tony Example, who built a chest on a walked square, listed before Ragnar joined
    const snapshot = snapshotWith({
      sessions: [sessionWith({ steamName: 'Tony Example' })],
      explored: { Ragnar: ['0,0'] },
      chests: {
        '1:10': { chest: 'piece_chest_wood', x: 12, z: 18, builder: 'Tony Example', items: {}, timeUtc: '2026-10-29T11:00:00.000Z' },
      },
    });

    // WHEN the map is made
    const map = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS));

    // THEN the chest is Ragnar's
    expect(map?.chests[0]?.record.builder).toBe('Ragnar');
  });
});

describe('chestSpotsOf', () => {
  it('sets chests that would cover each other side by side, and leaves far ones where they are', () => {
    // GIVEN two of Ragnar's chests 4 m apart and a third 100 m away, all on squares he walked
    const chest = { chest: 'piece_chest_wood', builder: 'Ragnar', items: {}, timeUtc: '2026-10-29T11:00:00.000Z' };
    const snapshot = snapshotWith({
      explored: { Ragnar: ['0,-1', '3,-1'] },
      chests: { '1:1': { ...chest, x: 1, z: -1 }, '1:2': { ...chest, x: 5, z: -3 }, '1:3': { ...chest, x: 100, z: -1 } },
    });

    // WHEN the map is made and its chests are placed
    const map = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS))!;
    const spots = chestSpotsOf(map.chests, 16);

    // THEN the close chests each get a mark, one step apart around their middle, and the far one stays put
    expect(spots).toEqual([
      { id: '1:1', x: 3 - 9.2, y: 2 },
      { id: '1:2', x: 3 + 9.2, y: 2 },
      { id: '1:3', x: 100, y: 1 },
    ]);
  });
});

describe('foundChests', () => {
  it('keeps only chests on a square someone walked, even ones a player built', () => {
    // GIVEN Ragnar walked square 0,0, which has a world chest, and there is a world chest on the square next to it
    // and a chest Ragnar built far away
    const chest = { chest: 'TreasureChest_meadows', items: {}, timeUtc: '2026-10-29T11:00:00.000Z' };
    const snapshot = snapshotWith({
      explored: { Ragnar: ['0,0'] },
      chests: {
        '1:10': { ...chest, chest: 'piece_chest_wood', x: 900, z: 900, builder: 'Ragnar' },
        '1:11': { ...chest, x: 20, z: 10, builder: null },
        '1:12': { ...chest, x: 40, z: -20, builder: null },
      },
    });

    // WHEN the found chests are listed
    const ids = foundChests(snapshot).map(([id]) => id);

    // THEN only the chest on the walked square shows
    expect(ids).toEqual(['1:11']);
  });
});

describe('chestMarkKindOf', () => {
  it('draws carts and ships as their own marks, and chests the world came with apart from built ones', () => {
    // GIVEN a built chest, a world chest, a shipwreck chest, a cart and a longship
    const prefabs = ['piece_chest', 'TreasureChest_forestcrypt', 'shipwreck_karve_chest', 'Cart', 'VikingShip'];

    // WHEN their marks are picked
    const kinds = prefabs.map(chestMarkKindOf);

    // THEN each gets its own drawing
    expect(kinds).toEqual(['chest', 'treasure', 'treasure', 'cart', 'ship']);
  });
});

describe('spotLabelOf', () => {
  it("names a map spot by the game's x and z and its distance from the center", () => {
    // GIVEN a spot 120 m east and 340 m south, and one 3 km east and 4 km north
    // WHEN the spots are named
    const near = spotLabelOf(120, 340);
    const far = spotLabelOf(3000, -4000);

    // THEN north turns back into the game's z, and long distances read in km
    expect(near).toBe('x 120, z -340 · 361 m from the center');
    expect(far).toBe('x 3000, z 4000 · 5.0 km from the center');
  });
});

describe('mapOf Leviathans', () => {
  it('marks a Leviathan only on a square someone walked', () => {
    // GIVEN Ragnar walked square 0,0, where one Leviathan floats, and another floats far out at sea
    const snapshot = snapshotWith({
      explored: { Ragnar: ['0,0'] },
      leviathans: {
        '1:20': { x: 10, z: 20, timeUtc: '2026-10-29T11:00:00.000Z' },
        '1:21': { x: 3000, z: 3000, timeUtc: '2026-10-29T11:00:00.000Z' },
      },
    });

    // WHEN the map is made
    const map = mapOf(snapshot, playersOf(snapshot, TEST_NOON_MS));

    // THEN only the Leviathan on the walked square is marked, with north up
    expect(map?.marks).toEqual([
      { key: 'leviathan:1:20', kind: 'leviathan', label: 'Leviathan', x: 10, y: -20, color: 'var(--frost)' },
    ]);
  });
});

describe('squareOf', () => {
  it('reads back the square a spot falls in, west and south of the center too', () => {
    // GIVEN spots on both sides of the center
    const keys = [squareKeyOf(10, 20), squareKeyOf(-10, -40)];

    // WHEN the keys are read back
    const squares = keys.map(squareOf);

    // THEN each gives its column and row
    expect(keys).toEqual(['0,0', '-1,-2']);
    expect(squares).toEqual([[0, 0], [-1, -2]]);
  });
});
