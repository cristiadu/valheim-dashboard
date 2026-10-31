import { setTimeout } from 'node:timers/promises';

import { fail, redirect } from '@sveltejs/kit';

import { configuredPassword, isSameSecret, passwordToken } from '#/lib/server/access';
import { PASSWORD_COOKIE, PASSWORD_COOKIE_SECONDS, WRONG_PASSWORD_DELAY_MS } from '#/lib/server/models';

/** Checks the typed password, remembers it in a cookie and goes back to the page the friend wanted. */
export const actions = {
  default: async ({ request, cookies, url }) => {
    const typed = String((await request.formData()).get('password') ?? '');
    if (configuredPassword === null || !isSameSecret(typed, configuredPassword)) {
      await setTimeout(WRONG_PASSWORD_DELAY_MS);
      return fail(401, { isWrong: true });
    }
    cookies.set(PASSWORD_COOKIE, passwordToken(configuredPassword), {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: PASSWORD_COOKIE_SECONDS,
    });
    // Only addresses on this site, so a link cannot send a friend elsewhere.
    const next = url.searchParams.get('next') ?? '/';
    redirect(303, next.startsWith('/') && !next.startsWith('//') ? next : '/');
  },
};
