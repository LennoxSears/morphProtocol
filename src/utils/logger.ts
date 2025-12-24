export enum LogLevel {
  TRACE = 0,  // Most verbose - includes test logs with hex dumps
  DEBUG = 1,  // Debug info without expensive operations
  INFO = 2,   // General info
  WARN = 3,   // Warnings
  ERROR = 4,  // Errors only
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * TRACE level - for test/debug logs with expensive operations (hex dumps, hashing)
   * Use lazy evaluation: logger.trace(() => `expensive ${operation()}`)
   */
  trace(message: string | (() => string), ...args: any[]): void {
    if (this.level <= LogLevel.TRACE) {
      const msg = typeof message === 'function' ? message() : message;
      console.debug(`[TRACE] ${msg}`, ...args);
    }
  }

  /**
   * DEBUG level - for debugging without expensive operations
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * INFO level - general information
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * WARN level - warnings
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * ERROR level - errors
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  /**
   * Check if TRACE level is enabled (for conditional expensive operations)
   */
  isTraceEnabled(): boolean {
    return this.level <= LogLevel.TRACE;
  }

  /**
   * Check if DEBUG level is enabled
   */
  isDebugEnabled(): boolean {
    return this.level <= LogLevel.DEBUG;
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : LogLevel.INFO
);
