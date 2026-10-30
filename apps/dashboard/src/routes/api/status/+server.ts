import { json } from '@sveltejs/kit';

import { currentSnapshot } from '#/src/lib/server/live.ts';

/** Returns what the server knows now, as JSON. */
export const GET = async (): Promise<Response> => json(await currentSnapshot());
