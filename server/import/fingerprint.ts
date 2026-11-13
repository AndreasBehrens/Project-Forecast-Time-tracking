import crypto from 'crypto';

/**
 * Einheitlicher Duplikat-Fingerabdruck für alle Importquellen (Konzept §6).
 *
 * 1. Liefert die Quelle eine externalId: `ext:` + SHA-256(Quelle | externalId)
 * 2. Sonst: `fp:` + SHA-256(Mitarbeitende | Datum | Startzeit | Dauer | Projekt)
 *
 * Die Beschreibung fließt bewusst NICHT ein, weil sie sich zwischen CSV- und
 * PDF-Export derselben Buchung unterscheiden kann. Bei Arbeitszeit/Abwesenheit
 * ersetzt die Tagesart das Projekt.
 */
export interface FingerprintInput {
  source?: string;
  externalId?: string;
  userId: string;
  date: string;
  startTime?: string;
  durationMinutes: number;
  projectId?: string;
  dayType?: string;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function computeFingerprint(input: FingerprintInput): string {
  if (input.externalId && input.externalId.trim()) {
    return 'ext:' + sha256(`${(input.source || '').toLowerCase()}|${input.externalId.trim()}`);
  }
  const scope = input.projectId ? `p:${input.projectId}` : `d:${input.dayType || 'REGULAR'}`;
  const parts = [input.userId, input.date, input.startTime || '', String(Math.round(input.durationMinutes)), scope];
  return 'fp:' + sha256(parts.join('|'));
}

/** Fingerabdruck eines bestehenden (auch manuell erfassten) Projektzeit-Eintrags. */
export function fingerprintOfTimeEntry(e: { userId: string; date: string; startTime?: string; durationMinutes: number; projectId?: string }): string {
  return computeFingerprint({ userId: e.userId, date: e.date, startTime: e.startTime, durationMinutes: e.durationMinutes, projectId: e.projectId || undefined });
}

/**
 * Fingerabdruck eines Arbeitszeit-/Abwesenheitseintrags. Ganztägige Abwesenheiten
 * (Urlaub, Krankheit, …) gelten pro Mitarbeitende, Tag und Art als eindeutig –
 * Uhrzeit und Dauer spielen dort keine Rolle.
 */
export function fingerprintOfWorkingTime(e: { userId: string; date: string; startTime?: string; totalNetMinutes: number; dayType?: string; halfDay?: boolean }): string {
  const dayType = e.dayType || 'REGULAR';
  if (dayType !== 'REGULAR' && !e.halfDay) {
    return computeFingerprint({ userId: e.userId, date: e.date, durationMinutes: 0, dayType });
  }
  return computeFingerprint({ userId: e.userId, date: e.date, startTime: e.startTime || undefined, durationMinutes: e.totalNetMinutes, dayType });
}

// ---------------------------------------------------------------------------
// Rückgängig-Regel für Import-Batches (Entscheidung §12: 5 Tage, keine Sperre)
// ---------------------------------------------------------------------------

export const IMPORT_UNDO_WINDOW_DAYS = 5;

export type UndoDenyReason = 'ALREADY_REVERTED' | 'EXPIRED' | 'PERIOD_LOCKED';

export function canUndoImportBatch(
  batch: { createdAt: string; revertedAt?: string },
  entryDates: string[],
  isPeriodLocked: (date: string) => boolean,
  now: Date = new Date()
): { allowed: true } | { allowed: false; reason: UndoDenyReason; lockedDates?: string[] } {
  if (batch.revertedAt) return { allowed: false, reason: 'ALREADY_REVERTED' };
  const ageMs = now.getTime() - new Date(batch.createdAt).getTime();
  if (!(ageMs <= IMPORT_UNDO_WINDOW_DAYS * 24 * 60 * 60 * 1000)) return { allowed: false, reason: 'EXPIRED' };
  const lockedDates = [...new Set(entryDates.filter(d => isPeriodLocked(d)))];
  if (lockedDates.length > 0) return { allowed: false, reason: 'PERIOD_LOCKED', lockedDates };
  return { allowed: true };
}
