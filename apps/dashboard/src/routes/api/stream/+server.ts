import { createGzip, type Gzip } from 'node:zlib';

import { CHANGE_EVENT } from '#/lib/models';
import { sentSnapshot, subscribe } from '#/lib/server/live';
import { KEEP_ALIVE_MS } from '#/lib/server/models';

/** Compresses [text] onto the stream and sends it right away instead of waiting for more. */
const send = (gzip: Gzip, text: string): void => {
  gzip.write(text);
  gzip.flush();
};

/**
 * Streams the snapshot to the page with server-sent events, compressed: the whole snapshot once now, then only
 * what changed after each batch of new log lines.
 */
export const GET = async (): Promise<Response> => {
  const first = await sentSnapshot();
  const gzip = createGzip();
  send(gzip, `data: ${JSON.stringify(first)}\n\n`);
  const unsubscribe = subscribe((change) => send(gzip, `event: ${CHANGE_EVENT}\ndata: ${JSON.stringify(change)}\n\n`));
  const keepAlive = setInterval(() => send(gzip, ': keep-alive\n\n'), KEEP_ALIVE_MS);
  gzip.once('close', () => {
    unsubscribe();
    clearInterval(keepAlive);
  });
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      gzip.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
    },
    cancel: () => {
      gzip.destroy();
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'content-encoding': 'gzip' },
  });
};
