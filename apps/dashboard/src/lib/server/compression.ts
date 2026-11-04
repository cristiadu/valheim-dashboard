import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import { COMPRESSED_TYPES } from '#/lib/server/models';

/** Gzip-compresses a body without blocking the server. */
const gzipBody = promisify(gzip);

/**
 * Returns [response] gzip-compressed when it is a page or page data and the browser that sent [request] accepts
 * gzip. Pages carry the whole snapshot, which shrinks about ten times. Anything else is returned as it is.
 */
export const compressed = async (request: Request, response: Response): Promise<Response> => {
  const type = response.headers.get('content-type') ?? '';
  const isCompressible = response.status === 200 && COMPRESSED_TYPES.some((prefix) => type.startsWith(prefix));
  const acceptsGzip = (request.headers.get('accept-encoding') ?? '').includes('gzip');
  if (!isCompressible || !acceptsGzip || response.headers.has('content-encoding')) {
    return response;
  }
  const body = await gzipBody(Buffer.from(await response.arrayBuffer()));
  const headers = new Headers(response.headers);
  headers.set('content-encoding', 'gzip');
  headers.delete('content-length');
  headers.append('vary', 'Accept-Encoding');
  return new Response(new Uint8Array(body), { status: response.status, headers });
};
