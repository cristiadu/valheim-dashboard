import {
  MAP_MARGIN_METERS,
  MAP_SQUARE_METERS,
  type MapView,
  OTHER_PLAYER_COLOR,
  type Player,
  type Snapshot,
} from '#/lib/models';

/** Returns the color of [character], from the player it belongs to among [players]. */
const colorOf = (players: Player[], character: string): string =>
  players.find((player) => player.sessions.some((session) => session.character === character))?.color ??
  OTHER_PLAYER_COLOR;

/**
 * What the map draws for [snapshot]: explored squares, chests, online players and last deaths, colored by
 * [players]. Null when the plugin has logged nothing to draw yet.
 */
export const mapOf = (snapshot: Snapshot, players: Player[]): MapView | null => {
  const squares = Object.entries(snapshot.explored).flatMap(([character, keys]) => {
    const color = colorOf(players, character);
    return keys.map((key) => {
      const [column, row] = key.split(',').map(Number);
      return {
        key: `${character}:${key}`,
        x: column! * MAP_SQUARE_METERS,
        y: (-row! - 1) * MAP_SQUARE_METERS,
        color,
      };
    });
  });
  const chests = Object.entries(snapshot.chests).map(([id, record]) => ({
    id,
    x: record.x,
    y: -record.z,
    record,
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
    ...squares.flatMap((square) => [square.x, square.x + MAP_SQUARE_METERS]),
    ...chests.map((chest) => chest.x),
    ...marks.map((mark) => mark.x),
  ];
  const ys = [
    ...squares.flatMap((square) => [square.y, square.y + MAP_SQUARE_METERS]),
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
    viewBox: `${left} ${top} ${width} ${height}`,
    squares,
    chests,
    marks,
  };
};
