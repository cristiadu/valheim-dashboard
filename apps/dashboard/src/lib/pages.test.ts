import { describe, expect, it } from 'vitest';

import { pageOf } from '#/lib/pages';

/** Seven lines, enough for three pages of three. */
const LINES = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('pageOf', () => {
  it('shows one page of the list and where it sits', () => {
    // GIVEN seven lines, three at a time
    // WHEN the second page is asked for
    const page = pageOf(LINES, 1, 3);
    // THEN it holds lines four to six of seven, on page two of three
    expect(page).toEqual({ items: ['d', 'e', 'f'], index: 1, count: 3, first: 4, last: 6 });
  });

  it('shows a short last page', () => {
    // GIVEN seven lines, three at a time
    // WHEN the third page is asked for
    const page = pageOf(LINES, 2, 3);
    // THEN it holds only the seventh line
    expect(page).toEqual({ items: ['g'], index: 2, count: 3, first: 7, last: 7 });
  });

  it('shows the last page when the list shrank under the one asked for', () => {
    // GIVEN seven lines, three at a time
    // WHEN page five is asked for
    const page = pageOf(LINES, 4, 3);
    // THEN the last page shows instead
    expect(page).toEqual({ items: ['g'], index: 2, count: 3, first: 7, last: 7 });
  });

  it('keeps an empty list on one empty page', () => {
    // GIVEN no lines
    // WHEN the first page is asked for
    const page = pageOf([], 0, 3);
    // THEN there is one page with nothing on it
    expect(page).toEqual({ items: [], index: 0, count: 1, first: 0, last: 0 });
  });
});
