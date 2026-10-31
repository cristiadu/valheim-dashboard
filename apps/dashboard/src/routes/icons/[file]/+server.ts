import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { error } from '@sveltejs/kit';

import { iconFolder } from '#lib/server/icons.ts';
import { ICON_CACHE_SECONDS, ICON_FILE_PATTERN } from '#lib/server/models.ts';

import type { RequestHandler } from './$types';

/** Returns a downloaded item icon, or 404 when it is not downloaded yet. */
export const GET: RequestHandler = async ({ params }) => {
  if (!ICON_FILE_PATTERN.test(params.file)) {
    error(404, 'No such icon');
  }
  const image = await readFile(join(iconFolder(), params.file)).catch(() => null);
  if (image === null) {
    error(404, 'Icon not downloaded yet');
  }
  return new Response(image, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${ICON_CACHE_SECONDS}` },
  });
};
