import { optionalNumber, playerOf } from '#/fields';
import type { ChatKind, Matcher, MoveKind } from '#/models';
import {
  AREA_ENTERED_PATTERN,
  BED_CLAIMED_PATTERN,
  BED_PATTERN,
  CHAT_PATTERN,
  CRAFTING_PATTERN,
  DEATH_DETAILS_PATTERN,
  EMOTE_PATTERN,
  GEAR_PATTERN,
  LOCATION_REVEALED_PATTERN,
  MAP_SHARED_PATTERN,
  MOVES_PATTERN,
  PLACE_FOUND_PATTERN,
  NOTHING_HELD,
  PING_PATTERN,
  POSITION_PATTERN,
  POWER_USED_PATTERN,
  PULLING_CART_PATTERN,
  PVP_PATTERN,
  RIDING_PATTERN,
  SAILING_PATTERN,
  SIGN_PATTERN,
  TELEPORTED_PATTERN,
  UNNAMED_PORTAL,
  WEARING_PATTERN,
} from '#/patterns';

/** Messages about what players say, where they go and what they wear, from chat and pings to deaths and beds. */
export const PLAYER_MATCHERS: readonly Matcher[] = [
  {
    pattern: SIGN_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'signWritten', timeUtc, author: playerOf(groups.author), text: groups.text! }),
  },
  {
    pattern: CHAT_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chatMessage',
      timeUtc,
      character: groups.character!,
      kind: groups.kind as ChatKind,
      text: groups.text!,
    }),
  },
  {
    pattern: PING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'ping',
      timeUtc,
      character: groups.character!,
      x: Number(groups.x),
      z: Number(groups.z),
    }),
  },
  {
    pattern: EMOTE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'emote', timeUtc, character: groups.character!, emote: groups.emote! }),
  },
  {
    pattern: POSITION_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'position',
      timeUtc,
      character: groups.character!,
      x: Number(groups.x),
      z: Number(groups.z),
    }),
  },
  {
    pattern: AREA_ENTERED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'areaEntered',
      timeUtc,
      character: groups.character!,
      area: groups.area!,
      ...(groups.place === undefined ? {} : { place: groups.place }),
    }),
  },
  {
    pattern: PLACE_FOUND_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'placeFound',
      timeUtc,
      character: groups.character!,
      place: groups.place!,
      x: Number(groups.x),
      z: Number(groups.z),
    }),
  },
  {
    pattern: TELEPORTED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'teleported',
      timeUtc,
      character: groups.character!,
      portal: groups.portal === UNNAMED_PORTAL ? null : groups.portal!,
    }),
  },
  {
    pattern: SAILING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'sailing', timeUtc, character: groups.character!, ship: groups.ship! }),
  },
  {
    pattern: RIDING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'riding', timeUtc, player: playerOf(groups.player), creature: groups.creature! }),
  },
  {
    pattern: PULLING_CART_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'cartPulled', timeUtc, player: playerOf(groups.player), cart: groups.cart! }),
  },
  {
    pattern: CRAFTING_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'crafting', timeUtc, character: groups.character!, station: groups.station! }),
  },
  {
    pattern: POWER_USED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'powerUsed', timeUtc, character: groups.character! }),
  },
  {
    pattern: LOCATION_REVEALED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'locationRevealed', timeUtc, location: groups.location!, player: playerOf(groups.player) }),
  },
  {
    pattern: MAP_SHARED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'mapShared', timeUtc, player: playerOf(groups.player), table: groups.table! }),
  },
  {
    pattern: MOVES_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'moves',
      timeUtc,
      character: groups.character!,
      move: groups.move as MoveKind,
      item: groups.item ?? null,
      count: Number(groups.count),
    }),
  },
  {
    pattern: DEATH_DETAILS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'deathDetails',
      timeUtc,
      character: groups.character!,
      area: groups.area!,
      fighting: groups.fighting === undefined ? [] : groups.fighting.split(', '),
    }),
  },
  {
    pattern: PVP_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pvpChanged', timeUtc, character: groups.character!, isOn: groups.state === 'on' }),
  },
  {
    pattern: BED_CLAIMED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'bedClaimed', timeUtc, character: groups.character! }),
  },
  {
    pattern: BED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'wentToBed', timeUtc, character: groups.character! }),
  },
  {
    pattern: GEAR_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'gearSeen',
      timeUtc,
      character: groups.character!,
      item: groups.item!,
      quality: optionalNumber(groups.quality) ?? 1,
    }),
  },
  {
    pattern: WEARING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wearing',
      timeUtc,
      character: groups.character!,
      items: groups.items === NOTHING_HELD ? [] : groups.items!.split(', '),
    }),
  },
];
