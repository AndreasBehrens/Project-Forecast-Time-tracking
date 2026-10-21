import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIME_ZONE, endOfNextMonth, isValidTimeZone, todayInZone, todayInZoneAsDate, userTimeZone, zonedParts
} from '../../src/utils/timeZone';

describe('Zeitzonen-Hilfen', () => {
  it('erkennt gültige und ungültige IANA-Zeitzonen', () => {
    expect(isValidTimeZone('Europe/Berlin')).toBe(true);
    expect(isValidTimeZone('America/Sao_Paulo')).toBe(true);
    expect(isValidTimeZone('Asia/Kathmandu')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });

  it('bestimmt "heute" je Zeitzone (derselbe Zeitpunkt, verschiedene Kalendertage)', () => {
    const instant = new Date('2026-10-16T01:30:00Z'); // 03:30 Berlin, 22:30 (15.10.) São Paulo, 07:15 Kathmandu
    expect(todayInZone('Europe/Berlin', instant)).toBe('2026-10-16');
    expect(todayInZone('America/Sao_Paulo', instant)).toBe('2026-10-15');
    expect(todayInZone('Asia/Kathmandu', instant)).toBe('2026-10-16');
    expect(todayInZone('America/Los_Angeles', instant)).toBe('2026-10-15');
  });

  it('liefert Ortszeit-Minuten inkl. Halbstunden-/Viertelstunden-Zonen', () => {
    const instant = new Date('2026-10-16T01:30:00Z');
    expect(zonedParts(instant, 'Europe/Berlin').minutes).toBe(3 * 60 + 30);
    expect(zonedParts(instant, 'America/Sao_Paulo').minutes).toBe(22 * 60 + 30);
    expect(zonedParts(instant, 'Asia/Kathmandu').minutes).toBe(7 * 60 + 15);
    expect(zonedParts(instant, 'Asia/Kolkata').minutes).toBe(7 * 60);
  });

  it('berücksichtigt die Sommerzeitumstellung', () => {
    expect(zonedParts(new Date('2026-07-01T10:00:00Z'), 'Europe/Berlin').minutes).toBe(12 * 60);
    expect(zonedParts(new Date('2026-01-15T10:00:00Z'), 'Europe/Berlin').minutes).toBe(11 * 60);
  });

  it('Mitternacht wird als 00:00 (nicht 24:00) geliefert', () => {
    expect(zonedParts(new Date('2026-10-15T22:00:00Z'), 'Europe/Berlin')).toEqual({ date: '2026-10-16', minutes: 0 });
  });

  it('userTimeZone: Profil vor Gerät vor Fallback, ungültige Werte werden ignoriert', () => {
    expect(userTimeZone({ timeZone: 'Asia/Kathmandu', deviceTimeZone: 'Europe/Lisbon' })).toBe('Asia/Kathmandu');
    expect(userTimeZone({ deviceTimeZone: 'Europe/Lisbon' })).toBe('Europe/Lisbon');
    expect(userTimeZone({ timeZone: 'kaputt' }, 'America/Sao_Paulo')).toBe('America/Sao_Paulo');
    expect(userTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(userTimeZone(undefined, 'kaputt')).toBe(DEFAULT_TIME_ZONE);
  });

  it('endOfNextMonth und todayInZoneAsDate', () => {
    expect(endOfNextMonth('2026-10-31')).toBe('2026-11-30');
    expect(endOfNextMonth('2026-11-01')).toBe('2026-12-31');
    const d = todayInZoneAsDate('America/Sao_Paulo', new Date('2026-10-16T01:30:00Z'));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 15]);
  });
});
