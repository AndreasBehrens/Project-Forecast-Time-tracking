import type { NavViewId } from '../components/NavigationSidebar';

/** Entfernte/umbenannte Navigationsziele → aktuelles Ziel (alte Deep-Links, gespeicherter Zustand). */
const LEGACY_NAV_REDIRECTS: Record<string, NavViewId> = {
  export: 'clockifyMigration',
  exports: 'clockifyMigration',
};

export function normalizeNavId(id: string): NavViewId {
  return (LEGACY_NAV_REDIRECTS[id] ?? id) as NavViewId;
}
