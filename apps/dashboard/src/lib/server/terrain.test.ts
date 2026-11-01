import { describe, expect, it } from 'vitest';

import { terrainOf } from '#/lib/server/terrain';

describe('terrainOf', () => {
  it('reads the westmost square and the rows, with Windows line ends', () => {
    // GIVEN a terrain file of two by two squares
    const text = 'squareMeters 32 first -1\r\nMB\r\n~S\r\n';

    // WHEN it is read
    const terrain = terrainOf(text);

    // THEN the rows come northmost first
    expect(terrain).toEqual({ first: -1, rows: ['MB', '~S'] });
  });

  it('refuses a file without the header', () => {
    // GIVEN a file that starts with a row
    const text = 'MB\n~S\n';

    // WHEN it is read
    const read = (): unknown => terrainOf(text);

    // THEN it says what the first line should be
    expect(read).toThrow('The terrain file starts with "MB", not "squareMeters <meters> first <square>".');
  });
});
