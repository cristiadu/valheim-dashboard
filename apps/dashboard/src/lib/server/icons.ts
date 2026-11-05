import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { iconItems } from '#/lib/gear';
import { itemName } from '#/lib/items';
import { iconFileName } from '#/lib/recipes';
import { readConfig } from '#/lib/server/config';
import { logger } from '#/lib/server/logger';
import { ICON_FOLDER_NAME, WIKI_API_URL, WIKI_ICON_FILES, WIKI_TITLES_PER_REQUEST, type WikiImageResponse } from '#/lib/server/models';

/** Items the wiki had no icon for since the dashboard started, so a missing icon asks the wiki only once. */
const missingOnWiki = new Set<string>();

/**
 * Returns the wiki file titles that may hold the icon of [item], best first: the known file name when there is one,
 * else the name as the game writes it (`File:Deer_hide.png`) and with every word capitalized (`File:Deer_Hide.png`).
 */
export const wikiTitlesOf = (item: string): string[] => {
  const known = WIKI_ICON_FILES[item];
  if (known !== undefined) {
    return [`File:${known}`];
  }
  const words = item.split(' ');
  const titled = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('_');
  return [...new Set([`File:${words.join('_')}.png`, `File:${titled}.png`])];
};

/** Asks the wiki for the image address of each of [items]' icons. Items without an icon on the wiki are left out. */
const imageUrls = async (items: string[]): Promise<Map<string, string>> => {
  const query = new URLSearchParams({
    action: 'query',
    titles: items.flatMap(wikiTitlesOf).join('|'),
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
  });
  const response = await fetch(`${WIKI_API_URL}?${query}`);
  if (!response.ok) {
    throw new Error(`The wiki API answered ${response.status}`);
  }
  const { query: answer } = (await response.json()) as WikiImageResponse;
  const renamed = new Map((answer.normalized ?? []).map(({ from, to }) => [from, to]));
  const urlByTitle = new Map(Object.values(answer.pages).map((page) => [page.title, page.imageinfo?.[0]?.url]));
  const urls = new Map<string, string>();
  for (const item of items) {
    const url = wikiTitlesOf(item)
      .map((title) => urlByTitle.get(renamed.get(title) ?? title))
      .find((found) => found !== undefined);
    if (url !== undefined) {
      urls.set(item, url);
    }
  }
  return urls;
};

/** Downloads the original image at [url] and saves it as [item]'s icon in [folder]. Returns the image, or null on failure. */
const saveIcon = async (folder: string, item: string, url: string): Promise<Buffer | null> => {
  const original = new URL(url);
  original.searchParams.set('format', 'original');
  const image = await fetch(original);
  if (!image.ok) {
    logger.error(`Could not download the icon for ${item}: ${original} answered ${image.status}`);
    return null;
  }
  const bytes = Buffer.from(await image.arrayBuffer());
  await writeFile(join(folder, iconFileName(item)), bytes);
  return bytes;
};

/** Returns the folder the item icons are kept in, next to the server's log. */
export const iconFolder = (): string => join(dirname(readConfig(process.env).logFile), ICON_FOLDER_NAME);

/** Downloads from the wiki the icon of every recipe item and known piece of gear that [folder] does not have yet. */
export const downloadMissingIcons = async (folder: string): Promise<void> => {
  await mkdir(folder, { recursive: true });
  const present = new Set(await readdir(folder));
  const missing = iconItems().filter((item) => !present.has(iconFileName(item)));
  for (let start = 0; start < missing.length; start += WIKI_TITLES_PER_REQUEST) {
    const batch = missing.slice(start, start + WIKI_TITLES_PER_REQUEST);
    const urls = await imageUrls(batch);
    for (const item of batch) {
      const url = urls.get(item);
      if (url === undefined) {
        missingOnWiki.add(item);
        logger.warn(`The wiki has no icon for ${item}`);
        continue;
      }
      await saveIcon(folder, item, url);
    }
  }
};

/**
 * Returns the icon saved as [file] in [folder]. When it is not there yet, finds which item it is for among the known
 * items and every item prefab in [stacks], downloads it from the wiki, and returns it. Returns null for an unknown
 * file or an item the wiki has no icon for, and asks the wiki about each item only once.
 */
export const iconFile = async (folder: string, file: string, stacks: Record<string, number>): Promise<Buffer | null> => {
  const saved = await readFile(join(folder, file)).catch(() => null);
  if (saved !== null) {
    return saved;
  }
  const names = [...iconItems(), ...Object.keys(stacks).map(itemName)];
  const item = names.find((name) => iconFileName(name) === file);
  if (item === undefined || missingOnWiki.has(item)) {
    return null;
  }
  missingOnWiki.add(item);
  const url = (await imageUrls([item])).get(item);
  if (url === undefined) {
    logger.warn(`The wiki has no icon for ${item}`);
    return null;
  }
  await mkdir(folder, { recursive: true });
  const image = await saveIcon(folder, item, url);
  if (image !== null) {
    missingOnWiki.delete(item);
  }
  return image;
};

/** Starts downloading the missing icons in the background, so the dashboard serves pages meanwhile. */
export const startIconDownload = (): void => {
  const folder = iconFolder();
  downloadMissingIcons(folder).catch((error: Error) =>
    logger.error(`Could not download item icons into ${folder}: ${error.message}`),
  );
};
