import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { generateJwtToken } from '../../server/authService.js';
import { storage } from '../../server/storage.js';
import { HR_ABSENCE_SCHEMA } from '../../server/import/schema.js';

// Persistenz mocken: Tests laufen gegen den In-Memory-Seed-Zustand.
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
  app = await createApp({ serveStatic: false });
});

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const deDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const weekdaysBetween = (fromIso: string, toIso: string) => {
  let n = 0;
  for (let t = Date.parse(fromIso); t <= Date.parse(toIso); t += 86400000) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
};

describe('Datenimport Phase 2: Berechtigungen', () => {
  it('Schema-Endpunkte verlangen Anmeldung und Admin-Rechte', async () => {
    expect((await request(app).get('/api/import/schemas')).status).toBe(401);
    expect((await authenticated('get', '/api/import/schemas', 'u-3')).status).toBe(403);
    const ok = await authenticated('get', '/api/import/schemas', 'u-2');
    expect(ok.status).toBe(200);
    expect(ok.body.builtin.map((s: any) => s.id)).toEqual(expect.arrayContaining(['builtin-clockify-csv', 'builtin-hr-absences', 'builtin-employees']));
  });
});

describe('Datenimport Phase 2: Mandanten-Schemas', () => {
  const schema = {
    ...HR_ABSENCE_SCHEMA,
    id: undefined,
    name: 'Personio Abwesenheiten',
    source: 'personio',
  };
  const headers = ['Mitarbeiter', 'Von', 'Bis', 'Art'];

  it('speichert, versioniert, listet, lädt herunter und löscht Schemas', async () => {
    const first = await authenticated('post', '/api/import/schemas').send({ schema, headers });
    expect(first.status).toBe(201);
    // Neue Schemas erhalten eine serverseitige ID (keine Kollision mit eingebauten/fremden IDs)
    expect(first.body).toMatchObject({ version: 1, name: 'Personio Abwesenheiten', source: 'personio' });
    expect(first.body.id).toMatch(/^isc-/);
    expect(first.body.headerFingerprint).toBeTruthy();
    const id = first.body.id as string;

    const second = await authenticated('post', '/api/import/schemas').send({ schema: { ...first.body.schema, description: 'v2' }, headers });
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(id);
    expect(second.body.version).toBe(2);
    expect(second.body.schema.description).toBe('v2');
    expect(second.body.previousVersions).toHaveLength(1);
    expect(second.body.previousVersions[0].version).toBe(1);

    const list = await authenticated('get', '/api/import/schemas');
    expect(list.body.tenant.map((s: any) => s.id)).toContain(id);

    // Erkennung per Fingerabdruck (Mandanten-Schema vor eingebautem)
    expect(storage.detectImportSchema(headers)).toMatchObject({ schemaId: id, method: 'fingerprint' });

    const dl = await authenticated('get', `/api/import/schemas/${id}/download`);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-disposition']).toMatch(/attachment; filename="import-schema-Personio-Abwesenheiten\.json"/);
    expect(dl.body).toMatchObject({ id, target: 'ABSENCE', version: 2 });

    const builtinDl = await authenticated('get', '/api/import/schemas/builtin-employees/download');
    expect(builtinDl.status).toBe(200);
    expect((await authenticated('get', '/api/import/schemas/gibt-es-nicht/download')).status).toBe(404);

    const del = await authenticated('delete', `/api/import/schemas/${id}`);
    expect(del.status).toBe(200);
    expect((await authenticated('delete', `/api/import/schemas/${id}`)).status).toBe(404);
    expect(storage.detectImportSchema(headers)).toMatchObject({ schemaId: 'builtin-hr-absences' });
  });

  it('weist ungültige Schemas mit 400 ab', async () => {
    const res = await authenticated('post', '/api/import/schemas').send({ schema: { name: 'kaputt' } });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('unbekannte Schema-ID im Probelauf ergibt 404', async () => {
    const res = await authenticated('post', '/api/import/dry-run').send({ schemaId: 'gibt-es-nicht', rows: [{ a: '1' }] });
    expect(res.status).toBe(404);
  });
});

describe('Datenimport Phase 2: Datei einlesen und Prüfsumme', () => {
  it('liest eine hochgeladene CSV, erkennt das Schema und merkt bereits importierte Dateien', async () => {
    const markus = storage.getUsers(true).find(u => u.id === 'u-3')!;
    const day = isoDaysAgo(40);
    const csv = `Mitarbeiter;E-Mail;Von;Bis;Art\n${markus.name};${markus.email};${deDate(day)};;Sonderurlaub\n`;
    const parse = await authenticated('post', '/api/import/parse').attach('file', Buffer.from(csv, 'utf-8'), 'hr.csv');
    expect(parse.status).toBe(200);
    expect(parse.body).toMatchObject({ fileType: 'csv', delimiter: ';', rowCount: 1, fileAlreadyImported: null });
    expect(parse.body.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(parse.body.detection).toMatchObject({ schemaId: 'builtin-hr-absences' });
    expect(parse.body.resolved['builtin-hr-absences']).toMatchObject({ userRef: 'Mitarbeiter', date: 'Von', dayType: 'Art' });
    expect(parse.body.lineNumbers).toEqual([2]);

    const exec = await authenticated('post', '/api/import/execute').send({
      schemaId: 'builtin-hr-absences', rows: parse.body.rows, lineNumbers: parse.body.lineNumbers,
      fileChecksum: parse.body.checksum, fileName: 'hr.csv',
    });
    expect(exec.status).toBe(200);
    expect(exec.body.batchId).toMatch(/^imp-/);
    const batch = storage.getImportBatches().find(b => b.id === exec.body.batchId)!;
    expect(batch.fileChecksum).toBe(parse.body.checksum);

    const again = await authenticated('post', '/api/import/parse').attach('file', Buffer.from(csv, 'utf-8'), 'hr-kopie.csv');
    expect(again.body.fileAlreadyImported).toMatchObject({ batchId: exec.body.batchId, fileName: 'hr.csv' });
    const dry = await authenticated('post', '/api/import/dry-run').send({ schemaId: 'builtin-hr-absences', rows: again.body.rows, fileChecksum: again.body.checksum });
    expect(dry.body.fileAlreadyImported?.batchId).toBe(exec.body.batchId);
    expect(dry.body.counts.DUPLICATE).toBe(1);

    // Rückgängig: danach gilt die Datei nicht mehr als importiert
    expect((await authenticated('delete', `/api/import/batches/${exec.body.batchId}`)).status).toBe(200);
    const third = await authenticated('post', '/api/import/parse').attach('file', Buffer.from(csv, 'utf-8'), 'hr.csv');
    expect(third.body.fileAlreadyImported).toBeNull();
  });

  it('meldet fehlende Datei mit 400', async () => {
    expect((await authenticated('post', '/api/import/parse')).status).toBe(400);
  });
});

describe('Datenimport Phase 2: HR-Abwesenheiten', () => {
  it('teilt Von/Bis-Zeiträume auf Arbeitstage auf und protokolliert Import und Rückgängig im Audit-Log', async () => {
    const markus = storage.getUsers(true).find(u => u.id === 'u-3')!;
    const from = isoDaysAgo(26);
    const to = isoDaysAgo(20);
    const rows = [
      { Mitarbeiter: markus.name, 'E-Mail': markus.email, Von: deDate(from), Bis: deDate(to), Art: 'Urlaub' },
      { Mitarbeiter: markus.name, 'E-Mail': markus.email, Von: deDate(to), Bis: deDate(from), Art: 'Urlaub' },
      { Mitarbeiter: markus.name, 'E-Mail': markus.email, Von: deDate(from), Bis: '', Art: 'Unbekannt' },
    ];
    const dry = await authenticated('post', '/api/import/dry-run').send({ schemaId: 'builtin-hr-absences', rows });
    expect(dry.status).toBe(200);
    expect(dry.body.rows.map((r: any) => r.status)).toEqual([expect.stringMatching(/^(NEW|WARNING)$/), 'ERROR', 'ERROR']);
    expect(dry.body.rows[1].messages.join(' ')).toMatch(/Bis-Datum liegt vor/);
    expect(dry.body.rows[0].record).toMatchObject({ target: 'ABSENCE', dayType: 'VACATION', date: from, dateTo: to });

    const exec = await authenticated('post', '/api/import/execute').send({ schemaId: 'builtin-hr-absences', rows: rows.slice(0, 1), fileName: 'urlaub.csv' });
    expect(exec.status).toBe(200);
    const batch = storage.getImportBatches().find(b => b.id === exec.body.batchId)!;
    expect(batch.target).toBe('ABSENCE');
    expect(batch.workingTimeCount).toBeGreaterThan(0);
    expect(batch.workingTimeCount).toBeLessThanOrEqual(weekdaysBetween(from, to));
    const created = storage.getWorkingTimeEntries().filter((w: any) => w.importBatchId === batch.id);
    expect(created.every((w: any) => w.dayType === 'VACATION' && w.userId === 'u-3')).toBe(true);
    expect(created.every((w: any) => ![0, 6].includes(new Date(w.date + 'T00:00:00Z').getUTCDay()))).toBe(true);

    const importLog = storage.getAuditLogs().find(a => a.entityType === 'IMPORT_BATCH' && a.entityId === batch.id && a.action === 'IMPORT');
    expect(importLog).toBeTruthy();

    expect((await authenticated('delete', `/api/import/batches/${batch.id}`)).status).toBe(200);
    const revertLog = storage.getAuditLogs().find(a => a.entityType === 'IMPORT_BATCH' && a.entityId === batch.id && a.action === 'REVERT_IMPORT');
    expect(revertLog).toBeTruthy();
  });
});

describe('Datenimport Phase 2: Stammdaten-Zuordnung und Aliase', () => {
  const day = () => {
    const d = new Date(Date.now() - 4 * 86400000);
    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
  };
  const row = (user: string, start: string, project = 'Alias Projekt') => ({
    Project: project, Client: 'Alias Kunde', Description: 'Alias', Task: '', User: user, Group: 'Insight Arcs',
    Email: '', Billable: 'Yes', 'Start Date': day(), 'Start Time': start, 'End Time': '23:59', 'Duration (decimal)': '0,5',
  });

  it('Stammdaten-Abgleich zeigt unbekannte Namen; __skip__ überspringt Zeilen; gemerkte Zuordnungen wirken beim nächsten Import', async () => {
    const rows = [row('M. Weber (alt)', '06:11'), row('Ignorieren Bitte', '06:12')];
    const md = await authenticated('post', '/api/import/master-data', 'u-2').send({ rows });
    expect(md.status).toBe(200);
    expect(md.body.canCreateUsers).toBe(false);
    const refs = md.body.users.map((u: any) => u.ref);
    expect(refs).toEqual(expect.arrayContaining(['m. weber (alt)', 'ignorieren bitte']));
    expect(md.body.users.find((u: any) => u.ref === 'm. weber (alt)').matchType).toBe('none');

    const mappings = { users: { 'm. weber (alt)': 'u-3', 'ignorieren bitte': '__skip__' } };
    const dry = await authenticated('post', '/api/import/dry-run', 'u-2').send({ rows, mappings });
    expect(dry.body.rows.map((r: any) => r.status)).toEqual(['NEW', 'SKIPPED']);
    expect(dry.body.counts.SKIPPED).toBe(1);

    const exec = await authenticated('post', '/api/import/execute', 'u-2').send({ rows, mappings, rememberMappings: true, fileName: 'alias.csv' });
    expect(exec.status).toBe(200);
    const aliases = await authenticated('get', '/api/import/aliases', 'u-2');
    expect(aliases.body).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'user', ref: 'm. weber (alt)', targetId: 'u-3' })]));
    expect(aliases.body.some((a: any) => a.ref === 'ignorieren bitte')).toBe(false);

    // Nächster Import ohne explizite Zuordnung: Alias greift
    const md2 = await authenticated('post', '/api/import/master-data', 'u-2').send({ rows: [row('M. Weber (alt)', '06:13')] });
    expect(md2.body.users[0]).toMatchObject({ matchType: 'alias', matchedId: 'u-3' });
    const dry2 = await authenticated('post', '/api/import/dry-run', 'u-2').send({ rows: [row('M. Weber (alt)', '06:13')] });
    expect(dry2.body.rows[0].status).toBe('NEW');

    const del = await authenticated('delete', '/api/import/aliases?kind=user&ref=' + encodeURIComponent('M. Weber (alt)'), 'u-2');
    expect(del.status).toBe(200);
    expect((await authenticated('delete', '/api/import/aliases?kind=user&ref=x', 'u-2')).status).toBe(404);
    expect((await authenticated('delete', '/api/import/aliases?kind=foo&ref=x', 'u-2')).status).toBe(400);

    const dry3 = await authenticated('post', '/api/import/dry-run', 'u-2').send({ rows: [row('M. Weber (alt)', '06:13')] });
    expect(dry3.body.rows[0].status).toBe('ERROR');

    await authenticated('delete', `/api/import/batches/${exec.body.batchId}`, 'u-2');
  });
});

describe('Datenimport Phase 2: Mitarbeitenden-Import (nur Superadmins)', () => {
  const rows = [
    { Name: 'Petra Import', 'E-Mail': 'petra.import@example.com', Firma: 'Insight Arcs' },
    { Name: 'Ohne Mail', 'E-Mail': '', Firma: 'Externe GmbH' },
  ];

  it('Admins ohne Superadmin-Recht erhalten 403', async () => {
    const res = await authenticated('post', '/api/import/execute', 'u-2').send({ schemaId: 'builtin-employees', rows });
    expect(res.status).toBe(403);
    expect(storage.getUsers(true).some(u => u.name === 'Petra Import')).toBe(false);
  });

  it('Superadmin: Probelauf zeigt neue Personen, Ausführung legt sie als „Eingeladen" an; Rückgängig nicht möglich', async () => {
    const dry = await authenticated('post', '/api/import/dry-run').send({ schemaId: 'builtin-employees', rows });
    expect(dry.body.wouldCreate.users).toEqual(expect.arrayContaining(['Petra Import', 'Ohne Mail']));
    expect(dry.body.rows[1].status).toBe('WARNING');

    const exec = await authenticated('post', '/api/import/execute').send({ schemaId: 'builtin-employees', rows, fileName: 'team.csv' });
    expect(exec.status).toBe(200);
    const petra = storage.getUsers(true).find(u => u.name === 'Petra Import');
    expect(petra).toMatchObject({ status: 'INVITED', email: 'petra.import@example.com' });
    const ext = storage.getUsers(true).find(u => u.name === 'Ohne Mail');
    expect(ext).toMatchObject({ status: 'INVITED', email: '', employmentType: 'EXTERNAL' });

    const batches = await authenticated('get', '/api/import/batches');
    const batch = batches.body.find((b: any) => b.id === exec.body.batchId);
    expect(batch).toMatchObject({ target: 'MASTER_DATA', createdUserCount: 2, canUndo: false, undoBlockedReason: 'NOT_SUPPORTED' });
    const undo = await authenticated('delete', `/api/import/batches/${exec.body.batchId}`);
    expect(undo.status).toBe(409);
    expect(undo.body.reason).toBe('NOT_SUPPORTED');

    const again = await authenticated('post', '/api/import/dry-run').send({ schemaId: 'builtin-employees', rows });
    expect(again.body.counts.DUPLICATE).toBe(2);
  });
});
