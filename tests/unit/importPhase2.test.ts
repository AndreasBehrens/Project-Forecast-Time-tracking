import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseImportFile, sha256, decodeCsv, detectFileType, excelCellToString } from '../../server/import/fileParser.js';
import {
  detectSchema, resolveColumns, applySchema, headerFingerprint,
  BUILTIN_SCHEMAS, HR_ABSENCE_SCHEMA, EMPLOYEE_SCHEMA, CLOCKIFY_CSV_SCHEMA, validateImportSchema,
} from '../../server/import/schema.js';
import { normalizeNavId } from '../../src/utils/navigation.js';

describe('Dateieinlesung (CSV/XLSX) und Prüfsumme', () => {
  it('sha256 liefert stabile Hex-Prüfsumme', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256(Buffer.from('abc'))).toBe(sha256('abc'));
  });

  it('erkennt UTF-8 und fällt bei ungültigen Bytes auf Latin-1 zurück', () => {
    expect(decodeCsv(Buffer.from('Größe', 'utf-8'))).toEqual({ text: 'Größe', encoding: 'utf-8' });
    const latin = decodeCsv(Buffer.from('Größe', 'latin1'));
    expect(latin).toEqual({ text: 'Größe', encoding: 'latin1' });
  });

  it('erkennt den Dateityp über Signatur bzw. Endung', () => {
    expect(detectFileType('a.csv', Buffer.from('a;b'))).toBe('csv');
    expect(detectFileType('a.xlsx', Buffer.from('x'))).toBe('xlsx');
    expect(detectFileType('a.bin', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]))).toBe('xlsx');
  });

  it('wandelt Excel-Zellwerte in Text um', () => {
    expect(excelCellToString(new Date(Date.UTC(2026, 10, 2)))).toBe('2026-11-02');
    expect(excelCellToString(new Date(Date.UTC(2026, 10, 2, 8, 30)))).toBe('2026-11-02 08:30');
    expect(excelCellToString(new Date(Date.UTC(1899, 11, 30, 7, 15)))).toBe('07:15');
    expect(excelCellToString(1.5)).toBe('1.5');
    expect(excelCellToString({ richText: [{ text: 'Hal' }, { text: 'lo' }] })).toBe('Hallo');
    expect(excelCellToString({ formula: 'A1*2', result: 3 })).toBe('3');
    expect(excelCellToString(null)).toBe('');
  });

  it('liest CSV inkl. Trennzeichen-Erkennung', async () => {
    const buf = Buffer.from('Name;E-Mail\nAnna;anna@example.com\n\nBert;bert@example.com\n', 'utf-8');
    const parsed = await parseImportFile(buf, 'mitarbeitende.csv');
    expect(parsed.fileType).toBe('csv');
    expect(parsed.delimiter).toBe(';');
    expect(parsed.headers).toEqual(['Name', 'E-Mail']);
    expect(parsed.rows.map(r => r.data.Name)).toEqual(['Anna', 'Bert']);
    expect(parsed.checksum).toBe(sha256(buf));
  });

  it('liest XLSX (Tabellenblatt-Auswahl, Datumszellen, Leerzeilen)', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Info').addRow(['nur Text']);
    const ws = wb.addWorksheet('Abwesenheiten');
    ws.addRow(['Mitarbeiter', 'Von', 'Bis', 'Art']);
    ws.addRow(['Anna', new Date(Date.UTC(2026, 10, 2)), new Date(Date.UTC(2026, 10, 4)), 'Urlaub']);
    ws.addRow([]);
    ws.addRow(['Bert', new Date(Date.UTC(2026, 10, 5)), '', 'Krank']);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const parsed = await parseImportFile(buf, 'hr.xlsx', { sheet: 'Abwesenheiten' });
    expect(parsed.fileType).toBe('xlsx');
    expect(parsed.sheetNames).toEqual(['Info', 'Abwesenheiten']);
    expect(parsed.sheet).toBe('Abwesenheiten');
    expect(parsed.headers).toEqual(['Mitarbeiter', 'Von', 'Bis', 'Art']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({ lineNumber: 2, data: { Mitarbeiter: 'Anna', Von: '2026-11-02', Bis: '2026-11-04', Art: 'Urlaub' } });
    expect(parsed.rows[1].lineNumber).toBe(4);
    // Ohne Angabe wird das erste Blatt gelesen
    const first = await parseImportFile(buf, 'hr.xlsx');
    expect(first.sheet).toBe('Info');
  });
});

describe('Automatische Schema-Erkennung', () => {
  it('erkennt Clockify-, HR- und Mitarbeitenden-Dateien über die Spalten', () => {
    const clockify = ['Project', 'Client', 'Description', 'User', 'Email', 'Start Date', 'Start Time', 'End Time', 'Duration (decimal)'];
    expect(detectSchema(clockify, BUILTIN_SCHEMAS)).toMatchObject({ schemaId: CLOCKIFY_CSV_SCHEMA.id, method: 'columns' });
    expect(detectSchema(['Mitarbeiter', 'Von', 'Bis', 'Art'], BUILTIN_SCHEMAS)).toMatchObject({ schemaId: HR_ABSENCE_SCHEMA.id });
    expect(detectSchema(['Name', 'E-Mail', 'Firma'], BUILTIN_SCHEMAS)).toMatchObject({ schemaId: EMPLOYEE_SCHEMA.id });
  });

  it('bevorzugt den exakten Fingerabdruck gespeicherter Schemas', () => {
    const headers = ['Mitarbeiter', 'Von', 'Bis', 'Art'];
    const tenant = { ...HR_ABSENCE_SCHEMA, id: 'tenant-hr', name: 'Personio', headerFingerprint: headerFingerprint(headers) };
    expect(detectSchema(headers, [...BUILTIN_SCHEMAS, tenant])).toMatchObject({ schemaId: 'tenant-hr', method: 'fingerprint' });
  });

  it('liefert null für unbekannte Spalten', () => {
    expect(detectSchema(['Foo', 'Bar'], BUILTIN_SCHEMAS)).toBeNull();
  });

  it('ordnet Spalten den kanonischen Feldern zu', () => {
    expect(resolveColumns(HR_ABSENCE_SCHEMA, ['Mitarbeiter', 'Von', 'Bis', 'Art', 'Halber Tag'])).toEqual({
      userRef: 'Mitarbeiter', date: 'Von', dateTo: 'Bis', dayType: 'Art', halfDay: 'Halber Tag',
    });
  });
});

describe('HR-Abwesenheiten und Mitarbeitenden-Schema', () => {
  const hr = (data: Record<string, string>, lineNumber = 2) => applySchema(HR_ABSENCE_SCHEMA, [{ lineNumber, data }])[0];

  it('liest Von/Bis-Zeiträume, Art und halbe Tage', () => {
    const r = hr({ Mitarbeiter: 'Anna', Von: '02.11.2026', Bis: '06.11.2026', Art: 'Urlaub' });
    expect(r.errors).toEqual([]);
    expect(r.record).toMatchObject({ target: 'ABSENCE', date: '2026-11-02', dateTo: '2026-11-06', dayType: 'VACATION' });
    const half = hr({ Mitarbeiter: 'Anna', Von: '02.11.2026', Bis: '', Art: 'Krank', 'Halber Tag': 'ja' });
    expect(half.record).toMatchObject({ dayType: 'SICK', halfDay: true });
    expect(half.record?.dateTo).toBeUndefined();
  });

  it('meldet Bis vor Von und halbe Tage über Zeiträume als Fehler', () => {
    expect(hr({ Mitarbeiter: 'Anna', Von: '06.11.2026', Bis: '02.11.2026', Art: 'Urlaub' }).errors.join(' ')).toMatch(/Bis-Datum liegt vor/);
    expect(hr({ Mitarbeiter: 'Anna', Von: '02.11.2026', Bis: '03.11.2026', Art: 'Urlaub', 'Halber Tag': 'ja' }).errors.join(' ')).toMatch(/Halbe Tage/);
  });

  it('Mitarbeitenden-Schema braucht weder Datum noch Dauer', () => {
    expect(validateImportSchema(EMPLOYEE_SCHEMA).valid).toBe(true);
    const r = applySchema(EMPLOYEE_SCHEMA, [{ lineNumber: 2, data: { Name: 'Anna Neu', 'E-Mail': 'anna@example.com' } }])[0];
    expect(r.errors).toEqual([]);
    expect(r.record).toMatchObject({ target: 'MASTER_DATA', userRef: 'Anna Neu', userEmail: 'anna@example.com' });
  });
});

describe('Navigation: Menü „Exporte" ist in „Import & Export" aufgegangen', () => {
  it('leitet alte Navigationsziele auf die kombinierte Seite um', () => {
    expect(normalizeNavId('export')).toBe('clockifyMigration');
    expect(normalizeNavId('exports')).toBe('clockifyMigration');
    expect(normalizeNavId('dashboard')).toBe('dashboard');
  });
});
