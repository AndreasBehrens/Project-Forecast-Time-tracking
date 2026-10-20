import 'dotenv/config';
import { installConsoleFileLogging } from './server/logging.js';
import path from 'node:path';

const stopFileLogging = installConsoleFileLogging();
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const LOG_FILE = path.resolve(process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'app.log'));

console.info('[STARTUP_TRACE] server process booted', {
  pid: process.pid,
  cwd: process.cwd(),
  port: PORT,
  logFile: LOG_FILE,
  nodeEnv: process.env.NODE_ENV || 'development'
});

/**
 * Produktiv-Bootstrap: erstellt die Express-App (inkl. statischer Auslieferung),
 * lädt den persistierten Zustand aus PostgreSQL, startet den HTTP-Server und
 * registriert einen Graceful-Shutdown, der ausstehende DB-Schreibvorgänge
 * abschließt.
 */
async function startServer() {
  const [{ createApp }, { storage }] = await Promise.all([
    import('./server/app.js'),
    import('./server/storage.js')
  ]);
  const app = await createApp({ serveStatic: true });

  // Persistierten Zustand aus PostgreSQL laden, bevor Anfragen angenommen werden.
  const loaded = await storage.initFromDatabase();
  console.log(loaded
    ? 'Loaded existing application state from PostgreSQL.'
    : 'PostgreSQL was empty; seeded initial application state.');

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Insight Arcs Zeiterfassung Server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown: ausstehende PostgreSQL-Schreibvorgänge vor dem Beenden leeren.
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        await storage.flush();
      } catch (err) {
        console.error('Error while flushing state on shutdown:', err);
      }
      stopFileLogging();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
