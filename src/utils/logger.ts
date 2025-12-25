export enum LogLevel {
  TRACE = 0,  // Most verbose - includes test logs with hex dumps
  DEBUG = 1,  // Debug info without expensive operations
  INFO = 2,   // General info
  WARN = 3,   // Warnings
  ERROR = 4,  // Errors only
}

// Detect if running as standalone executable (pkg)
const isStandalone = typeof (process as any).pkg !== 'undefined';

class Logger {
  private level: LogLevel;
  private pinoLogger: any = null;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
    
    // Only use pino if NOT running as standalone executable
    if (!isStandalone) {
      try {
        const pino = require('pino');
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        const LOG_LEVEL_MAP: Record<LogLevel, string> = {
          [LogLevel.TRACE]: 'trace',
          [LogLevel.DEBUG]: 'debug',
          [LogLevel.INFO]: 'info',
          [LogLevel.WARN]: 'warn',
          [LogLevel.ERROR]: 'error',
        };
        
        this.pinoLogger = pino({
          level: LOG_LEVEL_MAP[level],
          transport: isDevelopment ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            }
          } : undefined,
          formatters: {
            level: (label: string) => {
              return { level: label.toUpperCase() };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        });
      } catch (e) {
        // Fallback to console if pino fails to load
        this.pinoLogger = null;
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    if (this.pinoLogger) {
      const LOG_LEVEL_MAP: Record<LogLevel, string> = {
        [LogLevel.TRACE]: 'trace',
        [LogLevel.DEBUG]: 'debug',
        [LogLevel.INFO]: 'info',
        [LogLevel.WARN]: 'warn',
        [LogLevel.ERROR]: 'error',
      };
      this.pinoLogger.level = LOG_LEVEL_MAP[level];
    }
  }

  /**
   * TRACE level - for test/debug logs with expensive operations (hex dumps, hashing)
   * Use lazy evaluation: logger.trace(() => `expensive ${operation()}`)
   */
  trace(message: string | (() => string), ...args: any[]): void {
    if (this.level <= LogLevel.TRACE) {
      const msg = typeof message === 'function' ? message() : message;
      if (this.pinoLogger) {
        if (args.length > 0) {
          this.pinoLogger.trace({ data: args }, msg);
        } else {
          this.pinoLogger.trace(msg);
        }
      } else {
        console.debug(`[TRACE] ${msg}`, ...args);
      }
    }
  }

  /**
   * DEBUG level - for debugging without expensive operations
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      if (this.pinoLogger) {
        if (args.length > 0) {
          this.pinoLogger.debug({ data: args }, message);
        } else {
          this.pinoLogger.debug(message);
        }
      } else {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    }
  }

  /**
   * INFO level - general information
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      if (this.pinoLogger) {
        if (args.length > 0) {
          this.pinoLogger.info({ data: args }, message);
        } else {
          this.pinoLogger.info(message);
        }
      } else {
        console.log(`[INFO] ${message}`, ...args);
      }
    }
  }

  /**
   * WARN level - warnings
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      if (this.pinoLogger) {
        if (args.length > 0) {
          this.pinoLogger.warn({ data: args }, message);
        } else {
          this.pinoLogger.warn(message);
        }
      } else {
        console.warn(`[WARN] ${message}`, ...args);
      }
    }
  }

  /**
   * ERROR level - errors
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      if (this.pinoLogger) {
        if (args.length > 0) {
          this.pinoLogger.error({ data: args }, message);
        } else {
          this.pinoLogger.error(message);
        }
      } else {
        console.error(`[ERROR] ${message}`, ...args);
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
    if (this.pinoLogger && typeof this.pinoLogger.flush === 'function') {
      this.pinoLogger.flush();
    }
  }
}

export const logger = new Logger(
  process.env.LOG_LEVEL ? Number(process.env.LOG_LEVEL) : LogLevel.INFO
);
