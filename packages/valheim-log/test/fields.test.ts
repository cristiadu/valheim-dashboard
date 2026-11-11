import { describe, expect, it } from 'vitest';

import { heldItemsOf, optionalNumber, playerOf } from '#/fields';

describe('heldItemsOf', () => {
  it('adds up each item, and reads nothing as no items', () => {
    // WHEN / THEN the same item twice is one count, and the plugin's empty word is an empty list
    expect(heldItemsOf('Wood x20, Stone x3, Wood x5')).toEqual({ Wood: 25, Stone: 3 });
    expect(heldItemsOf('nothing')).toEqual({});
  });
});

describe('optionalNumber', () => {
  it('reads a number group, or null when it did not match', () => {
    // WHEN / THEN
    expect(optionalNumber('42')).toBe(42);
    expect(optionalNumber(undefined)).toBeNull();
  });
});

describe('playerOf', () => {
  it('reads a player, or null when the plugin did not know who it was', () => {
    // WHEN / THEN
    expect(playerOf('Ragnar')).toBe('Ragnar');
    expect(playerOf('an unknown player')).toBeNull();
  });
});
