import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { iconFileName, recipeItems } from '../recipes';
import { downloadMissingIcons } from './icons';

describe('downloadMissingIcons', () => {
  let folder: string;

  beforeEach(async () => {
    // Every icon except Deer hide's is already downloaded
    folder = await mkdtemp(join(tmpdir(), 'item-icons-'));
    await Promise.all(
      recipeItems()
        .filter((item) => item !== 'Deer hide')
        .map((item) => writeFile(join(folder, iconFileName(item)), 'old')),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(folder, { recursive: true, force: true });
  });

  it('downloads only the icons the folder does not have', async () => {
    // GIVEN a wiki that knows Deer hide's image
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          query: {
            normalized: [{ from: 'File:Deer_hide.png', to: 'File:Deer hide.png' }],
            pages: { '7558': { title: 'File:Deer hide.png', imageinfo: [{ url: 'https://static.example/Deer_Hide.png?cb=1' }] } },
          },
        }),
      )
      .mockResolvedValueOnce(new Response('png'));
    vi.stubGlobal('fetch', fetchMock);

    // WHEN the missing icons are downloaded
    await downloadMissingIcons(folder);

    // THEN only Deer hide's original image is fetched and saved
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('titles=File%3ADeer_hide.png&');
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://static.example/Deer_Hide.png?cb=1&format=original');
    expect(await readFile(join(folder, 'deer-hide.png'), 'utf8')).toBe('png');
  });

  it('skips an item the wiki has no icon for', async () => {
    // GIVEN a wiki without Deer hide's file
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ query: { pages: { '-1': { title: 'File:Deer hide.png' } } } })));

    // WHEN the missing icons are downloaded
    await downloadMissingIcons(folder);

    // THEN nothing new is saved
    expect(await readdir(folder)).not.toContain('deer-hide.png');
  });
});
