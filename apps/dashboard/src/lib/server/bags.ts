import type { LogEvent } from 'valheim-log';

import { gearPiece } from '#/lib/gear';
import { containerGrid, slotsUsed } from '#/lib/items';
import { PLAYER_PREFAB } from '#/lib/models/chests';
import { MIN_STACKABLE } from '#/lib/models/items';
import type { Snapshot } from '#/lib/models/snapshot';
import { MS_PER_MINUTE } from '#/lib/models/time';
import {
  EAT_AGAIN_MINUTES,
  EATEN_AGAIN_MIN_SHARE,
  MEAL_HEALTH_TOLERANCE,
  MEAL_MINUTES,
  type ServerState,
  SURE_ITEMS_MINUTES,
} from '#/lib/server/models';

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
 * Takes what making [count] of [item] at [level] costs out of [character]'s bag in [state], and returns how many the
 * crafts made. A craft can make more than one, such as 20 arrows, and an upgrade makes one.
 */
const payForCraft = (state: ServerState, character: string, item: string, level: number, count: number): number => {
  const cost = state.craftCosts[item]?.[level];
  if (cost === undefined) {
    return 0;
  }
  const crafts = Math.ceil(count / cost.yields);
  for (const [ingredient, amount] of Object.entries(cost.items)) {
    addToBag(state.snapshot, character, ingredient, -amount * crafts);
  }
  return crafts * cost.yields;
};

/**
 * Pays for [count] of [item] at [level] that a `Made` or `Upgraded` line says [character] made, as in [payForCraft],
 * except the ones in [state] already guessed as crafted unseen and paid for when they left the bag.
 */
const payForSeenCraft = (state: ServerState, character: string, item: string, level: number, count: number): void => {
  const unseen = (state.unseenCrafts[character] ??= {});
  const alreadyPaid = level === 1 ? Math.min(unseen[item] ?? 0, count) : 0;
  unseen[item] = (unseen[item] ?? 0) - alreadyPaid;
  if (count > alreadyPaid) {
    payForCraft(state, character, item, level, count - alreadyPaid);
  }
};

/**
 * Makes sure [character]'s bag in [state] holds [count] of [item] before they use, store, drop or wear it. Crafting
 * happens on the player's game and is often never seen, so when the bag holds fewer and the item can be crafted, the
 * missing ones were crafted: their cost comes out and what the crafts made goes in, remembered so a later `Made` line
 * for them does not pay again. A craft can make more than was missing, such as 20 arrows for one shot. The rest stays
 * in the bag, unless [isWholePile]: a player who stores what they made puts the whole pile in the chest.
 */
const craftMissing = (state: ServerState, character: string, item: string, count: number, isWholePile: boolean): void => {
  const missing = count - (state.snapshot.bags[character]?.[item] ?? 0);
  if (missing <= 0 || state.craftCosts[item]?.[1] === undefined) {
    return;
  }
  const made = payForCraft(state, character, item, 1, missing);
  const unseen = (state.unseenCrafts[character] ??= {});
  unseen[item] = (unseen[item] ?? 0) + made;
  addToBag(state.snapshot, character, item, isWholePile ? missing : made);
};

/**
 * Takes [count] of [item] out of [character]'s bag in [state], crafting the ones it is missing first, as in
 * [craftMissing].
 */
const takeOut = (state: ServerState, character: string, item: string, count: number, isWholePile = false): void => {
  craftMissing(state, character, item, count, isWholePile);
  addToBag(state.snapshot, character, item, -count);
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

/** Returns true when [health] is about the max health a meal added, [maxHealthGain]. */
const isAboutGain = (health: number, maxHealthGain: number): boolean => Math.abs(health - maxHealthGain) <= MEAL_HEALTH_TOLERANCE;

/**
 * Returns true when eating a food that gives [health] again, while some of it was still in effect, can add
 * [maxHealthGain]. Eating a food again only adds back the health it had lost: less than the food gives, but at
 * least [EATEN_AGAIN_MIN_SHARE] of it.
 */
const isTopUp = (health: number, maxHealthGain: number): boolean =>
  maxHealthGain <= health + MEAL_HEALTH_TOLERANCE && maxHealthGain >= health * EATEN_AGAIN_MIN_SHARE - MEAL_HEALTH_TOLERANCE;

/** Returns the first two of [foods] that give [maxHealthGain] together, by the health each gives in [healths], or none. */
const twoFoodsGiving = (foods: string[], healths: Record<string, number>, maxHealthGain: number): string[] => {
  for (const first of foods) {
    const second = foods.find((item) => item !== first && isAboutGain(healths[first]! + healths[item]!, maxHealthGain));
    if (second !== undefined) {
      return [first, second];
    }
  }
  return [];
};

/**
 * Returns the foods [character] ate from their [bag] in [state] in one meal at [nowMs], when the log names none.
 * Without the max health the meal added, [maxHealthGain], it is the food carried most that is not still in effect:
 * a food can not be eaten again for [MEAL_MINUTES]. With it, it is the first of these that fits, the most carried
 * first: one food giving about that much health, the food eaten longest ago that tops up to it as in [isTopUp], two
 * foods eaten one right after the other that give it together, or a food never seen eaten that tops up to it.
 * When nothing carried fits, the food eaten is not in the guess and nothing is taken. A gain of 0 is a mead, which
 * gives no health: the one carried most, since a mead can be drunk again after a minute or two.
 */
const foodsEaten = (
  state: ServerState,
  character: string,
  bag: Record<string, number>,
  nowMs: number,
  maxHealthGain: number | null,
): string[] => {
  const meals = state.lastMeals[character] ?? {};
  const carried = Object.keys(bag)
    .filter((item) => item in state.foods)
    .sort((first, second) => bag[second]! - bag[first]!);
  const ready = carried.filter((item) => isFoodReady(meals, item, nowMs));
  if (maxHealthGain === null) {
    return ready.slice(0, 1);
  }
  if (maxHealthGain === 0) {
    return carried.filter((item) => state.foods[item] === 0).slice(0, 1);
  }
  const eatenAgain = carried
    .filter((item) => meals[item] !== undefined && nowMs - Date.parse(meals[item]) >= EAT_AGAIN_MINUTES * MS_PER_MINUTE)
    .filter((item) => isTopUp(state.foods[item]!, maxHealthGain))
    .toSorted((first, second) => Date.parse(meals[first]!) - Date.parse(meals[second]!))[0];
  const one = ready.find((item) => isAboutGain(state.foods[item]!, maxHealthGain)) ?? eatenAgain;
  if (one !== undefined) {
    return [one];
  }
  const two = twoFoodsGiving(ready, state.foods, maxHealthGain);
  return two.length > 0 ? two : ready.filter((item) => isTopUp(state.foods[item]!, maxHealthGain)).slice(0, 1);
};

/**
 * Takes what [character] ate at [timeUtc] out of their bag in [state]: [food] when the log names it, or else each
 * of [foodsEaten], by how much their max health went up, [maxHealthGain].
 */
const eat = (state: ServerState, character: string, food: string | null, maxHealthGain: number | null, timeUtc: string): void => {
  const bag = state.snapshot.bags[character] ?? {};
  const meals = (state.lastMeals[character] ??= {});
  const eaten = food === null ? foodsEaten(state, character, bag, Date.parse(timeUtc), maxHealthGain) : [food];
  for (const item of eaten) {
    meals[item] = timeUtc;
    takeOut(state, character, item, 1);
  }
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

/**
 * Takes one slot of [item] out of [bag]: the part-filled slot when there is one, or else a full stack of [stack], but
 * never more than [most].
 */
const takeOneSlot = (bag: Record<string, number>, item: string, stack: number, most: number): void => {
  const rest = bag[item]! % stack;
  const taken = Math.min(rest > 0 ? rest : stack, most);
  if (bag[item]! <= taken) {
    delete bag[item];
  } else {
    bag[item]! -= taken;
  }
};

/** Returns how many of [item] in [bag] are not known for sure by [sure], counted from pickups and other guesses. */
const unsureOf = (bag: Record<string, number>, sure: Record<string, number>, item: string): number =>
  bag[item]! - Math.min(sure[item] ?? 0, bag[item]!);

/**
 * Returns the items in [character]'s bag in [state] known for sure at [timeUtc]: what they took back from their
 * tombstone in the last [SURE_ITEMS_MINUTES], kept within what the bag still holds.
 */
const sureItemsOf = (state: ServerState, character: string, timeUtc: string): Record<string, number> => {
  const sure = state.sureItems[character];
  if (sure === undefined || Date.parse(timeUtc) - Date.parse(sure.timeUtc) > SURE_ITEMS_MINUTES * MS_PER_MINUTE) {
    return {};
  }
  const bag = state.snapshot.bags[character] ?? {};
  for (const item of Object.keys(sure.items)) {
    sure.items[item] = Math.min(sure.items[item]!, bag[item] ?? 0);
  }
  return sure.items;
};

/**
 * Keeps [character]'s bag in [snapshot] within the slots a player has. Crafting is only seen once a made item reaches
 * the world, so materials pile up in the guess. While it needs more slots, one slot at a time is taken from the
 * stackable material filling the most slots, oldest touched first on a tie, so a big pile of guessed wood shrinks
 * before a small real stack goes. Items known for sure in [sure], just taken back from a tombstone, go only once
 * no guessed ones are left. Without materials, the oldest piece of gear or tool goes. What is worn now stays.
 */
const fitBag = (snapshot: Snapshot, character: string, sure: Record<string, number>): void => {
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
    const guessed = materials.filter((item) => unsureOf(bag, sure, item) > 0);
    const fullest = (guessed.length > 0 ? guessed : materials).toSorted(
      (first, second) => slotsOf(bag, second, stacks) - slotsOf(bag, first, stacks),
    )[0];
    if (fullest !== undefined) {
      const most = guessed.length > 0 ? unsureOf(bag, sure, fullest) : bag[fullest]!;
      takeOneSlot(bag, fullest, stacks[fullest] ?? bag[fullest]!, most);
      continue;
    }
    if (items[0] === undefined) {
      return;
    }
    delete bag[items[0]];
  }
};

/**
 * Returns the ammo [event], a shot, used. Some ammo looks the same in flight, so the log names each kind it may be:
 * it is then the first of them in the shooter's bag in [snapshot], oldest touched first, as a bow uses the first
 * it finds, or else the first one named.
 */
export const shotItemOf = (snapshot: Snapshot, event: Extract<LogEvent, { type: 'shot' }>): string => {
  const bag = event.player === null ? {} : (snapshot.bags[event.player] ?? {});
  return Object.keys(bag).find((item) => event.items.includes(item)) ?? event.items[0]!;
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
 * so something leaving the bag or worn that the bag never had is taken as crafted unseen. The bag is only a guess,
 * kept within the player's slots.
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
      takeOut(state, character, event.item, event.count);
      break;
    case 'itemMade':
      payForSeenCraft(state, character, event.item, event.level, event.count);
      break;
    case 'chestChanged':
      if (event.isStored) {
        takeOut(state, character, event.item, event.count, true);
      } else {
        addToBag(snapshot, character, event.item, event.count);
      }
      break;
    case 'smelting':
      addToBag(snapshot, character, event.item, -event.count);
      break;
    case 'ate':
      eat(state, character, event.item, event.maxHealthGain, event.timeUtc);
      break;
    case 'foodStarted':
    case 'itemHung':
      takeOut(state, character, event.item, 1);
      break;
    case 'shot':
      takeOut(state, character, shotItemOf(snapshot, event), 1);
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
      craftMissing(state, character, event.item, 1, false);
      keepInBag(snapshot, character, event.item);
      break;
    case 'wearing':
      for (const item of event.items) {
        craftMissing(state, character, item, 1, false);
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
      state.sureItems[character] = { timeUtc: event.timeUtc, items: { ...tombstone?.items } };
      break;
    }
    default:
      break;
  }
  if (event.type !== 'tombstoneContents' && event.type !== 'wearing') {
    keepWorn(snapshot, character, movedItemOf(event));
  }
  fitBag(snapshot, character, sureItemsOf(state, character, event.timeUtc));
};
