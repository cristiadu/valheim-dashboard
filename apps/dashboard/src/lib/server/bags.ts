import type { LogEvent } from 'valheim-log';

import type { Snapshot } from '#/lib/models';

/** Adds [count] of [item] to [character]'s bag in [snapshot], or takes it out when [count] is below zero, never below none. */
const addToBag = (snapshot: Snapshot, character: string, item: string, count: number): void => {
  const bag = (snapshot.bags[character] ??= {});
  const left = (bag[item] ?? 0) + count;
  if (left > 0) {
    bag[item] = left;
  } else {
    delete bag[item];
  }
};

/**
 * Updates the guess of what each character carries in [snapshot] from [event]. Items come in when picked up for the
 * first time, taken from a chest or a tombstone, and go out when stored, put in a smelter or eaten. A death empties
 * the bag into the tombstone. Crafting, building and dropping are not in the log, so the bag is only a guess.
 */
export const updateBags = (snapshot: Snapshot, event: LogEvent): void => {
  switch (event.type) {
    case 'itemPickedUp':
      if (event.player !== null && event.isFirstPickup) {
        addToBag(snapshot, event.player, event.item, event.count);
      }
      break;
    case 'chestChanged':
      if (event.player !== null) {
        addToBag(snapshot, event.player, event.item, event.isStored ? -event.count : event.count);
      }
      break;
    case 'smelting':
      if (event.player !== null) {
        addToBag(snapshot, event.player, event.item, -event.count);
      }
      break;
    case 'ate':
      addToBag(snapshot, event.character, event.item, -1);
      break;
    case 'tombstoneContents':
      if (event.owner !== null) {
        snapshot.bags[event.owner] = {};
      }
      break;
    case 'tombstoneEmptied': {
      const tombstone = event.owner === null ? undefined : snapshot.deathItems[event.owner];
      if (event.player !== null && tombstone !== undefined) {
        for (const [item, count] of Object.entries(tombstone.items)) {
          addToBag(snapshot, event.player, item, count);
        }
      }
      break;
    }
    default:
      break;
  }
};
