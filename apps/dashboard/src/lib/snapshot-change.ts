import type { JsonValue, SnapshotChange } from '#/lib/models/app';

/** Whether [value] is an object with keys, not a list or a plain value. */
const isObject = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Returns how the list [before] became [after]: items dropped from the front, the ones kept, and the ones added after them. */
const listChange = (before: JsonValue[], after: JsonValue[]): SnapshotChange => {
  const beforeTexts = before.map((item) => JSON.stringify(item));
  const afterTexts = after.map((item) => JSON.stringify(item));
  const firstKept = afterTexts.length === 0 ? -1 : beforeTexts.indexOf(afterTexts[0]);
  const dropped = firstKept === -1 ? before.length : firstKept;
  let kept = 0;
  while (kept < after.length && dropped + kept < before.length && beforeTexts[dropped + kept] === afterTexts[kept]) {
    kept += 1;
  }
  return { dropped, kept, added: after.slice(kept) };
};

/** Returns how the object [before] became [after]: the keys that changed or are new, and the keys that are gone. */
const objectChange = (before: { [key: string]: JsonValue }, after: { [key: string]: JsonValue }): SnapshotChange => {
  const fields: Record<string, SnapshotChange> = {};
  for (const [key, value] of Object.entries(after)) {
    const change = Object.hasOwn(before, key) ? changeBetween(before[key], value) : { value };
    if (change !== null) {
      fields[key] = change;
    }
  }
  return { fields, removed: Object.keys(before).filter((key) => !Object.hasOwn(after, key)) };
};

/** Returns how [before] became [after], so only what changed goes down the live stream. Null when nothing changed. */
export const changeBetween = (before: JsonValue, after: JsonValue): SnapshotChange | null => {
  if (JSON.stringify(before) === JSON.stringify(after)) {
    return null;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    return listChange(before, after);
  }
  if (isObject(before) && isObject(after)) {
    return objectChange(before, after);
  }
  return { value: after };
};

/** Returns [value] with [change] applied. Leaves [value] as it was, and reuses the parts that did not change. */
export const applyChange = (value: JsonValue, change: SnapshotChange): JsonValue => {
  if ('value' in change) {
    return change.value;
  }
  if ('added' in change) {
    const list = Array.isArray(value) ? value : [];
    return [...list.slice(change.dropped, change.dropped + change.kept), ...change.added];
  }
  const object = isObject(value) ? { ...value } : {};
  for (const [key, fieldChange] of Object.entries(change.fields)) {
    object[key] = applyChange(object[key] ?? null, fieldChange);
  }
  change.removed.forEach((key) => delete object[key]);
  return object;
};
