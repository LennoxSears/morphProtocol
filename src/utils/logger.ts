import pino from 'pino';

export enum LogLevel {
  TRACE = 0,  // Most verbose - includes test logs with hex dumps
  DEBUG = 1,  // Debug info without expensive operations
  INFO = 2,   // General info
  WARN = 3,   // Warnings
  ERROR = 4,  // Errors only
}

// Map our LogLevel to pino levels
const LOG_LEVEL_MAP: Record<LogLevel, pino.Level> = {
  [LogLevel.TRACE]: 'trace',
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

class Logger {
  private level: LogLevel;
  private pinoLogger: pino.Logger;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    
    // Configure pino for production or development
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    this.pinoLogger = pino({
      level: LOG_LEVEL_MAP[level],
      // Use pino-pretty in development for readable output
      transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        }
      } : undefined,
      // Production: fast JSON output
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    this.pinoLogger.level = LOG_LEVEL_MAP[level];
  }

  /**
   * TRACE level - for test/debug logs with expensive operations (hex dumps, hashing)
   * Use lazy evaluation: logger.trace(() => `expensive ${operation()}`)
   */
  trace(message: string | (() => string), ...args: any[]): void {
    if (this.level <= LogLevel.TRACE) {
      const msg = typeof message === 'function' ? message() : message;
      if (args.length > 0) {
        this.pinoLogger.trace({ data: args }, msg);
      } else {
        this.pinoLogger.trace(msg);
      }
    }
  }

  /**
   * DEBUG level - for debugging without expensive operations
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      if (args.length > 0) {
        this.pinoLogger.debug({ data: args }, message);
      } else {
        this.pinoLogger.debug(message);
      }
    }
  }

  /**
   * INFO level - general information
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      if (args.length > 0) {
        this.pinoLogger.info({ data: args }, message);
      } else {
        this.pinoLogger.info(message);
      }
    }
  }

  /**
   * WARN level - warnings
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      if (args.length > 0) {
        this.pinoLogger.warn({ data: args }, message);
      } else {
        this.pinoLogger.warn(message);
      }
    }
  }

  /**
   * ERROR level - errors
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      if (args.length > 0) {
        this.pinoLogger.error({ data: args }, message);
      } else {
        this.pinoLogger.error(message);
      }
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

  /**
   * Flush any buffered logs (useful before process exit)
   */
  flush(): void {
    // Pino automatically flushes, but we provide this for compatibility
    this.pinoLogger.flush();
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : LogLevel.INFO
);
