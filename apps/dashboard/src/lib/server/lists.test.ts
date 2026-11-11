import { describe, expect, it } from 'vitest';

import { pushCapped } from '#/lib/server/lists';

describe('pushCapped', () => {
  it('drops the oldest items once the list is full', () => {
    // GIVEN a list of three that keeps at most three
    const list = [1, 2, 3];

    // WHEN a fourth is added
    pushCapped(list, 4, 3);

    // THEN the first one is gone
    expect(list).toEqual([2, 3, 4]);
  });
});
