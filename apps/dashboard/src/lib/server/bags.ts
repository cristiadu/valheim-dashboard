import type { LogEvent } from 'valheim-log';

import { containerGrid, slotsUsed } from '#/lib/items';
import { PLAYER_PREFAB, type Snapshot } from '#/lib/models';
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

/** Takes what building [piece] costs out of [character]'s bag in [state]. */
const payFor = (state: ServerState, character: string, piece: string): void => {
  for (const [item, count] of Object.entries(state.pieceCosts[piece] ?? {})) {
    addToBag(state.snapshot, character, item, -count);
  }
};

/**
 * Keeps [character]'s bag in [snapshot] within the slots a player has. Crafting and dropping are not in the log, so
 * while the guess needs more slots, the item touched longest ago is taken out, never what is worn now.
 */
const fitBag = (snapshot: Snapshot, character: string): void => {
  const bag = snapshot.bags[character];
  if (bag === undefined) {
    return;
  }
  const { capacity } = containerGrid(PLAYER_PREFAB, 0);
  const worn = snapshot.worn[character] ?? [];
  while (slotsUsed(bag, snapshot.itemStacks) > capacity) {
    const oldest = Object.keys(bag).find((item) => !worn.includes(item));
    if (oldest === undefined) {
      return;
    }
    delete bag[oldest];
  }
};

/** Returns the character whose bag [event] changes, or null when it changes none. */
const characterOf = (event: LogEvent): string | null => {
  switch (event.type) {
    case 'ate':
    case 'gearSeen':
    case 'wearing':
      return event.character;
    case 'pieceBuilt':
      return event.builder;
    case 'tombstoneContents':
      return event.owner;
    case 'itemPickedUp':
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
 * Updates the guess of what each character carries in [state] from [event]. Items come in when picked up for the
 * first time, taken from a chest or a tombstone, or seen worn or held, and go out when stored, smelted, cooked,
 * eaten, hung on a stand, or used to build or plant. A death empties the bag into the tombstone. Crafting and
 * dropping are not in the log, so the bag is only a guess, kept within the player's slots.
 */
export const updateBags = (state: ServerState, event: LogEvent): void => {
  const { snapshot } = state;
  const character = characterOf(event);
  if (character === null) {
    return;
  }
  switch (event.type) {
    case 'itemPickedUp':
      if (event.isFirstPickup) {
        addToBag(snapshot, character, event.item, event.count);
      }
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
      addToBag(snapshot, character, event.item, -1);
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
  fitBag(snapshot, character);
};
