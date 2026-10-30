import { describe, expect, it } from 'vitest';

import { TABS } from '#/src/lib/models.ts';
import { tabFor } from '#/src/lib/tabs.ts';

describe('tabFor', () => {
  it('finds the tab for its path', () => {
    // GIVEN the Saga path
    // WHEN its tab is looked up
    const tab = tabFor('/saga');

    // THEN it is Saga
    expect(tab.label).toBe('Saga');
  });

  it('ignores a trailing slash', () => {
    // GIVEN the World path with a trailing slash
    // WHEN its tab is looked up
    const tab = tabFor('/world/');

    // THEN it is World
    expect(tab.label).toBe('World');
  });

  it('falls back to Hall for an unknown path', () => {
    // GIVEN a path with no tab
    // WHEN its tab is looked up
    const tab = tabFor('/nowhere');

    // THEN it is Hall
    expect(tab.label).toBe('Hall');
  });
});

describe('TABS', () => {
  it('lists the six tabs in menu order', () => {
    // GIVEN the tab list
    // WHEN the labels are read
    const labels = TABS.map((tab) => tab.label);

    // THEN they are in menu order
    expect(labels).toEqual(['Hall', 'Vikings', 'Saga', 'World', 'Recipes', 'Server']);
  });
});
