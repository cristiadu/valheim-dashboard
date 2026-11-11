/** How many lines one page of the Saga shows. */
export const SAGA_PAGE_SIZE = 25;

/** One page of a long list. */
export type Page<T> = {
  /** What this page shows. */
  items: T[];
  /** Page number, counted from 0 and kept inside the list. */
  index: number;
  /** How many pages the list has, at least 1. */
  count: number;
  /** Place of the first item on the page, counted from 1, or 0 for an empty list. */
  first: number;
  /** Place of the last item on the page, counted from 1, or 0 for an empty list. */
  last: number;
};
