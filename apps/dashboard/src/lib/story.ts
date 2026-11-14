import type { PlayerSession } from 'valheim-log';

import { ACTIVITY_STORY_KINDS, ACTIVITY_WORDS, type ActivityRecord, UNKNOWN_FOOD, UNKNOWN_STATION } from '#/lib/models/activities';
import { type ChatRecord, DEATH_DETAILS_WINDOW_MS, type Snapshot, type SourceLines, type StoryEvent } from '#/lib/models/snapshot';
import type { StoryItem, StoryKind, StoryText } from '#/lib/models/story';
import { DAY_MS, MS_PER_MINUTE } from '#/lib/models/time';
import { BOSS_ALTAR_NAMES, BOSS_NAMES, DUNGEON_AREA } from '#/lib/models/world';
import { mergedSource, sourceKey } from '#/lib/sources';
import { areaName, capitalized, count, listText, raidName, thingList, thingName, withArticle } from '#/lib/text';
import { durationLabel } from '#/lib/time';

/** Total things in a stretch of activity. */
export const activityTotal = (activity: ActivityRecord): number =>
  Object.values(activity.things).reduce((sum, amount) => sum + amount, 0);

/**
 * Story line for one stretch of activity, such as building or kills. Powers and carts have no list, meals leave
 * out food the server never learned, and items picked up after another player dropped them name that player.
 * Crafting names each station and how often the player opened it. Steering and riding name the ships or tames and how long the stretch lasted,
 * from the first time a player took the wheel or got on to the last, since the log can't tell two of a kind apart.
 */
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
  const ending = activity.from === undefined ? words.ending : ` that ${activity.from} dropped`;
  const sentence = `${activity.player ?? 'Someone'} ${words.verb} ${count(total, words.one, words.many)}${ending}`;
  if (kind === 'items') {
    const things = Object.fromEntries(Object.entries(activity.things).filter(([thing]) => thing !== UNKNOWN_FOOD));
    return { timeUtc, kind, text: sentence, things };
  }
  if (activity.kind === 'powered' || activity.kind === 'pulled') {
    return { timeUtc, kind, text: total === 1 ? `${activity.player ?? 'Someone'} ${words.verb}` : sentence };
  }
  if (activity.kind === 'crafted') {
    const stations = Object.entries(activity.things)
      .sort(([, firstVisits], [, secondVisits]) => secondVisits - firstVisits)
      .map(([station, visits]) => {
        const name = station === UNKNOWN_STATION ? 'a crafting station' : `the ${thingName(station)}`;
        return visits === 1 ? name : `${name} ${visits} times`;
      });
    return { timeUtc, kind, text: `${activity.player ?? 'Someone'} worked at ${listText(stations)}` };
  }
  if (activity.kind === 'sailed' || activity.kind === 'rode') {
    const ships = Object.keys(activity.things).map(thingName).join(' and the ');
    const steeredMs = Date.parse(activity.endUtc) - Date.parse(activity.startUtc);
    const time = steeredMs < MS_PER_MINUTE ? '' : ` for ${durationLabel(steeredMs)}`;
    return { timeUtc, kind, text: `${activity.player ?? 'Someone'} ${words.verb} the ${ships}${time}` };
  }
  return { timeUtc, kind, text: `${sentence}: ${thingList(activity.things)}` };
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
    case 'deathDetails':
      return { timeUtc, kind: 'died', text: `${event.character} died in ${areaName(event.area)}${fightingText(event.fighting, players)}` };
    case 'raidStarted':
      return { timeUtc, kind: 'raid', text: `A raid started: "${raidName(event.raid)}"` };
    case 'raidEnded':
      return { timeUtc, kind: 'raid', text: `The raid ended: "${raidName(event.raid)}"` };
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
            : `${event.character} reached ${areaName(event.area)} for the first time`,
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
    case 'bedClaimed':
      return { timeUtc, kind: 'night', text: `${event.character} claimed a bed` };
    case 'portalNamed':
      return { timeUtc, kind: 'travel', text: `${event.player ?? 'Someone'} named a portal "${event.portal}"` };
    case 'locationRevealed': {
      const boss = BOSS_ALTAR_NAMES[event.location];
      const place = boss === undefined ? `marks ${thingName(event.location)} on the map` : `shows where ${boss} is`;
      return { timeUtc, kind: 'travel', text: `${event.player ?? 'Someone'} read a stone that ${place}` };
    }
    case 'saddled':
      return { timeUtc, kind: 'tame', text: `${event.player ?? 'Someone'} put a saddle on ${withArticle(thingName(event.creature))}` };
    case 'tameFollowing':
      return { timeUtc, kind: 'tame', text: capitalized(`${withArticle(thingName(event.creature))} started following ${event.player}`) };
    case 'mapShared':
      return { timeUtc, kind: 'travel', text: `${event.player ?? 'Someone'} added what they explored to a map table` };
    case 'wardAccess': {
      const whose = event.builder === event.player ? 'their own' : `${event.builder ?? 'someone'}'s`;
      return { timeUtc, kind: 'built', text: `${event.player} ${event.isGiven ? 'got access to' : 'gave up access to'} ${whose} ward` };
    }
    case 'wardChanged':
      return { timeUtc, kind: 'built', text: `${event.builder ?? 'Someone'} turned their ward ${event.isOn ? 'on' : 'off'}` };
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

/** Log lines of [events], told as [kind]. */
const eventsSource = (events: StoryEvent[], kind: StoryKind): SourceLines => ({
  total: events.length,
  lines: events.map(({ timeUtc, line }) => ({ timeUtc, line, kind })),
});

/**
 * Parts of the one line about the last 24 hours, each with its log lines, for example `2 players in the last
 * 24 hours`, `1 death` and `1 raid`. Empty when nobody played.
 */
export const daySummaryParts = (snapshot: Snapshot, nowMs: number): { text: string; source: SourceLines }[] => {
  const sinceMs = nowMs - DAY_MS;
  const sessions = snapshot.sessions.filter((session) => session.endUtc === null || Date.parse(session.endUtc) > sinceMs);
  const players = new Set(sessions.map((session) => session.steamId ?? session.character));
  if (players.size === 0) {
    return [];
  }
  const visitTimes = new Set(sessions.flatMap((session) => [session.startUtc, session.endUtc ?? session.startUtc]));
  const visits = mergedSource(
    [...new Set(sessions.map((session) => session.character))].map((character) => {
      const lines = (snapshot.sources[sourceKey('visits', character)]?.lines ?? []).filter((record) => visitTimes.has(record.timeUtc));
      return { total: lines.length, lines };
    }),
  );
  const recent = snapshot.events.filter((event) => Date.parse(event.timeUtc) > sinceMs);
  const deaths = recent.filter((event) => event.type === 'playerDied');
  const raids = recent.filter((event) => event.type === 'raidStarted');
  const building = snapshot.activities.filter((activity) => activity.kind === 'built' && Date.parse(activity.endUtc) > sinceMs);
  const piecesBuilt = building.reduce((sum, activity) => sum + activityTotal(activity), 0);
  return [
    { text: `${count(players.size, 'player', 'players')} in the last 24 hours`, source: visits },
    { text: count(deaths.length, 'death', 'deaths'), source: eventsSource(deaths, 'died') },
    { text: count(raids.length, 'raid', 'raids'), source: eventsSource(raids, 'raid') },
    ...(piecesBuilt > 0
      ? [{ text: count(piecesBuilt, 'piece built', 'pieces built'), source: mergedSource(building.map((activity) => activity.source)) }]
      : []),
  ];
};

