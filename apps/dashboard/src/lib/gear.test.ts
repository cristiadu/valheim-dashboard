import { describe, expect, it } from 'vitest';

import { gearEntryOf, gearLabel, gearPiece, gearSheet, iconItems } from '#/lib/gear';

describe('gearEntryOf', () => {
  it('adds the level only past level 1, and reads back as the same piece', () => {
    // GIVEN a spear at level 1 and one at level 4
    const entries = [gearEntryOf('SpearFlint', 1), gearEntryOf('SpearFlint', 4)];

    // WHEN they are read back
    const pieces = entries.map((entry) => gearPiece(entry).quality);

    // THEN the level shows only on the second, and both read back at their level
    expect(entries).toEqual(['SpearFlint', 'SpearFlint quality 4']);
    expect(pieces).toEqual([1, 4]);
  });
});

describe('gearPiece', () => {
  it('reads the name, level and slot of a logged piece', () => {
    // WHEN / THEN each prefab gets the game's name, its level and its place
    expect(gearPiece('SpearFlint quality 4')).toEqual({ prefab: 'SpearFlint', name: 'Flint spear', quality: 4, place: 'weapon' });
    expect(gearPiece('ArmorLeatherChest')).toEqual({ prefab: 'ArmorLeatherChest', name: 'Leather tunic', quality: 1, place: 'chest' });
    expect(gearPiece('Hammer quality 3')).toEqual({ prefab: 'Hammer', name: 'Hammer', quality: 3, place: 'carried' });
    expect(gearPiece('FistBjornClaw')).toEqual({ prefab: 'FistBjornClaw', name: 'Paws of the Bear', quality: 1, place: 'weapon' });
  });

  it('puts unknown gear in a slot by its prefab and names it in plain words', () => {
    // WHEN / THEN gear missing from the name list still lands in the right slot
    expect(gearPiece('HelmetFenring')).toEqual({ prefab: 'HelmetFenring', name: 'Helmet fenring', quality: 1, place: 'head' });
    expect(gearPiece('ArmorCarapaceLegs')).toEqual({ prefab: 'ArmorCarapaceLegs', name: 'Armor carapace legs', quality: 1, place: 'legs' });
  });
});

describe('gearSheet', () => {
  it('puts what is worn now in its slot at its newest level, and other held pieces under it', () => {
    // GIVEN gear newest first, and the plugin saw the character wear the leather helmet, the spear and a torch
    const gear = ['HelmetTrollLeather', 'AxeFlint quality 4', 'SpearFlint quality 4', 'HelmetLeather', 'Torch'];
    const worn = ['HelmetLeather', 'SpearFlint', 'Torch'];

    // WHEN it is laid out
    const sheet = gearSheet(gear, worn);

    // THEN the older helmet is on the head, the spear keeps its level, and the torch is held
    expect(Object.fromEntries(Object.entries(sheet.worn).map(([slot, piece]) => [slot, `${piece.name} ${piece.quality}`]))).toEqual({
      head: 'Leather helmet 1',
      weapon: 'Flint spear 4',
    });
    expect(sheet.held.map((piece) => piece.name)).toEqual(['Torch']);
  });

  it('leaves a slot empty when nothing is worn there now', () => {
    // WHEN the character was seen with a helmet but wears nothing now
    const sheet = gearSheet(['HelmetLeather'], []);

    // THEN no slot is filled
    expect(sheet).toEqual({ worn: {}, held: [] });
  });

  it('uses the newest piece of each slot before the plugin logged what is worn', () => {
    // GIVEN gear newest first, and the same spear at two levels
    const gear = ['AxeFlint quality 4', 'SpearFlint quality 4', 'HelmetLeather', 'Torch', 'SpearFlint quality 2'];

    // WHEN it is laid out with nothing known as worn
    const sheet = gearSheet(gear, null);

    // THEN the axe is the weapon, the helmet is on the head, and nothing else is shown as held
    expect(Object.fromEntries(Object.entries(sheet.worn).map(([slot, piece]) => [slot, piece.name]))).toEqual({
      weapon: 'Flint axe',
      head: 'Leather helmet',
    });
    expect(sheet.held).toEqual([]);
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
    expect(items).toContain('Finewood bow');
    expect(items).toContain('Deer hide');
    expect(items.filter((item) => item === 'Hammer')).toEqual(['Hammer']);
  });
});
