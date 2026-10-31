import type { ServerInit } from '@sveltejs/kit/hooks';

import { startIconDownload } from '#lib/server/icons.ts';

/** Downloads any missing item icons when the dashboard starts. */
export const init: ServerInit = () => {
  startIconDownload();
};
