/**
 * Liest Importdateien (CSV oder XLSX) serverseitig in Zeilenobjekte
 * (Konzept §3.2/§10 Phase 2–3) und berechnet die SHA-256-Prüfsumme der Datei.
 */
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import { parseCsvObjects } from './schema.js';

export type ImportFileType = 'csv' | 'xlsx';

export interface ParsedImportFile {
  fileType: ImportFileType;
  checksum: string;
  headers: string[];
  rows: Array<{ lineNumber: number; data: Record<string, string> }>;
  delimiter?: ',' | ';' | '\t';
  encoding?: 'utf-8' | 'latin1';
  sheetNames?: string[];
  sheet?: string;
}

export const MAX_IMPORT_ROWS = 20000;

export function sha256(buf: Buffer | string): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function detectFileType(fileName: string, buf: Buffer): ImportFileType {
  // XLSX = ZIP-Container („PK\x03\x04“)
  if (buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'xlsx';
  if (/\.xlsx$/i.test(fileName)) return 'xlsx';
  return 'csv';
}

/** Dekodiert CSV-Bytes: UTF-8, bei ungültigen Zeichen automatisch Latin-1 (typisch für Excel-CSV unter Windows). */
export function decodeCsv(buf: Buffer, encoding: 'utf-8' | 'latin1' | 'auto' = 'auto'): { text: string; encoding: 'utf-8' | 'latin1' } {
  if (encoding === 'latin1') return { text: buf.toString('latin1'), encoding: 'latin1' };
  const utf = buf.toString('utf-8');
  if (encoding === 'utf-8' || !utf.includes('\uFFFD')) return { text: utf, encoding: 'utf-8' };
  return { text: buf.toString('latin1'), encoding: 'latin1' };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Wandelt einen Excel-Zellwert in Text um (Datum → JJJJ-MM-TT, Uhrzeit → HH:MM, Formeln → Ergebnis). */
export function excelCellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    // Reine Uhrzeiten liegen in Excel am 30.12.1899
    if (v.getUTCFullYear() <= 1900) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
    const date = `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    const hasTime = v.getUTCHours() !== 0 || v.getUTCMinutes() !== 0;
    return hasTime ? `${date} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}` : date;
  }
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') {
    const o = v as any;
    if ('result' in o) return excelCellToString(o.result);
    if (Array.isArray(o.richText)) return o.richText.map((r: any) => r.text).join('');
    if ('text' in o) return String(o.text);
    if ('error' in o) return '';
  }
  return String(v).trim();
}

async function parseXlsx(buf: Buffer, opts: { headerRow?: number; sheet?: string }): Promise<Omit<ParsedImportFile, 'checksum' | 'fileType'>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);
  const sheetNames = wb.worksheets.map(w => w.name);
  const ws = (opts.sheet && wb.getWorksheet(opts.sheet)) || wb.worksheets[0];
  if (!ws) throw new Error('Die Excel-Datei enthält kein Tabellenblatt.');
  const headerRowNo = Math.max(1, opts.headerRow || 1);
  const headerRow = ws.getRow(headerRowNo);
  const headers: string[] = [];
  const colCount = Math.max(ws.columnCount, headerRow.cellCount);
  for (let c = 1; c <= colCount; c++) headers.push(excelCellToString(headerRow.getCell(c).value).trim());
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  const rows: ParsedImportFile['rows'] = [];
  for (let r = headerRowNo + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const data: Record<string, string> = {};
    let any = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const val = excelCellToString(row.getCell(i + 1).value).trim();
      if (val) any = true;
      data[h] = val;
    });
    if (any) rows.push({ lineNumber: r, data });
    if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Die Datei enthält mehr als ${MAX_IMPORT_ROWS} Zeilen.`);
  }
  return { headers: headers.filter(Boolean), rows, sheetNames, sheet: ws.name };
}

export async function parseImportFile(
  buf: Buffer,
  fileName: string,
  opts: { delimiter?: ',' | ';' | '\t' | 'auto'; headerRow?: number; encoding?: 'utf-8' | 'latin1' | 'auto'; sheet?: string } = {}
): Promise<ParsedImportFile> {
  const checksum = sha256(buf);
  const fileType = detectFileType(fileName, buf);
  if (fileType === 'xlsx') {
    return { fileType, checksum, ...(await parseXlsx(buf, opts)) };
  }
  const { text, encoding } = decodeCsv(buf, opts.encoding || 'auto');
  const parsed = parseCsvObjects(text, opts.delimiter || 'auto', opts.headerRow || 1);
  if (parsed.rows.length > MAX_IMPORT_ROWS) throw new Error(`Die Datei enthält mehr als ${MAX_IMPORT_ROWS} Zeilen.`);
  return { fileType, checksum, headers: parsed.headers.filter(Boolean), rows: parsed.rows, delimiter: parsed.delimiter, encoding };
}
