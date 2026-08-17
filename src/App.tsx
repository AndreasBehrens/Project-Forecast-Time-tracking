import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { TimeTrackerView } from './components/TimeTrackerView';
import { WorkingTimeView } from './components/WorkingTimeView';
import { ApprovalsAuditView } from './components/ApprovalsAuditView';
import { RateHierarchyView } from './components/RateHierarchyView';
import { ProjectsClientsView } from './components/ProjectsClientsView';
import { ForecastView } from './components/ForecastView';
import { ClockifyMigrationView } from './components/ClockifyMigrationView';
import { ApiDocsView } from './components/ApiDocsView';
import { OrganizationsManagementView } from './components/OrganizationsManagementView';
import {
  Clock,
  Calendar,
  ShieldCheck,
  FolderKanban,
  Layers,
  TrendingUp,
  Database,
  Code,
  Sparkles,
  Server,
  Building2
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { t, timeEntries, projects, organization, currentUser } = useApp();
  const [activeNav, setActiveNav] = useState<
    'timeTracker' | 'workingTime' | 'approvalsAudit' | 'projectsClients' | 'ratesTeam' | 'forecast' | 'clockifyMigration' | 'apiDocs' | 'organizations'
  >('timeTracker');

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);
  const isExternal = currentUser?.employmentType === 'EXTERNAL';
  const isEmployee = currentUser?.role === 'EMPLOYEE' || (!isAdmin && !isPM);

  // Managed projects for PM
  const myManagedProjectIds = isPM && currentUser
    ? projects.filter(p => p.projectManagerId === currentUser.id || p.managerUserIds?.includes(currentUser.id)).map(p => p.id)
    : [];

  const pendingApprovalsCount = timeEntries.filter(e => {
    if (e.approvalStatus !== 'SUBMITTED') return false;
    if (isAdmin) return true;
    if (isPM) return myManagedProjectIds.includes(e.projectId);
    return false;
  }).length;

  // Compute allowed navigation items based on User Role & Employment Type
  const allNavItems = [
    {
      id: 'timeTracker' as const,
      label: t.navTimeTracker,
      icon: Clock,
      badge: null,
      visible: true // All users have access to project time tracking
    },
    {
      id: 'workingTime' as const,
      label: t.navWorkingTime,
      icon: Calendar,
      badge: null,
      // Only internal employees/PMs and admins have general ArbZG working time
      visible: isAdmin || isInternal
    },
    {
      id: 'approvalsAudit' as const,
      label: t.navApprovalsAudit,
      icon: ShieldCheck,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      // Visible to Admins and PMs (PMs only see their projects)
      visible: isAdmin || isPM
    },
    {
      id: 'projectsClients' as const,
      label: isPM ? 'Meine Projekte & Team' : t.navProjectsClients,
      icon: FolderKanban,
      badge: null,
      // Visible to Admins and PMs (PMs only see their own projects and assigned staff/costs)
      visible: isAdmin || isPM
    },
    {
      id: 'ratesTeam' as const,
      label: t.navRatesTeam,
      icon: Layers,
      badge: null,
      // Admin only: enterprise wide rate hierarchy and tenant defaults
      visible: isAdmin
    },
    {
      id: 'forecast' as const,
      label: isPM ? 'Projekt-Forecast' : t.navForecast,
      icon: TrendingUp,
      badge: null,
      // Admins and PMs
      visible: isAdmin || isPM
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
      visible: isAdmin
    },
    {
      id: 'organizations' as const,
      label: 'Mandanten',
      icon: Building2,
      badge: isSuperAdmin ? 'Superadmin' : null,
      visible: isSuperAdmin
    },
  ];

  const visibleNavItems = allNavItems.filter(item => item.visible);

  // Ensure current activeNav is valid for user role
  React.useEffect(() => {
    if (!visibleNavItems.some(item => item.id === activeNav)) {
      setActiveNav(visibleNavItems[0]?.id || 'timeTracker');
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.employmentType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic View Render */}
        <div className="animate-in fade-in duration-150">
          {activeNav === 'timeTracker' && <TimeTrackerView />}
          {activeNav === 'workingTime' && isInternal && <WorkingTimeView />}
          {activeNav === 'approvalsAudit' && (isAdmin || isPM) && <ApprovalsAuditView />}
          {activeNav === 'projectsClients' && (isAdmin || isPM) && <ProjectsClientsView />}
          {activeNav === 'ratesTeam' && isAdmin && <RateHierarchyView />}
          {activeNav === 'forecast' && (isAdmin || isPM) && <ForecastView />}
          {activeNav === 'clockifyMigration' && isAdmin && <ClockifyMigrationView />}
          {activeNav === 'apiDocs' && isAdmin && <ApiDocsView />}
          {activeNav === 'organizations' && isSuperAdmin && <OrganizationsManagementView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Insight Arcs Zeiterfassung</span>
            <span>•</span>
            <span>Mandant: {organization?.name || 'Insight Arcs GmbH'}</span>
            <span>•</span>
            <span>Multi-Tenant & ArbZG</span>
          </div>
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <span>EU-Cloud (Frankfurt) • Revisionssicher bis 10 Jahre</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useApp();

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl animate-pulse">
          IA
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Insight Arcs Enterprise lädt...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
