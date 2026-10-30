import type { PlayerSession } from 'valheim-log';

import { DAY_MS, type Snapshot, type StoryEvent, type StoryItem } from './models';

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

/** Everything that happened, newest first: joins and leaves from the sessions, plus the game events. */
export const storyOf = (snapshot: Snapshot): StoryItem[] => {
  const sessionItems = snapshot.sessions.flatMap((session): StoryItem[] => [
    { timeUtc: session.startUtc, kind: 'joined', text: `${session.character} joined` },
    ...(session.endUtc === null ? [] : [{ timeUtc: session.endUtc, kind: 'left' as const, text: leaveText(session) }]),
  ]);
  return [...sessionItems, ...snapshot.events.map(eventItem)].sort(
    (a, b) => Date.parse(b.timeUtc) - Date.parse(a.timeUtc),
  );
};

/** Returns `1 death` or `2 deaths` style text. */
const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** One plain line about the last 24 hours, for example `2 players in the last 24 hours · 1 death · 1 raid`. */
export const daySummary = (snapshot: Snapshot, nowMs: number): string => {
  const sinceMs = nowMs - DAY_MS;
  const players = new Set(
    snapshot.sessions
      .filter((s) => s.endUtc === null || Date.parse(s.endUtc) > sinceMs)
      .map((s) => s.steamId ?? s.character),
  );
  if (players.size === 0) {
    return 'Nobody played in the last 24 hours';
  }
  const recent = snapshot.events.filter((e) => Date.parse(e.timeUtc) > sinceMs);
  return [
    `${count(players.size, 'player', 'players')} in the last 24 hours`,
    count(recent.filter((e) => e.type === 'playerDied').length, 'death', 'deaths'),
    count(recent.filter((e) => e.type === 'raidStarted').length, 'raid', 'raids'),
  ].join(' · ');
};
