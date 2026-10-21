import { describe, it, expect } from 'vitest';
import {
  resolvePresetRange,
  getValueRange,
  presetValue,
  toLocalISODate,
  formatDateDE
} from '../../src/components/DateRangePicker';

// Lokale Daten (Monat 0-basiert)
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('resolvePresetRange', () => {
  it('Diese Woche beginnt am Montag (auch wenn heute Sonntag ist)', () => {
    // Fr 16.10.2026
    expect(resolvePresetRange('thisWeek', d(2026, 10, 16))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    // So 18.10.2026 → gleiche Woche
    expect(resolvePresetRange('thisWeek', d(2026, 10, 18))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    // Mo 12.10.2026 → gleiche Woche
    expect(resolvePresetRange('thisWeek', d(2026, 10, 12))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('Woche über Monats-/Jahresgrenze', () => {
    // Do 01.01.2026 → Mo 29.12.2025 – So 04.01.2026
    expect(resolvePresetRange('thisWeek', d(2026, 1, 1))).toEqual({ from: '2025-12-29', to: '2026-01-04' });
  });

  it('Letzte Woche und Letzte zwei Wochen', () => {
    expect(resolvePresetRange('lastWeek', d(2026, 10, 16))).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    expect(resolvePresetRange('lastTwoWeeks', d(2026, 10, 16))).toEqual({ from: '2026-10-05', to: '2026-10-18' });
  });

  it('Heute / Gestern (inkl. Monatswechsel)', () => {
    expect(resolvePresetRange('today', d(2026, 10, 16))).toEqual({ from: '2026-10-16', to: '2026-10-16' });
    expect(resolvePresetRange('yesterday', d(2026, 3, 1))).toEqual({ from: '2026-02-28', to: '2026-02-28' });
  });

  it('Dieser Monat endet am echten Monatsletzten', () => {
    expect(resolvePresetRange('thisMonth', d(2026, 2, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(resolvePresetRange('thisMonth', d(2028, 2, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('Letzter Monat (inkl. Jahreswechsel)', () => {
    expect(resolvePresetRange('lastMonth', d(2026, 10, 16))).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(resolvePresetRange('lastMonth', d(2026, 1, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(resolvePresetRange('lastMonth', d(2026, 3, 31))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('Quartalsgrenzen', () => {
    expect(resolvePresetRange('thisQuarter', d(2026, 1, 1))).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(resolvePresetRange('thisQuarter', d(2026, 3, 31))).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(resolvePresetRange('thisQuarter', d(2026, 4, 1))).toEqual({ from: '2026-04-01', to: '2026-06-30' });
    expect(resolvePresetRange('thisQuarter', d(2026, 10, 16))).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(resolvePresetRange('lastQuarter', d(2026, 10, 16))).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(resolvePresetRange('lastQuarter', d(2026, 2, 1))).toEqual({ from: '2025-10-01', to: '2025-12-31' });
  });

  it('Jahre und "Alle Einträge"', () => {
    expect(resolvePresetRange('thisYear', d(2026, 10, 16))).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    expect(resolvePresetRange('lastYear', d(2026, 10, 16))).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(resolvePresetRange('all', d(2026, 10, 16))).toBeNull();
    expect(resolvePresetRange('unknown', d(2026, 10, 16))).toBeNull();
  });

  it('benutzerdefinierte Presets haben Vorrang', () => {
    const custom = [{ key: 'thisMonth', label: 'X', getRange: () => ({ from: '2000-01-01', to: '2000-01-02' }) }];
    expect(resolvePresetRange('thisMonth', d(2026, 10, 16), custom)).toEqual({ from: '2000-01-01', to: '2000-01-02' });
  });
});

describe('Value-Helfer', () => {
  it('benutzerdefinierter Zeitraum ohne Preset', () => {
    expect(getValueRange({ from: '2026-09-03', to: '2026-09-17' })).toEqual({ from: '2026-09-03', to: '2026-09-17' });
    expect(getValueRange({ from: '2026-09-03', to: null })).toBeNull();
  });

  it('presetValue löst den Zeitraum auf', () => {
    expect(presetValue('lastMonth', undefined, d(2026, 10, 16))).toEqual({ preset: 'lastMonth', from: '2026-09-01', to: '2026-09-30' });
    expect(presetValue('all', undefined, d(2026, 10, 16))).toEqual({ preset: 'all', from: null, to: null });
  });

  it('lokale Formatierung ohne UTC-Versatz', () => {
    expect(toLocalISODate(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01');
    expect(formatDateDE('2026-09-01')).toBe('01.09.2026');
  });
});

describe('DateRangePicker Sprachumschaltung', () => {
  it('hat für jedes Standard-Preset eine englische Bezeichnung', async () => {
    const { PRESET_DEFINITIONS, PRESET_LABELS_EN } = await import('../../src/components/DateRangePicker');
    for (const key of Object.keys(PRESET_DEFINITIONS)) {
      expect(PRESET_LABELS_EN[key], key).toBeTruthy();
      expect(PRESET_LABELS_EN[key]).not.toBe(PRESET_DEFINITIONS[key].label);
    }
  });
});
