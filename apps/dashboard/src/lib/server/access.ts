import { createHash, timingSafeEqual } from 'node:crypto';

import { FORWARDED_HEADER, LOCAL_HOSTNAMES, type AccessDecision } from '#/lib/server/models';

/**
 * Decides whether [request] may see the dashboard. Requests made on this PC, such as the updater's, need no
 * password. Requests through the tunnel need [password] in a Basic login, with any name.
 */
export const checkAccess = (request: Request, password: string | null): AccessDecision => {
  const hostname = new URL(`http://${request.headers.get('host') ?? ''}`).hostname;
  const isLocal = LOCAL_HOSTNAMES.includes(hostname) && !request.headers.has(FORWARDED_HEADER);
  if (isLocal) {
    return 'allowed';
  }
  if (password === null) {
    return 'refused';
  }
  const [scheme, encoded] = (request.headers.get('authorization') ?? '').split(' ');
  if (scheme !== 'Basic' || !encoded) {
    return 'needsPassword';
  }
  const login = Buffer.from(encoded, 'base64').toString('utf8');
  const typed = login.slice(login.indexOf(':') + 1);
  // Comparing hashes keeps the time the same whatever was typed, so it gives no hint of the password.
  const typedHash = createHash('sha256').update(typed).digest();
  const passwordHash = createHash('sha256').update(password).digest();
  return login.includes(':') && timingSafeEqual(typedHash, passwordHash) ? 'allowed' : 'needsPassword';
};
