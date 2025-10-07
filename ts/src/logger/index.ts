import pino, { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from 'pino';

export type Logger = PinoLogger;

export type LoggerOptions = {
  level?: string;
  pretty?: boolean;
  name?: string;
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
  const pretty = options.pretty ?? (process.env.LOG_PRETTY === '1' || process.env.NODE_ENV !== 'production');
  const name = options.name ?? 'cloudflared-ts';

  const pinoOptions: PinoLoggerOptions = {
    level,
    name,
    transport: pretty
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  };

  return pino(pinoOptions);
}

