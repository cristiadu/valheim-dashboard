import type { Page } from '#/lib/models/pages';

/**
 * Page [index] of [items], [size] at a time. An index past the end shows the last page, so a list that shrank
 * under a live update still shows something.
 */
export const pageOf = <T>(items: T[], index: number, size: number): Page<T> => {
  const count = Math.max(1, Math.ceil(items.length / size));
  const keptIndex = Math.min(Math.max(0, index), count - 1);
  const start = keptIndex * size;
  const pageItems = items.slice(start, start + size);
  return {
    items: pageItems,
    index: keptIndex,
    count,
    first: pageItems.length === 0 ? 0 : start + 1,
    last: start + pageItems.length,
  };
};
