import type { LogEvent } from 'valheim-log';

import { ACTIVITY_STORY_KINDS, type ActivityKind, type Snapshot, UNKNOWN_FOOD } from '#/lib/models';
import { characterOfSteamName } from '#/lib/players';
import { pushCapped } from '#/lib/server/lists';
import { addLineUnder, addSourceLine } from '#/lib/server/log-sources';
import { ACTIVITY_GAP_MS, MAX_ACTIVITIES } from '#/lib/server/models';
import { sourceKey } from '#/lib/sources';

/**
 * Adds [count] of [thing] and its log [line] to the player's latest stretch of the same [kind] in [snapshot], or
 * starts a new stretch when the player paused longer than [ACTIVITY_GAP_MS]. Also adds them to the player's totals.
 */
const addActivity = (
  snapshot: Snapshot,
  line: string,
  timeUtc: string,
  player: string | null,
  kind: ActivityKind,
  thing: string,
  count: number,
): void => {
  if (player !== null) {
    const totals = (snapshot.activityTotals[player] ??= {});
    totals[kind] = (totals[kind] ?? 0) + count;
    addLineUnder(snapshot, sourceKey('activity', player, kind), timeUtc, line, ACTIVITY_STORY_KINDS[kind]);
  }
  const { activities } = snapshot;
  const stretch = activities.findLast((activity) => activity.player === player && activity.kind === kind);
  if (stretch && Date.parse(timeUtc) - Date.parse(stretch.endUtc) <= ACTIVITY_GAP_MS) {
    stretch.endUtc = timeUtc;
    stretch.things[thing] = (stretch.things[thing] ?? 0) + count;
    addSourceLine(stretch.source, timeUtc, line, ACTIVITY_STORY_KINDS[kind]);
    return;
  }
  const source = { total: 1, lines: [{ timeUtc, line, kind: ACTIVITY_STORY_KINDS[kind] }] };
  pushCapped(activities, { player, kind, startUtc: timeUtc, endUtc: timeUtc, things: { [thing]: count }, source }, MAX_ACTIVITIES);
};

/**
 * Adds the activity [event] stands for, such as a piece built or a creature killed, read from [line], to the
 * activities of [snapshot]. An item counts as gathered only the first time anyone picks it up.
 */
export const addActivityOf = (snapshot: Snapshot, event: LogEvent, line: string): void => {
  const { timeUtc } = event;
  switch (event.type) {
    case 'pieceBuilt':
      addActivity(snapshot, line, timeUtc, characterOfSteamName(snapshot.sessions, event.builder), 'built', event.piece, 1);
      break;
    case 'pieceDestroyed':
      addActivity(snapshot, line, timeUtc, characterOfSteamName(snapshot.sessions, event.builder), 'destroyed', event.piece, 1);
      break;
    case 'creatureKilled':
      for (const attacker of event.attackers) {
        addActivity(snapshot, line, timeUtc, attacker, 'killed', event.creature, 1);
      }
      break;
    case 'itemPickedUp':
      if (event.isFirstPickup) {
        addActivity(snapshot, line, timeUtc, event.player, 'gathered', event.item, event.count);
      }
      break;
    case 'chestChanged':
      addActivity(snapshot, line, timeUtc, event.player, event.isStored ? 'stored' : 'taken', event.item, event.count);
      break;
    case 'planted':
      addActivity(snapshot, line, timeUtc, event.player, 'planted', event.plant, 1);
      break;
    case 'ate':
      addActivity(snapshot, line, timeUtc, event.character, 'ate', event.item ?? UNKNOWN_FOOD, 1);
      break;
    case 'smelting':
      addActivity(snapshot, line, timeUtc, event.player, 'smelted', event.item, event.count);
      break;
    case 'foodStarted':
      addActivity(snapshot, line, timeUtc, event.player, event.kind === 'cooking' ? 'cooked' : 'brewed', event.item, 1);
      break;
    case 'sailing':
      addActivity(snapshot, line, timeUtc, event.character, 'sailed', event.ship, 1);
      break;
    case 'crafting':
      addActivity(snapshot, line, timeUtc, event.character, 'crafted', event.station, 1);
      break;
    case 'emote':
      addActivity(snapshot, line, timeUtc, event.character, 'emoted', event.emote, 1);
      break;
    case 'itemMade':
      addActivity(snapshot, line, timeUtc, event.crafter, event.level === 1 ? 'made' : 'upgraded', event.item, event.count);
      break;
    case 'riding':
      addActivity(snapshot, line, timeUtc, event.player, 'rode', event.creature, 1);
      break;
    case 'powerUsed':
      addActivity(snapshot, line, timeUtc, event.character, 'powered', 'power', 1);
      break;
    case 'obliterated':
      addActivity(snapshot, line, timeUtc, event.player, 'obliterated', event.item, event.count);
      break;
    case 'fueled':
      addActivity(snapshot, line, timeUtc, event.player, 'fueled', event.fire, 1);
      break;
    case 'repaired':
      addActivity(snapshot, line, timeUtc, event.player, 'repaired', event.piece, 1);
      break;
    case 'cartPulled':
      addActivity(snapshot, line, timeUtc, event.player, 'pulled', event.cart, 1);
      break;
    case 'depleted':
      addActivity(snapshot, line, timeUtc, event.player, event.kind === 'tree' ? 'cut' : 'mined', event.thing, 1);
      break;
    default:
      break;
  }
};
