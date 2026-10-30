import { getContext, setContext } from 'svelte';

import type { Snapshot } from './models';

/** How often the page clock moves, so ages like "up 3h 12m" stay current. */
const CLOCK_TICK_MS = 30_000;

/** Context key for the snapshot getter. */
const SNAPSHOT_KEY = Symbol('snapshot');

/** Live data in the browser. Both stay null while the page renders on the server. */
export const live = $state<{ snapshot: Snapshot | null; nowMs: number | null }>({ snapshot: null, nowMs: null });

/** Listens to the server's live stream and moves the clock. Runs in the browser. Returns a function that stops both. */
export const connectLive = (): (() => void) => {
  live.nowMs = Date.now();
  const source = new EventSource('/api/stream');
  source.onmessage = (message) => {
    live.snapshot = JSON.parse(message.data) as Snapshot;
    live.nowMs = Date.now();
  };
  const clock = setInterval(() => (live.nowMs = Date.now()), CLOCK_TICK_MS);
  return () => {
    source.close();
    clearInterval(clock);
  };
};

/** Shares [getSnapshot] with the pages under the layout. */
export const provideSnapshot = (getSnapshot: () => Snapshot): void => {
  setContext(SNAPSHOT_KEY, getSnapshot);
};

/** Returns the getter for the current snapshot, shared by the layout. */
export const useSnapshot = (): (() => Snapshot) => getContext(SNAPSHOT_KEY);

/** The viewer's offset from UTC in minutes at [nowMs], for example `-420` for UTC−7. */
export const viewerOffsetMinutes = (nowMs: number): number => -new Date(nowMs).getTimezoneOffset();
