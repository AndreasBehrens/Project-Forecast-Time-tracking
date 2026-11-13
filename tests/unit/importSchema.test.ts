import { describe, it, expect } from 'vitest';
import {
  validateImportSchema, importSchemaJsonSchema, CLOCKIFY_CSV_SCHEMA, applySchema, parseCsvObjects,
  deriveSchemaFromCsv, headerFingerprint, resolveColumn,
} from '../../server/import/schema.js';

const CLOCKIFY_CSV = [
  'Project,Client,Description,Task,User,Group,Email,Tags,Billable,Start Date,Start Time,End Date,End Time,Duration (h),Duration (decimal),Billable Rate (EUR)',
  'Website,ACME GmbH,Konzept,Design,Sophie Becker,Insight Arcs,sophie.becker@insightarcs.de,,Yes,02.11.2026,09:00:00,02.11.2026,10:30:00,01:30:00,"1,50",95',
  'Website,ACME GmbH,Review,,Sophie Becker,Insight Arcs,sophie.becker@insightarcs.de,,No,03.11.2026,13:00:00,03.11.2026,14:00:00,01:00:00,"1,00",',
  'Website,ACME GmbH,Kaputt,,Sophie Becker,Insight Arcs,sophie.becker@insightarcs.de,,Yes,31.02.2026,13:00:00,,,,"",',
].join('\n');

describe('Schema-Datei: Validierung', () => {
  it('akzeptiert das eingebaute Clockify-Schema', () => {
    expect(validateImportSchema(CLOCKIFY_CSV_SCHEMA).valid).toBe(true);
  });

  it('meldet fehlende Pflichtfelder mit Pfad', () => {
    const { columns: _c, ...noColumns } = CLOCKIFY_CSV_SCHEMA;
    const r = validateImportSchema(noColumns);
    expect(r.valid).toBe(false);
    const broken = validateImportSchema({ ...CLOCKIFY_CSV_SCHEMA, columns: { userRef: 'User' } });
    expect(broken.valid).toBe(false);
    if (broken.valid === false) {
      const text = broken.errors.map(e => e.message).join(' ');
      expect(text).toMatch(/Datum|date/i);
    }
  });

  it('lehnt unbekannte Spaltenfelder und falsche Versionen ab', () => {
    expect(validateImportSchema({ ...CLOCKIFY_CSV_SCHEMA, columns: { ...CLOCKIFY_CSV_SCHEMA.columns, foo: 'Bar' } }).valid).toBe(false);
    expect(validateImportSchema({ ...CLOCKIFY_CSV_SCHEMA, schemaVersion: 2 }).valid).toBe(false);
  });

  it('erzeugt ein JSON Schema für die Schema-Datei', () => {
    const js = importSchemaJsonSchema() as any;
    expect(js.type).toBe('object');
    expect(js.properties.columns).toBeDefined();
  });
});

describe('Schema anwenden', () => {
  it('wandelt Clockify-CSV-Zeilen in ImportRecords um und meldet Fehler je Zeile', () => {
    const parsed = parseCsvObjects(CLOCKIFY_CSV);
    expect(parsed.delimiter).toBe(',');
    const res = applySchema(CLOCKIFY_CSV_SCHEMA, parsed.rows);
    expect(res).toHaveLength(3);
    const [a, b, c] = res;
    expect(a.errors).toEqual([]);
    expect(a.record).toMatchObject({
      rowNumber: 2, target: 'TIME_ENTRY', userRef: 'Sophie Becker', userEmail: 'sophie.becker@insightarcs.de',
      clientRef: 'ACME GmbH', projectRef: 'Website', taskRef: 'Design', date: '2026-11-02',
      startTime: '09:00', endTime: '10:30', durationMinutes: 90, isBillable: true, hourlyBillingRate: 95,
    });
    expect(b.record?.isBillable).toBe(false);
    expect(c.record).toBeUndefined();
    expect(c.errors.length).toBeGreaterThan(0);
    expect(c.rowNumber).toBe(4);
  });

  it('ignoriert leere und wiederholte Kopfzeilen', () => {
    const rows = [
      { lineNumber: 2, data: { User: 'User', Project: 'Project', 'Start Date': 'Start Date', 'Duration (decimal)': 'Duration (decimal)' } },
      { lineNumber: 3, data: { User: '', Project: '', 'Start Date': '', 'Duration (decimal)': '' } },
    ];
    expect(applySchema(CLOCKIFY_CSV_SCHEMA, rows).every(r => r.ignored)).toBe(true);
  });

  it('setzt per Wertzuordnung Abwesenheiten (Projekt „Urlaub" → VACATION)', () => {
    const schema = {
      ...CLOCKIFY_CSV_SCHEMA,
      valueMappings: [{ when: { field: 'projectRef' as const, equals: 'Urlaub' }, set: { dayType: 'VACATION' as const } }],
    };
    const res = applySchema(schema, [{ lineNumber: 2, data: { User: 'Sophie Becker', Project: 'Urlaub', 'Start Date': '04.11.2026', 'Duration (decimal)': '8' } }]);
    expect(res[0].record).toMatchObject({ target: 'ABSENCE', dayType: 'VACATION', date: '2026-11-04' });
  });

  it('findet Spalten ohne Groß-/Kleinschreibung und mit Platzhalter', () => {
    expect(resolveColumn(['billable rate (EUR)'], 'Billable Rate*')).toBe('billable rate (EUR)');
    expect(resolveColumn(['USER'], ['Benutzer', 'User'])).toBe('USER');
  });
});

describe('Schema-Entwurf aus Musterdatei ableiten', () => {
  it('erkennt Clockify-Spalten und schlägt ein gültiges Schema vor', () => {
    const d = deriveSchemaFromCsv(CLOCKIFY_CSV, { name: 'Test' });
    expect(d.validation.valid).toBe(true);
    expect(d.schema.columns.userRef).toBe('User');
    expect(d.schema.columns.projectRef).toBe('Project');
    expect(d.schema.columns.date).toBe('Start Date');
    expect(d.detected.delimiter).toBe(',');
    expect(d.detected.dateFormat).toBe('DD.MM.YYYY');
    expect(d.sampleRows.length).toBeGreaterThan(0);
    expect(d.schema.headerFingerprint).toBe(headerFingerprint(d.headers));
  });

  it('leitet ein Schema für eine unbekannte Semikolon-Datei ab', () => {
    const csv = 'Mitarbeiter;Datum;Projekt;Stunden;Notiz;Abrechenbar\nMax Muster;2026-11-02;Intern;7,5;Doku;ja\n';
    const d = deriveSchemaFromCsv(csv);
    expect(d.detected.delimiter).toBe(';');
    expect(d.schema.columns).toMatchObject({ userRef: 'Mitarbeiter', date: 'Datum', projectRef: 'Projekt', duration: 'Stunden', description: 'Notiz', isBillable: 'Abrechenbar' });
    expect(d.detected.dateFormat).toBe('YYYY-MM-DD');
    expect(d.detected.decimalSeparator).toBe(',');
    const applied = applySchema(d.schema, parseCsvObjects(csv, d.schema.delimiter).rows);
    expect(applied[0].record).toMatchObject({ userRef: 'Max Muster', durationMinutes: 450, isBillable: true });
  });
});
