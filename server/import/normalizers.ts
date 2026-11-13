/**
 * Normalisierer für den Datenimport (Konzept §5: keine stillen Ersatzwerte).
 *
 * Jede Funktion liefert entweder `{ ok: true, value }` oder `{ ok: false, error }`.
 * Ungültige Werte werden NIE durch „heute“, „60 Minuten“ o. Ä. ersetzt – der
 * Aufrufer macht daraus einen Zeilenfehler mit Zeilennummer und Originalwert.
 */

export type NormResult<T> =
  | { ok: true; value: T; error?: undefined }
  | { ok: false; value?: undefined; error: string };

export type DateFormat = 'auto' | 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type DurationFormat = 'auto' | 'HH:MM' | 'decimal' | 'minutes';
export type DecimalSeparator = 'auto' | ',' | '.';

export const DEFAULT_TRUE_VALUES = ['yes', 'ja', 'y', 'j', 'true', 'wahr', '1', 'x', 'billable', 'abrechenbar'];
export const DEFAULT_FALSE_VALUES = ['no', 'nein', 'n', 'false', 'falsch', '0', '', 'non-billable', 'nicht abrechenbar'];

const ok = <T>(value: T): NormResult<T> => ({ ok: true, value });
const fail = <T>(error: string): NormResult<T> => ({ ok: false, error });

/** Entfernt Leerraum und umschließende Anführungszeichen. */
export function cleanCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim().replace(/^["']|["']$/g, '').trim();
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Datum → ISO `YYYY-MM-DD`. Bei `auto` werden DD.MM.YYYY, YYYY-MM-DD und
 * Schrägstrich-Formate erkannt; ist ein Schrägstrich-Datum mehrdeutig
 * (z. B. 03/04/2026), wird DD/MM angenommen (europäische Konvention) –
 * über das Schema lässt sich MM/DD/YYYY explizit festlegen.
 */
export function parseDate(raw: unknown, format: DateFormat = 'auto'): NormResult<string> {
  const s = cleanCell(raw);
  if (!s) return fail('Datum fehlt');
  // Zeitanteil abschneiden (z. B. "2026-09-01T00:00:00" oder "01.09.2026 09:00")
  const v = s.split(/[T ]/)[0];

  let y: number | undefined, m: number | undefined, d: number | undefined;
  const dot = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const dash = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (format === 'DD.MM.YYYY' || (format === 'auto' && dot)) {
    if (!dot) return fail(`Datum "${s}" entspricht nicht dem Format TT.MM.JJJJ`);
    [d, m, y] = [Number(dot[1]), Number(dot[2]), Number(dot[3])];
  } else if (format === 'YYYY-MM-DD' || (format === 'auto' && dash)) {
    if (!dash) return fail(`Datum "${s}" entspricht nicht dem Format JJJJ-MM-TT`);
    [y, m, d] = [Number(dash[1]), Number(dash[2]), Number(dash[3])];
  } else if (format === 'DD/MM/YYYY' || format === 'MM/DD/YYYY' || (format === 'auto' && slash)) {
    if (!slash) return fail(`Datum "${s}" entspricht nicht dem Format ${format}`);
    const a = Number(slash[1]), b = Number(slash[2]);
    y = Number(slash[3]);
    if (format === 'MM/DD/YYYY') [m, d] = [a, b];
    else if (format === 'DD/MM/YYYY') [d, m] = [a, b];
    else if (a > 12) [d, m] = [a, b];
    else if (b > 12) [m, d] = [a, b];
    else [d, m] = [a, b];
  } else {
    return fail(`Datum "${s}" hat ein unbekanntes Format`);
  }

  if (!isValidCalendarDate(y!, m!, d!)) return fail(`Datum "${s}" ist kein gültiges Kalenderdatum`);
  return ok(iso(y!, m!, d!));
}

/** Uhrzeit → `HH:mm`. Leer ist erlaubt (→ undefined); ungültig ist ein Fehler. */
export function parseTime(raw: unknown): NormResult<string | undefined> {
  const s = cleanCell(raw);
  if (!s) return ok(undefined);
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return fail(`Uhrzeit "${s}" ist ungültig`);
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toLowerCase();
  if (ampm) {
    if (h < 1 || h > 12) return fail(`Uhrzeit "${s}" ist ungültig`);
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return fail(`Uhrzeit "${s}" ist ungültig`);
  return ok(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
}

/** Dezimalzahl mit wählbarem Trennzeichen. `auto`: letztes `,` oder `.` ist das Dezimaltrennzeichen. */
export function parseDecimal(raw: unknown, sep: DecimalSeparator = 'auto'): NormResult<number> {
  let s = cleanCell(raw).replace(/\s|€|EUR/gi, '');
  if (!s) return fail('Zahl fehlt');
  if (sep === 'auto') {
    const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    sep = lastComma > lastDot ? ',' : '.';
  }
  s = sep === ',' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return fail(`"${cleanCell(raw)}" ist keine gültige Zahl`);
  return ok(Number(s));
}

/**
 * Dauer → Minuten (> 0). Formate: `HH:MM[:SS]`, dezimale Stunden (1,5 / 1.5)
 * oder Minuten. `auto` erkennt `:` als HH:MM, sonst dezimal.
 */
export function parseDuration(raw: unknown, format: DurationFormat = 'auto', sep: DecimalSeparator = 'auto'): NormResult<number> {
  const s = cleanCell(raw);
  if (!s) return fail('Dauer fehlt');
  const useHHMM = format === 'HH:MM' || (format === 'auto' && s.includes(':'));
  let minutes: number;
  if (useHHMM) {
    const m = s.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
    if (!m || Number(m[2]) > 59) return fail(`Dauer "${s}" entspricht nicht dem Format HH:MM`);
    minutes = Number(m[1]) * 60 + Number(m[2]) + Math.round(Number(m[3] || 0) / 60);
  } else {
    const n = parseDecimal(s, sep);
    if (!n.ok) return fail(`Dauer "${s}" ist ungültig`);
    minutes = format === 'minutes' ? Math.round(n.value) : Math.round(n.value * 60);
  }
  if (!Number.isFinite(minutes) || minutes <= 0) return fail(`Dauer "${s}" muss größer als 0 sein`);
  if (minutes > 24 * 60) return fail(`Dauer "${s}" ist länger als 24 Stunden`);
  return ok(minutes);
}

/** Ja/Nein-Wert anhand konfigurierbarer Wertelisten (Groß-/Kleinschreibung egal). */
export function parseBoolean(raw: unknown, trueValues = DEFAULT_TRUE_VALUES, falseValues = DEFAULT_FALSE_VALUES): NormResult<boolean> {
  if (typeof raw === 'boolean') return ok(raw);
  const s = cleanCell(raw).toLowerCase();
  if (trueValues.map(v => v.toLowerCase()).includes(s)) return ok(true);
  if (falseValues.map(v => v.toLowerCase()).includes(s)) return ok(false);
  return fail(`"${cleanCell(raw)}" ist kein bekannter Ja/Nein-Wert`);
}

/** Minuten zwischen zwei `HH:mm`-Zeiten; Ende vor Start gilt als Arbeit über Mitternacht. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}
