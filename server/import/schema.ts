/**
 * Import-Schema / Musterdatei des Quellsystems (Konzept §3.4).
 *
 * Ein Schema beschreibt pro Quelle (und optional pro Mandant), wie eine Datei
 * gelesen und in das kanonische ImportRecord-Format übersetzt wird:
 * Trennzeichen, Kopfzeile, Spalten → kanonische Felder, Datums-/Dauer-/
 * Dezimalformate, Ja/Nein-Wertelisten, Wertzuordnungen (z. B. Projekt
 * „Urlaub“ → Tagesart VACATION), Ziel, Duplikatschlüssel und Prüfregeln.
 *
 * Die Schema-Datei selbst wird mit Zod validiert; daraus lässt sich ein
 * JSON Schema erzeugen (`importSchemaJsonSchema()`).
 */
import crypto from 'crypto';
import { z } from 'zod';
import type { DayType, ImportRecord, ImportTarget } from '../../src/types.js';
import {
  cleanCell, parseBoolean, parseDate, parseDecimal, parseDuration, parseTime, minutesBetween,
  DEFAULT_FALSE_VALUES, DEFAULT_TRUE_VALUES,
  type DateFormat, type DecimalSeparator, type DurationFormat
} from './normalizers.js';

export const CANONICAL_FIELDS = [
  'externalId', 'userRef', 'userEmail', 'userGroup', 'clientRef', 'projectRef', 'taskRef',
  'date', 'startTime', 'endTime', 'duration', 'breakMinutes', 'description', 'isBillable',
  'dayType', 'hourlyBillingRate', 'hourlyCostRate'
] as const;
export type CanonicalField = typeof CANONICAL_FIELDS[number];

const DAY_TYPES = ['REGULAR', 'VACATION', 'SICK', 'SPECIAL_LEAVE', 'PARENTAL_LEAVE'] as const;
const TARGETS = ['TIME_ENTRY', 'WORKING_TIME', 'ABSENCE', 'MASTER_DATA'] as const;

/** Spaltenverweis: ein Spaltenname oder eine Liste von Alternativen; `*` als Platzhalter erlaubt. */
const ColumnRef = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

const columnsShape = Object.fromEntries(CANONICAL_FIELDS.map(f => [f, ColumnRef.optional()])) as Record<CanonicalField, z.ZodOptional<typeof ColumnRef>>;

export const ImportSchemaZ = z.object({
  schemaVersion: z.literal(1),
  id: z.string().optional(),
  name: z.string().min(1),
  source: z.string().min(1),
  version: z.number().int().min(1).optional(),
  description: z.string().optional(),
  fileType: z.enum(['csv']).optional(),
  delimiter: z.enum([',', ';', '\t', 'auto']).optional(),
  encoding: z.enum(['utf-8', 'latin1']).optional(),
  headerRow: z.number().int().min(1).optional(),
  target: z.enum(TARGETS).optional(),
  columns: z.object(columnsShape).strict(),
  formats: z.object({
    date: z.enum(['auto', 'DD.MM.YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']).optional(),
    duration: z.enum(['auto', 'HH:MM', 'decimal', 'minutes']).optional(),
    decimalSeparator: z.enum(['auto', ',', '.']).optional(),
  }).strict().optional(),
  billable: z.object({
    trueValues: z.array(z.string()).optional(),
    falseValues: z.array(z.string()).optional(),
    default: z.boolean().optional(),
  }).strict().optional(),
  valueMappings: z.array(z.object({
    when: z.object({ field: z.enum(CANONICAL_FIELDS), equals: z.string().optional(), contains: z.string().optional() }).strict(),
    set: z.object({ dayType: z.enum(DAY_TYPES).optional(), target: z.enum(TARGETS).optional(), isBillable: z.boolean().optional() }).strict(),
  }).strict()).optional(),
  duplicateKey: z.enum(['auto', 'externalId', 'fingerprint']).optional(),
  validation: z.object({
    maxDurationHours: z.number().positive().max(24).optional(),
    warnOnWeekend: z.boolean().optional(),
  }).strict().optional(),
  headerFingerprint: z.string().optional(),
}).strict().superRefine((s, ctx) => {
  const c = s.columns;
  if (!c.userRef && !c.userEmail) ctx.addIssue({ code: 'custom', path: ['columns', 'userRef'], message: 'Spalte für Mitarbeitende (userRef oder userEmail) ist erforderlich' });
  if (!c.date) ctx.addIssue({ code: 'custom', path: ['columns', 'date'], message: 'Spalte für das Datum (date) ist erforderlich' });
  const target = s.target || 'TIME_ENTRY';
  if (target !== 'ABSENCE' && !c.duration && !(c.startTime && c.endTime)) {
    ctx.addIssue({ code: 'custom', path: ['columns', 'duration'], message: 'Spalte für die Dauer oder Start- und Endzeit ist erforderlich' });
  }
  if (target === 'TIME_ENTRY' && !c.projectRef) ctx.addIssue({ code: 'custom', path: ['columns', 'projectRef'], message: 'Für Projektzeiten ist eine Projektspalte (projectRef) erforderlich' });
  if (s.duplicateKey === 'externalId' && !c.externalId) ctx.addIssue({ code: 'custom', path: ['duplicateKey'], message: 'duplicateKey "externalId" setzt eine Spalte externalId voraus' });
});

export type ImportSchema = z.infer<typeof ImportSchemaZ>;

export function validateImportSchema(input: unknown): { valid: true; schema: ImportSchema } | { valid: false; errors: Array<{ path: string; message: string }> } {
  const res = ImportSchemaZ.safeParse(input);
  if (res.success) return { valid: true, schema: res.data };
  return { valid: false, errors: res.error.issues.map(i => ({ path: i.path.join('.') || '(root)', message: i.message })) };
}

/** JSON Schema der Schema-Datei (z. B. für Editoren oder externe Prüfung). */
export function importSchemaJsonSchema(): unknown {
  return z.toJSONSchema(ImportSchemaZ, { unrepresentable: 'any' });
}

// ---------------------------------------------------------------------------
// Eingebautes Schema: Clockify CSV (entspricht dem bisherigen Verhalten)
// ---------------------------------------------------------------------------

export const CLOCKIFY_CSV_SCHEMA: ImportSchema = {
  schemaVersion: 1,
  id: 'builtin-clockify-csv',
  name: 'Clockify CSV',
  source: 'clockify-csv',
  version: 1,
  description: 'Clockify „Detailed“-Export als CSV (englische oder deutsche Spaltennamen).',
  fileType: 'csv',
  delimiter: 'auto',
  encoding: 'utf-8',
  headerRow: 1,
  target: 'TIME_ENTRY',
  columns: {
    userRef: ['User', 'Benutzer', 'Mitarbeiter'],
    userEmail: ['Email', 'E-Mail'],
    userGroup: ['Group', 'Gruppe'],
    clientRef: ['Client', 'Kunde'],
    projectRef: ['Project', 'Projekt'],
    taskRef: ['Task', 'Aufgabe'],
    description: ['Description', 'Beschreibung'],
    date: ['Start Date', 'Datum', 'Date'],
    startTime: ['Start Time', 'Startzeit'],
    endTime: ['End Time', 'Endzeit'],
    duration: ['Duration (decimal)', 'Duration (h)', 'Dauer (dezimal)', 'Dauer (h)'],
    isBillable: ['Billable', 'Abrechenbar'],
    hourlyBillingRate: ['Billable Rate*', 'Stundensatz*', 'Hourly Rate*'],
    hourlyCostRate: ['Cost Rate*', 'Kostensatz*'],
  },
  formats: { date: 'auto', duration: 'auto', decimalSeparator: 'auto' },
  billable: { trueValues: DEFAULT_TRUE_VALUES, falseValues: DEFAULT_FALSE_VALUES, default: true },
  duplicateKey: 'fingerprint',
  validation: { maxDurationHours: 12 },
};

export const BUILTIN_SCHEMAS: ImportSchema[] = [CLOCKIFY_CSV_SCHEMA];

// ---------------------------------------------------------------------------
// CSV-Parser (serverseitig, mit Anführungszeichen, BOM, CRLF)
// ---------------------------------------------------------------------------

export function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',') as ',' | ';' | '\t';
}

/** Zerlegt CSV-Text in Zeilen aus Zellen. */
export function parseCsvMatrix(text: string, delimiter: ',' | ';' | '\t' | 'auto' = 'auto'): { delimiter: ',' | ';' | '\t'; rows: string[][] } {
  const src = text.replace(/^\uFEFF/, '');
  const delim = delimiter === 'auto' ? detectDelimiter(src.split(/\r?\n/)[0] || '') : delimiter;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return { delimiter: delim, rows: rows.filter(r => r.some(c => c.trim() !== '')) };
}

/** CSV-Text → Objekte (Kopfzeile = headerRow, 1-basiert). `lineNumber` = Zeile in der Datei. */
export function parseCsvObjects(text: string, delimiter: ',' | ';' | '\t' | 'auto' = 'auto', headerRow = 1): {
  delimiter: ',' | ';' | '\t'; headers: string[]; rows: Array<{ lineNumber: number; data: Record<string, string> }>;
} {
  const { delimiter: d, rows } = parseCsvMatrix(text, delimiter);
  const headerIdx = Math.max(0, headerRow - 1);
  const headers = (rows[headerIdx] || []).map(h => h.trim());
  const out = rows.slice(headerIdx + 1).map((r, i) => ({
    lineNumber: headerIdx + 2 + i,
    data: Object.fromEntries(headers.map((h, j) => [h, (r[j] ?? '').trim()])),
  }));
  return { delimiter: d, headers, rows: out };
}

/** Fingerabdruck der Spaltenköpfe, um ein passendes Schema automatisch zu erkennen. */
export function headerFingerprint(headers: string[]): string {
  const norm = headers.map(h => h.trim().toLowerCase()).filter(Boolean).sort().join('|');
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Schema anwenden: Zeilen → ImportRecords
// ---------------------------------------------------------------------------

const norm = (s: string) => s.trim().toLowerCase();

function refList(ref: string | string[] | undefined): string[] {
  if (!ref) return [];
  return Array.isArray(ref) ? ref : [ref];
}

/** Findet den Spaltennamen, der zu einem Verweis passt (exakt, ohne Groß-/Kleinschreibung, `*` als Platzhalter). */
export function resolveColumn(headers: string[], ref: string | string[] | undefined): string | undefined {
  for (const r of refList(ref)) {
    if (r.includes('*')) {
      const rx = new RegExp('^' + norm(r).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      const hit = headers.find(h => rx.test(norm(h)));
      if (hit) return hit;
    } else {
      const hit = headers.find(h => norm(h) === norm(r));
      if (hit) return hit;
    }
  }
  return undefined;
}

export interface SchemaRowResult {
  rowNumber: number;
  record?: ImportRecord;
  errors: string[];
  warnings: string[];
  /** true = Zeile ist eine wiederholte Kopfzeile oder leer und wird ignoriert */
  ignored?: boolean;
}

const DAY_TYPE_ALIASES: Record<string, DayType> = {
  regular: 'REGULAR', arbeit: 'REGULAR', arbeitszeit: 'REGULAR', work: 'REGULAR',
  vacation: 'VACATION', urlaub: 'VACATION', holiday: 'VACATION',
  sick: 'SICK', krank: 'SICK', krankheit: 'SICK', 'sick leave': 'SICK',
  special_leave: 'SPECIAL_LEAVE', sonderurlaub: 'SPECIAL_LEAVE', 'special leave': 'SPECIAL_LEAVE',
  parental_leave: 'PARENTAL_LEAVE', elternzeit: 'PARENTAL_LEAVE', 'parental leave': 'PARENTAL_LEAVE',
};

export function applySchema(schema: ImportSchema, rows: Array<{ lineNumber: number; data: Record<string, unknown> }>): SchemaRowResult[] {
  const headers = rows.length ? Object.keys(rows[0].data) : [];
  const col: Partial<Record<CanonicalField, string>> = {};
  for (const f of CANONICAL_FIELDS) {
    const hit = resolveColumn(headers, schema.columns[f]);
    if (hit) col[f] = hit;
  }
  // Mehrere Dauer-Spalten (z. B. "Duration (decimal)" und "Duration (h)"): erste nicht-leere gewinnt
  const durationCols = refList(schema.columns.duration).map(r => resolveColumn(headers, r)).filter((c): c is string => !!c);

  const dateFmt = (schema.formats?.date || 'auto') as DateFormat;
  const durFmt = (schema.formats?.duration || 'auto') as DurationFormat;
  const decSep = (schema.formats?.decimalSeparator || 'auto') as DecimalSeparator;
  const trueVals = schema.billable?.trueValues || DEFAULT_TRUE_VALUES;
  const falseVals = schema.billable?.falseValues || DEFAULT_FALSE_VALUES;
  const maxHours = schema.validation?.maxDurationHours ?? 12;

  return rows.map(({ lineNumber, data }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const get = (f: CanonicalField) => (col[f] ? cleanCell(data[col[f]!]) : '');

    // Leere oder wiederholte Kopfzeilen ignorieren
    const mappedValues = (Object.keys(col) as CanonicalField[]).map(f => get(f));
    if (mappedValues.every(v => v === '')) return { rowNumber: lineNumber, errors, warnings, ignored: true };
    if ((Object.keys(col) as CanonicalField[]).every(f => get(f) === '' || norm(get(f)) === norm(col[f]!))) {
      return { rowNumber: lineNumber, errors, warnings, ignored: true };
    }

    let target: ImportTarget = schema.target || 'TIME_ENTRY';
    let dayType: DayType | undefined;
    let billableOverride: boolean | undefined;
    for (const vm of schema.valueMappings || []) {
      const v = norm(get(vm.when.field));
      const hit = (vm.when.equals !== undefined && v === norm(vm.when.equals)) || (vm.when.contains !== undefined && v.includes(norm(vm.when.contains)));
      if (hit) {
        if (vm.set.target) target = vm.set.target;
        if (vm.set.dayType) dayType = vm.set.dayType;
        if (vm.set.isBillable !== undefined) billableOverride = vm.set.isBillable;
      }
    }
    if (!dayType && get('dayType')) {
      const dt = DAY_TYPE_ALIASES[norm(get('dayType'))];
      if (dt) dayType = dt;
      else errors.push(`Unbekannte Tagesart "${get('dayType')}"`);
    }
    if (dayType && dayType !== 'REGULAR' && target === 'TIME_ENTRY') target = 'ABSENCE';

    const userRef = get('userRef') || get('userEmail');
    if (!userRef) errors.push('Mitarbeitende fehlen');

    const date = parseDate(get('date'), dateFmt);
    if (!date.ok) errors.push(date.error);

    const start = parseTime(get('startTime'));
    if (!start.ok) errors.push(start.error);
    const end = parseTime(get('endTime'));
    if (!end.ok) errors.push(end.error);
    const startTime = start.ok ? start.value : undefined;
    const endTime = end.ok ? end.value : undefined;

    let durationMinutes = 0;
    const rawDuration = durationCols.map(c => cleanCell(data[c])).find(v => v !== '');
    if (rawDuration !== undefined) {
      const d = parseDuration(rawDuration, durFmt, decSep);
      if (d.ok) durationMinutes = d.value; else errors.push(d.error);
    } else if (startTime && endTime) {
      durationMinutes = minutesBetween(startTime, endTime);
      if (durationMinutes <= 0) errors.push('Ende liegt nicht nach dem Start');
    } else if (target !== 'ABSENCE') {
      errors.push('Dauer fehlt (weder Dauer noch Start- und Endzeit angegeben)');
    }

    let breakMinutes: number | undefined;
    if (get('breakMinutes')) {
      const b = parseDecimal(get('breakMinutes'), decSep);
      if (b.ok && b.value >= 0) breakMinutes = Math.round(b.value); else errors.push(`Pause "${get('breakMinutes')}" ist ungültig`);
    }

    let isBillable: boolean | undefined = billableOverride;
    if (isBillable === undefined) {
      if (get('isBillable')) {
        const b = parseBoolean(get('isBillable'), trueVals, falseVals);
        if (b.ok) isBillable = b.value; else errors.push(b.error);
      } else isBillable = schema.billable?.default;
    }

    const rate = (f: 'hourlyBillingRate' | 'hourlyCostRate'): number | undefined => {
      if (!get(f)) return undefined;
      const r = parseDecimal(get(f), decSep);
      if (r.ok && r.value > 0) return r.value;
      if (r.ok && r.value === 0) return undefined;
      warnings.push(`Satz "${get(f)}" in Spalte "${col[f]}" ist ungültig und wird ignoriert`);
      return undefined;
    };
    const hourlyBillingRate = rate('hourlyBillingRate');
    const hourlyCostRate = rate('hourlyCostRate');

    if (target === 'TIME_ENTRY' && !get('projectRef')) errors.push('Projekt fehlt');
    if (durationMinutes > maxHours * 60) warnings.push(`Dauer über ${maxHours} Stunden`);
    if (date.ok && schema.validation?.warnOnWeekend) {
      const wd = new Date(date.value + 'T00:00:00Z').getUTCDay();
      if (wd === 0 || wd === 6) warnings.push('Buchung am Wochenende');
    }

    if (errors.length > 0 || !date.ok) return { rowNumber: lineNumber, errors, warnings };

    const record: ImportRecord = {
      rowNumber: lineNumber,
      target,
      externalId: get('externalId') || undefined,
      userRef,
      userEmail: get('userEmail') || undefined,
      userGroup: get('userGroup') || undefined,
      clientRef: get('clientRef') || undefined,
      projectRef: get('projectRef') || undefined,
      taskRef: get('taskRef') || undefined,
      date: date.value,
      startTime,
      endTime,
      durationMinutes,
      breakMinutes,
      description: get('description'),
      isBillable,
      dayType: dayType || (target === 'WORKING_TIME' ? 'REGULAR' : undefined),
      hourlyBillingRate,
      hourlyCostRate,
      raw: data,
    };
    return { rowNumber: lineNumber, record, errors, warnings };
  });
}

// ---------------------------------------------------------------------------
// Entwurf aus einer Musterdatei ableiten
// ---------------------------------------------------------------------------

const SYNONYMS: Record<CanonicalField, string[]> = {
  externalId: ['id', 'entry id', 'eintrag id', 'worklog id', 'external id', 'externe id'],
  userRef: ['user', 'benutzer', 'mitarbeiter', 'mitarbeiterin', 'mitarbeitende', 'employee', 'name', 'person', 'member'],
  userEmail: ['email', 'e-mail', 'mail', 'user email', 'e-mail-adresse'],
  userGroup: ['group', 'gruppe', 'team', 'abteilung', 'department'],
  clientRef: ['client', 'kunde', 'customer', 'auftraggeber'],
  projectRef: ['project', 'projekt', 'project name', 'projektname'],
  taskRef: ['task', 'aufgabe', 'activity', 'tätigkeit', 'taetigkeit'],
  date: ['start date', 'date', 'datum', 'tag', 'day', 'startdatum', 'von datum'],
  startTime: ['start time', 'startzeit', 'von', 'start', 'beginn', 'from', 'kommen'],
  endTime: ['end time', 'endzeit', 'bis', 'ende', 'end', 'to', 'gehen'],
  duration: ['duration (decimal)', 'duration (h)', 'duration', 'dauer', 'dauer (h)', 'dauer (dezimal)', 'stunden', 'hours', 'time (decimal)', 'zeit'],
  breakMinutes: ['break', 'pause', 'pause (min)', 'break (min)'],
  description: ['description', 'beschreibung', 'notiz', 'note', 'notes', 'kommentar', 'comment'],
  isBillable: ['billable', 'abrechenbar', 'fakturierbar'],
  dayType: ['type', 'art', 'abwesenheitsart', 'absence type', 'day type', 'tagesart'],
  hourlyBillingRate: ['billable rate*', 'stundensatz*', 'hourly rate*'],
  hourlyCostRate: ['cost rate*', 'kostensatz*'],
};

export interface DerivedSchemaResult {
  schema: ImportSchema;
  headers: string[];
  sampleRows: Array<Record<string, string>>;
  detected: {
    delimiter: ',' | ';' | '\t';
    dateFormat: DateFormat;
    dateFormatAmbiguous: boolean;
    durationFormat: DurationFormat;
    decimalSeparator: DecimalSeparator;
    unmappedHeaders: string[];
    unknownBillableValues: string[];
    matchedBuiltinSchemaId?: string;
  };
  validation: ReturnType<typeof validateImportSchema>;
}

function detectDateFormat(samples: string[]): { format: DateFormat; ambiguous: boolean } {
  const vals = samples.map(s => s.split(/[T ]/)[0]).filter(Boolean);
  if (vals.length === 0) return { format: 'auto', ambiguous: false };
  if (vals.every(v => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v))) return { format: 'DD.MM.YYYY', ambiguous: false };
  if (vals.every(v => /^\d{4}-\d{1,2}-\d{1,2}$/.test(v))) return { format: 'YYYY-MM-DD', ambiguous: false };
  if (vals.every(v => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))) {
    const parts = vals.map(v => v.split('/').map(Number));
    if (parts.some(p => p[0] > 12)) return { format: 'DD/MM/YYYY', ambiguous: false };
    if (parts.some(p => p[1] > 12)) return { format: 'MM/DD/YYYY', ambiguous: false };
    return { format: 'DD/MM/YYYY', ambiguous: true };
  }
  return { format: 'auto', ambiguous: true };
}

export function deriveSchemaFromCsv(text: string, opts: { name?: string; source?: string; sampleSize?: number } = {}): DerivedSchemaResult {
  const parsed = parseCsvObjects(text, 'auto', 1);
  const { headers } = parsed;
  const sample = parsed.rows.slice(0, opts.sampleSize ?? 50).map(r => r.data);
  const fp = headerFingerprint(headers);

  const builtin = BUILTIN_SCHEMAS.find(b => {
    const c = b.columns;
    return !!resolveColumn(headers, c.userRef) && !!resolveColumn(headers, c.date) && !!resolveColumn(headers, c.projectRef) && !!resolveColumn(headers, c.duration);
  });

  const used = new Set<string>();
  const columns: Partial<Record<CanonicalField, string | string[]>> = {};
  for (const f of CANONICAL_FIELDS) {
    if (f === 'duration') {
      const hits = SYNONYMS.duration.map(s => resolveColumn(headers.filter(h => !used.has(h)), s)).filter((h): h is string => !!h);
      const uniq = [...new Set(hits)];
      if (uniq.length) { uniq.forEach(h => used.add(h)); columns.duration = uniq.length === 1 ? uniq[0] : uniq; }
      continue;
    }
    for (const syn of SYNONYMS[f]) {
      const hit = resolveColumn(headers.filter(h => !used.has(h)), syn);
      if (hit) { columns[f] = hit; used.add(hit); break; }
    }
  }

  const values = (c: string | string[] | undefined) => {
    const cols = refList(c);
    return sample.flatMap(r => cols.map(col => cleanCell(r[col]))).filter(Boolean);
  };
  const { format: dateFormat, ambiguous } = detectDateFormat(values(columns.date));
  const durVals = values(columns.duration);
  const durationFormat: DurationFormat = durVals.length && durVals.every(v => v.includes(':')) ? 'HH:MM' : durVals.some(v => v.includes(':')) ? 'auto' : 'decimal';
  const numericVals = [...durVals.filter(v => !v.includes(':')), ...values(columns.hourlyBillingRate), ...values(columns.hourlyCostRate)];
  const decimalSeparator: DecimalSeparator = numericVals.some(v => /^\d+,\d+$/.test(v)) ? ',' : numericVals.some(v => /^\d+\.\d+$/.test(v)) ? '.' : 'auto';

  const billVals = [...new Set(values(columns.isBillable).map(v => v.toLowerCase()))];
  const unknownBillableValues = billVals.filter(v => !DEFAULT_TRUE_VALUES.includes(v) && !DEFAULT_FALSE_VALUES.includes(v));

  const target: ImportTarget = columns.projectRef ? 'TIME_ENTRY' : columns.dayType ? 'ABSENCE' : 'WORKING_TIME';

  const schema: ImportSchema = {
    schemaVersion: 1,
    name: opts.name || 'Entwurf aus Musterdatei',
    source: opts.source || 'custom-csv',
    version: 1,
    fileType: 'csv',
    delimiter: parsed.delimiter,
    encoding: 'utf-8',
    headerRow: 1,
    target,
    columns,
    formats: { date: dateFormat, duration: durationFormat, decimalSeparator },
    billable: { trueValues: DEFAULT_TRUE_VALUES, falseValues: DEFAULT_FALSE_VALUES },
    duplicateKey: columns.externalId ? 'externalId' : 'fingerprint',
    validation: { maxDurationHours: 12 },
    headerFingerprint: fp,
  };

  return {
    schema,
    headers,
    sampleRows: sample.slice(0, 5),
    detected: {
      delimiter: parsed.delimiter,
      dateFormat,
      dateFormatAmbiguous: ambiguous,
      durationFormat,
      decimalSeparator,
      unmappedHeaders: headers.filter(h => !used.has(h)),
      unknownBillableValues,
      matchedBuiltinSchemaId: builtin?.id,
    },
    validation: validateImportSchema(schema),
  };
}
