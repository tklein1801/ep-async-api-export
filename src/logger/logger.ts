import {LOG_COLORS, LOG_LEVEL_COLORS} from './config';

export type LogLevel = 'silent' | 'info' | 'warn' | 'error' | 'debug';

export const LogLevels = ['silent', 'info', 'warn', 'error', 'debug'] as const;

export function shouldPublishLog(currentLogLevel: LogLevel, logLevel: LogLevel): boolean {
  return LogLevels.indexOf(logLevel) <= LogLevels.indexOf(currentLogLevel);
}

export function isValidLogLevel(level: string): level is LogLevel {
  return LogLevels.includes(level.toLowerCase() as LogLevel);
}

export interface Logger {
  label?: string;
  disabled?: boolean;
  level?: LogLevel;
  log?: (level: LogLevel, message: string, ...args: any[]) => void;
}

export type LogHandlerParams = Parameters<NonNullable<Logger['log']>> extends [LogLevel, ...infer Rest] ? Rest : never;

const formatMessage = (level: LogLevel, message: string, label: string): string => {
  const timestamp = new Date().toISOString();
  return `${LOG_COLORS.dim}${timestamp}${LOG_COLORS.reset} ${
    LOG_LEVEL_COLORS[level]
  }${level.toUpperCase()}${LOG_COLORS.reset} ${LOG_COLORS.bright}[${label}]:${LOG_COLORS.reset} ${message}`;
};

export type LoggerClient = Record<LogLevel, (...params: LogHandlerParams) => void> & {
  getLogLevel: () => LogLevel;
  setLogLevel: (level: LogLevel) => LogLevel;
  child: (options?: Pick<Logger, 'label' | 'level' | 'disabled' | 'log'>) => LoggerClient;
};

export function createLogger(options?: Logger): LoggerClient {
  const enabled = options?.disabled !== true;
  let logLevel = options?.level && isValidLogLevel(options.level) ? options.level : 'error';
  const label = options?.label ?? 'default';

  const getLogLevel = () => logLevel;
  const setLogLevel = (level: LogLevel) => {
    if (isValidLogLevel(level)) {
      logLevel = level;
    } else formatMessage('error', `Invalid log level: ${level}`, label);

    return logLevel;
  };

  const log = (level: LogLevel, message: string, args: any[] = []): void => {
    if (!enabled || !shouldPublishLog(logLevel, level)) {
      return;
    }

    const formattedMessage = formatMessage(level, message, label);

    if (!options || typeof options.log !== 'function') {
      if (level === 'silent') return;
      if (level === 'error') {
        console.error(formattedMessage, ...args);
      } else if (level === 'warn') {
        console.warn(formattedMessage, ...args);
      } else {
        console.log(formattedMessage, ...args);
      }
      return;
    }

    options.log(level, message, ...args);
  };

  return {
    ...(Object.fromEntries(
      LogLevels.map(level => [level, (...[message, ...args]: LogHandlerParams) => log(level, message, args)]),
    ) as Record<LogLevel, (...params: LogHandlerParams) => void>),
    getLogLevel,
    setLogLevel,
    child: childOptions =>
      createLogger({
        ...options,
        ...childOptions,
        label: `${label}${childOptions?.label ? `:${childOptions.label}` : ''}`,
      }),
  };
}
