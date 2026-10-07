/**
 * XLSX-Exporte (Abrechnung im Clockify-Format & Bi-Weekly Timesheet).
 * Layouts orientieren sich 1:1 an den vom Kunden gelieferten Beispieldateien.
 */
import ExcelJS from 'exceljs';
import type { TimeEntry } from '../src/types.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "HH:mm" → Excel-Zeitwert (Bruchteil eines Tages) oder null. */
const timeToExcel = (hhmm?: string): number | null => {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) / 1440;
};

/** "YYYY-MM-DD" → "D.M.YYYY" (wie im Clockify-Original, ohne führende Nullen). */
const formatDateDe = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
};

/** Dateinamen-sicherer String (Umlaute bleiben erhalten, Sonderzeichen → "_"). */
export const safeFilePart = (s: string): string =>
  (s || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'export';

// ---------------------------------------------------------------------------
// Format 1: Clockify-Abrechnungsexport
// ---------------------------------------------------------------------------
export async function buildClockifyXlsx(entries: TimeEntry[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.columns = [
    { header: 'Description', key: 'description', width: 70 },
    { header: 'Project Name', key: 'project', width: 20 },
    { header: 'Client', key: 'client', width: 18 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'Billable', key: 'billable', width: 10 },
    { header: 'Start Date', key: 'date', width: 12 },
    { header: 'Start Time', key: 'start', width: 11, style: { numFmt: 'h:mm:ss' } },
    { header: 'End Time', key: 'end', width: 11, style: { numFmt: 'h:mm:ss' } },
    { header: 'Duration (h)', key: 'durH', width: 12, style: { numFmt: '[h]:mm' } },
    { header: 'Duration (Decimal)', key: 'durDec', width: 18 }
  ];
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  // Neueste zuerst (wie Clockify), innerhalb eines Tages nach Startzeit absteigend
  const sorted = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || ''));

  for (const e of sorted) {
    const minutes = e.durationMinutes ?? Math.round((e.durationHoursDecimal || 0) * 60);
    const row = ws.addRow({
      description: e.description || '',
      project: e.projectName || '',
      client: e.clientName || '',
      user: e.userName || '',
      billable: !!e.isBillable,
      date: formatDateDe(e.date),
      start: timeToExcel(e.startTime),
      end: timeToExcel(e.endTime),
      durH: minutes / 1440,
      durDec: Math.round((e.durationHoursDecimal ?? minutes / 60) * 100) / 100
    });
    row.getCell('description').alignment = { wrapText: true, vertical: 'top' };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// Format 2: Bi-Weekly Timesheet (pro Mitarbeiter)
// ---------------------------------------------------------------------------
export interface TimesheetTaskRow { task: string; hours: number; }

/** Gruppiert Einträge nach Aufgabe (Fallback "Allgemein") und summiert Stunden. */
export function aggregateByTask(entries: TimeEntry[]): TimesheetTaskRow[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = (e.taskName || '').trim() || 'Allgemein';
    map.set(key, (map.get(key) || 0) + (e.durationHoursDecimal || 0));
  }
  return [...map.entries()]
    .map(([task, hours]) => ({ task, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => b.hours - a.hours);
}

/** Numerische Strings (z. B. Ticket-ID "264560" oder Sprint "24") als Zahl schreiben. */
const numericOrText = (v: string): string | number => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : v);

export async function buildTimesheetXlsx(opts: {
  userName: string;
  label: string;
  rows: TimesheetTaskRow[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.columns = [
    { width: 3 }, { width: 22 }, { width: 14 }, { width: 10 },
    { width: 4 }, { width: 13 }, { width: 10 }, { width: 6 }
  ];

  ws.mergeCells('B1:H1');
  ws.getCell('B1').value = 'Bi-Weekly Timesheet';
  ws.getCell('B1').font = { bold: true, size: 14 };

  ws.getCell('B4').value = 'Name: ';
  ws.mergeCells('C4:D4');
  ws.getCell('C4').value = opts.userName;
  ws.getCell('F4').value = 'Sprint:';
  ws.getCell('G4').value = numericOrText(opts.label);
  ws.getCell('G4').alignment = { horizontal: 'left' };

  ws.getCell('B6').value = 'Task ID';
  ws.getCell('C6').value = 'Hours spend';
  ws.getCell('F6').value = 'Total hours:';
  for (const c of ['B4', 'F4', 'B6', 'C6', 'F6', 'F8']) ws.getCell(c).font = { bold: true };

  const firstDataRow = 7;
  const lastSumRow = Math.max(36, firstDataRow + opts.rows.length - 1);
  opts.rows.forEach((r, i) => {
    ws.getCell(`B${firstDataRow + i}`).value = numericOrText(r.task);
    ws.getCell(`B${firstDataRow + i}`).alignment = { horizontal: 'left' };
    ws.getCell(`C${firstDataRow + i}`).value = r.hours;
  });

  const totalHours = Math.round(opts.rows.reduce((s, r) => s + r.hours, 0) * 100) / 100;
  ws.getCell('G6').value = { formula: `SUM(C${firstDataRow}:C${lastSumRow})`, result: totalHours };
  ws.getCell('F8').value = 'Total days:';
  // Wie im Original: Tage = Gesamtstunden / 8
  ws.getCell('G8').value = { formula: '(G6/8)', result: Math.round((totalHours / 8) * 100) / 100 };
  ws.getCell('G8').numFmt = '0.##';

  return Buffer.from(await wb.xlsx.writeBuffer());
}
