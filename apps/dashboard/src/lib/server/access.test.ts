import { describe, expect, it } from 'vitest';

import { checkAccess } from '#/lib/server/access';
import { requestTo, TUNNEL_HOST } from '#/lib/test-common';

/** Login header for the name `viking` and the password `skol`. */
const RIGHT_LOGIN = 'Basic dmlraW5nOnNrb2w=';

/** Login header for the name `viking` and the password `wrong`. */
const WRONG_LOGIN = 'Basic dmlraW5nOndyb25n';

/** Header ngrok adds with the friend's address. */
const FORWARDED = { 'x-forwarded-for': '203.0.113.7' };

describe('checkAccess', () => {
  it('lets requests made on this PC in without a password', () => {
    // GIVEN the updater asking for the status on this PC
    const request = requestTo('localhost:3000');

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN it is allowed
    expect(access).toBe('allowed');
  });

  it('lets local requests in when no password is set', () => {
    // GIVEN a request to 127.0.0.1 and no password
    const request = requestTo('127.0.0.1:3000');

    // WHEN access is checked
    const access = checkAccess(request, null);

    // THEN it is allowed
    expect(access).toBe('allowed');
  });

  it('asks for the password when a forwarded request claims to be local', () => {
    // GIVEN a tunnel request whose host says localhost
    const request = requestTo('localhost:3000', FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('turns tunnel requests away when no password is set', () => {
    // GIVEN a friend coming through ngrok and no password
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, null);

    // THEN it is refused
    expect(access).toBe('refused');
  });

  it('asks for the password when none was typed', () => {
    // GIVEN a friend's first visit through ngrok
    const request = requestTo(TUNNEL_HOST, FORWARDED);

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('asks again when the password is wrong', () => {
    // GIVEN a friend who typed the wrong password
    const request = requestTo(TUNNEL_HOST, { ...FORWARDED, authorization: WRONG_LOGIN });

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });

  it('lets a friend in with the right password and any name', () => {
    // GIVEN a friend who typed the right password
    const request = requestTo(TUNNEL_HOST, { ...FORWARDED, authorization: RIGHT_LOGIN });

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN it is allowed
    expect(access).toBe('allowed');
  });

  it('asks again when the login has no name and password separator', () => {
    // GIVEN a login that is only the password, base64 of `skol`
    const request = requestTo(TUNNEL_HOST, { ...FORWARDED, authorization: 'Basic c2tvbA==' });

    // WHEN access is checked
    const access = checkAccess(request, 'skol');

    // THEN the password is needed
    expect(access).toBe('needsPassword');
  });
});
