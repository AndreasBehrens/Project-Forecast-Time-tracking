import { describe, it, expect } from 'vitest';
import { computeFingerprint, fingerprintOfTimeEntry, fingerprintOfWorkingTime, canUndoImportBatch, IMPORT_UNDO_WINDOW_DAYS } from '../../server/import/fingerprint.js';

describe('Einheitlicher Duplikat-Fingerabdruck', () => {
  const base = { userId: 'u-4', date: '2026-11-02', startTime: '09:00', durationMinutes: 90, projectId: 'p-1' };

  it('ist für CSV- und PDF-Eintrag derselben Buchung identisch (Beschreibung zählt nicht)', () => {
    const csv = computeFingerprint(base);
    const pdf = fingerprintOfTimeEntry({ ...base });
    expect(csv).toBe(pdf);
    expect(csv.startsWith('fp:')).toBe(true);
  });

  it('unterscheidet abweichende Dauer, Startzeit, Projekt oder Mitarbeitende', () => {
    const fp = computeFingerprint(base);
    expect(computeFingerprint({ ...base, durationMinutes: 91 })).not.toBe(fp);
    expect(computeFingerprint({ ...base, startTime: '10:00' })).not.toBe(fp);
    expect(computeFingerprint({ ...base, projectId: 'p-2' })).not.toBe(fp);
    expect(computeFingerprint({ ...base, userId: 'u-5' })).not.toBe(fp);
  });

  it('nutzt die externe ID der Quelle, wenn vorhanden', () => {
    const a = computeFingerprint({ ...base, source: 'jira', externalId: 'WL-1' });
    const b = computeFingerprint({ ...base, durationMinutes: 30, source: 'jira', externalId: 'WL-1' });
    expect(a).toBe(b);
    expect(a.startsWith('ext:')).toBe(true);
    expect(computeFingerprint({ ...base, source: 'clockify', externalId: 'WL-1' })).not.toBe(a);
  });

  it('behandelt ganztägige Abwesenheiten pro Tag und Art als eindeutig', () => {
    const a = fingerprintOfWorkingTime({ userId: 'u-4', date: '2026-11-02', totalNetMinutes: 0, dayType: 'VACATION' });
    const b = fingerprintOfWorkingTime({ userId: 'u-4', date: '2026-11-02', startTime: '09:00', totalNetMinutes: 480, dayType: 'VACATION' });
    expect(a).toBe(b);
    expect(fingerprintOfWorkingTime({ userId: 'u-4', date: '2026-11-02', totalNetMinutes: 0, dayType: 'SICK' })).not.toBe(a);
  });
});

describe('Rückgängig-Regel für Import-Batches', () => {
  const created = '2026-11-01T10:00:00.000Z';
  const notLocked = () => false;

  it('erlaubt das Rückgängigmachen innerhalb von 5 Tagen', () => {
    expect(IMPORT_UNDO_WINDOW_DAYS).toBe(5);
    expect(canUndoImportBatch({ createdAt: created }, ['2026-10-30'], notLocked, new Date('2026-11-06T09:59:59.000Z'))).toEqual({ allowed: true });
    expect(canUndoImportBatch({ createdAt: created }, ['2026-10-30'], notLocked, new Date('2026-11-06T10:00:00.000Z'))).toEqual({ allowed: true });
  });

  it('verweigert nach Ablauf von 5 Tagen', () => {
    expect(canUndoImportBatch({ createdAt: created }, [], notLocked, new Date('2026-11-06T10:00:01.000Z'))).toEqual({ allowed: false, reason: 'EXPIRED' });
  });

  it('verweigert bei gesperrtem Zeitraum und nennt die betroffenen Tage', () => {
    const r = canUndoImportBatch({ createdAt: created }, ['2026-10-30', '2026-10-30', '2026-11-01'], d => d.startsWith('2026-10'), new Date('2026-11-02T00:00:00.000Z'));
    expect(r).toEqual({ allowed: false, reason: 'PERIOD_LOCKED', lockedDates: ['2026-10-30'] });
  });

  it('verweigert einen bereits rückgängig gemachten Import', () => {
    expect(canUndoImportBatch({ createdAt: created, revertedAt: '2026-11-02T00:00:00.000Z' }, [], notLocked, new Date('2026-11-02T01:00:00.000Z')))
      .toEqual({ allowed: false, reason: 'ALREADY_REVERTED' });
  });
});
