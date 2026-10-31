import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { iconFileName, recipeItems } from '../recipes';
import { readConfig } from './config';
import { logger } from './logger';
import { ICON_FOLDER_NAME, WIKI_API_URL, WIKI_ICON_FILES, WIKI_TITLES_PER_REQUEST, type WikiImageResponse } from './models';

/** Returns the wiki file title of the icon for [item], for example `File:Deer_hide.png`. */
const wikiTitleOf = (item: string): string => `File:${WIKI_ICON_FILES[item] ?? `${item.replaceAll(' ', '_')}.png`}`;

/** Asks the wiki for the image address of each of [items]' icons. Items without an icon on the wiki are left out. */
const imageUrls = async (items: string[]): Promise<Map<string, string>> => {
  const query = new URLSearchParams({
    action: 'query',
    titles: items.map(wikiTitleOf).join('|'),
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
    const title = wikiTitleOf(item);
    const url = urlByTitle.get(renamed.get(title) ?? title);
    if (url !== undefined) {
      urls.set(item, url);
    }
  }
  return urls;
};

/** Returns the folder the item icons are kept in, next to the server's log. */
export const iconFolder = (): string => join(dirname(readConfig(process.env).logFile), ICON_FOLDER_NAME);

/** Downloads from the wiki the icon of every recipe item that [folder] does not have yet. */
export const downloadMissingIcons = async (folder: string): Promise<void> => {
  await mkdir(folder, { recursive: true });
  const present = new Set(await readdir(folder));
  const missing = recipeItems().filter((item) => !present.has(iconFileName(item)));
  for (let start = 0; start < missing.length; start += WIKI_TITLES_PER_REQUEST) {
    const batch = missing.slice(start, start + WIKI_TITLES_PER_REQUEST);
    const urls = await imageUrls(batch);
    for (const item of batch) {
      const url = urls.get(item);
      if (url === undefined) {
        logger.warn(`The wiki has no icon for ${item}`);
        continue;
      }
      const original = new URL(url);
      original.searchParams.set('format', 'original');
      const image = await fetch(original);
      if (!image.ok) {
        logger.error(`Could not download the icon for ${item}: ${original} answered ${image.status}`);
        continue;
      }
      await writeFile(join(folder, iconFileName(item)), Buffer.from(await image.arrayBuffer()));
    }
  }
};

/** Starts downloading the missing icons in the background, so the dashboard serves pages meanwhile. */
export const startIconDownload = (): void => {
  const folder = iconFolder();
  downloadMissingIcons(folder).catch((error: Error) =>
    logger.error(`Could not download item icons into ${folder}: ${error.message}`),
  );
};
