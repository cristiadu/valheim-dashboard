import { error, type RequestEvent } from '@sveltejs/kit';

import { iconFile, iconFolder } from '#/lib/server/icons';
import { currentSnapshot } from '#/lib/server/live';
import { logger } from '#/lib/server/logger';
import { ICON_CACHE_SECONDS, ICON_FILE_PATTERN } from '#/lib/server/models';

/** Returns an item icon, downloading it from the wiki on first use, or 404 when there is no icon for it. */
export const GET = async ({ params }: RequestEvent<{ file: string }>): Promise<Response> => {
  if (!ICON_FILE_PATTERN.test(params.file)) {
    error(404, 'No such icon');
  }
  const { itemStacks } = await currentSnapshot();
  let image: Buffer | null = null;
  try {
    image = await iconFile(iconFolder(), params.file, itemStacks);
  } catch (failure) {
    logger.error(`Could not get the icon ${params.file}: ${String(failure)}`);
  }
  if (image === null) {
    error(404, 'No icon for this item');
  }
  return new Response(new Uint8Array(image), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${ICON_CACHE_SECONDS}` },
  });
};
