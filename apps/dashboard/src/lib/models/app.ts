import type { PageRouteId } from '$app/types';

/** One dashboard tab and the page it opens. */
export type Tab = {
  /** Page path, for example `/saga`. */
  path: PageRouteId;
  /** Name shown in the menu and as the page heading. */
  label: string;
  /** Short line under the label in the menu. */
  hint: string;
  /** Rune shown as the tab icon. */
  rune: string;
};

/** The dashboard tabs, in menu order. Hall is the first screen and stays short. */
export const TABS: readonly Tab[] = [
  { path: '/', label: 'Hall', hint: 'Today at a glance', rune: 'ᛟ' },
  { path: '/vikings', label: 'Vikings', hint: 'Who was online', rune: 'ᛗ' },
  { path: '/saga', label: 'Saga', hint: 'Every game event', rune: 'ᚱ' },
  { path: '/world', label: 'World', hint: 'Saves and backups', rune: 'ᛃ' },
  { path: '/map', label: 'Map', hint: 'Where everyone went', rune: 'ᛉ' },
  { path: '/recipes', label: 'Recipes', hint: 'Plan what to make', rune: 'ᚲ' },
  { path: '/server', label: 'Server', hint: 'Status and warnings', rune: 'ᚾ' },
];

/** Address of the page where friends type the password. */
export const PASSWORD_PATH = '/password';

/** How often the page clock moves, so ages like "up 3h 12m" stay current. */
export const CLOCK_TICK_MS = 30_000;

/** Name of the live stream event that carries a [SnapshotChange] instead of a whole snapshot. */
export const CHANGE_EVENT = 'change';

/** Context key for the snapshot getter that the layout shares with the pages. */
export const SNAPSHOT_KEY = Symbol('snapshot');

/** The browser's live stream and page clock, while the page is open. */
export type LiveConnection = {
  /** Server-sent events from `/api/stream`. */
  source: EventSource;
  /** Timer that moves the page clock. */
  clock: ReturnType<typeof setInterval>;
};

/** Any value that JSON can hold, such as the snapshot or one of its parts. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * How one value in the snapshot changed since the stream last sent it:
 * - `value`: the new value, sent whole.
 * - `dropped`, `kept`, `added`: a list that lost its first `dropped` items, kept the next `kept`, then got `added` at the end.
 * - `fields`, `removed`: an object whose `fields` changed as described, and whose `removed` keys are gone.
 */
export type SnapshotChange =
  | { value: JsonValue }
  | { dropped: number; kept: number; added: JsonValue[] }
  | { fields: Record<string, SnapshotChange>; removed: string[] };
