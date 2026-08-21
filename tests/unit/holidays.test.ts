import { describe, it, expect } from 'vitest';
import {
  getEasterSunday,
  getGermanHolidays,
  getWorkingDaysInRange,
  resolveUserHolidayState,
} from '../../server/holidays.js';

/** Helfer: Datum als YYYY-MM-DD (UTC) */
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe('getEasterSunday', () => {
  // Bekannte Ostersonntagsdaten (Gauß-Osterformel)
  const cases: Array<[number, string]> = [
    [2020, '2020-04-12'],
    [2021, '2021-04-04'],
    [2022, '2022-04-17'],
    [2023, '2023-04-09'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ];
  it.each(cases)('berechnet Ostersonntag %i korrekt', (year, expected) => {
    expect(iso(getEasterSunday(year))).toBe(expected);
  });
});

describe('getGermanHolidays', () => {
  it('enthält alle bundesweiten Feiertage für Berlin 2025', () => {
    const h = getGermanHolidays(2025, 'DE-BE');
    const dates = h.map((x) => x.date);
    // Ostersonntag 2025 = 2025-04-20
    expect(dates).toContain('2025-01-01'); // Neujahr
    expect(dates).toContain('2025-04-18'); // Karfreitag (Ostern -2)
    expect(dates).toContain('2025-04-21'); // Ostermontag (Ostern +1)
    expect(dates).toContain('2025-05-01'); // Tag der Arbeit
    expect(dates).toContain('2025-05-29'); // Christi Himmelfahrt (Ostern +39)
    expect(dates).toContain('2025-06-09'); // Pfingstmontag (Ostern +50)
    expect(dates).toContain('2025-10-03'); // Tag der Deutschen Einheit
    expect(dates).toContain('2025-12-25'); // 1. Weihnachtstag
    expect(dates).toContain('2025-12-26'); // 2. Weihnachtstag
  });

  it('enthält den Berlin-spezifischen Internationalen Frauentag', () => {
    const berlin = getGermanHolidays(2025, 'DE-BE').map((x) => x.date);
    const bayern = getGermanHolidays(2025, 'DE-BY').map((x) => x.date);
    expect(berlin).toContain('2025-03-08');
    expect(bayern).not.toContain('2025-03-08');
  });

  it('enthält bayernspezifische Feiertage (Heilige Drei Könige, Fronleichnam)', () => {
    const bayern = getGermanHolidays(2025, 'DE-BY').map((x) => x.date);
    expect(bayern).toContain('2025-01-06'); // Heilige Drei Könige
    expect(bayern).toContain('2025-06-19'); // Fronleichnam (Ostern +60)
  });

  it('berechnet Buß- und Bettag (nur Sachsen) korrekt', () => {
    const bbCases: Array<[number, string]> = [
      [2024, '2024-11-20'],
      [2025, '2025-11-19'],
      [2026, '2026-11-18'],
    ];
    for (const [year, expected] of bbCases) {
      const sn = getGermanHolidays(year, 'DE-SN');
      const bb = sn.find((x) => x.name === 'Buß- und Bettag');
      expect(bb?.date).toBe(expected);
      // Nicht in Berlin
      const be = getGermanHolidays(year, 'DE-BE');
      expect(be.find((x) => x.name === 'Buß- und Bettag')).toBeUndefined();
    }
  });

  it('liefert Feiertage in aufsteigend sortierter Reihenfolge', () => {
    const h = getGermanHolidays(2025, 'DE-BE').map((x) => x.date);
    const sorted = [...h].sort((a, b) => a.localeCompare(b));
    expect(h).toEqual(sorted);
  });
});

describe('getWorkingDaysInRange', () => {
  it('zählt Arbeitstage einer vollständigen Woche ohne Feiertage', () => {
    // Mo 2025-06-02 .. So 2025-06-08 -> 5 Arbeitstage (keine Feiertage in dieser Woche)
    const r = getWorkingDaysInRange('2025-06-02', '2025-06-08', 'DE-BE');
    expect(r.totalWorkdays).toBe(5);
    expect(r.workdayDates).toHaveLength(5);
  });

  it('schließt Feiertage aus der Arbeitstagszählung aus', () => {
    // Woche mit Tag der Arbeit (Do 2025-05-01)
    const r = getWorkingDaysInRange('2025-04-28', '2025-05-02', 'DE-BE');
    // Mo,Di,Mi,Fr = 4 Arbeitstage (Do ist Feiertag)
    expect(r.totalWorkdays).toBe(4);
    expect(r.workdayDates).not.toContain('2025-05-01');
    expect(r.holidaysInRange.map((h) => h.date)).toContain('2025-05-01');
  });

  it('berücksichtigt individuelle Arbeitstagsmuster (Teilzeit Mo/Di/Mi)', () => {
    const r = getWorkingDaysInRange('2025-06-02', '2025-06-08', 'DE-BE', [1, 2, 3]);
    expect(r.totalWorkdays).toBe(3);
  });
});

describe('resolveUserHolidayState', () => {
  it('nutzt für externe Mitarbeiter immer den Mandanten-Standort', () => {
    const state = resolveUserHolidayState(
      { employmentType: 'EXTERNAL', stateLocation: 'DE-BY' },
      { stateLocation: 'DE-BE', allowMobileWorkplaces: true }
    );
    expect(state).toBe('DE-BE');
  });

  it('nutzt für interne Mitarbeiter den individuellen Standort bei mobilen Arbeitsplätzen', () => {
    const state = resolveUserHolidayState(
      { employmentType: 'INTERNAL', stateLocation: 'DE-BY' },
      { stateLocation: 'DE-BE', allowMobileWorkplaces: true }
    );
    expect(state).toBe('DE-BY');
  });

  it('nutzt Mandanten-Standort, wenn mobile Arbeitsplätze deaktiviert sind', () => {
    const state = resolveUserHolidayState(
      { employmentType: 'INTERNAL', stateLocation: 'DE-BY' },
      { stateLocation: 'DE-HH', allowMobileWorkplaces: false }
    );
    expect(state).toBe('DE-HH');
  });

  it('fällt auf DE-BE zurück, wenn keine Angaben vorhanden sind', () => {
    expect(resolveUserHolidayState(null, null)).toBe('DE-BE');
  });
});
