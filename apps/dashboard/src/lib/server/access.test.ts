import { describe, expect, it } from 'vitest';

import { checkAccess, isSameSecret, passwordToken } from '#/lib/server/access';
import { requestTo, TUNNEL_HOST } from '#/lib/test-common';

/** Cookie value for the password `skol`. */
const SKOL_TOKEN = '368a3b15864d6e32f5c02567aadc497bdec1974f47625a426a7031a9f315f67b';

/** Header ngrok adds with the friend's address. */
const FORWARDED = { 'x-forwarded-for': '203.0.113.7' };

describe('passwordToken', () => {
  it('gives the same cookie value for the same password', () => {
    // GIVEN the password skol
    const password = 'skol';

    // WHEN its token is made
    const token = passwordToken(password);

    // THEN it is the known value
    expect(token).toBe(SKOL_TOKEN);
  });

  it('gives another value when the password changes', () => {
    // GIVEN a new password
    const password = 'skol2';

    // WHEN its token is made
    const token = passwordToken(password);

    // THEN the old cookie no longer matches
    expect(token).not.toBe(SKOL_TOKEN);
  });
});

describe('isSameSecret', () => {
  it('matches the same text', () => {
    // GIVEN / WHEN the right password is compared
    const isRight = isSameSecret('skol', 'skol');

    // THEN it matches
    expect(isRight).toBe(true);
  });

  it('does not match other text, even a longer one', () => {
    // GIVEN / WHEN a wrong password is compared
    const isRight = isSameSecret('skol!', 'skol');

    // THEN it does not match
    expect(isRight).toBe(false);
  });
});

describe('checkAccess', () => {
  it('lets requests made on this PC in without a password', () => {
    // GIVEN the updater asking for the status on this PC
    const request = requestTo('localhost:3000');

    // WHEN access is checked
    const access = checkAccess(request, 'skol', undefined);

    // THEN it is allowed
    expect(access).toBe('allowed');
  });

  it('lets local requests in when no password is set', () => {
    // GIVEN a request to 127.0.0.1 and no password
    const request = requestTo('127.0.0.1:3000');

    // WHEN access is checked
    const access = checkAccess(request, null, undefined);

    // THEN it is allowed
    expect(access).toBe('allowed');
  });

  it('asks for the password when a forwarded request claims to be local', () => {
    // GIVEN a tunnel request whose host says localhost
    const request = requestTo('localhost:3000', FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, 'skol', undefined);

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('turns tunnel requests away when no password is set', () => {
    // GIVEN a friend coming through ngrok and no password
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, null, SKOL_TOKEN);

    // THEN it is refused
    expect(access).toBe('refused');
  });

  it('asks for the password on a first visit', () => {
    // GIVEN a friend with no cookie yet
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, 'skol', undefined);

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('asks again after the password changed', () => {
    // GIVEN a friend whose cookie is for the old password
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked with a new password
    const access = checkAccess(request, 'skol2', SKOL_TOKEN);

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('lets a friend in with the cookie from the password page', () => {
    // GIVEN a friend who typed the right password before
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, 'skol', SKOL_TOKEN);

    // THEN it is allowed
    expect(access).toBe('allowed');
  });
});
