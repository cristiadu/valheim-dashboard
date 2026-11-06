import type { LogEvent } from 'valheim-log';

import { gearPiece } from '#/lib/gear';
import { containerGrid, slotsUsed } from '#/lib/items';
import { MIN_STACKABLE, PLAYER_PREFAB, type Snapshot } from '#/lib/models';
import type { ServerState } from '#/lib/server/models';

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

/** Takes what building [piece] costs out of [character]'s bag in [state]. */
const payFor = (state: ServerState, character: string, piece: string): void => {
  for (const [item, count] of Object.entries(state.pieceCosts[piece] ?? {})) {
    addToBag(state.snapshot, character, item, -count);
  }
};

/**
 * Keeps [character]'s bag in [snapshot] within the slots a player has. Crafting and dropping are not in the log, so
 * while the guess needs more slots, an item is taken out: first the stackable material touched longest ago, as it
 * most likely went into crafting, then the oldest piece of gear or tool. What is worn now is never taken out.
 */
const fitBag = (snapshot: Snapshot, character: string): void => {
  const bag = snapshot.bags[character];
  if (bag === undefined) {
    return;
  }
  const { capacity } = containerGrid(PLAYER_PREFAB, 0);
  const worn = snapshot.worn[character] ?? [];
  const gear = new Set((snapshot.gear[character] ?? []).map((entry) => gearPiece(entry).prefab));
  while (slotsUsed(bag, snapshot.itemStacks) > capacity) {
    const items = Object.keys(bag).filter((item) => !worn.includes(item));
    const oldest =
      items.find((item) => !gear.has(item) && (snapshot.itemStacks[item] ?? MIN_STACKABLE) >= MIN_STACKABLE) ?? items[0];
    if (oldest === undefined) {
      return;
    }
    delete bag[oldest];
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
const characterOf = (event: LogEvent): string | null => {
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
    case 'tombstoneEmptied':
      return event.player;
    default:
      return null;
  }
};

/**
 * Updates the guess of what each character carries in [state] from [event]. Items come in when picked up, taken from
 * a chest or a tombstone, or seen worn or held, and go out when dropped, stored, smelted, cooked, fermented, eaten,
 * hung on a stand, or used to build, plant or craft. An item on the ground has an ID, so each pickup counts once.
 * Gear worn now always stays in the bag, and a death empties it into the tombstone. Crafting is only seen once a
 * made item reaches a chest or the ground, so the bag is only a guess, kept within the player's slots.
 */
export const updateBags = (state: ServerState, event: LogEvent): void => {
  const { snapshot } = state;
  const character = characterOf(event);
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
    case 'foodStarted':
    case 'itemHung':
      if (event.item !== null) {
        addToBag(snapshot, character, event.item, -1);
      }
      break;
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
