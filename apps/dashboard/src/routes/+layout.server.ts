import { currentSnapshot } from '#/src/lib/server/live.ts';

/** Gives every page the snapshot, so the first view has data before the live stream connects. */
export const load = async () => ({ snapshot: await currentSnapshot() });
