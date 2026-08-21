import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Persistenz mocken: Integrationstests laufen gegen den In-Memory-Seed-Zustand,
// ohne echte PostgreSQL-Verbindung.
vi.mock('../../server/prismaStore.js', () => ({
  saveAll: vi.fn().mockResolvedValue(undefined),
  loadAll: vi.fn().mockResolvedValue(null),
  prisma: { $disconnect: vi.fn() },
}));

import { createApp } from '../../server/app.js';

let app: Express;

beforeAll(async () => {
  // serveStatic:false -> kein Vite-Dev-Server im Test
  app = await createApp({ serveStatic: false });
});

describe('Health & Basis-Endpunkte', () => {
  it('GET /api/health liefert Status und PostgreSQL-Backend', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('PostgreSQL (persistent)');
  });

  it('GET /api/organizations liefert eine Liste', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/german-states liefert die Bundesländer', async () => {
    const res = await request(app).get('/api/german-states');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Zentrale Fehlerbehandlung', () => {
  it('unbekannte /api-Route liefert strukturierte 404', async () => {
    const res = await request(app).get('/api/gibt-es-nicht');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/time-entries mit ungültigem Body liefert 422 mit Feld-Details', async () => {
    const res = await request(app)
      .post('/api/time-entries')
      .send({ projectId: '', date: 'FALSCH', durationMinutes: 0 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    // error bleibt String (Frontend-Kompatibilität)
    expect(typeof res.body.error).toBe('string');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details[0]).toHaveProperty('field');
    expect(res.body.details[0]).toHaveProperty('message');
  });

  it('POST /api/working-time ohne Pflichtfelder liefert 422', async () => {
    const res = await request(app).post('/api/working-time').send({ date: '2025-06-02' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/forecasts mit negativen Stunden liefert 422', async () => {
    const res = await request(app)
      .post('/api/forecasts')
      .send({ projectId: 'p-1', userId: 'u-1', month: '2025-06', plannedHours: -5 });
    expect(res.status).toBe(422);
  });
});

describe('Rückwärtskompatibles Fehlerformat', () => {
  it('liefert error als String (nicht als Objekt)', async () => {
    const res = await request(app).get('/api/gibt-es-nicht');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});

describe('CRUD-Grundfunktion (Kunden, In-Memory)', () => {
  it('GET /api/clients liefert eine Liste', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/clients legt einen Kunden an', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'Integrationstest Kunde GmbH' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Integrationstest Kunde GmbH');
    expect(res.body.id).toBeTruthy();
  });
});
