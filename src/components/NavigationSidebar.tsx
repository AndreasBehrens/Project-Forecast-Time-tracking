import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';

export type NavViewId =
  | 'timeTracker'
  | 'workingTime'
  | 'approvalsAudit'
  | 'projectsClients'
  | 'ratesTeam'
  | 'forecast'
  | 'clockifyMigration'
  | 'apiDocs'
  | 'organizations';

interface SidebarNavItem {
  id: NavViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | number | null;
  badgeColor?: string;
  visible: boolean;
}

interface SidebarNavSection {
  title: string;
  items: SidebarNavItem[];
}

interface NavigationSidebarProps {
  activeNav: NavViewId;
  setActiveNav: (nav: NavViewId) => void;
  pendingApprovalsCount: number;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeNav,
  setActiveNav,
  pendingApprovalsCount
}) => {
  const {
    t,
    currentUser,
    organization,
    logout
  } = useApp();

  // Collapsed rail state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('insight_arcs_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('insight_arcs_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);

  // Grouped Navigation Items
  const navSections: SidebarNavSection[] = [
    {
      title: t.navigationSectionMain || 'Hauptnavigation',
      items: [
        {
          id: 'timeTracker' as const,
          label: t.navTimeTracker,
          icon: Clock,
          badge: null,
          visible: true
        },
        {
          id: 'workingTime' as const,
          label: t.navWorkingTime,
          icon: Calendar,
          badge: null,
          visible: isAdmin || isInternal
        }
      ]
    },
    {
      title: t.navigationSectionManagement || 'Management & Analyse',
      items: [
        {
          id: 'approvalsAudit' as const,
          label: t.navApprovalsAudit,
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeColor: 'bg-emerald-500 text-white',
          visible: isAdmin || isPM
        },
        {
          id: 'projectsClients' as const,
          label: isPM ? t.navMyProjectsTeam : t.navProjectsClients,
          icon: FolderKanban,
          badge: null,
          visible: isAdmin || isPM
        },
        {
          id: 'forecast' as const,
          label: isPM ? t.navProjectForecast : t.navForecast,
          icon: TrendingUp,
          badge: null,
          visible: isAdmin || isPM
        }
      ]
    },
    {
      title: t.navigationSectionAdmin || 'System & Mandanten',
      items: [
        {
          id: 'ratesTeam' as const,
          label: t.navRatesTeam,
          icon: Layers,
          badge: null,
          visible: isAdmin
        },
        {
          id: 'clockifyMigration' as const,
          label: t.navClockifyMigration,
          icon: Database,
          badge: null,
          visible: isAdmin
        },
        {
          id: 'apiDocs' as const,
          label: t.navApiDocs,
          icon: Code,
          badge: 'REST',
          badgeColor: 'bg-slate-700 text-slate-200',
          visible: isAdmin
        },
        {
          id: 'organizations' as const,
          label: t.navOrganizations,
          icon: Building2,
          badge: isSuperAdmin ? (t.roleSuperadmin || 'Superadmin') : null,
          badgeColor: 'bg-purple-600 text-white',
          visible: isSuperAdmin
        }
      ]
    }
  ];

  return (
    <aside
      id="desktop-navigation-sidebar"
      className={`hidden md:flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 select-none z-20 ${
        isCollapsed ? 'w-[74px]' : 'w-64'
      }`}
    >
      {/* Sidebar Header: Brand & Collapse Toggle */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                <span>Insight Arcs</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold px-1.5 py-0.2 rounded">
                  Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {organization?.name || 'Hauptmandant'}
              </p>
            </div>
          )}
        </div>

        {/* Rail Collapse Toggle */}
        <button
          id="btn-toggle-sidebar-collapse"
          onClick={toggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title={isCollapsed ? t.expandSidebar || 'Seitenleiste ausklappen' : t.collapseSidebar || 'Seitenleiste einklappen'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 no-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(i => i.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  {section.title}
                </div>
              )}

              {visibleItems.map(item => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => setActiveNav(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {item.badge !== null && !isCollapsed && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-white text-emerald-900'
                            : (item.badgeColor || 'bg-slate-700 text-slate-200')
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.badge !== null && isCollapsed && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: User Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 font-bold text-xs">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Mitarbeiter'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.role === 'SUPERADMIN'
                    ? (t.roleSuperadmin || 'Superadmin')
                    : currentUser?.role === 'ADMIN'
                    ? (t.roleAdmin || 'Admin')
                    : currentUser?.role === 'PROJECT_MANAGER'
                    ? (t.rolePM || 'Projektleitung')
                    : (t.roleEmp || 'Mitarbeiter')}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              id="btn-sidebar-logout"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
              title={t.logout || 'Abmelden'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
