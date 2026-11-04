import { gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { compressed } from '#/lib/server/compression';

/** A page as the dashboard renders it. */
const PAGE = '<html><body>Hall</body></html>';

/** Request from a browser that accepts gzip. */
const GZIP_REQUEST = new Request('http://localhost/', { headers: { 'accept-encoding': 'gzip, deflate, br' } });

describe('compressed', () => {
  it('compresses a page for a browser that accepts gzip', async () => {
    // GIVEN a page
    const page = new Response(PAGE, { headers: { 'content-type': 'text/html' } });

    // WHEN it is compressed
    const response = await compressed(GZIP_REQUEST, page);

    // THEN it is gzip and unzips to the same page
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('vary')).toBe('Accept-Encoding');
    expect(gunzipSync(Buffer.from(await response.arrayBuffer())).toString()).toBe(PAGE);
  });

  it('leaves a page alone for a browser that does not accept gzip', async () => {
    // GIVEN a page and a request with no accept-encoding
    const page = new Response(PAGE, { headers: { 'content-type': 'text/html' } });

    // WHEN it is compressed
    const response = await compressed(new Request('http://localhost/'), page);

    // THEN it is sent as it was
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(await response.text()).toBe(PAGE);
  });

  it('leaves icons, the live stream and redirects alone', async () => {
    // GIVEN an icon, an already compressed stream and a redirect
    const icon = new Response('png', { headers: { 'content-type': 'image/png' } });
    const stream = new Response('x', { headers: { 'content-type': 'text/event-stream', 'content-encoding': 'gzip' } });
    const redirect = new Response(null, { status: 303, headers: { 'content-type': 'text/html', location: '/' } });

    // WHEN each is compressed
    // THEN each is returned as it was
    expect(await compressed(GZIP_REQUEST, icon)).toBe(icon);
    expect(await compressed(GZIP_REQUEST, stream)).toBe(stream);
    expect(await compressed(GZIP_REQUEST, redirect)).toBe(redirect);
  });
});
