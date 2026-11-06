import { describe, expect, it } from 'vitest';

import { areaLabel, areaName, count, listText, thingList, thingName, withArticle } from '#/lib/text';

describe('count', () => {
  it('uses the single word only for one', () => {
    // GIVEN no deaths, one and two
    // WHEN / THEN only one reads as a single death
    expect([0, 1, 2].map((amount) => count(amount, 'death', 'deaths'))).toEqual(['0 deaths', '1 death', '2 deaths']);
  });
});

describe('thingName', () => {
  it('reads prefabs as plain words, without the piece and pickable starts', () => {
    // GIVEN a building piece, an item and a pickable
    // WHEN / THEN each reads in lowercase words
    expect(['piece_workbench', 'SwordIron', 'Pickable_Mushroom'].map(thingName)).toEqual(['workbench', 'sword iron', 'mushroom']);
  });
});

describe('withArticle', () => {
  it('puts an before a vowel and a before anything else', () => {
    // WHEN / THEN abomination takes an and troll takes a
    expect(['abomination', 'troll'].map(withArticle)).toEqual(['an abomination', 'a troll']);
  });
});

describe('listText', () => {
  it('joins names with commas and a last and', () => {
    // GIVEN no names, one, two and three
    // WHEN / THEN each reads as a sentence would
    expect([[], ['a troll'], ['a troll', 'Bjorn'], ['a', 'b', 'c']].map(listText)).toEqual(['', 'a troll', 'a troll and Bjorn', 'a, b and c']);
  });
});

describe('thingList', () => {
  it('lists every thing with its count, most first', () => {
    // GIVEN a stretch of building
    // WHEN / THEN the most built piece comes first
    expect(thingList({ wood_fence: 8, piece_workbench: 1, wood_floor_1x1: 14 })).toBe('14 wood floor 1x1, 8 wood fence, 1 workbench');
  });
});

describe('areaName', () => {
  it('names areas as they read in a sentence, and keeps unknown ones', () => {
    // WHEN / THEN known areas take their article and an unknown one stays as logged
    expect(['BlackForest', 'Moon'].map(areaName)).toEqual(['the Black Forest', 'Moon']);
  });
});

describe('areaLabel', () => {
  it('names areas the way the game shows them', () => {
    // WHEN / THEN plugin names read plainly
    expect(['BlackForest', 'Mountain', 'Ocean', 'Dungeon'].map(areaLabel)).toEqual(['Black Forest', 'Mountains', 'Ocean', 'Dungeon']);
  });
});
