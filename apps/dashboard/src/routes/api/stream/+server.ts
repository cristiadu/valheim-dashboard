import { currentSnapshot, subscribe } from '#/lib/server/live';
import { KEEP_ALIVE_MS } from '#/lib/server/models';

/** Streams the snapshot to the page with server-sent events: once now, then after each batch of new log lines. */
export const GET = async (): Promise<Response> => {
  const first = await currentSnapshot();
  let stop = (): void => {};
  const stream = new ReadableStream<string>({
    start: (controller) => {
      controller.enqueue(`data: ${JSON.stringify(first)}\n\n`);
      const unsubscribe = subscribe((snapshot) => controller.enqueue(`data: ${JSON.stringify(snapshot)}\n\n`));
      const keepAlive = setInterval(() => controller.enqueue(': keep-alive\n\n'), KEEP_ALIVE_MS);
      stop = () => {
        unsubscribe();
        clearInterval(keepAlive);
      };
    },
    cancel: () => stop(),
  });
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
  });
};
