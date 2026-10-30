import { open, stat } from 'node:fs/promises';

import type { TailListener } from '#/lib/server/models';

/**
 * Follows a growing text file, like `tail -f`.
 *
 * Each [poll] reads only the bytes added since the last one. When the file gets shorter, it was
 * replaced: the server writes a new `logs.txt` on every start. Then the tail starts again from the top.
 */
export class LogTail {
  /** Bytes already read. */
  private offset = 0;
  /** End of the last read when it stopped mid-line. */
  private partialLine = '';

  /**
   * Creates a tail for the file at [path].
   * @param path File to follow.
   * @param listener Gets the new lines and file changes.
   */
  constructor(
    private readonly path: string,
    private readonly listener: TailListener,
  ) {}

  /** Reads what was added since the last poll. Does nothing while the file is missing. */
  async poll(): Promise<void> {
    let size: number;
    try {
      size = (await stat(this.path)).size;
    } catch {
      return;
    }
    if (size === this.offset) {
      return;
    }
    if (size < this.offset) {
      this.offset = 0;
      this.partialLine = '';
      this.listener.onNewFile();
    }
    const file = await open(this.path, 'r');
    try {
      const buffer = Buffer.alloc(size - this.offset);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, this.offset);
      this.offset += bytesRead;
      const lines = (this.partialLine + buffer.subarray(0, bytesRead).toString('utf8')).split(/\r?\n/);
      this.partialLine = lines.pop() ?? '';
      lines.forEach((line) => this.listener.onLine(line));
    } finally {
      await file.close();
    }
  }
}
