import type { PlayerSession } from 'valheim-log';

import {
  ACTIVITY_STORY_KINDS,
  ACTIVITY_WORDS,
  type ActivityRecord,
  AREA_NAMES,
  BOSS_NAMES,
  type ChatRecord,
  DAY_MS,
  DEATH_DETAILS_WINDOW_MS,
  DUNGEON_AREA,
  type Snapshot,
  type SourceLines,
  type StoryEvent,
  type StoryItem,
  type StoryKind,
  type StoryText,
} from '#/lib/models';
import { sourceKey } from '#/lib/sources';

/** Returns `1 death` or `2 deaths` style text. */
const count = (amount: number, one: string, many: string): string => `${amount} ${amount === 1 ? one : many}`;

/** Readable name of a prefab, for example `wood floor 1x1`, `sword iron`, `turnip` or `greydwarf elite`. */
export const thingName = (prefab: string): string =>
  prefab
    .replace(/^(piece|Pickable)_/, '')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

/** [text] with its first letter in capitals. */
export const capitalized = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** Short name of an area the plugin logs, for example `Black Forest` for `BlackForest`. */
export const areaLabel = (area: string): string => capitalized((AREA_NAMES[area] ?? area).replace(/^(the|a) /, ''));

/** [name] with `a` or `an` before it, for example `a troll` or `an abomination`. */
const withArticle = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;

/** Joins [names] as `a, b and c`. */
const listText = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/** Total things in a stretch of activity. */
const activityTotal = (activity: ActivityRecord): number =>
  Object.values(activity.things).reduce((sum, amount) => sum + amount, 0);

/** Every thing of [things], most first, for example `14 wood floor 1x1, 8 wood fence, 1 workbench`. */
export const thingList = (things: Record<string, number>): string =>
  Object.entries(things)
    .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
    .map(([thing, amount]) => `${amount} ${thingName(thing)}`)
    .join(', ');

/** Story line for one stretch of activity, such as building or kills. */
const activityItem = (activity: ActivityRecord): StoryText => {
  const total = activityTotal(activity);
  const timeUtc = activity.endUtc;
  if (activity.kind === 'destroyed') {
    const pieces = count(total, 'piece', 'pieces');
    const whose = activity.player === null ? pieces : `${pieces} ${activity.player} built`;
    return { timeUtc, kind: ACTIVITY_STORY_KINDS.destroyed, text: `${whose} ${total === 1 ? 'was' : 'were'} destroyed: ${thingList(activity.things)}` };
  }
  const words = ACTIVITY_WORDS[activity.kind];
  const kind = ACTIVITY_STORY_KINDS[activity.kind];
  const text = `${activity.player ?? 'Someone'} ${words.verb} ${count(total, words.one, words.many)}${words.ending}: ${thingList(activity.things)}`;
  return { timeUtc, kind, text };
};

/** Story line for one chat message or ping. */
const chatItem = (chat: ChatRecord): StoryText => {
  const { timeUtc, character, text } = chat;
  switch (chat.kind) {
    case 'ping':
      return { timeUtc, kind: 'chat', text: `${character} pinged the map` };
    case 'said':
      return { timeUtc, kind: 'chat', text: `${character}: ${text}` };
    default:
      return { timeUtc, kind: 'chat', text: `${character} ${chat.kind}: ${text}` };
  }
};

/** What a player was fighting when they died, for example ` fighting a troll and Bjorn`. Players keep their names. */
const fightingText = (fighting: string[], players: Set<string>): string =>
  fighting.length === 0
    ? ''
    : ` fighting ${listText(fighting.map((name) => (players.has(name) ? name : withArticle(thingName(name)))))}`;

/** Sentence for how a tame changed. */
const tameText = (event: Extract<StoryEvent, { type: 'tameChanged' }>): string => {
  const creature = thingName(event.creature);
  switch (event.change) {
    case 'tamed':
      return capitalized(`${withArticle(creature)} was tamed`);
    case 'born':
      return capitalized(`${withArticle(creature)} was born`);
    case 'grewUp':
      return capitalized(`${withArticle(creature)} grew up`);
    case 'died':
      return event.name === null ? `A tame ${creature} died` : `${event.name} the ${creature} died`;
  }
};

/** Sentence for how a session ended. */
const leaveText = (session: PlayerSession): string => {
  switch (session.endReason) {
    case 'timedOut':
      return `${session.character} lost connection`;
    case 'serverStopped':
      return `${session.character} left when the server stopped`;
    case 'serverCrashed':
      return `${session.character} left when the server went down`;
    default:
      return `${session.character} left`;
  }
};

/** Story line for one game event. [players] are the character names, which are never given an article. */
const eventItem = (event: StoryEvent, players: Set<string>): StoryText => {
  const { timeUtc } = event;
  switch (event.type) {
    case 'playerDied':
      return { timeUtc, kind: 'died', text: `${event.character} died` };
    case 'deathDetails': {
      const area = AREA_NAMES[event.area] ?? event.area;
      return { timeUtc, kind: 'died', text: `${event.character} died in ${area}${fightingText(event.fighting, players)}` };
    }
    case 'raidStarted':
      return { timeUtc, kind: 'raid', text: `A raid started: ${event.raid.replaceAll('_', ' ')}` };
    case 'raidEnded':
      return { timeUtc, kind: 'raid', text: `The raid ended: ${event.raid.replaceAll('_', ' ')}` };
    case 'wentToBed':
      return { timeUtc, kind: 'night', text: `${event.character} went to bed` };
    case 'bossSummoned':
      return { timeUtc, kind: 'boss', text: `${event.summoner ?? 'Someone'} summoned ${BOSS_NAMES[event.boss] ?? event.boss}` };
    case 'globalKey':
      return { timeUtc, kind: 'boss', text: `${BOSS_NAMES[event.key] ?? event.key} was defeated` };
    case 'areaEntered':
      return {
        timeUtc,
        kind: 'travel',
        text:
          event.area === DUNGEON_AREA
            ? `${event.character} went into a dungeon`
            : `${event.character} reached ${AREA_NAMES[event.area] ?? event.area} for the first time`,
      };
    case 'teleported':
      return {
        timeUtc,
        kind: 'travel',
        text: event.portal === null ? `${event.character} went through a portal` : `${event.character} took the portal to ${event.portal}`,
      };
    case 'pvpChanged':
      return { timeUtc, kind: 'fight', text: `${event.character} turned PvP ${event.isOn ? 'on' : 'off'}` };
    case 'gearSeen': {
      const level = event.quality > 1 ? ` (level ${event.quality})` : '';
      return { timeUtc, kind: 'items', text: `${event.character} has new gear: ${thingName(event.item)}${level}` };
    }
    case 'itemHung':
      return { timeUtc, kind: 'items', text: `${event.player ?? 'Someone'} hung ${withArticle(thingName(event.item))} on a stand` };
    case 'tombstoneEmptied':
      return {
        timeUtc,
        kind: 'items',
        text:
          event.owner === event.player
            ? `${event.player ?? 'Someone'} got their things back from their tombstone`
            : `${event.player ?? 'Someone'} emptied ${event.owner ?? 'someone'}'s tombstone`,
      };
    case 'tameChanged':
      return { timeUtc, kind: 'tame', text: tameText(event) };
    case 'petNamed':
      return { timeUtc, kind: 'tame', text: capitalized(`${withArticle(thingName(event.creature))} was named ${event.name}`) };
    case 'signWritten':
      return { timeUtc, kind: 'chat', text: `${event.author ?? 'Someone'} wrote on a sign: "${event.text}"` };
    case 'nightSkipped':
      return { timeUtc, kind: 'night', text: `Players slept through the night. Day ${event.day} began` };
    case 'worldLoaded':
      return { timeUtc, kind: 'world', text: `Server started with world ${event.world}` };
    case 'serverStopped':
      return { timeUtc, kind: 'stopped', text: 'Server stopped' };
  }
};

/** True when [other] is the game's own death line for the death the plugin told about in [event]. */
const isSameDeath = (event: StoryEvent, other: StoryEvent): boolean =>
  event.type === 'deathDetails' &&
  other.type === 'playerDied' &&
  other.character === event.character &&
  Math.abs(Date.parse(other.timeUtc) - Date.parse(event.timeUtc)) <= DEATH_DETAILS_WINDOW_MS;

/** Log lines behind [event]: its own line, and for death details also the game's death line. */
const eventSource = (event: StoryEvent, events: StoryEvent[], kind: StoryKind): SourceLines => {
  const told = [...events.filter((other) => isSameDeath(event, other)), event];
  return { total: told.length, lines: told.map(({ timeUtc, line }) => ({ timeUtc, line, kind })) };
};

/** Log lines of [character] at [timeUtc] among the joins and leaves, for one join or leave. */
const visitSource = (snapshot: Snapshot, character: string, timeUtc: string): SourceLines => {
  const lines = (snapshot.sources[sourceKey('visits', character)]?.lines ?? []).filter((record) => record.timeUtc === timeUtc);
  return { total: lines.length, lines };
};

/** Everything that happened, newest first: joins and leaves from the sessions, game events, activity and chat. */
export const storyOf = (snapshot: Snapshot): StoryItem[] => {
  const sessionItems = snapshot.sessions.flatMap((session): StoryItem[] => [
    {
      timeUtc: session.startUtc,
      kind: 'joined',
      text: `${session.character} joined`,
      source: visitSource(snapshot, session.character, session.startUtc),
    },
    ...(session.endUtc === null
      ? []
      : [{ timeUtc: session.endUtc, kind: 'left' as const, text: leaveText(session), source: visitSource(snapshot, session.character, session.endUtc) }]),
  ]);
  const players = new Set(snapshot.sessions.map((session) => session.character));
  const eventItems = snapshot.events
    .filter((event) => !snapshot.events.some((other) => isSameDeath(other, event)))
    .map((event) => {
      const item = eventItem(event, players);
      return { ...item, source: eventSource(event, snapshot.events, item.kind) };
    });
  const activityItems = snapshot.activities.map((activity) => ({ ...activityItem(activity), source: activity.source }));
  const chatItems = snapshot.chat.map((chat) => ({ ...chatItem(chat), source: { total: 1, lines: [{ timeUtc: chat.timeUtc, line: chat.line, kind: 'chat' as const }] } }));
  return [...sessionItems, ...eventItems, ...activityItems, ...chatItems].sort((a, b) => Date.parse(b.timeUtc) - Date.parse(a.timeUtc));
};

/** One plain line about the last 24 hours, for example `2 players in the last 24 hours · 1 death · 1 raid`. */
export const daySummary = (snapshot: Snapshot, nowMs: number): string => {
  const sinceMs = nowMs - DAY_MS;
  const players = new Set(
    snapshot.sessions
      .filter((session) => session.endUtc === null || Date.parse(session.endUtc) > sinceMs)
      .map((session) => session.steamId ?? session.character),
  );
  if (players.size === 0) {
    return 'Nobody played in the last 24 hours';
  }
  const recent = snapshot.events.filter((event) => Date.parse(event.timeUtc) > sinceMs);
  const piecesBuilt = snapshot.activities
    .filter((activity) => activity.kind === 'built' && Date.parse(activity.endUtc) > sinceMs)
    .reduce((sum, activity) => sum + activityTotal(activity), 0);
  return [
    `${count(players.size, 'player', 'players')} in the last 24 hours`,
    count(recent.filter((event) => event.type === 'playerDied').length, 'death', 'deaths'),
    count(recent.filter((event) => event.type === 'raidStarted').length, 'raid', 'raids'),
    ...(piecesBuilt > 0 ? [count(piecesBuilt, 'piece built', 'pieces built')] : []),
  ].join(' · ');
};
