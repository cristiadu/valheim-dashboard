import { setTimeout } from 'node:timers/promises';

import { redirect, type RequestHandler } from '@sveltejs/kit';

import { configuredPassword, isSameSecret, passwordToken } from '#/lib/server/access';
import { PASSWORD_COOKIE, PASSWORD_COOKIE_SECONDS, WRONG_PASSWORD_DELAY_MS } from '#/lib/server/models';
import { passwordPage } from '#/lib/server/password-page';

/** Headers for the password page. */
const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8' };

/** Shows the password page. */
export const GET: RequestHandler = async () => new Response(passwordPage(false), { headers: HTML_HEADERS });

/** Checks the typed password, remembers it in a cookie and goes back to the page the friend wanted. */
export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const typed = String((await request.formData()).get('password') ?? '');
  if (configuredPassword === null || !isSameSecret(typed, configuredPassword)) {
    await setTimeout(WRONG_PASSWORD_DELAY_MS);
    return new Response(passwordPage(true), { status: 401, headers: HTML_HEADERS });
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
};
