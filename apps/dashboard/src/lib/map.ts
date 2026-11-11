import {
  CHEST_MARK_KINDS,
  type ChestMarkKind,
  type ChestRecord,
  LEVIATHAN_COLOR,
  MAP_CHEST_STEP,
  MAP_MARGIN_METERS,
  MAP_SQUARE_METERS,
  MAP_TRAIL_METERS,
  type MapChest,
  type MapChestSpot,
  type MapView,
  METERS_PER_KM,
  OTHER_PLAYER_COLOR,
  type Player,
  TERRAIN_STYLES,
  TREASURE_CHEST_PREFIX,
  UNKNOWN_TERRAIN_COLOR,
} from '#/lib/models';
import type { Snapshot } from '#/lib/models/snapshot';

/** Returns the color of [character], from the player it belongs to among [players]. */
const colorOf = (players: Player[], character: string): string =>
  players.find((player) => player.sessions.some((session) => session.character === character))?.color ??
  OTHER_PLAYER_COLOR;

/** Returns the character of the player among [players] whose Steam name is [builder], or [builder] as it is. */
const builderOf = (players: Player[], builder: string | null): string | null =>
  players.find((player) => player.steamName !== null && player.steamName === builder)?.character ?? builder;

/** Returns the `x,z` square number that the spot [x], [z] falls in, as explored squares are keyed. */
export const squareKeyOf = (x: number, z: number): string => `${Math.floor(x / MAP_SQUARE_METERS)},${Math.floor(z / MAP_SQUARE_METERS)}`;

/** Returns the column and row of the square keyed [key], for example `[3, -11]` for `3,-11`. */
export const squareOf = (key: string): [column: number, row: number] => {
  const [column, row] = key.split(',').map(Number);
  return [column!, row!];
};

/**
 * Returns the chests, carts and ships of [snapshot] that sit on a square someone walked, by ID. Chests anywhere
 * else stay hidden, even ones a player built, so the map only shows land players have been through.
 */
export const foundChests = (snapshot: Snapshot): [string, ChestRecord][] => {
  const explored = new Set(Object.values(snapshot.explored).flat());
  return Object.entries(snapshot.chests).filter(([, chest]) => explored.has(squareKeyOf(chest.x, chest.z)));
};

/** Returns which drawing the map uses for the chest, cart or ship [prefab]: chests the world came with get their own. */
export const chestMarkKindOf = (prefab: string): ChestMarkKind =>
  CHEST_MARK_KINDS[prefab] ?? (prefab.startsWith(TREASURE_CHEST_PREFIX) ? 'treasure' : 'chest');

/**
 * Returns where the map spot [x], [y] is, as the game's own coordinates and how far it is from the world's
 * center, for example `x 120, z -340 · 360 m from the center`. The game shows the same `x` and `z` with `pos`.
 */
export const spotLabelOf = (x: number, y: number): string => {
  const meters = Math.round(Math.hypot(x, y));
  const distance = meters >= METERS_PER_KM ? `${(meters / METERS_PER_KM).toFixed(1)} km` : `${meters} m`;
  return `x ${Math.round(x)}, z ${Math.round(-y)} · ${distance} from the center`;
};

/**
 * Places each of [chests] on the map. Chests that share a square [chestMeters] wide would cover each other, so they
 * sit side by side in a small grid around their middle, and each one can still be pointed at and tapped on its own.
 */
export const chestSpotsOf = (chests: MapChest[], chestMeters: number): MapChestSpot[] => {
  const cells = new Map<string, MapChest[]>();
  for (const chest of chests) {
    const key = `${Math.floor(chest.x / chestMeters)},${Math.floor(chest.y / chestMeters)}`;
    cells.set(key, [...(cells.get(key) ?? []), chest]);
  }
  return [...cells.values()].flatMap((members) => {
    const columns = Math.ceil(Math.sqrt(members.length));
    const rows = Math.ceil(members.length / columns);
    const step = chestMeters * MAP_CHEST_STEP;
    const middleX = members.reduce((sum, chest) => sum + chest.x, 0) / members.length;
    const middleY = members.reduce((sum, chest) => sum + chest.y, 0) / members.length;
    return members.map((chest, index) => ({
      id: chest.id,
      x: middleX + ((index % columns) - (columns - 1) / 2) * step,
      y: middleY + (Math.floor(index / columns) - (rows - 1) / 2) * step,
    }));
  });
};

/**
 * What the map draws for [snapshot]: explored squares in their terrain color, each player's trail, chests,
 * online players, last deaths and Leviathans on a square someone walked, colored by [players], fitted to what was explored. Null when the plugin has logged nothing to draw yet.
 */
export const mapOf = (snapshot: Snapshot, players: Player[]): MapView | null => {
  const squareKeys = [...new Set(Object.values(snapshot.explored).flat())];
  const land = squareKeys.map((key) => {
    const [column, row] = squareOf(key);
    const letter = snapshot.terrain[key];
    const color = letter === undefined ? UNKNOWN_TERRAIN_COLOR : (TERRAIN_STYLES[letter]?.color ?? UNKNOWN_TERRAIN_COLOR);
    return { key, x: column * MAP_SQUARE_METERS, y: (-row - 1) * MAP_SQUARE_METERS, color };
  });
  const inset = (MAP_SQUARE_METERS - MAP_TRAIL_METERS) / 2;
  const trails = Object.entries(snapshot.explored).flatMap(([character, keys]) => {
    const color = colorOf(players, character);
    return keys.map((key) => {
      const [column, row] = squareOf(key);
      return {
        key: `${character}:${key}`,
        x: column * MAP_SQUARE_METERS + inset,
        y: (-row - 1) * MAP_SQUARE_METERS + inset,
        color,
      };
    });
  });
  const chests = foundChests(snapshot).map(([id, record]) => ({
    id,
    x: record.x,
    y: -record.z,
    kind: chestMarkKindOf(record.chest),
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
    ...Object.entries(snapshot.leviathans)
      .filter(([, leviathan]) => squareKeys.includes(squareKeyOf(leviathan.x, leviathan.z)))
      .map(([id, leviathan]) => ({
        key: `leviathan:${id}`,
        kind: 'leviathan' as const,
        label: 'Leviathan',
        x: leviathan.x,
        y: -leviathan.z,
        color: LEVIATHAN_COLOR,
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
  return {
    box: { x: left, y: top, width, height },
    land,
    trails,
    chests,
    marks,
  };
};
