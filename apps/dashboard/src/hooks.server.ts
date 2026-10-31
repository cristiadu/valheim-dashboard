import type { Handle, ServerInit } from '@sveltejs/kit/hooks';

import { checkAccess } from '#/lib/server/access';
import { readConfig } from '#/lib/server/config';
import { startIconDownload } from '#/lib/server/icons';
import { NO_PASSWORD_SET_TEXT, PASSWORD_NEEDED_TEXT, PASSWORD_REALM } from '#/lib/server/models';

/** Password friends type, read once when the dashboard starts. */
const password = readConfig(process.env).password;

/** Downloads any missing item icons when the dashboard starts. */
export const init: ServerInit = () => {
  startIconDownload();
};

/** Asks for the password on every request from outside this PC. */
export const handle: Handle = async ({ event, resolve }) => {
  const access = checkAccess(event.request, password);
  if (access === 'allowed') {
    return resolve(event);
  }
  const headers = new Headers({ 'content-type': 'text/plain; charset=utf-8' });
  if (access === 'refused') {
    return new Response(NO_PASSWORD_SET_TEXT, { status: 403, headers });
  }
  headers.set('www-authenticate', `Basic realm="${PASSWORD_REALM}", charset="UTF-8"`);
  return new Response(PASSWORD_NEEDED_TEXT, { status: 401, headers });
};
