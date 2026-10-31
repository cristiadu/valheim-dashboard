import { describe, expect, it } from 'vitest';

import { bossPill, planPill, playerPill, serverPill, steamPill, warningPill } from '#/lib/pills';

describe('serverPill', () => {
  it('shows an up server in green and a down one in red', () => {
    // GIVEN a server that is up and one that is down
    // WHEN / THEN each gets its own word and color
    expect([serverPill(true), serverPill(false)]).toEqual([
      { text: 'Online', tone: 'good' },
      { text: 'Offline', tone: 'bad' },
    ]);
  });
});

describe('playerPill', () => {
  it('keeps an offline player grey, not red', () => {
    // GIVEN a player in the game and one away
    // WHEN / THEN being away is not shown as a problem
    expect([playerPill(true), playerPill(false)]).toEqual([
      { text: 'Online', tone: 'good' },
      { text: 'Offline', tone: 'quiet' },
    ]);
  });
});

describe('steamPill', () => {
  it('names each state of the Steam link, including before the log says', () => {
    // GIVEN each state of the Steam link
    // WHEN / THEN each reads as a word or two
    expect([steamPill(true), steamPill(false), steamPill(null)]).toEqual([
      { text: 'Connected', tone: 'good' },
      { text: 'Disconnected', tone: 'bad' },
      { text: 'Not seen yet', tone: 'quiet' },
    ]);
  });
});

describe('bossPill', () => {
  it('marks a defeated boss in gold', () => {
    // GIVEN a defeated boss and one still alive
    // WHEN / THEN only the defeated one is gold
    expect([bossPill(true), bossPill(false)]).toEqual([
      { text: 'Defeated', tone: 'gold' },
      { text: 'Not yet', tone: 'quiet' },
    ]);
  });
});

describe('warningPill', () => {
  it('shows crashes in red and Steam or disk problems in gold', () => {
    // GIVEN each kind of warning
    // WHEN / THEN each has a short name and color
    expect([warningPill('crash'), warningPill('steam'), warningPill('disk')]).toEqual([
      { text: 'Crash', tone: 'bad' },
      { text: 'Steam', tone: 'gold' },
      { text: 'Disk', tone: 'gold' },
    ]);
  });
});

describe('planPill', () => {
  it('says a plan is ready, or how many items are missing', () => {
    // GIVEN plans missing nothing, one item and three items
    // WHEN / THEN each says where it stands
    expect([planPill(0), planPill(1), planPill(3)]).toEqual([
      { text: 'Ready to craft', tone: 'good' },
      { text: '1 item missing', tone: 'quiet' },
      { text: '3 items missing', tone: 'quiet' },
    ]);
  });
});
