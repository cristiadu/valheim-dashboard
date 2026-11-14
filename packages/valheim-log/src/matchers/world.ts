import { optionalNumber, playerOf } from '#/fields';
import type { Matcher } from '#/models';
import {
  BACKUP_PATTERN,
  BOSS_DEFEATED_PATTERN,
  BOSS_HURT_PATTERN,
  BOSS_SUMMONED_PATTERN,
  DAY_STARTED_PATTERN,
  DISK_SPACE_PATTERN,
  GAME_SERVER_PATTERN,
  GLOBAL_KEY_PATTERN,
  LEGACY_WORLD_SAVED_PATTERN,
  PLAYFAB_ERROR_PATTERN,
  POSSIBLE_RAIDS_PATTERN,
  RAID_ENDED_PATTERN,
  RAID_PATTERN,
  VERSION_PATTERN,
  WORLD_LOADED_PATTERN,
  WORLD_SAVE_STEP_PATTERN,
} from '#/patterns';

/** Messages about the server and its world: saves, backups, versions, days, global keys, raids and bosses. */
export const WORLD_MATCHERS: readonly Matcher[] = [
  {
    pattern: WORLD_SAVE_STEP_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: Number(groups.step),
      durationMs: Number(groups.ms),
      saveNumber: optionalNumber(groups.saveNumber),
    }),
  },
  {
    pattern: LEGACY_WORLD_SAVED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldSaveStep',
      timeUtc,
      step: 5,
      durationMs: Math.round(Number(groups.ms)),
      saveNumber: null,
    }),
  },
  {
    pattern: BACKUP_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'backupCreated', timeUtc, backup: groups.backup! }),
  },
  {
    pattern: DISK_SPACE_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'diskSpace',
      timeUtc,
      availableBytes: Number(groups.available),
      blockedBelowBytes: Number(groups.blockedBelow),
      warnBelowBytes: Number(groups.warnBelow),
    }),
  },
  {
    pattern: VERSION_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'serverVersion',
      timeUtc,
      version: groups.version!,
      networkVersion: Number(groups.network),
    }),
  },
  {
    pattern: WORLD_LOADED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'worldLoaded',
      timeUtc,
      world: groups.world!,
      saveNumber: optionalNumber(groups.saveNumber),
    }),
  },
  {
    pattern: GAME_SERVER_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'gameServer', timeUtc, isConnected: groups.state === 'connected' }),
  },
  {
    pattern: PLAYFAB_ERROR_PATTERN,
    toEvent: (_, timeUtc) => ({ type: 'crossplayError', timeUtc }),
  },
  {
    pattern: GLOBAL_KEY_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'globalKey', timeUtc, key: groups.key!, isSet: groups.change === 'set' }),
  },
  {
    pattern: DAY_STARTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'dayStarted', timeUtc, day: Number(groups.day) }),
  },
  {
    pattern: POSSIBLE_RAIDS_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidCheck', timeUtc, possibleRaids: Number(groups.count) }),
  },
  {
    pattern: RAID_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidStarted', timeUtc, raid: groups.raid! }),
  },
  {
    pattern: RAID_ENDED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'raidEnded', timeUtc, raid: groups.raid! }),
  },
  {
    pattern: BOSS_SUMMONED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'bossSummoned',
      timeUtc,
      boss: groups.boss!,
      summoner: playerOf(groups.summoner),
    }),
  },
  {
    pattern: BOSS_HURT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'bossHurt', timeUtc, boss: groups.boss!, percent: Number(groups.percent) }),
  },
  {
    pattern: BOSS_DEFEATED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'bossDefeated',
      timeUtc,
      boss: groups.boss!,
      seconds: Number(groups.seconds),
      attackers: groups.attackers!.split(', '),
    }),
  },
];
