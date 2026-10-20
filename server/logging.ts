import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';

const consoleMethods: ConsoleMethod[] = ['debug', 'error', 'info', 'log', 'warn'];

export function installConsoleFileLogging(
  logFilePath = process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'app.log')
): () => void {
  const absoluteLogFilePath = path.resolve(logFilePath);
  mkdirSync(path.dirname(absoluteLogFilePath), { recursive: true });

  const originalMethods = new Map<ConsoleMethod, Console[ConsoleMethod]>();

  for (const level of consoleMethods) {
    const original = console[level];
    originalMethods.set(level, original);
    console[level] = ((...args: unknown[]) => {
      (original as (...values: unknown[]) => void).apply(console, args);
      const timestamp = new Date().toISOString();
      const line = `${timestamp} [${level.toUpperCase()}] ${format(...args)}\n`;
      try {
        appendFileSync(absoluteLogFilePath, line, { encoding: 'utf8', mode: 0o600 });
      } catch (error) {
        (original as (...values: unknown[]) => void).call(console, 'Failed to write application log file:', error);
      }
    }) as typeof console[typeof level];
  }

  return () => {
    for (const [level, original] of originalMethods) {
      console[level] = original;
    }
  };
}