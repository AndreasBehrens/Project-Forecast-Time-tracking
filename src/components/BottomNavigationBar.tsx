import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NavViewId } from './NavigationSidebar';
import {
  Clock,
  Calendar,
  ShieldCheck,
  FolderKanban,
  Layers,
  TrendingUp,
  Database,
  Code,
  Building2,
  Menu,
  X,
  LogOut,
  UserCheck,
  User as UserIcon,
  ChevronRight,
  Globe,
  MapPin,
  Sparkles
} from 'lucide-react';
import { CompanyLocationModal } from './CompanyLocationModal';

interface BottomNavigationBarProps {
  activeNav: NavViewId;
  setActiveNav: (nav: NavViewId) => void;
  pendingApprovalsCount: number;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeNav,
  setActiveNav,
  pendingApprovalsCount
}) => {
  const {
    t,
    currentUser,
    users,
    switchUser,
    organization,
    organizations,
    logout,
    language,
    setLanguage
  } = useApp();

  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);

  // Primary mobile tabs (4 tabs + More button)
  const primaryTabs: {
    id: NavViewId;
    label: string;
    icon: React.ElementType;
    badge?: number | null;
  }[] = [
    {
      id: 'timeTracker',
      label: t.navTimeTracker || 'Zeiterfassung',
      icon: Clock,
      badge: null
    },
    ...(isAdmin || isInternal
      ? [
          {
            id: 'workingTime' as NavViewId,
            label: t.navWorkingTime || 'Arbeitszeit',
            icon: Calendar,
            badge: null
          }
        ]
      : [
          {
            id: 'projectsClients' as NavViewId,
            label: isPM ? t.navMyProjectsTeam : t.navProjectsClients,
            icon: FolderKanban,
            badge: null
          }
        ]),
    ...(isAdmin || isPM
      ? [
          {
            id: 'forecast' as NavViewId,
            label: isPM ? t.navProjectForecast : t.navForecast,
            icon: TrendingUp,
            badge: null
          }
        ]
      : []),
    ...(isAdmin || isPM
      ? [
          {
            id: 'approvalsAudit' as NavViewId,
            label: t.navApprovalsAudit || 'Freigaben',
            icon: ShieldCheck,
            badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null
          }
        ]
      : [])
  ];

  // Secondary items shown in the "Mehr" drawer
  const drawerItems: {
    id: NavViewId;
    label: string;
    icon: React.ElementType;
    badge?: string | number | null;
    visible: boolean;
  }[] = [
    {
      id: 'timeTracker',
      label: t.navTimeTracker || 'Zeiterfassung (Dashboard)',
      icon: Clock,
      badge: null,
      visible: true
    },
    {
      id: 'workingTime',
      label: t.navWorkingTime || 'Allgemeine Arbeitszeit',
      icon: Calendar,
      badge: null,
      visible: isAdmin || isInternal
    },
    {
      id: 'approvalsAudit',
      label: t.navApprovalsAudit || 'Freigaben & Audit-Log',
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} offen` : null,
      visible: isAdmin || isPM
    },
    {
      id: 'projectsClients',
      label: isPM ? (t.navMyProjectsTeam || 'Meine Projekte & Team') : (t.navProjectsClients || 'Kunden & Projekte'),
      icon: FolderKanban,
      badge: null,
      visible: isAdmin || isPM
    },
    {
      id: 'ratesTeam',
      label: t.navRatesTeam || 'Mitarbeiter & Stundensätze',
      icon: Layers,
      badge: null,
      visible: isAdmin
    },
    {
      id: 'forecast',
      label: isPM ? (t.navProjectForecast || 'Projekt-Forecast') : (t.navForecast || 'Forecast (Plan vs. Ist)'),
      icon: TrendingUp,
      badge: null,
      visible: isAdmin || isPM
    },
    {
      id: 'clockifyMigration',
      label: t.navClockifyMigration || 'Clockify-Import & Export',
      icon: Database,
      badge: null,
      visible: isAdmin
    },
    {
      id: 'apiDocs',
      label: t.navApiDocs || 'REST-API & Dokumentation',
      icon: Code,
      badge: 'REST',
      visible: isAdmin
    },
    {
      id: 'organizations',
      label: t.navOrganizations || 'Mandantenverwaltung',
      icon: Building2,
      badge: isSuperAdmin ? (t.roleSuperadmin || 'Superadmin') : null,
      visible: isSuperAdmin
    }
  ];

  const handleSelectDrawerNav = (id: NavViewId) => {
    setActiveNav(id);
    setShowMoreDrawer(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile */}
      <nav
        id="mobile-bottom-navigation-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around select-none"
      >
        {primaryTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeNav === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              onClick={() => setActiveNav(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-500'} transition-transform`} />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-extrabold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center border-2 border-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[65px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More Button */}
        <button
          id="mobile-tab-more"
          onClick={() => setShowMoreDrawer(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${
            showMoreDrawer ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">
            {t.navMore || 'Mehr'}
          </span>
        </button>
      </nav>

      {/* Slide-Over Drawer for "Mehr" */}
      {showMoreDrawer && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="flex-1"
            onClick={() => setShowMoreDrawer(false)}
          />

          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Insight Arcs Zeiterfassung</h3>
                  <p className="text-xs text-slate-500">{organization?.name || 'Hauptmandant'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                {t.navMoreMenu || 'Navigation'}
              </div>
              {drawerItems
                .filter(i => i.visible)
                .map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectDrawerNav(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* User Profile & Actions in Drawer */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{currentUser?.name}</div>
                    <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowMoreDrawer(false);
                    logout();
                  }}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.logout || 'Abmelden'}</span>
                </button>
              </div>

              {/* Quick Language & Location Controls */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setLanguage(language === 'de' ? 'en' : 'de')}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-600" />
                  <span>{language === 'de' ? 'English' : 'Deutsch'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreDrawer(false);
                    setShowLocationModal(true);
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{organization?.stateLocation || 'Berlin'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <CompanyLocationModal onClose={() => setShowLocationModal(false)} />
      )}
    </>
  );
};
