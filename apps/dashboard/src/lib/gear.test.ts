import { describe, expect, it } from 'vitest';

import { gearLabel, gearPiece, gearSheet, iconItems } from '#/lib/gear';

describe('gearPiece', () => {
  it('reads the name, level and slot of a logged piece', () => {
    // WHEN / THEN each prefab gets the game's name, its level and its place
    expect(gearPiece('SpearFlint quality 4')).toEqual({ prefab: 'SpearFlint', name: 'Flint spear', quality: 4, place: 'weapon' });
    expect(gearPiece('ArmorLeatherChest')).toEqual({ prefab: 'ArmorLeatherChest', name: 'Leather tunic', quality: 1, place: 'chest' });
    expect(gearPiece('Hammer quality 3')).toEqual({ prefab: 'Hammer', name: 'Hammer', quality: 3, place: 'carried' });
  });

  it('puts unknown gear in a slot by its prefab and names it in plain words', () => {
    // WHEN / THEN gear missing from the name list still lands in the right slot
    expect(gearPiece('HelmetFenring')).toEqual({ prefab: 'HelmetFenring', name: 'Helmet fenring', quality: 1, place: 'head' });
    expect(gearPiece('ArmorCarapaceLegs')).toEqual({ prefab: 'ArmorCarapaceLegs', name: 'Armor carapace legs', quality: 1, place: 'legs' });
  });
});

describe('gearSheet', () => {
  it('wears the newest piece of each slot and carries the rest', () => {
    // GIVEN gear newest first, as the player card keeps it
    const gear = ['AxeFlint quality 4', 'BowFineWood', 'SpearFlint quality 4', 'HelmetLeather', 'Torch', 'CapeDeerHide quality 3'];

    // WHEN it is laid out
    const sheet = gearSheet(gear);

    // THEN the axe is the weapon, the older weapons and the torch are carried
    expect(Object.fromEntries(Object.entries(sheet.worn).map(([slot, piece]) => [slot, piece.name]))).toEqual({
      weapon: 'Flint axe',
      head: 'Leather helmet',
      cape: 'Deer hide cape',
    });
    expect(sheet.carried.map((piece) => piece.name)).toEqual(['Fine bow', 'Flint spear', 'Torch']);
  });

  it('shows an upgraded piece once, at its newest level', () => {
    // WHEN the same spear was seen at level 4 and level 2
    const sheet = gearSheet(['SpearFlint quality 4', 'SpearFlint quality 2']);

    // THEN only level 4 is kept
    expect(sheet.worn.weapon?.quality).toBe(4);
    expect(sheet.carried).toEqual([]);
  });
});

describe('gearLabel', () => {
  it('adds the level only when the piece was upgraded', () => {
    // WHEN / THEN
    expect(gearLabel(gearPiece('SpearFlint quality 4'))).toBe('Flint spear, level 4');
    expect(gearLabel(gearPiece('Torch'))).toBe('Torch');
  });
});

describe('iconItems', () => {
  it('lists recipe items and known gear once each', () => {
    // WHEN
    const items = iconItems();

    // THEN gear and recipe items are both there, with no repeats
    expect(items).toContain('Fine bow');
    expect(items).toContain('Deer hide');
    expect(items.filter((item) => item === 'Hammer')).toEqual(['Hammer']);
  });
});
