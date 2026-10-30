/** Writes server messages to the terminal the dashboard runs in. */
export const logger = {
  /** Logs something that went wrong. */
  error: (message: string): void => console.error(message),
};
