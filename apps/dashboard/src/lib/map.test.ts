import { describe, expect, it } from 'vitest';

import { foundChests, mapOf } from '#/lib/map';
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
      viewBox: '-64 -96 192 192',
      land: [
        { key: '0,0', x: 0, y: -32, color: '#5f7a3a' },
        { key: '1,-1', x: 32, y: 0, color: 'var(--line)' },
      ],
      trails: [
        { key: 'Ragnar:0,0', x: 10, y: -22, color: 'var(--gold)' },
        { key: 'Ragnar:1,-1', x: 42, y: 10, color: 'var(--gold)' },
      ],
      chests: [{ id: '1:10', x: 12, y: -18, record: snapshot.chests['1:10'] }],
      marks: [
        { key: 'player:Ragnar', kind: 'player', label: 'Ragnar', x: 40, y: 10, color: 'var(--gold)' },
        { key: 'death:Ragnar', kind: 'death', label: 'Ragnar died here', x: 50, y: 20, color: 'var(--gold)' },
      ],
    });
  });
});

describe('mapOf chest builders', () => {
  it("names a chest built under a Steam name by that player's character", () => {
    // GIVEN Ragnar plays as Steam name Tony Example, who built a chest listed before Ragnar joined
    const snapshot = snapshotWith({
      sessions: [sessionWith({ steamName: 'Tony Example' })],
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

describe('foundChests', () => {
  it('keeps chests players built and world chests next to walked land, and hides the rest', () => {
    // GIVEN Ragnar walked square 0,0, and the world has one chest next to it and one far away
    const chest = { chest: 'TreasureChest_meadows', items: {}, timeUtc: '2026-10-29T11:00:00.000Z' };
    const snapshot = snapshotWith({
      explored: { Ragnar: ['0,0'] },
      chests: {
        '1:10': { ...chest, chest: 'piece_chest_wood', x: 900, z: 900, builder: 'Ragnar' },
        '1:11': { ...chest, x: 40, z: -20, builder: null },
        '1:12': { ...chest, x: 400, z: 400, builder: null },
      },
    });

    // WHEN the found chests are listed
    const ids = foundChests(snapshot).map(([id]) => id);

    // THEN Ragnar's chest and the nearby world chest show, and the far one stays hidden
    expect(ids).toEqual(['1:10', '1:11']);
  });
});
