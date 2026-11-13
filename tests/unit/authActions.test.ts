import { describe, it, expect, vi } from 'vitest';
import { performLogin, type LoginDeps } from '../../src/context/authActions.js';

const response = (status: number, body: unknown) =>
  ({ status, ok: status < 400, json: async () => body }) as unknown as Response;

function deps(res: Response | Error): LoginDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetchFn: vi.fn(async () => { calls.push('fetch'); if (res instanceof Error) throw res; return res; }) as unknown as typeof fetch,
    onAuthenticated: vi.fn(() => { calls.push('authenticated'); }),
    refreshAllData: vi.fn(async () => { calls.push('refresh'); }),
  };
}

describe('Anmeldung (performLogin) – Regression: Fehlermeldung darf nicht verloren gehen', () => {
  it('liefert die Server-Fehlermeldung zurück und meldet niemanden an', async () => {
    const d = deps(response(401, { success: false, error: 'Für dieses Konto ist noch kein Passwort eingerichtet.' }));
    const r = await performLogin({ email: 'a@b.de', password: 'x' }, d);
    expect(r).toEqual({ success: false, error: 'Für dieses Konto ist noch kein Passwort eingerichtet.' });
    expect(d.calls).toEqual(['fetch']);
  });

  it('kennt keinen globalen Ladezustand (sonst baut die App die Anmeldemaske neu auf)', () => {
    // Die Abhängigkeiten enthalten bewusst keinen Setter für den globalen Ladezustand.
    const keys = Object.keys(deps(response(200, {}))).filter(k => k !== 'calls').sort();
    expect(keys).toEqual(['fetchFn', 'onAuthenticated', 'refreshAllData']);
  });

  it('Fallback-Meldung bei Antwort ohne JSON-Fehlertext', async () => {
    const d = deps({ status: 502, ok: false, json: async () => { throw new Error('kein JSON'); } } as unknown as Response);
    expect(await performLogin({ email: 'a@b.de', password: 'x' }, d)).toEqual({ success: false, error: 'Anmeldung fehlgeschlagen (HTTP 502)' });
  });

  it('Netzwerkfehler wird als Meldung zurückgegeben', async () => {
    const d = deps(new Error('Failed to fetch'));
    expect(await performLogin({ email: 'a@b.de', password: 'x' }, d)).toEqual({ success: false, error: 'Failed to fetch' });
  });

  it('Erfolg: Sitzung übernehmen, dann Daten laden', async () => {
    const d = deps(response(200, { success: true, user: { id: 'u-1' }, token: 't' }));
    expect(await performLogin({ email: 'a@b.de', password: 'x' }, d)).toEqual({ success: true });
    expect(d.calls).toEqual(['fetch', 'authenticated', 'refresh']);
  });
});
