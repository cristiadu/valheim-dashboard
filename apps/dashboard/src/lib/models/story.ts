import type { SourceLines } from '#/lib/models/snapshot';

/** How many events the Hall shows. */
export const LATEST_EVENT_COUNT = 5;

/** What kind of thing happened, which picks its rune and color. */
export type StoryKind =
  | 'joined'
  | 'left'
  | 'died'
  | 'raid'
  | 'night'
  | 'world'
  | 'stopped'
  | 'built'
  | 'wrecked'
  | 'boss'
  | 'fight'
  | 'travel'
  | 'items'
  | 'tame'
  | 'chat';

/** One line in the story of the server. */
export type StoryItem = {
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** What kind of thing it is. */
  kind: StoryKind;
  /** Plain sentence, for example `Ragnar died`. */
  text: string;
  /** Item counts behind an item activity, so views can show their icons. */
  things?: Record<string, number>;
  /** Log lines it was told from. */
  source: SourceLines;
};

/** A story line's words, before its log lines are added. */
export type StoryText = Omit<StoryItem, 'source'>;

/** Rune, color and pill label for each story kind. */
export const STORY_STYLES: Record<StoryKind, { rune: string; color: string; label: string }> = {
  joined: { rune: 'ᛖ', color: 'var(--good)', label: 'Joined' },
  left: { rune: 'ᛚ', color: 'var(--muted)', label: 'Left' },
  died: { rune: 'ᛞ', color: 'var(--blood)', label: 'Death' },
  raid: { rune: 'ᚦ', color: 'var(--ember)', label: 'Raid' },
  night: { rune: 'ᛜ', color: 'var(--frost)', label: 'Night' },
  world: { rune: 'ᛃ', color: 'var(--gold)', label: 'World' },
  stopped: { rune: 'ᚾ', color: 'var(--muted)', label: 'Stopped' },
  built: { rune: 'ᛒ', color: 'var(--good)', label: 'Built' },
  wrecked: { rune: 'ᚺ', color: 'var(--ember)', label: 'Wrecked' },
  boss: { rune: 'ᛏ', color: 'var(--gold)', label: 'Boss' },
  fight: { rune: 'ᛉ', color: 'var(--blood)', label: 'Fight' },
  travel: { rune: 'ᚱ', color: 'var(--frost)', label: 'Travel' },
  items: { rune: 'ᚷ', color: 'var(--gold)', label: 'Gear and items' },
  tame: { rune: 'ᚠ', color: 'var(--good)', label: 'Tame' },
  chat: { rune: 'ᚨ', color: 'var(--frost)', label: 'Chat' },
};

/** One filter on the Saga tab: its button text and the story kinds it shows. */
export type SagaFilter = { label: string; kinds: readonly StoryKind[] };

/** Filters on the Saga tab and the story kinds each one shows. */
export const SAGA_FILTERS: readonly SagaFilter[] = [
  {
    label: 'All',
    kinds: ['joined', 'left', 'died', 'raid', 'night', 'world', 'stopped', 'built', 'wrecked', 'boss', 'fight', 'travel', 'items', 'tame', 'chat'],
  },
  { label: 'Joins and leaves', kinds: ['joined', 'left'] },
  { label: 'Deaths', kinds: ['died'] },
  { label: 'Fights and raids', kinds: ['fight', 'boss', 'raid'] },
  { label: 'Travel', kinds: ['travel'] },
  { label: 'Building', kinds: ['built', 'wrecked'] },
  { label: 'Items', kinds: ['items'] },
  { label: 'Tames', kinds: ['tame'] },
  { label: 'Chat and signs', kinds: ['chat'] },
  { label: 'Nights and server', kinds: ['night', 'world', 'stopped'] },
];
