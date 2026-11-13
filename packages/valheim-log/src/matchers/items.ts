import { heldItemsOf, playerOf } from '#/fields';
import type { Matcher } from '#/models';
import {
  ATE_PATTERN,
  ATE_SOMETHING_PATTERN,
  CHEST_PATTERN,
  DEPLETED_PATTERN,
  DROPPED_PATTERN,
  FOOD_STARTED_PATTERN,
  HARVESTED_PATTERN,
  ITEM_HUNG_PATTERN,
  MADE_PATTERN,
  OBLITERATED_PATTERN,
  PICKED_UP_PATTERN,
  PLANTED_PATTERN,
  SHOT_PATTERN,
  SMELTING_PATTERN,
  TOMBSTONE_EMPTIED_PATTERN,
  TOMBSTONE_PATTERN,
  UPGRADED_PATTERN,
} from '#/patterns';

/** Messages about items picked up, dropped, stored, grown, eaten, smelted, cooked, made and lost in tombstones. */
export const ITEM_MATCHERS: readonly Matcher[] = [
  {
    pattern: PICKED_UP_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemPickedUp',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
      isFirstPickup: groups.again === undefined,
      itemId: groups.id ?? null,
    }),
  },
  {
    pattern: DROPPED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemDropped',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
      itemId: groups.id!,
    }),
  },
  {
    pattern: ITEM_HUNG_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'itemHung', timeUtc, item: groups.item!, player: playerOf(groups.player) }),
  },
  {
    pattern: CHEST_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chestChanged',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      chest: groups.chest!,
      player: playerOf(groups.player),
      isStored: groups.change === 'Stored',
    }),
  },
  {
    pattern: HARVESTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'harvested', timeUtc, plant: groups.plant!, player: playerOf(groups.player) }),
  },
  {
    pattern: PLANTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'planted', timeUtc, plant: groups.plant!, player: playerOf(groups.player) }),
  },
  {
    pattern: DEPLETED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'depleted',
      timeUtc,
      kind: groups.kind === 'Tree cut' ? 'tree' : 'rock',
      thing: groups.thing!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: ATE_SOMETHING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'ate',
      timeUtc,
      character: groups.character!,
      item: null,
      maxHealthGain: groups.gain === undefined ? null : Number(groups.gain),
    }),
  },
  {
    pattern: ATE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'ate', timeUtc, character: groups.character!, item: groups.item!, maxHealthGain: null }),
  },
  {
    pattern: SMELTING_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'smelting',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      station: groups.station!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: FOOD_STARTED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'foodStarted',
      timeUtc,
      kind: groups.kind === 'Cooking' ? 'cooking' : 'fermenting',
      item: groups.item!,
      station: groups.station!,
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: MADE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemMade',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      level: 1,
      crafter: groups.crafter!,
    }),
  },
  {
    pattern: UPGRADED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'itemMade',
      timeUtc,
      item: groups.item!,
      count: 1,
      level: Number(groups.level),
      crafter: groups.crafter!,
    }),
  },
  {
    pattern: OBLITERATED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'obliterated',
      timeUtc,
      item: groups.item!,
      count: Number(groups.count),
      player: playerOf(groups.player),
    }),
  },
  {
    pattern: SHOT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'shot', timeUtc, item: groups.item!, player: playerOf(groups.player) }),
  },
  {
    pattern: TOMBSTONE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tombstoneContents',
      timeUtc,
      owner: playerOf(groups.owner),
      x: Number(groups.x),
      z: Number(groups.z),
      items: heldItemsOf(groups.items!),
    }),
  },
  {
    pattern: TOMBSTONE_EMPTIED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'tombstoneEmptied',
      timeUtc,
      owner: playerOf(groups.owner),
      player: playerOf(groups.player),
    }),
  },
];
