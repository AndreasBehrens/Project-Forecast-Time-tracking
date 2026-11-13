import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import bcrypt from 'bcrypt';
import { generateJwtToken } from '../../server/authService.js';
import { createPasswordResetToken } from '../../server/passwordResetTokens.js';
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


const daysAgo = (n: number) => {
  const d = new Date(Date.now() - n * 86400000);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
};

const row = (user: string, email: string, date: string, start: string, end: string, dec: string, project = 'Importtest Projekt') => ({
  Project: project, Client: 'Importtest Kunde', Description: 'Import', Task: '', User: user, Group: 'Insight Arcs',
  Email: email, Billable: 'Yes', 'Start Date': date, 'Start Time': start, 'End Time': end, 'Duration (decimal)': dec,
});

describe('Datenimport Phase 1: Probelauf, Ausführung, Batch, Rückgängig', () => {
  const d1 = daysAgo(3);
  const rows = [
    row('Dr. Andreas Behrens', 'andreas.behrens@insightarcs.de', d1, '07:01', '08:31', '1,5'),
    row('Dr. Andreas Behrens', 'andreas.behrens@insightarcs.de', d1, '07:01', '08:31', '1,5'),
    row('Neue Person', '', d1, '07:02', '08:02', '1'),
    row('Dr. Andreas Behrens', 'andreas.behrens@insightarcs.de', '31.02.2026', '07:03', '08:03', '1'),
  ];

  it('Probelauf liefert Status je Zeile und schreibt nichts (Admin ohne Superadmin-Recht)', async () => {
    const before = storage.getImportBatches().length;
    const res = await authenticated('post', '/api/import/dry-run', 'u-2').send({ rows });
    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(4);
    expect(res.body.rows.map((r: any) => r.status)).toEqual(['NEW', 'DUPLICATE', 'ERROR', 'ERROR']);
    expect(res.body.counts).toMatchObject({ NEW: 1, DUPLICATE: 1, ERROR: 2 });
    expect(res.body.rows[3].messages.join(' ')).toMatch(/31\.02\.2026/);
    expect(res.body.rows[2].messages.join(' ')).toMatch(/Superadmin/);
    expect(res.body.wouldCreate.projects).toContain('Importtest Projekt');
    expect(res.body.wouldCreate.users).toEqual([]);
    expect(storage.getImportBatches().length).toBe(before);
  });

  it('Superadmin darf neue Mitarbeitende anlegen (Status INVITED, ohne Platzhalter-E-Mail); Einträge „zur Freigabe"', async () => {
    const dry = await authenticated('post', '/api/import/dry-run').send({ rows });
    expect(dry.body.wouldCreate.users).toContain('Neue Person');

    const res = await authenticated('post', '/api/clockify/import').send({ rows, fileName: 'test.csv' });
    expect(res.status).toBe(200);
    expect(res.body.importedEntries).toBe(2);
    expect(res.body.skippedDuplicates).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.batchId).toMatch(/^imp-/);

    const created = storage.getUsers(true).find(u => u.name === 'Neue Person');
    expect(created?.status).toBe('INVITED');
    expect(created?.email).toBe('');

    const batches = await authenticated('get', '/api/import/batches');
    const batch = batches.body.find((b: any) => b.id === res.body.batchId);
    expect(batch).toMatchObject({ importedCount: 2, timeEntryCount: 2, canUndo: true, fileName: 'test.csv' });

    // Zweiter Import derselben Datei: alles Duplikate
    const again = await authenticated('post', '/api/import/dry-run').send({ rows: rows.slice(0, 3) });
    expect(again.body.counts.DUPLICATE).toBe(3);
  });

  it('importierte Projektzeiten haben den Status „zur Freigabe" und lassen sich rückgängig machen', async () => {
    const batch = storage.getImportBatches()[0];
    const res = await authenticated('delete', `/api/import/batches/${batch.id}`);
    expect(res.status).toBe(200);
    expect(res.body.deletedTimeEntries).toBe(2);
    const again = await authenticated('delete', `/api/import/batches/${batch.id}`);
    expect(again.status).toBe(409);
    expect(again.body.reason).toBe('ALREADY_REVERTED');
  });

  it('nach 5 Tagen ist kein Rückgängigmachen mehr möglich', async () => {
    const res = await authenticated('post', '/api/clockify/import').send({ rows: [row('Dr. Andreas Behrens', 'andreas.behrens@insightarcs.de', daysAgo(4), '06:10', '06:40', '0,5')] });
    expect(res.body.importedEntries).toBe(1);
    const entry = storage.getTimeEntries({ limit: 100000 } as any, 'u-1').data.find((e: any) => e.importBatchId === res.body.batchId);
    expect(entry?.approvalStatus).toBe('SUBMITTED');
    const r = storage.undoImportBatch(res.body.batchId, 'u-1', new Date(Date.now() + 6 * 86400000));
    expect(r).toEqual({ ok: false, reason: 'EXPIRED', lockedDates: undefined });
  });

  it('Schema-Endpunkte: Vorlage, Prüfung, Ableitung; Mitarbeitende ohne Admin-Recht erhalten 403', async () => {
    const tpl = await authenticated('get', '/api/import/schemas/template');
    expect(tpl.status).toBe(200);
    expect(tpl.body.source).toBe('clockify-csv');
    const ok = await authenticated('post', '/api/import/schemas/validate').send(tpl.body);
    expect(ok.body.valid).toBe(true);
    const bad = await authenticated('post', '/api/import/schemas/validate').send({ schemaVersion: 1 });
    expect(bad.body.valid).toBe(false);
    const derived = await authenticated('post', '/api/import/schemas/derive').send({ csv: 'Mitarbeiter;Datum;Projekt;Stunden\nMax;02.11.2026;Intern;8\n' });
    expect(derived.status).toBe(200);
    expect(derived.body.schema.columns.userRef).toBe('Mitarbeiter');
    const forbidden = await authenticated('post', '/api/import/dry-run', 'u-4').send({ rows });
    expect(forbidden.status).toBe(403);
  });
});
