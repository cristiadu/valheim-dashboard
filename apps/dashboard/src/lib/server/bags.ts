import type { LogEvent } from 'valheim-log';

import { gearPiece } from '#/lib/gear';
import { containerGrid, slotsUsed } from '#/lib/items';
import { PLAYER_PREFAB } from '#/lib/models/chests';
import { MIN_STACKABLE } from '#/lib/models/items';
import type { Snapshot } from '#/lib/models/snapshot';
import { MS_PER_MINUTE } from '#/lib/models/time';
import { MEAL_HEALTH_TOLERANCE, MEAL_MINUTES, type ServerState } from '#/lib/server/models';

/**
 * Adds [count] of [item] to [character]'s bag in [snapshot], or takes it out when [count] is below zero, never below
 * none. An item it touches moves to the end of the bag, so the bag's order is oldest touched first.
 */
const addToBag = (snapshot: Snapshot, character: string, item: string, count: number): void => {
  if (count < 0 && snapshot.bags[character] === undefined) {
    return;
  }
  const bag = (snapshot.bags[character] ??= {});
  const left = (bag[item] ?? 0) + count;
  delete bag[item];
  if (left > 0) {
    bag[item] = left;
  }
};

/** Puts one [item] in [character]'s bag in [snapshot] when it holds none, since gear worn or held sits in the bag. */
const keepInBag = (snapshot: Snapshot, character: string, item: string): void => {
  const bag = (snapshot.bags[character] ??= {});
  bag[item] ??= 1;
};

/** Puts back in [character]'s bag in [snapshot] each piece they wear now, except [movedItem], which just left the bag. */
const keepWorn = (snapshot: Snapshot, character: string, movedItem: string | null): void => {
  for (const item of snapshot.worn[character] ?? []) {
    if (item !== movedItem) {
      keepInBag(snapshot, character, item);
    }
  }
};

/**
 * Takes what making [count] of [item] at [level] costs out of [character]'s bag in [state]. A craft can make more
 * than one, such as 20 arrows, and an upgrade makes one.
 */
const payForCraft = (state: ServerState, character: string, item: string, level: number, count: number): void => {
  const cost = state.craftCosts[item]?.[level];
  if (cost === undefined) {
    return;
  }
  const crafts = Math.ceil(count / cost.yields);
  for (const [ingredient, amount] of Object.entries(cost.items)) {
    addToBag(state.snapshot, character, ingredient, -amount * crafts);
  }
};

/**
 * Returns true when [event], a pickup, puts its item in the bag. A first pickup always does. An item picked up again
 * does only when its line has the item's ID, which every new line has, and the ID did not count yet in [state]: the
 * drop that came before it took the item out of the dropper's bag.
 */
const isPickupNew = (state: ServerState, event: Extract<LogEvent, { type: 'itemPickedUp' }>): boolean => {
  if (event.itemId === null) {
    return event.isFirstPickup;
  }
  if (state.pickedUpItemIds.has(event.itemId)) {
    return false;
  }
  state.pickedUpItemIds.add(event.itemId);
  return true;
};

/** Returns true when [food] is not still in effect at [nowMs], by when each food was last eaten in [meals]. */
const isFoodReady = (meals: Record<string, string>, food: string, nowMs: number): boolean =>
  meals[food] === undefined || nowMs - Date.parse(meals[food]) >= MEAL_MINUTES * MS_PER_MINUTE;

/**
 * Returns the foods in [character]'s [bag] in [state] they may have eaten at [nowMs], the most carried first: those
 * not eaten in the last [MEAL_MINUTES], since a food still in effect can not be eaten again. When [maxHealthGain] is
 * known, only those giving about that much health; when none does, all of them, unless the gain is 0, which is a mead.
 */
const foodsToEat = (
  state: ServerState,
  character: string,
  bag: Record<string, number>,
  nowMs: number,
  maxHealthGain: number | null,
): string[] => {
  const meals = state.lastMeals[character] ?? {};
  const ready = Object.keys(bag)
    .filter((item) => item in state.foods && isFoodReady(meals, item, nowMs))
    .sort((first, second) => bag[second]! - bag[first]!);
  const matching = ready.filter((item) => Math.abs(state.foods[item]! - (maxHealthGain ?? 0)) <= MEAL_HEALTH_TOLERANCE);
  return maxHealthGain === null || (matching.length === 0 && maxHealthGain > 0) ? ready : matching;
};

/**
 * Takes one food [character] ate at [timeUtc] out of their bag in [state]. When the log names no food, it is the
 * first of [foodsToEat], by how much their max health went up, [maxHealthGain].
 */
const eat = (state: ServerState, character: string, food: string | null, maxHealthGain: number | null, timeUtc: string): void => {
  const bag = state.snapshot.bags[character] ?? {};
  const meals = (state.lastMeals[character] ??= {});
  const eaten = food ?? foodsToEat(state, character, bag, Date.parse(timeUtc), maxHealthGain)[0];
  if (eaten === undefined) {
    return;
  }
  meals[eaten] = timeUtc;
  addToBag(state.snapshot, character, eaten, -1);
};

/** Takes what building [piece] costs out of [character]'s bag in [state]. */
const payFor = (state: ServerState, character: string, piece: string): void => {
  for (const [item, count] of Object.entries(state.pieceCosts[piece] ?? {})) {
    addToBag(state.snapshot, character, item, -count);
  }
};

/** Returns how many slots the [item] in [bag] fill, in stacks of the most one slot holds in [stacks]. */
const slotsOf = (bag: Record<string, number>, item: string, stacks: Record<string, number>): number =>
  Math.ceil(bag[item]! / (stacks[item] ?? bag[item]!));

/** Takes one slot of [item] out of [bag]: the part-filled slot when there is one, or else a full stack of [stack]. */
const takeOneSlot = (bag: Record<string, number>, item: string, stack: number): void => {
  const rest = bag[item]! % stack;
  const taken = rest > 0 ? rest : stack;
  if (bag[item]! <= taken) {
    delete bag[item];
  } else {
    bag[item]! -= taken;
  }
};

/**
 * Keeps [character]'s bag in [snapshot] within the slots a player has. Crafting is only seen once a made item reaches
 * the world, so materials pile up in the guess. While it needs more slots, one slot at a time is taken from the
 * stackable material filling the most slots, oldest touched first on a tie, so a big pile of guessed wood shrinks
 * before a small real stack goes. Without materials, the oldest piece of gear or tool goes. What is worn now stays.
 */
const fitBag = (snapshot: Snapshot, character: string): void => {
  const bag = snapshot.bags[character];
  if (bag === undefined) {
    return;
  }
  const { capacity } = containerGrid(PLAYER_PREFAB, 0);
  const stacks = snapshot.itemStacks;
  const worn = snapshot.worn[character] ?? [];
  const gear = new Set((snapshot.gear[character] ?? []).map((entry) => gearPiece(entry).prefab));
  while (slotsUsed(bag, stacks) > capacity) {
    const items = Object.keys(bag).filter((item) => !worn.includes(item));
    const materials = items.filter((item) => !gear.has(item) && (stacks[item] ?? MIN_STACKABLE) >= MIN_STACKABLE);
    const fullest = materials.toSorted((first, second) => slotsOf(bag, second, stacks) - slotsOf(bag, first, stacks))[0];
    if (fullest !== undefined) {
      takeOneSlot(bag, fullest, stacks[fullest] ?? bag[fullest]!);
      continue;
    }
    if (items[0] === undefined) {
      return;
    }
    delete bag[items[0]];
  }
};

/** Returns the item [event] takes out of a bag on purpose, so worn gear moved away is not put back, or null. */
const movedItemOf = (event: LogEvent): string | null => {
  switch (event.type) {
    case 'chestChanged':
      return event.isStored ? event.item : null;
    case 'itemDropped':
    case 'itemHung':
      return event.item;
    default:
      return null;
  }
};

/** Returns the character whose bag [event] changes, or null when it changes none. */
const bagOwnerOf = (event: LogEvent): string | null => {
  switch (event.type) {
    case 'ate':
    case 'gearSeen':
    case 'wearing':
      return event.character;
    case 'itemMade':
      return event.crafter;
    case 'pieceBuilt':
      return event.builder;
    case 'tombstoneContents':
      return event.owner;
    case 'itemPickedUp':
    case 'itemDropped':
    case 'chestChanged':
    case 'smelting':
    case 'foodStarted':
    case 'itemHung':
    case 'planted':
    case 'fueled':
    case 'shot':
    case 'tombstoneEmptied':
      return event.player;
    default:
      return null;
  }
};

/**
 * Updates the guess of what each character carries in [state] from [event]. Items come in when picked up, taken from
 * a chest or a tombstone, or seen worn or held, and go out when dropped, stored, smelted, cooked, fermented, eaten,
 * shot, burnt in a fire, hung on a stand, or used to build, plant or craft. An item on the ground has an ID, so each
 * pickup counts once. Gear worn now always stays in the bag, and a death empties the bag into the tombstone and takes
 * off everything worn until the next gear line. Crafting is only seen once a made item reaches a chest or the ground,
 * so the bag is only a guess, kept within the player's slots.
 */
export const updateBags = (state: ServerState, event: LogEvent): void => {
  const { snapshot } = state;
  const character = bagOwnerOf(event);
  if (character === null) {
    return;
  }
  switch (event.type) {
    case 'itemPickedUp':
      if (isPickupNew(state, event)) {
        addToBag(snapshot, character, event.item, event.count);
      }
      break;
    case 'itemDropped':
      addToBag(snapshot, character, event.item, -event.count);
      break;
    case 'itemMade':
      payForCraft(state, character, event.item, event.level, event.count);
      break;
    case 'chestChanged':
      addToBag(snapshot, character, event.item, event.isStored ? -event.count : event.count);
      break;
    case 'smelting':
      addToBag(snapshot, character, event.item, -event.count);
      break;
    case 'ate':
      eat(state, character, event.item, event.maxHealthGain, event.timeUtc);
      break;
    case 'foodStarted':
    case 'itemHung':
    case 'shot':
      addToBag(snapshot, character, event.item, -1);
      break;
    case 'fueled': {
      const fuel = state.fireFuels[event.fire];
      if (fuel !== undefined) {
        addToBag(snapshot, character, fuel, -1);
      }
      break;
    }
    case 'pieceBuilt':
      payFor(state, character, event.piece);
      break;
    case 'planted':
      payFor(state, character, event.plant);
      break;
    case 'gearSeen':
      keepInBag(snapshot, character, event.item);
      break;
    case 'wearing':
      for (const item of event.items) {
        keepInBag(snapshot, character, item);
      }
      break;
    case 'tombstoneContents':
      snapshot.bags[character] = {};
      snapshot.worn[character] = [];
      break;
    case 'tombstoneEmptied': {
      const tombstone = event.owner === null ? undefined : snapshot.deathItems[event.owner];
      for (const [item, count] of Object.entries(tombstone?.items ?? {})) {
        addToBag(snapshot, character, item, count);
      }
      break;
    }
    default:
      break;
  }
  if (event.type !== 'tombstoneContents' && event.type !== 'wearing') {
    keepWorn(snapshot, character, movedItemOf(event));
  }
  fitBag(snapshot, character);
};
