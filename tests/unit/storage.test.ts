import { describe, it, expect, beforeEach, vi } from 'vitest';

// Persistenz-Gateway mocken: Unit-Tests dürfen keine echte PostgreSQL-Verbindung
// benötigen. saveAll/loadAll werden zu No-Ops.
vi.mock('../../server/prismaStore.js', () => ({
  saveAll: vi.fn().mockResolvedValue(undefined),
  loadAll: vi.fn().mockResolvedValue(null),
  prisma: { $disconnect: vi.fn() },
}));

import { StorageService, localISODate, maxFutureBookingDate } from '../../server/storage.js';

describe('StorageService.resolveRates (Rate-Hierarchie)', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  it('fällt auf den Organisations-Standardsatz zurück, wenn kein Benutzer existiert', () => {
    const r = storage.resolveRates('unbekannter-user');
    expect(r.billingRate).toBe(130); // Org-Default Hauptmandant
    expect(r.costRate).toBe(65);
    expect(r.billingSource).toBe('ORG_DEFAULT');
    expect(r.costSource).toBe('ORG_DEFAULT');
  });

  it('nutzt den Satz der fachlichen Rolle (JOB_ROLE), wenn gesetzt', () => {
    const s = storage as any;
    s.jobRoles.push({ id: 'role-test', orgId: s.organization.id, name: 'Senior Dev', standardBillingRate: 160, standardCostRate: 80 });
    s.users.push({ id: 'u-test', orgId: s.organization.id, name: 'Test User', jobRoleId: 'role-test' });

    const r = storage.resolveRates('u-test');
    expect(r.billingRate).toBe(160);
    expect(r.costRate).toBe(80);
    expect(r.billingSource).toBe('JOB_ROLE');
    expect(r.jobRoleName).toBe('Senior Dev');
  });

  it('überschreibt die Rolle mit dem individuellen Benutzersatz (USER_INDIVIDUAL)', () => {
    const s = storage as any;
    s.jobRoles.push({ id: 'role-test', orgId: s.organization.id, name: 'Dev', standardBillingRate: 160, standardCostRate: 80 });
    s.users.push({ id: 'u-test', orgId: s.organization.id, name: 'Test', jobRoleId: 'role-test', individualBillingRate: 200, individualCostRate: 100 });

    const r = storage.resolveRates('u-test');
    expect(r.billingRate).toBe(200);
    expect(r.billingSource).toBe('USER_INDIVIDUAL');
    expect(r.costRate).toBe(100);
    expect(r.costSource).toBe('USER_INDIVIDUAL');
  });

  it('projektspezifischer Mitgliedersatz (PROJECT_MEMBER) hat höchste Priorität', () => {
    const s = storage as any;
    s.users.push({ id: 'u-test', orgId: s.organization.id, name: 'Test', individualBillingRate: 200, individualCostRate: 100 });
    s.projects.push({
      id: 'proj-test',
      orgId: s.organization.id,
      name: 'Projekt',
      memberRates: [{ userId: 'u-test', hourlyBillingRate: 250, hourlyCostRate: 120 }],
    });

    const r = storage.resolveRates('u-test', 'proj-test');
    expect(r.billingRate).toBe(250);
    expect(r.billingSource).toBe('PROJECT_MEMBER');
    expect(r.costRate).toBe(120);
    expect(r.costSource).toBe('PROJECT_MEMBER');
  });
});

describe('StorageService GoBD Audit-Hashkette', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
  });

  function generateAuditLogs(n: number): void {
    // updateClient erzeugt jeweils einen Audit-Log-Eintrag (logAudit).
    const s = storage as any;
    // Seed-Daten enthalten Alt-Einträge ohne Hash; für einen isolierten Test
    // der Verkettungslogik starten wir mit einer leeren Kette (Genesis).
    s.auditLogs = [];
    const clientId = s.clients[0]?.id;
    expect(clientId).toBeTruthy();
    for (let i = 0; i < n; i++) {
      storage.updateClient(clientId, { contactPerson: `Kontakt ${i}` }, 'u-1');
    }
  }

  it('erzeugt eine gültige, verkettete Hashkette für neue Audit-Einträge', () => {
    generateAuditLogs(5);
    const report = storage.verifyAuditHashChain();
    expect(report.isChainValid).toBe(true);
    expect(report.totalEntriesChecked).toBeGreaterThanOrEqual(5);
    expect(report.tamperedEntryIds).toHaveLength(0);
  });

  it('jeder Eintrag referenziert den Hash seines Vorgängers (previousHash)', () => {
    generateAuditLogs(3);
    const s = storage as any;
    // auditLogs sind absteigend (neueste zuerst); in chronologischer Reihenfolge prüfen
    const chrono = [...s.auditLogs].reverse();
    for (let i = 1; i < chrono.length; i++) {
      expect(chrono[i].previousHash).toBe(chrono[i - 1].hash);
    }
  });

  it('erkennt nachträgliche Manipulation eines Audit-Eintrags', () => {
    generateAuditLogs(5);
    const s = storage as any;
    // Einen Eintrag manipulieren, ohne den Hash neu zu berechnen
    const target = s.auditLogs[2];
    const tamperedId = target.id;
    target.reason = 'MANIPULIERT';

    const report = storage.verifyAuditHashChain();
    expect(report.isChainValid).toBe(false);
    expect(report.tamperedEntryIds).toContain(tamperedId);
  });

  it('bleibt gültig über einen verlustfreien JSON-Roundtrip (Persistenz-Simulation)', () => {
    generateAuditLogs(4);
    const s = storage as any;
    // Persistenz serialisiert als JSONB -> Roundtrip darf nichts verändern
    const roundTripped = JSON.parse(JSON.stringify(s.auditLogs));
    s.auditLogs = roundTripped;
    const report = storage.verifyAuditHashChain();
    expect(report.isChainValid).toBe(true);
  });
});

describe('StorageService.getWorkingTimeSummary (Tagesart-Anrechnung & Neutralisierung)', () => {
  let storage: StorageService;
  const MONTH = '2026-08';

  beforeEach(() => {
    storage = new StorageService();
    const s = storage as any;
    // Testbenutzer mit 8h Tagessoll, Mo–Fr
    s.users.push({
      id: 'u-wt',
      orgId: s.organization.id,
      name: 'Zeit Tester',
      dailyTargetHours: 8,
      workDays: [1, 2, 3, 4, 5],
    });
  });

  it('rechnet reguläre Arbeitszeit als Ist an', () => {
    storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-03', dayType: 'REGULAR', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
      'u-wt'
    );
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    // 8,5h brutto - 0,5h Pause = 8h netto
    expect(sum.actualWorkedHours).toBe(8);
    expect(sum.actualWorkingHours).toBe(8);
    expect(sum.creditedDays).toBe(0);
    expect(sum.parentalLeaveDays).toBe(0);
  });

  it('rechnet einen ganztägigen Urlaubstag an (Saldo neutral, Sollzeit unverändert)', () => {
    const base = storage.getWorkingTimeSummary('u-wt', MONTH);
    storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-04', dayType: 'VACATION', halfDay: false },
      'u-wt'
    );
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    // Sollzeit bleibt identisch (Urlaubstag zählt weiterhin als Arbeitstag)
    expect(sum.targetHoursTotal).toBe(base.targetHoursTotal);
    // 8h werden angerechnet -> Saldo verbessert sich um genau 8h ggü. Baseline
    expect(sum.creditedHours).toBe(8);
    expect(sum.creditedDays).toBe(1);
    expect(sum.balanceHours).toBeCloseTo(base.balanceHours + 8, 2);
  });

  it('rechnet Krankheit und Sonderurlaub ebenfalls an', () => {
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-04', dayType: 'SICK', halfDay: false }, 'u-wt');
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-05', dayType: 'SPECIAL_LEAVE', halfDay: false }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.creditedDays).toBe(2);
    expect(sum.creditedHours).toBe(16);
  });

  it('neutralisiert Elternzeit vollständig (Sollzeit reduziert, keine Anrechnung)', () => {
    const base = storage.getWorkingTimeSummary('u-wt', MONTH);
    storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-03', dayType: 'PARENTAL_LEAVE', halfDay: false },
      'u-wt'
    );
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    // Ein Werktag weniger im Soll
    expect(sum.effectiveTargetDays).toBeCloseTo(base.targetWorkDays - 1, 2);
    expect(sum.targetHoursTotal).toBeCloseTo(base.targetHoursTotal - 8, 2);
    expect(sum.parentalLeaveDays).toBe(1);
    expect(sum.creditedHours).toBe(0);
    // Saldo bleibt neutral (weder Soll noch Ist an diesem Tag)
    expect(sum.balanceHours).toBeCloseTo(base.balanceHours + 8, 2);
  });

  it('behandelt einen halben Urlaubstag korrekt (0,5 Tag angerechnet + gearbeitete Hälfte)', () => {
    storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-04', dayType: 'VACATION', halfDay: true, startTime: '08:00', endTime: '12:00', breakMinutes: 0 },
      'u-wt'
    );
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.creditedDays).toBe(0.5);
    expect(sum.creditedHours).toBe(4); // 0,5 * 8h
    expect(sum.actualWorkedHours).toBe(4); // 4h gearbeitet
  });

  it('setzt dayType standardmäßig auf REGULAR, wenn nicht angegeben', () => {
    const entry = storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-03', startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
      'u-wt'
    );
    expect(entry.dayType).toBe('REGULAR');
    expect(entry.halfDay).toBe(false);
  });

  it('speichert Ganztags-Abwesenheiten ohne Uhrzeiten', () => {
    const entry = storage.createOrUpdateWorkingTime(
      { userId: 'u-wt', date: '2026-08-03', dayType: 'VACATION', halfDay: false },
      'u-wt'
    );
    expect(entry.totalNetHoursDecimal).toBe(0);
    expect(entry.startTime).toBe('');
    expect(entry.endTime).toBe('');
  });
});

describe('Einheitliche Zeiterfassung: Gesamt-Ist (Projekt + Arbeitszeit + Abwesenheiten)', () => {
  let storage: StorageService;
  const MONTH = '2026-08';

  beforeEach(() => {
    storage = new StorageService();
    const s = storage as any;
    s.users.push({ id: 'u-wt', orgId: s.organization.id, name: 'Zeit Tester', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
  });

  it('addiert Projektzeit und Arbeitszeit ohne Projekt, wenn sie sich nicht überschneiden', () => {
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-03', dayType: 'REGULAR', startTime: '08:00', endTime: '10:00', breakMinutes: 0 }, 'u-wt');
    storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', startTime: '10:00', endTime: '13:00', durationMinutes: 180 }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.actualProjectHours).toBe(3);
    expect(sum.totalActualHours).toBe(5);
  });

  it('zählt Altdaten-"Rahmen"-Tage nicht doppelt (Überschneidung Arbeitszeit/Projektzeit wird abgezogen)', () => {
    // Rahmen 09–17 Uhr mit 1h Pause (7h netto), darin 3h Projektzeit + 1h Projektzeit nach Feierabend
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-03', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }, 'u-wt');
    storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', startTime: '09:00', endTime: '12:00', durationMinutes: 180 }, 'u-wt');
    storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', startTime: '18:00', endTime: '19:00', durationMinutes: 60 }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    // 7h Rahmen + 1h außerhalb = 8h (nicht 7 + 4 = 11h)
    expect(sum.totalActualHours).toBe(8);
  });

  it('enthält angerechnete Abwesenheiten im Gesamt-Ist und liefert den Saldo', () => {
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-04', dayType: 'VACATION', halfDay: false }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.totalActualHours).toBe(8);
    expect(sum.totalBalanceHours).toBeCloseTo(8 - sum.targetHoursTotal, 2);
  });

  it('rechnet ganztägige Abwesenheit an Wochenenden nicht an', () => {
    // 2026-08-08 ist ein Samstag
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-08', dayType: 'SICK', halfDay: false }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.creditedHours).toBe(0);
    expect(sum.creditedDays).toBe(0);
  });

  it('rechnet eine teilzeitige Abwesenheit (nicht ganztägig) mit ihren Stunden an', () => {
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-04', dayType: 'SICK', halfDay: true, partialAbsence: true, startTime: '13:00', endTime: '17:00', breakMinutes: 0 }, 'u-wt');
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH);
    expect(sum.creditedHours).toBe(4);
    expect(sum.creditedDays).toBe(0.5);
    expect(sum.actualWorkedHours).toBe(0);
  });

  it('wertet einen frei gewählten Zeitraum (from/to) aus', () => {
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-03', dayType: 'REGULAR', startTime: '08:00', endTime: '16:00', breakMinutes: 0 }, 'u-wt');
    storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-10', dayType: 'REGULAR', startTime: '08:00', endTime: '16:00', breakMinutes: 0 }, 'u-wt');
    // Mo 03.08. – Fr 07.08. = 5 Arbeitstage
    const sum = storage.getWorkingTimeSummary('u-wt', MONTH, { from: '2026-08-03', to: '2026-08-07' });
    expect(sum.from).toBe('2026-08-03');
    expect(sum.to).toBe('2026-08-07');
    expect(sum.targetWorkDays).toBe(5);
    expect(sum.targetHoursTotal).toBe(40);
    expect(sum.totalActualHours).toBe(8);
  });
});

describe('StorageService.computeWorkProjectOverlapMinutes', () => {
  const ov = StorageService.computeWorkProjectOverlapMinutes;

  it('liefert 0 ohne Überschneidung oder ohne Uhrzeiten', () => {
    expect(ov([{ date: 'd', startTime: '08:00', endTime: '10:00' }], [{ date: 'd', startTime: '10:00', endTime: '11:00', durationMinutes: 60 }])).toBe(0);
    expect(ov([{ date: 'd', startTime: '08:00', endTime: '10:00' }], [{ date: 'd', durationMinutes: 60 }])).toBe(0);
    expect(ov([{ date: 'a', startTime: '08:00', endTime: '10:00' }], [{ date: 'b', startTime: '08:00', endTime: '10:00', durationMinutes: 120 }])).toBe(0);
  });

  it('zählt überlappende Projektintervalle nur einmal', () => {
    const r = ov(
      [{ date: 'd', startTime: '09:00', endTime: '17:00', breakMinutes: 0 }],
      [{ date: 'd', startTime: '09:00', endTime: '11:00', durationMinutes: 120 }, { date: 'd', startTime: '10:00', endTime: '12:00', durationMinutes: 120 }]
    );
    expect(r).toBe(180);
  });

  it('begrenzt die Überschneidung auf die Netto-Arbeitszeit (Pause im Rahmen)', () => {
    const r = ov(
      [{ date: 'd', startTime: '09:00', endTime: '17:00', breakMinutes: 60 }],
      [{ date: 'd', startTime: '09:00', endTime: '17:00', durationMinutes: 480 }]
    );
    expect(r).toBe(420);
  });

  it('behandelt Einträge über Mitternacht', () => {
    const r = ov(
      [{ date: 'd', startTime: '20:00', endTime: '02:00', breakMinutes: 0 }],
      [{ date: 'd', startTime: '23:00', endTime: '01:00', durationMinutes: 120 }]
    );
    expect(r).toBe(120);
  });
});

describe('Zukunfts- und Datumsregeln bei Buchungen', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
    const s = storage as any;
    s.users.push({ id: 'u-wt', orgId: s.organization.id, name: 'Zeit Tester', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
  });

  it('maxFutureBookingDate liefert das Ende des Folgemonats (inkl. Jahreswechsel/Februar)', () => {
    expect(maxFutureBookingDate('2026-10-16')).toBe('2026-11-30');
    expect(maxFutureBookingDate('2026-12-05')).toBe('2027-01-31');
    expect(maxFutureBookingDate('2026-01-31')).toBe('2026-02-28');
  });

  it('localISODate verwendet deutsche Zeit statt UTC', () => {
    // 22:30 UTC am 15.10. = 00:30 Uhr am 16.10. in Berlin (Sommerzeit)
    expect(localISODate(new Date('2026-10-15T22:30:00Z'))).toBe('2026-10-16');
    // 23:30 UTC am 15.01. = 00:30 Uhr am 16.01. in Berlin (Winterzeit)
    expect(localISODate(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16');
  });

  it('lehnt reguläre Arbeitszeit und Projektzeit jenseits des Folgemonats ab', () => {
    expect(() => storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2099-01-05', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' }, 'u-wt')).toThrow(/im Voraus/);
    expect(() => storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2099-01-05', dayType: 'SICK', halfDay: false }, 'u-wt')).toThrow(/im Voraus/);
    expect(() => storage.createTimeEntry({ userId: 'u-wt', date: '2099-01-05', durationMinutes: 60 }, 'u-wt')).toThrow(/im Voraus/);
  });

  it('erlaubt Urlaub und Elternzeit beliebig weit in der Zukunft', () => {
    expect(storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2099-01-05', dayType: 'VACATION', halfDay: false }, 'u-wt').date).toBe('2099-01-05');
    expect(storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2099-01-06', dayType: 'PARENTAL_LEAVE', halfDay: false }, 'u-wt').date).toBe('2099-01-06');
  });

  it('erlaubt Buchungen innerhalb des Folgemonats', () => {
    const max = maxFutureBookingDate();
    expect(storage.createTimeEntry({ userId: 'u-wt', date: max, durationMinutes: 60 }, 'u-wt').date).toBe(max);
  });

  it('verhindert das Umwandeln eines Zukunfts-Urlaubs in einen regulären Arbeitstag', () => {
    const vac = storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2099-01-05', dayType: 'VACATION', halfDay: false }, 'u-wt');
    expect(() => storage.createOrUpdateWorkingTime({ id: vac.id, userId: 'u-wt', date: '2099-01-05', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' }, 'u-wt')).toThrow(/im Voraus/);
  });

  it('setzt ohne Datum das heutige Datum in deutscher Zeit', () => {
    const e = storage.createTimeEntry({ userId: 'u-wt', durationMinutes: 30 }, 'u-wt');
    expect(e.date).toBe(localISODate());
  });
});

describe('Projektzeiten: Buchen für Kollegen & Bearbeiten', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
    const s = storage as any;
    s.users.push({ id: 'u-wt', orgId: s.organization.id, name: 'Zeit Tester', dailyTargetHours: 8, workDays: [1, 2, 3, 4, 5] });
  });

  it('bucht für den angegebenen Mitarbeiter (userId) statt für den Handelnden', () => {
    const e = storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', durationMinutes: 60 }, 'u-1');
    expect(e.userId).toBe('u-wt');
    expect(e.userName).toBe('Zeit Tester');
  });

  it('bucht ohne userId für den handelnden Benutzer', () => {
    const e = storage.createTimeEntry({ date: '2026-08-03', durationMinutes: 60 }, 'u-1');
    expect(e.userId).toBe('u-1');
  });

  it('zieht beim Bearbeiten die Pause von der Dauer ab (wie beim Anlegen)', () => {
    const e = storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', startTime: '09:00', endTime: '12:00', durationMinutes: 180 }, 'u-wt');
    const u = storage.updateTimeEntry(e.id, { startTime: '09:00', endTime: '13:00', breakMinutes: 30 }, 'u-wt');
    expect(u?.durationMinutes).toBe(210);
    expect(u?.durationHoursDecimal).toBe(3.5);
  });

  it('lehnt das Verschieben eines Eintrags weit in die Zukunft ab', () => {
    const e = storage.createTimeEntry({ userId: 'u-wt', date: '2026-08-03', durationMinutes: 60 }, 'u-wt');
    expect(() => storage.updateTimeEntry(e.id, { date: '2099-01-05' }, 'u-wt')).toThrow(/im Voraus/);
  });

  it('verhindert Änderungen an Arbeitszeit aus einem gesperrten Monat (auch per Datumswechsel)', () => {
    const w = storage.createOrUpdateWorkingTime({ userId: 'u-wt', date: '2026-08-03', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' }, 'u-wt');
    storage.lockPeriod({ periodKey: '2026-08', actorId: 'u-1' });
    expect(() => storage.createOrUpdateWorkingTime({ id: w.id, userId: 'u-wt', date: '2026-09-01', dayType: 'REGULAR', startTime: '09:00', endTime: '17:00' }, 'u-wt')).toThrow(/GoBD/);
  });
});
