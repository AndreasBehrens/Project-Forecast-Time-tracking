import { describe, it, expect, beforeEach, vi } from 'vitest';

// Persistenz-Gateway mocken: Unit-Tests dürfen keine echte PostgreSQL-Verbindung
// benötigen. saveAll/loadAll werden zu No-Ops.
vi.mock('../../server/prismaStore.js', () => ({
  saveAll: vi.fn().mockResolvedValue(undefined),
  loadAll: vi.fn().mockResolvedValue(null),
  prisma: { $disconnect: vi.fn() },
}));

import { StorageService } from '../../server/storage.js';

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
