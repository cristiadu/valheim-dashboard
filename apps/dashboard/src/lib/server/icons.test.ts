import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { iconItems } from '#/lib/gear';
import { iconFileName } from '#/lib/recipes';
import { downloadMissingIcons, iconFile, wikiTitlesOf } from '#/lib/server/icons';

describe('downloadMissingIcons', () => {
  let folder: string;

  beforeEach(async () => {
    // Every icon except Deer hide's is already downloaded
    folder = await mkdtemp(join(tmpdir(), 'item-icons-'));
    await Promise.all(
      iconItems()
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('titles=File%3ADeer_hide.png%7CFile%3ADeer_Hide.png&');
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

describe('wikiTitlesOf', () => {
  it('tries the game name and the name with every word capitalized', () => {
    // GIVEN an item with no known wiki file name
    // WHEN its wiki titles are asked for
    // THEN both spellings are tried, the game's first
    expect(wikiTitlesOf('Minced meat sauce')).toEqual(['File:Minced_meat_sauce.png', 'File:Minced_Meat_Sauce.png']);
  });

  it('uses the known wiki file name when there is one', () => {
    // GIVEN an item whose wiki file is named differently
    // WHEN its wiki titles are asked for
    // THEN only the known file is tried
    expect(wikiTitlesOf('Flint arrow')).toEqual(['File:Flinthead Arrow.png']);
  });

  it('asks once for a one-word name', () => {
    // GIVEN a one-word item
    // WHEN its wiki titles are asked for
    // THEN the single spelling is not repeated
    expect(wikiTitlesOf('Acorn')).toEqual(['File:Acorn.png']);
  });
});

describe('iconFile', () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'item-icons-'));
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(folder, { recursive: true, force: true });
  });

  it('returns a saved icon without asking the wiki', async () => {
    // GIVEN a saved Wood icon
    await writeFile(join(folder, 'wood.png'), 'saved');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // WHEN the icon is asked for
    const image = await iconFile(folder, 'wood.png', {});

    // THEN the saved file comes back
    expect(image?.toString()).toBe('saved');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads the icon of an item only the item stacks know, on first use', async () => {
    // GIVEN a wiki that has the capitalized Battle Idol file, and an item stacks file listing its prefab
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          query: {
            pages: {
              '-1': { title: 'File:Bronze battle idol.png' },
              '9': { title: 'File:Bronze Battle Idol.png', imageinfo: [{ url: 'https://static.example/Bronze_Battle_Idol.png' }] },
            },
            normalized: [
              { from: 'File:Bronze_battle_idol.png', to: 'File:Bronze battle idol.png' },
              { from: 'File:Bronze_Battle_Idol.png', to: 'File:Bronze Battle Idol.png' },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(new Response('png'));
    vi.stubGlobal('fetch', fetchMock);

    // WHEN its icon is asked for
    const image = await iconFile(folder, 'bronze-battle-idol.png', { Upgrader1Weapon: 20 });

    // THEN it is downloaded, saved and returned
    expect(image?.toString()).toBe('png');
    expect(await readFile(join(folder, 'bronze-battle-idol.png'), 'utf8')).toBe('png');
  });

  it('asks the wiki only once about an item it has no icon for', async () => {
    // GIVEN a wiki without the item's file
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ query: { pages: { '-1': { title: 'File:Pine cone.png' } } } }));
    vi.stubGlobal('fetch', fetchMock);

    // WHEN the icon is asked for twice
    const first = await iconFile(folder, 'pine-cone.png', { PineCone: 100 });
    const second = await iconFile(folder, 'pine-cone.png', { PineCone: 100 });

    // THEN both are missing and the wiki was asked once
    expect([first, second]).toEqual([null, null]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for a file no item uses', async () => {
    // GIVEN no item named like the file
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    // WHEN the icon is asked for
    // THEN there is none and the wiki is not asked
    expect(await iconFile(folder, 'not-an-item.png', {})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
