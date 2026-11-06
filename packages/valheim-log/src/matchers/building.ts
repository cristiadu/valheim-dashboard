import { heldItemsOf, playerOf } from '#/fields';
import type { Matcher } from '#/models';
import {
  CHEST_CONTENTS_PATTERN,
  CHEST_REMOVED_PATTERN,
  FUELED_PATTERN,
  PIECE_BUILT_PATTERN,
  PIECE_DESTROYED_PATTERN,
  PORTAL_NAMED_PATTERN,
  REPAIRED_PATTERN,
  WARD_ACCESS_PATTERN,
  WARD_PATTERN,
} from '#/patterns';

/** Messages about pieces built and destroyed, portals, wards, repairs, fires and chests. */
export const BUILDING_MATCHERS: readonly Matcher[] = [
  {
    pattern: PIECE_BUILT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceBuilt', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: PIECE_DESTROYED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'pieceDestroyed', timeUtc, piece: groups.piece!, builder: playerOf(groups.builder) }),
  },
  {
    pattern: PORTAL_NAMED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'portalNamed', timeUtc, portal: groups.portal!, player: playerOf(groups.player) }),
  },
  {
    pattern: WARD_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wardChanged',
      timeUtc,
      ward: groups.ward!,
      builder: playerOf(groups.builder),
      isOn: groups.state === 'on',
    }),
  },
  {
    pattern: WARD_ACCESS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'wardAccess',
      timeUtc,
      player: groups.player!,
      ward: groups.ward!,
      builder: playerOf(groups.builder),
      isGiven: groups.change === 'given',
    }),
  },
  {
    pattern: REPAIRED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'repaired', timeUtc, piece: groups.piece!, player: playerOf(groups.player) }),
  },
  {
    pattern: FUELED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'fueled', timeUtc, fire: groups.fire!, player: playerOf(groups.player) }),
  },
  {
    pattern: CHEST_CONTENTS_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'chestContents',
      timeUtc,
      id: groups.id!,
      chest: groups.chest!,
      x: Number(groups.x),
      z: Number(groups.z),
      builder: playerOf(groups.builder),
      items: heldItemsOf(groups.items!),
    }),
  },
  {
    pattern: CHEST_REMOVED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'chestRemoved', timeUtc, id: groups.id! }),
  },
];
