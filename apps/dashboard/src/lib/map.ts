import {
  CONTAINER_NAMES,
  CONTAINER_SIZES,
  type ContainerGrid,
  DEFAULT_CONTAINER_SIZE,
  MAP_CHEST_REACH_ICONS,
  MAP_CHEST_ICON_SHARE,
  MAP_CHEST_METERS,
  MAP_MARGIN_METERS,
  MAP_SQUARE_METERS,
  MAP_TRAIL_METERS,
  type ChestRecord,
  type MapChest,
  type MapChestSpot,
  type MapView,
  OTHER_PLAYER_COLOR,
  type Player,
  type Snapshot,
  TERRAIN_STYLES,
  TREASURE_CHEST_NAME,
  TREASURE_CHEST_PREFIX,
  UNKNOWN_TERRAIN_COLOR,
} from '#/lib/models';
import { capitalized, thingName } from '#/lib/story';

/** Returns the color of [character], from the player it belongs to among [players]. */
const colorOf = (players: Player[], character: string): string =>
  players.find((player) => player.sessions.some((session) => session.character === character))?.color ??
  OTHER_PLAYER_COLOR;

/** Returns the character of the player among [players] whose Steam name is [builder], or [builder] as it is. */
const builderOf = (players: Player[], builder: string | null): string | null =>
  players.find((player) => player.steamName !== null && player.steamName === builder)?.character ?? builder;

/** Returns the `x,z` square number that the spot [x], [z] falls in, as explored squares are keyed. */
const squareKeyOf = (x: number, z: number): string => `${Math.floor(x / MAP_SQUARE_METERS)},${Math.floor(z / MAP_SQUARE_METERS)}`;

/** Returns true when [chest] is in or next to one of the [explored] squares. */
const isNearExplored = (chest: ChestRecord, explored: Set<string>): boolean =>
  [-1, 0, 1].some((east) =>
    [-1, 0, 1].some((north) =>
      explored.has(squareKeyOf(chest.x + east * MAP_SQUARE_METERS, chest.z + north * MAP_SQUARE_METERS)),
    ),
  );

/** Name of the container [prefab] as the game shows it, for example `Wood chest` for `piece_chest_wood`. */
export const containerName = (prefab: string): string =>
  CONTAINER_NAMES[prefab] ?? (prefab.startsWith(TREASURE_CHEST_PREFIX) ? TREASURE_CHEST_NAME : capitalized(thingName(prefab)));

/** Grid of slots of the container [prefab], with more rows when its [itemKinds] kinds of items need them. */
export const containerGrid = (prefab: string, itemKinds: number): ContainerGrid => {
  const { columns, rows } = CONTAINER_SIZES[prefab] ?? DEFAULT_CONTAINER_SIZE;
  return { columns, slots: Math.max(rows, Math.ceil(itemKinds / columns)) * columns };
};

/** One icon for [chests], in the middle of them. */
const chestSpot = (chests: MapChest[]): MapChestSpot => ({
  key: chests[0]!.id,
  x: chests.reduce((sum, chest) => sum + chest.x, 0) / chests.length,
  y: chests.reduce((sum, chest) => sum + chest.y, 0) / chests.length,
  chests,
});

/**
 * Groups [chests] into icons: any two icons closer than [reachMeters] become one, until every icon has room
 * around it. A base full of chests then shows as one icon with a count.
 */
const chestSpotsOf = (chests: MapChest[], reachMeters: number): MapChestSpot[] => {
  let spots = chests.map((chest) => chestSpot([chest]));
  let isMerging = true;
  while (isMerging) {
    isMerging = false;
    for (const [index, spot] of spots.entries()) {
      const nearIndex = spots.findIndex((other, otherIndex) => otherIndex > index && Math.hypot(other.x - spot.x, other.y - spot.y) < reachMeters);
      if (nearIndex !== -1) {
        const merged = chestSpot([...spot.chests, ...spots[nearIndex]!.chests]);
        spots = spots.map((one, oneIndex) => (oneIndex === index ? merged : one)).filter((_, oneIndex) => oneIndex !== nearIndex);
        isMerging = true;
        break;
      }
    }
  }
  return spots;
};

/**
 * Returns the chests, carts and ships of [snapshot] that players have found, by ID: the ones a player built, and
 * the ones in or next to a square someone walked. Chests the world came with stay hidden until then.
 */
export const foundChests = (snapshot: Snapshot): [string, ChestRecord][] => {
  const explored = new Set(Object.values(snapshot.explored).flat());
  return Object.entries(snapshot.chests).filter(([, chest]) => chest.builder !== null || isNearExplored(chest, explored));
};

/**
 * What the map draws for [snapshot]: explored squares in their terrain color, each player's trail, chests,
 * online players and last deaths, colored by [players]. Null when the plugin has logged nothing to draw yet.
 */
export const mapOf = (snapshot: Snapshot, players: Player[]): MapView | null => {
  const squareKeys = [...new Set(Object.values(snapshot.explored).flat())];
  const land = squareKeys.map((key) => {
    const [column, row] = key.split(',').map(Number);
    const letter = snapshot.terrain[key];
    const color = letter === undefined ? UNKNOWN_TERRAIN_COLOR : (TERRAIN_STYLES[letter]?.color ?? UNKNOWN_TERRAIN_COLOR);
    return { key, x: column! * MAP_SQUARE_METERS, y: (-row! - 1) * MAP_SQUARE_METERS, color };
  });
  const inset = (MAP_SQUARE_METERS - MAP_TRAIL_METERS) / 2;
  const trails = Object.entries(snapshot.explored).flatMap(([character, keys]) => {
    const color = colorOf(players, character);
    return keys.map((key) => {
      const [column, row] = key.split(',').map(Number);
      return {
        key: `${character}:${key}`,
        x: column! * MAP_SQUARE_METERS + inset,
        y: (-row! - 1) * MAP_SQUARE_METERS + inset,
        color,
      };
    });
  });
  const chests = foundChests(snapshot).map(([id, record]) => ({
    id,
    x: record.x,
    y: -record.z,
    record: { ...record, builder: builderOf(players, record.builder) },
  }));
  const online = players.filter((player) => player.isOnline && snapshot.positions[player.character] !== undefined);
  const marks = [
    ...online.map((player) => {
      const position = snapshot.positions[player.character]!;
      const { character, color } = player;
      return {
        key: `player:${character}`,
        kind: 'player' as const,
        label: character,
        x: position.x,
        y: -position.z,
        color,
      };
    }),
    ...Object.entries(snapshot.deathItems).map(([character, death]) => ({
      key: `death:${character}`,
      kind: 'death' as const,
      label: `${character} died here`,
      x: death.x,
      y: -death.z,
      color: colorOf(players, character),
    })),
  ];
  const xs = [
    ...land.flatMap((square) => [square.x, square.x + MAP_SQUARE_METERS]),
    ...chests.map((chest) => chest.x),
    ...marks.map((mark) => mark.x),
  ];
  const ys = [
    ...land.flatMap((square) => [square.y, square.y + MAP_SQUARE_METERS]),
    ...chests.map((chest) => chest.y),
    ...marks.map((mark) => mark.y),
  ];
  if (xs.length === 0) {
    return null;
  }
  const left = Math.min(...xs) - MAP_MARGIN_METERS;
  const top = Math.min(...ys) - MAP_MARGIN_METERS;
  const width = Math.max(...xs) + MAP_MARGIN_METERS - left;
  const height = Math.max(...ys) + MAP_MARGIN_METERS - top;
  const chestIconMeters = Math.max(MAP_CHEST_METERS, Math.max(width, height) / MAP_CHEST_ICON_SHARE);
  return {
    viewBox: `${left} ${top} ${width} ${height}`,
    land,
    trails,
    chests,
    chestSpots: chestSpotsOf(chests, chestIconMeters * MAP_CHEST_REACH_ICONS),
    chestIconMeters,
    marks,
  };
};
