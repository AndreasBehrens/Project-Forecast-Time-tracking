import { describe, it, expect } from 'vitest';
import { parseDate, parseTime, parseDecimal, parseDuration, parseBoolean, minutesBetween } from '../../server/import/normalizers.js';

describe('Import-Normalisierer: Datum', () => {
  it('erkennt deutsche, ISO- und Schrägstrich-Formate', () => {
    expect(parseDate('18.08.2026')).toEqual({ ok: true, value: '2026-08-18' });
    expect(parseDate('1.2.2026')).toEqual({ ok: true, value: '2026-02-01' });
    expect(parseDate('2026-08-18')).toEqual({ ok: true, value: '2026-08-18' });
    expect(parseDate('25/12/2026')).toEqual({ ok: true, value: '2026-12-25' });
    expect(parseDate('12/25/2026')).toEqual({ ok: true, value: '2026-12-25' });
    expect(parseDate('03/04/2026', 'MM/DD/YYYY')).toEqual({ ok: true, value: '2026-03-04' });
  });

  it('liefert Fehler statt „heute" bei ungültigen oder leeren Werten', () => {
    expect(parseDate('').ok).toBe(false);
    expect(parseDate(undefined).ok).toBe(false);
    expect(parseDate('31.02.2026').ok).toBe(false);
    expect(parseDate('morgen').ok).toBe(false);
    expect(parseDate('2026-13-01').ok).toBe(false);
  });

  it('respektiert ein fest vorgegebenes Format', () => {
    expect(parseDate('2026-08-18', 'DD.MM.YYYY').ok).toBe(false);
  });
});

describe('Import-Normalisierer: Uhrzeit, Dezimal, Dauer, Ja/Nein', () => {
  it('normalisiert Uhrzeiten', () => {
    expect(parseTime('9:05')).toEqual({ ok: true, value: '09:05' });
    expect(parseTime('17:30:00')).toEqual({ ok: true, value: '17:30' });
    expect(parseTime('')).toEqual({ ok: true, value: undefined });
    expect(parseTime('25:00').ok).toBe(false);
  });

  it('liest Dezimalzahlen mit Komma oder Punkt', () => {
    expect(parseDecimal('1,5')).toEqual({ ok: true, value: 1.5 });
    expect(parseDecimal('1.234,50', ',')).toEqual({ ok: true, value: 1234.5 });
    expect(parseDecimal('abc').ok).toBe(false);
  });

  it('liest Dauer als HH:MM, Dezimalstunden oder Minuten', () => {
    expect(parseDuration('01:30')).toEqual({ ok: true, value: 90 });
    expect(parseDuration('1,5')).toEqual({ ok: true, value: 90 });
    expect(parseDuration('2.25', 'decimal')).toEqual({ ok: true, value: 135 });
    expect(parseDuration('45', 'minutes')).toEqual({ ok: true, value: 45 });
  });

  it('liefert Fehler statt „60 Minuten" bei ungültiger Dauer', () => {
    expect(parseDuration('').ok).toBe(false);
    expect(parseDuration('0').ok).toBe(false);
    expect(parseDuration('-1').ok).toBe(false);
    expect(parseDuration('25:00').ok).toBe(false);
    expect(parseDuration('viel').ok).toBe(false);
  });

  it('liest Ja/Nein-Werte und meldet unbekannte Werte', () => {
    expect(parseBoolean('Yes')).toEqual({ ok: true, value: true });
    expect(parseBoolean('Nein')).toEqual({ ok: true, value: false });
    expect(parseBoolean('vielleicht').ok).toBe(false);
  });

  it('berechnet Minuten zwischen zwei Uhrzeiten', () => {
    expect(minutesBetween('09:00', '17:30')).toBe(510);
  });
});
