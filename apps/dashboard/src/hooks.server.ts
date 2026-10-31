import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';

import { checkAccess, configuredPassword } from '#/lib/server/access';
import { startIconDownload } from '#/lib/server/icons';
import { PASSWORD_PATH } from '#/lib/models';
import { NO_PASSWORD_SET_TEXT, PASSWORD_COOKIE, PASSWORD_NEEDED_TEXT } from '#/lib/server/models';

/** Downloads any missing item icons when the dashboard starts. */
export const init: ServerInit = () => {
  startIconDownload();
};

/** Sends friends from outside this PC to the password page until they type it. */
export const handle: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;
  const access = checkAccess(event.request, configuredPassword, event.cookies.get(PASSWORD_COOKIE));
  if (access === 'refused') {
    return new Response(NO_PASSWORD_SET_TEXT, { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  if (access === 'allowed' || pathname === PASSWORD_PATH) {
    return resolve(event);
  }
  if (pathname.startsWith('/api/')) {
    return new Response(PASSWORD_NEEDED_TEXT, { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  redirect(303, `${PASSWORD_PATH}?next=${encodeURIComponent(pathname + search)}`);
};
