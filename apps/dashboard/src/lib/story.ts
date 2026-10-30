import type { PlayerSession } from 'valheim-log';

import {
  type BuildRecord,
  DAY_MS,
  LISTED_PIECE_KINDS,
  type Snapshot,
  type StoryEvent,
  type StoryItem,
} from '#/src/lib/models.ts';

/** Returns `1 death` or `2 deaths` style text. */
const count = (amount: number, one: string, many: string): string => `${amount} ${amount === 1 ? one : many}`;

/** Total pieces in a stretch of building. */
const pieceTotal = (build: BuildRecord): number => Object.values(build.pieces).reduce((sum, amount) => sum + amount, 0);

/** Most common pieces of a stretch, for example `14 wood floor 1x1, 8 wood fence and more`. */
const pieceList = (build: BuildRecord): string => {
  const kinds = Object.entries(build.pieces).sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount);
  const listed = kinds
    .slice(0, LISTED_PIECE_KINDS)
    .map(([piece, amount]) => `${amount} ${piece.replace(/^piece_/, '').replaceAll('_', ' ')}`)
    .join(', ');
  return kinds.length > LISTED_PIECE_KINDS ? `${listed} and more` : listed;
};

/** Story line for one stretch of building or of destroyed pieces. */
const buildItem = (build: BuildRecord): StoryItem => {
  const total = pieceTotal(build);
  const pieces = count(total, 'piece', 'pieces');
  if (!build.isDestroyed) {
    return { timeUtc: build.endUtc, kind: 'built', text: `${build.builder ?? 'Someone'} built ${pieces}: ${pieceList(build)}` };
  }
  const whose = build.builder === null ? pieces : `${pieces} ${build.builder} built`;
  return {
    timeUtc: build.endUtc,
    kind: 'wrecked',
    text: `${whose} ${total === 1 ? 'was' : 'were'} destroyed: ${pieceList(build)}`,
  };
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

/** Story line for one game event. */
const eventItem = (event: StoryEvent): StoryItem => {
  const { timeUtc } = event;
  switch (event.type) {
    case 'playerDied':
      return { timeUtc, kind: 'died', text: `${event.character} died` };
    case 'raidStarted':
      return { timeUtc, kind: 'raid', text: `A raid started: ${event.raid.replaceAll('_', ' ')}` };
    case 'nightSkipped':
      return { timeUtc, kind: 'night', text: `Players slept through the night. Day ${event.day} began` };
    case 'worldLoaded':
      return { timeUtc, kind: 'world', text: `Server started with world ${event.world}` };
    case 'serverStopped':
      return { timeUtc, kind: 'stopped', text: 'Server stopped' };
  }
};

/** Everything that happened, newest first: joins and leaves from the sessions, game events and building. */
export const storyOf = (snapshot: Snapshot): StoryItem[] => {
  const sessionItems = snapshot.sessions.flatMap((session): StoryItem[] => [
    { timeUtc: session.startUtc, kind: 'joined', text: `${session.character} joined` },
    ...(session.endUtc === null ? [] : [{ timeUtc: session.endUtc, kind: 'left' as const, text: leaveText(session) }]),
  ]);
  return [...sessionItems, ...snapshot.events.map(eventItem), ...snapshot.builds.map(buildItem)].sort(
    (a, b) => Date.parse(b.timeUtc) - Date.parse(a.timeUtc),
  );
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
  const piecesBuilt = snapshot.builds
    .filter((build) => !build.isDestroyed && Date.parse(build.endUtc) > sinceMs)
    .reduce((sum, build) => sum + pieceTotal(build), 0);
  return [
    `${count(players.size, 'player', 'players')} in the last 24 hours`,
    count(recent.filter((event) => event.type === 'playerDied').length, 'death', 'deaths'),
    count(recent.filter((event) => event.type === 'raidStarted').length, 'raid', 'raids'),
    ...(piecesBuilt > 0 ? [count(piecesBuilt, 'piece built', 'pieces built')] : []),
  ].join(' · ');
};
