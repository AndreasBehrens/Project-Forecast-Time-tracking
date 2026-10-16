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

  it('POST /api/working-time mit ungültigem Datum liefert 422', async () => {
    // date ist Pflichtfeld; Uhrzeiten sind seit der Tagesart-Erweiterung optional
    const res = await request(app).post('/api/working-time').send({ date: 'kein-datum' });
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

describe('Einheitliche Zeiterfassung: Buchen für Kollegen, Zukunftsgrenze, Zeitraum-Saldo', () => {
  let employeeId: string;
  let colleagueId: string;
  let projectId: string;

  beforeAll(async () => {
    // Seed enthält nur den Superadmin u-1 -> Testdaten über die API anlegen
    const e = await request(app).post('/api/users/invite').set('x-user-id', 'u-1')
      .send({ name: 'IT Mitarbeiter', email: 'it.mitarbeiter@example.com', role: 'EMPLOYEE', employmentType: 'INTERNAL', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
    const c = await request(app).post('/api/users/invite').set('x-user-id', 'u-1')
      .send({ name: 'IT Kollegin', email: 'it.kollegin@example.com', role: 'EMPLOYEE', employmentType: 'INTERNAL', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
    const p = await request(app).post('/api/projects').set('x-user-id', 'u-1')
      .send({ name: 'IT Projekt', projectType: 'INTERNAL_PROJECT', status: 'ACTIVE' });
    employeeId = e.body.user.id;
    colleagueId = c.body.user.id;
    projectId = p.body.id;
    expect(employeeId).toBeTruthy();
    expect(colleagueId).toBeTruthy();
    expect(projectId).toBeTruthy();
  });

  it('Mitarbeiter (EMPLOYEE) darf keine Projektzeit für Kollegen buchen (403)', async () => {
    const res = await request(app).post('/api/time-entries').set('x-user-id', employeeId)
      .send({ userId: colleagueId, projectId, date: '2026-08-03', durationMinutes: 60 });
    expect(res.status).toBe(403);
  });

  it('Mitarbeiter (EMPLOYEE) darf keine Arbeitszeit/Abwesenheit für Kollegen buchen (403)', async () => {
    const res = await request(app).post('/api/working-time').set('x-user-id', employeeId)
      .send({ userId: colleagueId, date: '2026-08-04', dayType: 'VACATION' });
    expect(res.status).toBe(403);
  });

  it('Mitarbeiter darf für sich selbst buchen (userId = eigene ID)', async () => {
    const res = await request(app).post('/api/time-entries').set('x-user-id', employeeId)
      .send({ userId: employeeId, projectId, date: '2026-08-03', startTime: '09:00', endTime: '10:00', durationMinutes: 60 });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(employeeId);
  });

  it('Zeitzone im Profil: gültig wird gespeichert, ungültig ergibt 400', async () => {
    const ok = await request(app).put(`/api/users/${employeeId}`).set('x-user-id', employeeId).send({ timeZone: 'America/Sao_Paulo' });
    expect(ok.status).toBe(200);
    expect(ok.body.timeZone).toBe('America/Sao_Paulo');
    const bad = await request(app).put(`/api/users/${employeeId}`).set('x-user-id', employeeId).send({ timeZone: 'Mars/Olympus' });
    expect(bad.status).toBe(400);
    const reset = await request(app).put(`/api/users/${employeeId}`).set('x-user-id', employeeId).send({ timeZone: '' });
    expect(reset.body.timeZone).toBeUndefined();
  });

  it('Zukunftsgrenze wird in der Gerätezeitzone (X-Time-Zone) berechnet', async () => {
    const tz = 'Pacific/Kiritimati'; // UTC+14
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [y, m] = today.split('-').map(Number);
    const limit = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
    const dayAfter = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
    const ok = await request(app).post('/api/time-entries').set('x-user-id', employeeId).set('x-time-zone', tz)
      .send({ projectId, date: limit, durationMinutes: 15 });
    expect(ok.status).toBe(201);
    const tooLate = await request(app).post('/api/time-entries').set('x-user-id', employeeId).set('x-time-zone', tz)
      .send({ projectId, date: dayAfter, durationMinutes: 15 });
    expect(tooLate.status).toBe(400);
  });

  it('Superadmin bucht für eine Kollegin -> Eintrag gehört der Kollegin', async () => {
    const res = await request(app).post('/api/time-entries').set('x-user-id', 'u-1')
      .send({ userId: colleagueId, projectId, date: '2026-08-03', startTime: '10:00', endTime: '12:00', durationMinutes: 120 });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(colleagueId);

    const wt = await request(app).post('/api/working-time').set('x-user-id', 'u-1')
      .send({ userId: colleagueId, date: '2026-08-04', dayType: 'VACATION' });
    expect(wt.status).toBe(200);
    expect(wt.body.userId).toBe(colleagueId);
  });

  it('lehnt reguläre Arbeitszeit jenseits des Folgemonats ab (400), erlaubt aber Urlaub', async () => {
    const reg = await request(app).post('/api/working-time').set('x-user-id', employeeId)
      .send({ date: '2099-01-05', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' });
    expect(reg.status).toBe(400);
    const proj = await request(app).post('/api/time-entries').set('x-user-id', employeeId)
      .send({ projectId, date: '2099-01-05', durationMinutes: 60 });
    expect(proj.status).toBe(400);
    const vac = await request(app).post('/api/working-time').set('x-user-id', employeeId)
      .send({ date: '2099-01-05', dayType: 'VACATION' });
    expect(vac.status).toBe(200);
  });

  it('GET /api/working-time/summary mit from/to liefert Gesamt-Ist und Saldo für den Zeitraum', async () => {
    const res = await request(app).get('/api/working-time/summary')
      .query({ userId: colleagueId, from: '2026-08-03', to: '2026-08-07' });
    expect(res.status).toBe(200);
    expect(res.body.from).toBe('2026-08-03');
    expect(res.body.to).toBe('2026-08-07');
    expect(res.body.targetHoursTotal).toBe(40);
    // 2h Projektzeit + 8h angerechneter Urlaub
    expect(res.body.totalActualHours).toBe(10);
    expect(res.body.totalBalanceHours).toBe(-30);
  });

  it('PUT /api/time-entries/:id berücksichtigt die Pause bei der Dauer', async () => {
    const created = await request(app).post('/api/time-entries').set('x-user-id', employeeId)
      .send({ projectId, date: '2026-08-05', startTime: '09:00', endTime: '12:00', durationMinutes: 180 });
    const res = await request(app).put(`/api/time-entries/${created.body.id}`).set('x-user-id', employeeId)
      .send({ startTime: '09:00', endTime: '13:00', breakMinutes: 30 });
    expect(res.status).toBe(200);
    expect(res.body.durationMinutes).toBe(210);
  });
});
