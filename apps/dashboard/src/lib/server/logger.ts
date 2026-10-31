/** Writes server messages to the terminal the dashboard runs in. */
export const logger = {
  /** Logs something that went wrong. */
  error: (message: string): void => console.error(message),
  /** Logs something expected that is missing. */
  warn: (message: string): void => console.warn(message),
};
