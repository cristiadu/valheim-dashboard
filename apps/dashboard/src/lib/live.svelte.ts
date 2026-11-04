import { getContext, setContext } from 'svelte';

import {
  CHANGE_EVENT,
  CLOCK_TICK_MS,
  type JsonValue,
  type LiveConnection,
  SNAPSHOT_KEY,
  type Snapshot,
  type SnapshotChange,
} from '#/lib/models';
import { applyChange } from '#/lib/snapshot-change';

/** Live data in the browser. Both stay null while the page renders on the server. */
export const live = $state<{ snapshot: Snapshot | null; nowMs: number | null }>({ snapshot: null, nowMs: null });

/** The last snapshot from the live stream, as plain data, which the next change applies to. Null before the first. */
let received: JsonValue | null = null;

/** The open live stream and clock. Null while the page is not connected. */
let connection: LiveConnection | null = null;

/** Moves the page clock to now. */
const tickClock = (): void => {
  live.nowMs = Date.now();
};

/** Shows the snapshot in a [message] from the live stream. */
const showSnapshot = (message: MessageEvent<string>): void => {
  received = JSON.parse(message.data) as JsonValue;
  live.snapshot = received as Snapshot;
  tickClock();
};

/** Applies the change in a [message] from the live stream to the last snapshot, and shows the result. */
const showChange = (message: MessageEvent<string>): void => {
  if (received === null) {
    return;
  }
  received = applyChange(received, JSON.parse(message.data) as SnapshotChange);
  live.snapshot = received as Snapshot;
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
  source.addEventListener(CHANGE_EVENT, showChange);
  connection = { source, clock: setInterval(tickClock, CLOCK_TICK_MS) };
  return disconnectLive;
};

/** Shares [getSnapshot] with the pages under the layout. */
export const provideSnapshot = (getSnapshot: () => Snapshot): void => {
  setContext(SNAPSHOT_KEY, getSnapshot);
};

/** Returns the getter for the current snapshot, shared by the layout. */
export const useSnapshot = (): (() => Snapshot) => getContext(SNAPSHOT_KEY);
