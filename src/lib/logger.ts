/**
 * Minimal structured server logger. Emits one JSON line per event so log
 * drains can parse it. Never pass personal data (emails, names) as context.
 */

type Level = 'info' | 'warn' | 'error';

type LogContext = Readonly<Record<string, string | number | boolean | null | undefined>>;

function describeError(error: unknown): LogContext {
  if (error instanceof Error) return { errorName: error.name, errorMessage: error.message };
  return { errorMessage: String(error) };
}

function emit(level: Level, event: string, context: LogContext = {}): void {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...context });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, context?: LogContext): void => emit('info', event, context),
  warn: (event: string, context?: LogContext): void => emit('warn', event, context),
  error: (event: string, error: unknown, context?: LogContext): void => emit('error', event, { ...context, ...describeError(error) }),
};
