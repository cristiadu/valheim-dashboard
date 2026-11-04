import { readFile } from 'node:fs/promises';

import { ITEM_STACK_LINE_PATTERN } from '#/lib/server/models';

/** Reads the plugin's item stacks file [text], one `Wood 50` line per item, into the most of each item one slot holds. */
export const itemStacksOf = (text: string): Record<string, number> => {
  const stacks: Record<string, number> = {};
  for (const line of text.split(/\r?\n/)) {
    const groups = ITEM_STACK_LINE_PATTERN.exec(line)?.groups;
    if (groups !== undefined) {
      stacks[groups.item!] = Number(groups.stack);
    }
  }
  return stacks;
};

/** Reads the item stacks file at [path]. */
export const readItemStacks = async (path: string): Promise<Record<string, number>> => itemStacksOf(await readFile(path, 'utf8'));
