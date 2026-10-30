import { getContext, setContext } from 'svelte';

import { CLOCK_TICK_MS, type LiveConnection, SNAPSHOT_KEY, type Snapshot } from '#/src/lib/models.ts';

/** Live data in the browser. Both stay null while the page renders on the server. */
export const live = $state<{ snapshot: Snapshot | null; nowMs: number | null }>({ snapshot: null, nowMs: null });

/** The open live stream and clock. Null while the page is not connected. */
let connection: LiveConnection | null = null;

/** Moves the page clock to now. */
const tickClock = (): void => {
  live.nowMs = Date.now();
};

/** Shows the snapshot in a [message] from the live stream. */
const showSnapshot = (message: MessageEvent<string>): void => {
  live.snapshot = JSON.parse(message.data) as Snapshot;
  tickClock();
};

/** Closes the live stream and stops the clock. */
export const disconnectLive = (): void => {
  connection?.source.close();
  clearInterval(connection?.clock);
  connection = null;
};

/** Listens to the server's live stream and moves the clock. Runs in the browser. Returns [disconnectLive]. */
export const connectLive = (): (() => void) => {
  tickClock();
  const source = new EventSource('/api/stream');
  source.onmessage = showSnapshot;
  connection = { source, clock: setInterval(tickClock, CLOCK_TICK_MS) };
  return disconnectLive;
};

/** Shares [getSnapshot] with the pages under the layout. */
export const provideSnapshot = (getSnapshot: () => Snapshot): void => {
  setContext(SNAPSHOT_KEY, getSnapshot);
};

/** Returns the getter for the current snapshot, shared by the layout. */
export const useSnapshot = (): (() => Snapshot) => getContext(SNAPSHOT_KEY);

/** The viewer's offset from UTC in minutes at [nowMs], for example `-420` for UTC−7. */
export const viewerOffsetMinutes = (nowMs: number): number => -new Date(nowMs).getTimezoneOffset();
