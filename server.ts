import { createApp } from './server/app.js';
import { storage } from './server/storage.js';

const PORT = 3000;

/**
 * Produktiv-Bootstrap: erstellt die Express-App (inkl. statischer Auslieferung),
 * lädt den persistierten Zustand aus PostgreSQL, startet den HTTP-Server und
 * registriert einen Graceful-Shutdown, der ausstehende DB-Schreibvorgänge
 * abschließt.
 */
async function startServer() {
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
