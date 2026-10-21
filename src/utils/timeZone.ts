/**
 * Zeitzonen-Hilfen (Frontend und Server).
 *
 * Buchungen speichern Datum und Uhrzeiten als Ortszeit des Mitarbeiters ("Wanduhrzeit"),
 * es wird nichts nach UTC umgerechnet. Entscheidend ist daher nur, in welcher Zeitzone
 * "heute", die Stoppuhr-Zeiten und die Zukunftsgrenze bestimmt werden.
 *
 * Reihenfolge: im Profil gewählte Zeitzone → zuletzt erkannte Gerätezeitzone → Fallback.
 */
export const DEFAULT_TIME_ZONE = 'Europe/Berlin';

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Zeitzone des Geräts (Browser/Node), ungültig → Fallback. */
export function deviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export interface TimeZoneCarrier {
  timeZone?: string;
  deviceTimeZone?: string;
}

/** Effektive Zeitzone eines Mitarbeiters. */
export function userTimeZone(user: TimeZoneCarrier | null | undefined, fallback: string = DEFAULT_TIME_ZONE): string {
  if (user && isValidTimeZone(user.timeZone)) return user.timeZone;
  if (user && isValidTimeZone(user.deviceTimeZone)) return user.deviceTimeZone;
  return isValidTimeZone(fallback) ? fallback : DEFAULT_TIME_ZONE;
}

/** Datum (YYYY-MM-DD) und Minuten seit Mitternacht eines Zeitpunkts in einer Zeitzone. */
export function zonedParts(d: Date, tz: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute'))
  };
}

/** Heutiges Datum (YYYY-MM-DD) in der angegebenen Zeitzone. */
export function todayInZone(tz: string, now: Date = new Date()): string {
  return zonedParts(now, tz).date;
}

/** Heutiges Datum der Zeitzone als lokales Date (00:00) – für Kalender-/Preset-Berechnungen. */
export function todayInZoneAsDate(tz: string, now: Date = new Date()): Date {
  const [y, m, d] = todayInZone(tz, now).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Letzter Tag des Folgemonats (YYYY-MM-DD) – Zukunftsgrenze außer Urlaub/Elternzeit. */
export function endOfNextMonth(today: string): string {
  const [y, m] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
}

/** Alle vom Laufzeitsystem bekannten IANA-Zeitzonen (für die Auswahl im Profil). */
export function listTimeZones(): string[] {
  const anyIntl = Intl as any;
  if (typeof anyIntl.supportedValuesOf === 'function') {
    try { return anyIntl.supportedValuesOf('timeZone') as string[]; } catch { /* ignore */ }
  }
  return [DEFAULT_TIME_ZONE, 'UTC', 'Europe/London', 'Europe/Lisbon', 'America/Sao_Paulo', 'America/New_York', 'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Istanbul'];
}
