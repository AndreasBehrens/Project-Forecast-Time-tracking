import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import bcrypt from 'bcrypt';
import { generateJwtToken } from '../../server/authService.js';
import { storage } from '../../server/storage.js';

// Persistenz mocken: Integrationstests laufen gegen den In-Memory-Seed-Zustand,
// ohne echte PostgreSQL-Verbindung.
vi.mock('../../server/prismaStore.js', () => ({
  saveAll: vi.fn().mockResolvedValue(undefined),
  loadAll: vi.fn().mockResolvedValue(null),
  prisma: { $disconnect: vi.fn() },
}));

import { createApp } from '../../server/app.js';

process.env.JWT_SECRET ||= 'integration-test-secret-with-at-least-32-bytes';

let app: Express;

function authenticated(method: 'get' | 'post' | 'put' | 'delete', path: string, actorId = 'u-1') {
  const user = storage.getUsers(true).find(candidate => candidate.id === actorId);
  if (!user) throw new Error(`Test user not found: ${actorId}`);
  const token = generateJwtToken(user, storage.getActiveOrgId()).token;
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

beforeAll(async () => {
  // serveStatic:false -> kein Vite-Dev-Server im Test
  app = await createApp({ serveStatic: false });
});

describe('Health & Basis-Endpunkte', () => {
  it('GET /api/health liefert Status und PostgreSQL-Backend', async () => {
    const traceSpy = vi.spyOn(console, 'info');
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('PostgreSQL (persistent)');
    expect(traceSpy).toHaveBeenCalledWith('[HTTP_TRACE] request received', expect.objectContaining({
      method: 'GET',
      path: '/api/health'
    }));
    expect(traceSpy).toHaveBeenCalledWith('[HTTP_TRACE] response sent', expect.objectContaining({
      method: 'GET',
      path: '/api/health',
      status: 200
    }));
    traceSpy.mockRestore();
  });

  it('POST /api/auth/login bleibt öffentlich, stellt ohne Passwort aber kein Token aus', async () => {
    const res = await request(app).post('/api/auth/login').send({ userId: 'u-1' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects wrong passwords and only issues a JWT for a matching password', async () => {
    const user = storage.getUsers(true).find(candidate => candidate.id === 'u-1');
    if (!user) throw new Error('Seed superadmin u-1 is required for this test');
    const originalHash = user.passwordHash;
    const correctPassword = 'test-only-correct-password';
    storage.updateUser('u-1', { passwordHash: bcrypt.hashSync(correctPassword, 4) }, 'u-1');

    try {
      const wrongPassword = await request(app).post('/api/auth/login').send({
        userId: 'u-1',
        password: 'test-only-wrong-password'
      });
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.success).toBe(false);
      expect(wrongPassword.body.token).toBeUndefined();

      const correct = await request(app).post('/api/auth/login').send({
        userId: 'u-1',
        password: correctPassword
      });
      expect(correct.status).toBe(200);
      expect(correct.body.success).toBe(true);
      expect(typeof correct.body.token).toBe('string');
    } finally {
      storage.updateUser('u-1', { passwordHash: originalHash }, 'u-1');
    }
  });

  it('always selects the first membership and ignores a client-supplied orgId', async () => {
    const user = storage.getUsers(true).find(candidate => candidate.id === 'u-1');
    if (!user?.memberships?.length) throw new Error('Seed superadmin memberships are required for this test');
    const originalHash = user.passwordHash;
    const originalMemberships = user.memberships;
    const originalActiveOrgId = storage.getActiveOrgId();
    const firstOrgId = originalMemberships[0].orgId;
    const otherOrgId = storage.getOrganizations().find(org => org.id !== firstOrgId)?.id;
    if (!otherOrgId) throw new Error('At least two organizations are required for this test');
    const correctPassword = 'test-only-membership-password';
    storage.updateUser('u-1', {
      passwordHash: bcrypt.hashSync(correctPassword, 4),
      memberships: originalMemberships
    }, 'u-1');

    try {
      const res = await request(app).post('/api/auth/login').send({
        userId: 'u-1',
        password: correctPassword,
        orgId: otherOrgId
      });
      expect(res.status).toBe(200);
      expect(res.body.activeOrgId).toBe(firstOrgId);
      expect(res.body.organization.id).toBe(firstOrgId);
    } finally {
      storage.updateUser('u-1', { passwordHash: originalHash, memberships: originalMemberships }, 'u-1');
      storage.setActiveOrgId(originalActiveOrgId);
    }
  });

  it('rejects login when the user has no organization memberships', async () => {
    const user = storage.getUsers(true).find(candidate => candidate.id === 'u-1');
    if (!user) throw new Error('Seed superadmin u-1 is required for this test');
    const originalHash = user.passwordHash;
    const originalMemberships = user.memberships;
    const originalActiveOrgId = storage.getActiveOrgId();
    const correctPassword = 'test-only-no-membership-password';
    storage.updateUser('u-1', {
      passwordHash: bcrypt.hashSync(correctPassword, 4),
      memberships: []
    }, 'u-1');

    try {
      const res = await request(app).post('/api/auth/login').send({ userId: 'u-1', password: correctPassword });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    } finally {
      storage.updateUser('u-1', { passwordHash: originalHash, memberships: originalMemberships }, 'u-1');
      storage.setActiveOrgId(originalActiveOrgId);
    }
  });

  it('API-v1 bleibt beim API-Key-Schutz statt JWT-Schutz', async () => {
    const res = await request(app).get('/api/v1/time-entries');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized: API Key missing');
  });

  it('GET /api/organizations liefert eine Liste', async () => {
    const res = await authenticated('get', '/api/organizations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/german-states liefert die Bundesländer', async () => {
    const res = await authenticated('get', '/api/german-states');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('interne API-Routen verlangen ein gültiges Bearer-Token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('x-user-id kann ein Bearer-Token nicht ersetzen', async () => {
    const res = await request(app).get('/api/users').set('x-user-id', 'u-1');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('createApp fails fast when JWT_SECRET is missing or weak', async () => {
    vi.stubEnv('JWT_SECRET', 'short');
    await expect(createApp({ serveStatic: false })).rejects.toThrow('JWT_SECRET must be configured');
    vi.unstubAllEnvs();
  });
});

describe('Zentrale Fehlerbehandlung', () => {
  it('unbekannte /api-Route liefert strukturierte 404', async () => {
    const res = await authenticated('get', '/api/gibt-es-nicht');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/time-entries mit ungültigem Body liefert 422 mit Feld-Details', async () => {
    const res = await authenticated('post', '/api/time-entries')
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
    const res = await authenticated('post', '/api/working-time').send({ date: 'kein-datum' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/forecasts mit negativen Stunden liefert 422', async () => {
    const res = await authenticated('post', '/api/forecasts')
      .send({ projectId: 'p-1', userId: 'u-1', month: '2025-06', plannedHours: -5 });
    expect(res.status).toBe(422);
  });
});

describe('Rückwärtskompatibles Fehlerformat', () => {
  it('liefert error als String (nicht als Objekt)', async () => {
    const res = await authenticated('get', '/api/gibt-es-nicht');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error.length).toBeGreaterThan(0);
  });
});

describe('CRUD-Grundfunktion (Kunden, In-Memory)', () => {
  it('GET /api/clients liefert eine Liste', async () => {
    const res = await authenticated('get', '/api/clients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/clients legt einen Kunden an', async () => {
    const res = await authenticated('post', '/api/clients')
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
    const e = await authenticated('post', '/api/users/invite')
      .send({ name: 'IT Mitarbeiter', email: 'it.mitarbeiter@example.com', role: 'EMPLOYEE', employmentType: 'INTERNAL', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
    const c = await authenticated('post', '/api/users/invite')
      .send({ name: 'IT Kollegin', email: 'it.kollegin@example.com', role: 'EMPLOYEE', employmentType: 'INTERNAL', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
    const p = await authenticated('post', '/api/projects')
      .send({ name: 'IT Projekt', projectType: 'INTERNAL_PROJECT', status: 'ACTIVE' });
    employeeId = e.body.user.id;
    colleagueId = c.body.user.id;
    projectId = p.body.id;
    expect(employeeId).toBeTruthy();
    expect(colleagueId).toBeTruthy();
    expect(projectId).toBeTruthy();
  });

  it('Mitarbeiter (EMPLOYEE) darf keine Projektzeit für Kollegen buchen (403)', async () => {
    const res = await authenticated('post', '/api/time-entries', employeeId)
      .send({ userId: colleagueId, projectId, date: '2026-08-03', durationMinutes: 60 });
    expect(res.status).toBe(403);
  });

  it('Mitarbeiter (EMPLOYEE) darf keine Arbeitszeit/Abwesenheit für Kollegen buchen (403)', async () => {
    const res = await authenticated('post', '/api/working-time', employeeId)
      .send({ userId: colleagueId, date: '2026-08-04', dayType: 'VACATION' });
    expect(res.status).toBe(403);
  });

  it('Mitarbeiter darf für sich selbst buchen (userId = eigene ID)', async () => {
    const res = await authenticated('post', '/api/time-entries', employeeId)
      .send({ userId: employeeId, projectId, date: '2026-08-03', startTime: '09:00', endTime: '10:00', durationMinutes: 60 });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(employeeId);
  });

  it('Zeitzone im Profil: gültig wird gespeichert, ungültig ergibt 400', async () => {
    const ok = await authenticated('put', `/api/users/${employeeId}`, employeeId).send({ timeZone: 'America/Sao_Paulo' });
    expect(ok.status).toBe(200);
    expect(ok.body.timeZone).toBe('America/Sao_Paulo');
    const bad = await authenticated('put', `/api/users/${employeeId}`, employeeId).send({ timeZone: 'Mars/Olympus' });
    expect(bad.status).toBe(400);
    const reset = await authenticated('put', `/api/users/${employeeId}`, employeeId).send({ timeZone: '' });
    expect(reset.body.timeZone).toBeUndefined();
  });

  it('Zukunftsgrenze wird in der Gerätezeitzone (X-Time-Zone) berechnet', async () => {
    const tz = 'Pacific/Kiritimati'; // UTC+14
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const [y, m] = today.split('-').map(Number);
    const limit = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
    const dayAfter = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
    const ok = await authenticated('post', '/api/time-entries', employeeId).set('x-time-zone', tz)
      .send({ projectId, date: limit, durationMinutes: 15 });
    expect(ok.status).toBe(201);
    const tooLate = await authenticated('post', '/api/time-entries', employeeId).set('x-time-zone', tz)
      .send({ projectId, date: dayAfter, durationMinutes: 15 });
    expect(tooLate.status).toBe(400);
  });

  it('Superadmin bucht für eine Kollegin -> Eintrag gehört der Kollegin', async () => {
    const res = await authenticated('post', '/api/time-entries', 'u-1')
      .send({ userId: colleagueId, projectId, date: '2026-08-03', startTime: '10:00', endTime: '12:00', durationMinutes: 120 });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(colleagueId);

    const wt = await authenticated('post', '/api/working-time', 'u-1')
      .send({ userId: colleagueId, date: '2026-08-04', dayType: 'VACATION' });
    expect(wt.status).toBe(200);
    expect(wt.body.userId).toBe(colleagueId);
  });

  it('lehnt reguläre Arbeitszeit jenseits des Folgemonats ab (400), erlaubt aber Urlaub', async () => {
    const reg = await authenticated('post', '/api/working-time', employeeId)
      .send({ date: '2099-01-05', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' });
    expect(reg.status).toBe(400);
    const proj = await authenticated('post', '/api/time-entries', employeeId)
      .send({ projectId, date: '2099-01-05', durationMinutes: 60 });
    expect(proj.status).toBe(400);
    const vac = await authenticated('post', '/api/working-time', employeeId)
      .send({ date: '2099-01-05', dayType: 'VACATION' });
    expect(vac.status).toBe(200);
  });

  it('GET /api/working-time/summary mit from/to liefert Gesamt-Ist und Saldo für den Zeitraum', async () => {
    const res = await authenticated('get', '/api/working-time/summary')
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
    const created = await authenticated('post', '/api/time-entries', employeeId)
      .send({ projectId, date: '2026-08-05', startTime: '09:00', endTime: '12:00', durationMinutes: 180 });
    const res = await authenticated('put', `/api/time-entries/${created.body.id}`, employeeId)
      .send({ startTime: '09:00', endTime: '13:00', breakMinutes: 30 });
    expect(res.status).toBe(200);
    expect(res.body.durationMinutes).toBe(210);
  });
});
