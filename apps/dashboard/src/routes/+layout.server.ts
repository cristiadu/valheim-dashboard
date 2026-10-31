import { PASSWORD_PATH } from '#/lib/models';
import { currentSnapshot } from '#/lib/server/live';
import { createServerState } from '#/lib/server/server-state';

/**
 * Gives every page the snapshot, so the first view has data before the live stream connects. The password
 * page gets an empty one, because whoever sees it has not typed the password yet.
 */
export const load = async ({ url }: { url: URL }) => ({
  snapshot: url.pathname === PASSWORD_PATH ? createServerState(0).snapshot : await currentSnapshot(),
});
