import type { User } from '../types';

export type LoginCredentials = { email?: string; password?: string; userId?: string };
export type LoginResult = { success: boolean; error?: string };

export interface LoginDeps {
  fetchFn: typeof fetch;
  onAuthenticated: (data: { user: User; token?: string; activeOrgId?: string; organization?: any }) => void;
  refreshAllData: () => Promise<void>;
}

/**
 * Anmeldung gegen /api/auth/login.
 *
 * Wichtig: Diese Aktion setzt bewusst KEINEN globalen Ladezustand. Die App zeigt
 * bei globalem Laden ohne angemeldete Person den Startbildschirm statt der
 * Anmeldemaske; dadurch wurde die Anmeldemaske bei jedem Versuch neu aufgebaut
 * und die Fehlermeldung (z. B. „kein Passwort eingerichtet“) samt eingegebener
 * E-Mail ging verloren. Den Ladezustand des Formulars verwaltet LoginView selbst.
 */
export async function performLogin(credentials: LoginCredentials, deps: LoginDeps): Promise<LoginResult> {
  try {
    const res = await deps.fetchFn('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json().catch(() => ({} as any));
    if (data?.success && data.user) {
      deps.onAuthenticated(data);
      await deps.refreshAllData();
      return { success: true };
    }
    return { success: false, error: data?.error || `Anmeldung fehlgeschlagen (HTTP ${res.status})` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verbindungsfehler beim Anmelden' };
  }
}
