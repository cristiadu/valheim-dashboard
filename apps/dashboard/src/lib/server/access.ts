import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { readConfig } from '#/lib/server/config';
import { FORWARDED_HEADER, LOCAL_HOSTNAMES, type AccessDecision } from '#/lib/server/models';

/** Password friends type, read once when the dashboard starts. */
export const configuredPassword = readConfig(process.env).password;

/** Returns the cookie value that proves someone typed [password]. It changes when the password does. */
export const passwordToken = (password: string): string =>
  createHmac('sha256', password).update('valheim-dashboard').digest('hex');

/** True when [typed] matches [secret]. Hashes keep the time the same whatever was typed, so it gives no hint. */
export const isSameSecret = (typed: string, secret: string): boolean =>
  timingSafeEqual(createHash('sha256').update(typed).digest(), createHash('sha256').update(secret).digest());

/**
 * Decides whether [request] may see the dashboard. Requests made on this PC, such as the updater's, need no
 * password. Requests through the tunnel need the cookie set by the password page, holding [cookieToken].
 */
export const checkAccess = (request: Request, password: string | null, cookieToken: string | undefined): AccessDecision => {
  const hostname = new URL(`http://${request.headers.get('host') ?? ''}`).hostname;
  const isLocal = LOCAL_HOSTNAMES.includes(hostname) && !request.headers.has(FORWARDED_HEADER);
  if (isLocal) {
    return 'allowed';
  }
  if (password === null) {
    return 'refused';
  }
  return cookieToken !== undefined && isSameSecret(cookieToken, passwordToken(password)) ? 'allowed' : 'needsPassword';
};
