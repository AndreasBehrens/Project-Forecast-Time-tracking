import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { NavigationSidebar, NavViewId } from './components/NavigationSidebar';
import { BottomNavigationBar } from './components/BottomNavigationBar';
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
import { Server } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { t, timeEntries, projects, organization, currentUser } = useApp();
  const [activeNav, setActiveNav] = useState<NavViewId>('timeTracker');

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased">
      {/* 1. Desktop & Tablet Left Navigation Sidebar (>= 768px) */}
      <NavigationSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* 2. Main Application Flow Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Header />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 pb-24 md:pb-10">
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

        {/* Desktop Footer */}
        <footer className="border-t border-slate-200/90 bg-white py-3.5 mt-auto hidden md:block">
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

      {/* 3. Mobile Bottom Navigation Bar (< 768px) */}
      <BottomNavigationBar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        pendingApprovalsCount={pendingApprovalsCount}
      />
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
