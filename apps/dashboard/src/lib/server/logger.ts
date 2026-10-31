/** Writes server messages to the terminal the dashboard runs in. */
export const logger = {
  /** Logs something that went wrong. */
  error: (message: string): void => {
    process.stderr.write(`${message}\n`);
  },
  /** Logs something expected that is missing. */
  warn: (message: string): void => {
    process.stderr.write(`${message}\n`);
  },
};
