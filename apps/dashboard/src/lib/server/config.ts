import { DEFAULT_LOG_FILE, type Config } from '#/lib/server/models';

/**
 * Reads the dashboard settings from [env]. Without `SERVER_UTC_OFFSET_MINUTES`, the offset is this
 * machine's, which is right when the dashboard runs on the server PC.
 */
export const readConfig = (env: Record<string, string | undefined>, nowMs = Date.now()): Config => {
  const offset = env.SERVER_UTC_OFFSET_MINUTES?.trim() || null;
  const serverUtcOffsetMinutes = offset === null ? -new Date(nowMs).getTimezoneOffset() : Number(offset);
  if (!Number.isInteger(serverUtcOffsetMinutes)) {
    throw new Error(`SERVER_UTC_OFFSET_MINUTES must be whole minutes, for example -420. Got "${offset}".`);
  }
  return { logFile: env.LOG_FILE?.trim() || DEFAULT_LOG_FILE, serverUtcOffsetMinutes };
};
