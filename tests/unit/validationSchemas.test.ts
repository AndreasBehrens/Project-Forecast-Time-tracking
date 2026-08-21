import { describe, it, expect } from 'vitest';
import {
  CreateTimeEntrySchema,
  UpdateTimeEntrySchema,
  CreateWorkingTimeSchema,
  CreateForecastSchema,
  CreateOrganizationSchema,
  PeriodLockSchema,
} from '../../server/validationSchemas.js';

describe('CreateTimeEntrySchema', () => {
  const valid = {
    projectId: 'p-1',
    date: '2025-06-02',
    durationMinutes: 480,
  };

  it('akzeptiert einen gültigen Zeiteintrag und setzt Defaults', () => {
    const r = CreateTimeEntrySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.breakMinutes).toBe(0);
      expect(r.data.isBillable).toBe(true);
      expect(r.data.description).toBe('');
    }
  });

  it('lehnt fehlende Projekt-ID ab', () => {
    const r = CreateTimeEntrySchema.safeParse({ ...valid, projectId: '' });
    expect(r.success).toBe(false);
  });

  it('lehnt ungültiges Datumsformat ab', () => {
    const r = CreateTimeEntrySchema.safeParse({ ...valid, date: '02.06.2025' });
    expect(r.success).toBe(false);
  });

  it('lehnt Dauer über 24 Stunden ab', () => {
    const r = CreateTimeEntrySchema.safeParse({ ...valid, durationMinutes: 1441 });
    expect(r.success).toBe(false);
  });

  it('lehnt Dauer unter 1 Minute ab', () => {
    const r = CreateTimeEntrySchema.safeParse({ ...valid, durationMinutes: 0 });
    expect(r.success).toBe(false);
  });

  it('akzeptiert gültige Start-/Endzeit und leere Strings', () => {
    expect(CreateTimeEntrySchema.safeParse({ ...valid, startTime: '08:00', endTime: '16:30' }).success).toBe(true);
    expect(CreateTimeEntrySchema.safeParse({ ...valid, startTime: '', endTime: '' }).success).toBe(true);
  });

  it('lehnt ungültige Uhrzeit ab', () => {
    expect(CreateTimeEntrySchema.safeParse({ ...valid, startTime: '25:00' }).success).toBe(false);
    expect(CreateTimeEntrySchema.safeParse({ ...valid, startTime: '8:0' }).success).toBe(false);
  });
});

describe('UpdateTimeEntrySchema', () => {
  it('erlaubt partielle Updates', () => {
    expect(UpdateTimeEntrySchema.safeParse({ description: 'Neu' }).success).toBe(true);
    expect(UpdateTimeEntrySchema.safeParse({}).success).toBe(true);
  });

  it('akzeptiert Grund und Genehmigungsstatus', () => {
    const r = UpdateTimeEntrySchema.safeParse({ reason: 'Korrektur', approvalStatus: 'APPROVED' });
    expect(r.success).toBe(true);
  });

  it('lehnt ungültigen Genehmigungsstatus ab', () => {
    expect(UpdateTimeEntrySchema.safeParse({ approvalStatus: 'FOO' }).success).toBe(false);
  });
});

describe('CreateWorkingTimeSchema', () => {
  const valid = { date: '2025-06-02', startTime: '08:00', endTime: '17:00' };

  it('akzeptiert gültige Anwesenheit und setzt Pausendefault (30)', () => {
    const r = CreateWorkingTimeSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.breakMinutes).toBe(30);
  });

  it('erfordert Start- und Endzeit', () => {
    expect(CreateWorkingTimeSchema.safeParse({ date: '2025-06-02' }).success).toBe(false);
  });

  it('lehnt Pause über 480 Minuten ab', () => {
    expect(CreateWorkingTimeSchema.safeParse({ ...valid, breakMinutes: 481 }).success).toBe(false);
  });
});

describe('CreateForecastSchema', () => {
  const valid = { projectId: 'p-1', userId: 'u-1', month: '2025-06', plannedHours: 40 };

  it('akzeptiert eine gültige Planung', () => {
    expect(CreateForecastSchema.safeParse(valid).success).toBe(true);
  });

  it('lehnt ungültiges Monatsformat ab', () => {
    expect(CreateForecastSchema.safeParse({ ...valid, month: '2025-6' }).success).toBe(false);
  });

  it('lehnt negative Stunden ab', () => {
    expect(CreateForecastSchema.safeParse({ ...valid, plannedHours: -1 }).success).toBe(false);
  });

  it('lehnt mehr als 720 Stunden pro Monat ab', () => {
    expect(CreateForecastSchema.safeParse({ ...valid, plannedHours: 721 }).success).toBe(false);
  });
});

describe('CreateOrganizationSchema', () => {
  const valid = { name: 'Test GmbH', defaultHourlyBillingRate: 130, defaultHourlyCostRate: 65 };

  it('akzeptiert eine gültige Organisation und setzt Defaults', () => {
    const r = CreateOrganizationSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.defaultCurrency).toBe('EUR');
      expect(r.data.stateLocation).toBe('DE-BE');
      expect(r.data.logoColor).toBe('emerald');
    }
  });

  it('lehnt zu kurzen Namen ab', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('lehnt nicht-positiven Abrechnungssatz ab', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, defaultHourlyBillingRate: 0 }).success).toBe(false);
  });

  it('lehnt negativen Kostensatz ab', () => {
    expect(CreateOrganizationSchema.safeParse({ ...valid, defaultHourlyCostRate: -5 }).success).toBe(false);
  });
});

describe('PeriodLockSchema', () => {
  const valid = {
    periodKey: '2025-06',
    orgId: 'org-1',
    status: 'LOCKED',
    lockedByUserId: 'u-1',
    lockedByUserName: 'Admin',
  };

  it('akzeptiert eine gültige Periodensperre mit Defaults', () => {
    const r = PeriodLockSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.reason).toBe('Regulärer Monatsabschluss');
      expect(r.data.complianceStatus).toBe('COMPLIANT');
    }
  });

  it('lehnt ungültigen Periodenschlüssel ab', () => {
    expect(PeriodLockSchema.safeParse({ ...valid, periodKey: '2025/06' }).success).toBe(false);
  });

  it('lehnt ungültigen Status ab', () => {
    expect(PeriodLockSchema.safeParse({ ...valid, status: 'CLOSED' }).success).toBe(false);
  });
});
