import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { readConfig } from '#/lib/server/config';

describe('readConfig', () => {
  beforeAll(() => {
    // GIVEN a machine in Arizona, which is UTC−7 all year
    vi.stubEnv('TZ', 'America/Phoenix');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('uses the default log path and this machine offset when nothing is set', () => {
    // GIVEN no settings
    const nowMs = Date.parse('2026-10-29T12:00:00Z');

    // WHEN the config is read
    const config = readConfig({}, nowMs);

    // THEN the defaults are used
    expect(config).toEqual({ logFile: 'C:\\Valheim Server\\logs.txt', serverUtcOffsetMinutes: -420 });
  });

  it('reads the log path and offset from the settings', () => {
    // GIVEN both settings
    const env = { LOG_FILE: 'D:\\Valheim\\logs.txt', SERVER_UTC_OFFSET_MINUTES: '-420' };

    // WHEN the config is read
    const config = readConfig(env);

    // THEN both are used
    expect(config).toEqual({ logFile: 'D:\\Valheim\\logs.txt', serverUtcOffsetMinutes: -420 });
  });

  it('refuses an offset that is not whole minutes', () => {
    // GIVEN an offset in hours
    const env = { SERVER_UTC_OFFSET_MINUTES: '-7.5' };

    // WHEN / THEN reading it fails with a clear message
    expect(() => readConfig(env)).toThrow('SERVER_UTC_OFFSET_MINUTES must be whole minutes');
  });
});
