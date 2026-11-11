/** Adds [item] to the end of [list] and drops the oldest items past [max]. */
export const pushCapped = <T>(list: T[], item: T, max: number): void => {
  list.push(item);
  list.splice(0, Math.max(0, list.length - max));
};
