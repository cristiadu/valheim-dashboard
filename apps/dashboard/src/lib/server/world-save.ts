import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { logger } from '#/lib/server/logger';
import {
  GENERATED_ZONE_BYTES,
  INT_BYTES,
  LENGTH_BITS_PER_BYTE,
  MORE_LENGTH_FLAG,
  WORLD_SAVE_FILE_PATTERN,
  WORLD_SAVE_HEADER_BYTES,
  ZONE_DATA_LENGTH_OFFSET,
} from '#/lib/server/models';

/**
 * Reads the global keys, such as `defeated_eikthyr`, from a world save's `.db2` [data]. The keys sit in the
 * compressed zone data, after the generated zones and the location version.
 */
export const globalKeysOf = (data: Buffer): string[] => {
  const zoneDataLength = data.readInt32LE(ZONE_DATA_LENGTH_OFFSET);
  const zoneData = gunzipSync(data.subarray(WORLD_SAVE_HEADER_BYTES, WORLD_SAVE_HEADER_BYTES + zoneDataLength));
  const zoneCount = zoneData.readInt32LE(0);
  let offset = INT_BYTES + zoneCount * GENERATED_ZONE_BYTES + INT_BYTES;
  const keyCount = zoneData.readInt32LE(offset);
  offset += INT_BYTES;
  const keys: string[] = [];
  for (let index = 0; index < keyCount; index++) {
    let length = 0;
    let shift = 0;
    let lengthByte: number;
    do {
      lengthByte = zoneData.readUInt8(offset);
      offset += 1;
      length |= (lengthByte & ~MORE_LENGTH_FLAG) << shift;
      shift += LENGTH_BITS_PER_BYTE;
    } while (lengthByte & MORE_LENGTH_FLAG);
    keys.push(zoneData.toString('utf8', offset, offset + length));
    offset += length;
  }
  return keys;
};

/** Reads the global keys from the newest save in [worldFolder], for example `C:\Valheim Server\worlds_local\Cotil`. */
export const readSavedGlobalKeys = async (worldFolder: string): Promise<string[]> => {
  let newestSave: string | null = null;
  let newestSaveNumber = -1;
  for (const file of await readdir(worldFolder)) {
    const saveNumber = Number(WORLD_SAVE_FILE_PATTERN.exec(file)?.groups?.saveNumber ?? -1);
    if (saveNumber > newestSaveNumber) {
      newestSave = file;
      newestSaveNumber = saveNumber;
    }
  }
  if (newestSave === null) {
    logger.warn(`${worldFolder} has no world save yet`);
    return [];
  }
  return globalKeysOf(await readFile(join(worldFolder, newestSave)));
};
