import type { Pill, WarningKind } from '#/lib/models';

/** Whether the server is up: `Online` in green or `Offline` in red. */
export const serverPill = (isOnline: boolean): Pill => (isOnline ? { text: 'Online', tone: 'good' } : { text: 'Offline', tone: 'bad' });

/** Whether a player is in the game now: `Online` in green or `Offline` in grey, since being away is normal. */
export const playerPill = (isOnline: boolean): Pill => (isOnline ? { text: 'Online', tone: 'good' } : { text: 'Offline', tone: 'quiet' });

/** The server's Steam link: `Connected`, `Disconnected`, or `Not seen yet` before the log says. */
export const steamPill = (isConnected: boolean | null): Pill => {
  if (isConnected === null) {
    return { text: 'Not seen yet', tone: 'quiet' };
  }
  return isConnected ? { text: 'Connected', tone: 'good' } : { text: 'Disconnected', tone: 'bad' };
};

/** A boss's state: `Defeated` in gold or `Not yet` in grey. */
export const bossPill = (isDefeated: boolean): Pill => (isDefeated ? { text: 'Defeated', tone: 'gold' } : { text: 'Not yet', tone: 'quiet' });

/** What kind of problem a warning is: a crash in red, or a Steam or disk problem in gold. */
export const warningPill = (kind: WarningKind): Pill => {
  switch (kind) {
    case 'crash':
      return { text: 'Crash', tone: 'bad' };
    case 'steam':
      return { text: 'Steam', tone: 'gold' };
    case 'disk':
      return { text: 'Disk', tone: 'gold' };
  }
};

/** A crafting plan's state: `Ready to craft` once nothing is missing, else how many items are still missing. */
export const planPill = (missingItems: number): Pill => {
  if (missingItems === 0) {
    return { text: 'Ready to craft', tone: 'good' };
  }
  return { text: missingItems === 1 ? '1 item missing' : `${missingItems} items missing`, tone: 'quiet' };
};
