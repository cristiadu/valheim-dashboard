import { describe, expect, it } from 'vitest';

import { applyChange, changeBetween } from '#/lib/snapshot-change';

describe('snapshot changes', () => {
  it('sends nothing when nothing changed', () => {
    // GIVEN two equal values
    const before = { day: 12, events: ['joined'] };

    // WHEN the change between them is found
    // THEN there is none
    expect(changeBetween(before, { day: 12, events: ['joined'] })).toBeNull();
  });

  it('sends only the new items of a list that grew', () => {
    // GIVEN a list that got one item at the end
    const before = { events: ['joined', 'died'] };
    const after = { events: ['joined', 'died', 'left'] };

    // WHEN the change is found
    const change = changeBetween(before, after);

    // THEN only the new item is in it, and applying it gives the new list
    expect(change).toEqual({ fields: { events: { dropped: 0, kept: 2, added: ['left'] } }, removed: [] });
    expect(applyChange(before, change!)).toEqual(after);
  });

  it('drops old items and resends a changed last item of a capped list', () => {
    // GIVEN a list that lost its first item, whose last item changed, and that got one more
    const before = [{ count: 1 }, { count: 2 }, { count: 3 }];
    const after = [{ count: 2 }, { count: 4 }, { count: 5 }];

    // WHEN the change is found
    const change = changeBetween(before, after);

    // THEN it drops one, keeps one, sends two, and applying it gives the new list
    expect(change).toEqual({ dropped: 1, kept: 1, added: [{ count: 4 }, { count: 5 }] });
    expect(applyChange(before, change!)).toEqual(after);
  });

  it('sends changed, new and removed keys of an object', () => {
    // GIVEN positions where one moved, one is new and one is gone
    const before = { positions: { Ragnar: { x: 1, z: 2 }, Astrid: { x: 5, z: 5 } } };
    const after = { positions: { Ragnar: { x: 3, z: 2 }, Bjorn: { x: 0, z: 0 } } };

    // WHEN the change is found
    const change = changeBetween(before, after);

    // THEN only those keys are in it, and applying it gives the new object
    expect(change).toEqual({
      fields: {
        positions: {
          fields: { Ragnar: { fields: { x: { value: 3 } }, removed: [] }, Bjorn: { value: { x: 0, z: 0 } } },
          removed: ['Astrid'],
        },
      },
      removed: [],
    });
    expect(applyChange(before, change!)).toEqual(after);
  });

  it('sends a value whole when its kind changed', () => {
    // GIVEN a day that was not known and now is
    const before = { day: null };

    // WHEN the change is found
    const change = changeBetween(before, { day: 7 });

    // THEN the new value is sent whole
    expect(change).toEqual({ fields: { day: { value: 7 } }, removed: [] });
  });

  it('leaves the value it applies a change to as it was', () => {
    // GIVEN a value and a change to it
    const before = { events: ['joined'], day: 1 };
    const change = changeBetween(before, { events: ['joined', 'left'], day: 2 });

    // WHEN the change is applied
    applyChange(before, change!);

    // THEN the old value did not change
    expect(before).toEqual({ events: ['joined'], day: 1 });
  });
});
