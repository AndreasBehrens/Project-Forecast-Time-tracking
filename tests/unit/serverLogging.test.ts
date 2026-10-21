import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installConsoleFileLogging } from '../../server/logging.js';

describe('installConsoleFileLogging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tees console output to a timestamped file and can restore console methods', () => {
    const tempDirectory = mkdtempSync(path.join(os.tmpdir(), 'server-logging-'));
    const logFile = path.join(tempDirectory, 'nested', 'application.log');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logMethodBeforeInstall = console.log;
    const restoreLogging = installConsoleFileLogging(logFile);

    try {
      console.log('Server %s', 'ready');
      console.error('Startup failed', new Error('test error'));

      const contents = readFileSync(logFile, 'utf8');
      expect(contents).toMatch(/\d{4}-\d{2}-\d{2}T.* \[LOG\] Server ready/);
      expect(contents).toContain('[ERROR] Startup failed Error: test error');
      expect(logSpy).toHaveBeenCalledWith('Server %s', 'ready');
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      restoreLogging();
      expect(console.log).toBe(logMethodBeforeInstall);
      const contentsBeforeUnloggedCall = readFileSync(logFile, 'utf8');
      console.log('not written after restore');
      expect(readFileSync(logFile, 'utf8')).toBe(contentsBeforeUnloggedCall);
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('creates a missing log file and its parent directories', () => {
    const tempDirectory = mkdtempSync(path.join(os.tmpdir(), 'server-logging-'));
    const logFile = path.join(tempDirectory, 'application.log');
    const restoreLogging = installConsoleFileLogging(logFile);

    try {
      console.info('Log destination ready');
      expect(readFileSync(logFile, 'utf8')).toContain('[INFO] Log destination ready');
    } finally {
      restoreLogging();
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});
