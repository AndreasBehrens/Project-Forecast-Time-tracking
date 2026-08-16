import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TimeTrackerView } from './components/TimeTrackerView';
import { WorkingTimeView } from './components/WorkingTimeView';
import { ApprovalsAuditView } from './components/ApprovalsAuditView';
import { RateHierarchyView } from './components/RateHierarchyView';
import { ProjectsClientsView } from './components/ProjectsClientsView';
import { ForecastView } from './components/ForecastView';
import { ClockifyMigrationView } from './components/ClockifyMigrationView';
import { ApiDocsView } from './components/ApiDocsView';
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
  Server
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { t, timeEntries } = useApp();
  const [activeNav, setActiveNav] = useState<
    'timeTracker' | 'workingTime' | 'approvalsAudit' | 'projectsClients' | 'ratesTeam' | 'forecast' | 'clockifyMigration' | 'apiDocs'
  >('timeTracker');

  const pendingApprovalsCount = timeEntries.filter(e => e.approvalStatus === 'SUBMITTED').length;

  const navItems = [
    { id: 'timeTracker', label: t.navTimeTracker, icon: Clock, badge: null },
    { id: 'workingTime', label: t.navWorkingTime, icon: Calendar, badge: null },
    { id: 'approvalsAudit', label: t.navApprovalsAudit, icon: ShieldCheck, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
    { id: 'projectsClients', label: t.navProjectsClients, icon: FolderKanban, badge: null },
    { id: 'ratesTeam', label: t.navRatesTeam, icon: Layers, badge: null },
    { id: 'forecast', label: t.navForecast, icon: TrendingUp, badge: null },
    { id: 'clockifyMigration', label: t.navClockifyMigration, icon: Database, badge: null },
    { id: 'apiDocs', label: t.navApiDocs, icon: Code, badge: 'REST' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveNav(item.id as any)}
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
          {activeNav === 'workingTime' && <WorkingTimeView />}
          {activeNav === 'approvalsAudit' && <ApprovalsAuditView />}
          {activeNav === 'projectsClients' && <ProjectsClientsView />}
          {activeNav === 'ratesTeam' && <RateHierarchyView />}
          {activeNav === 'forecast' && <ForecastView />}
          {activeNav === 'clockifyMigration' && <ClockifyMigrationView />}
          {activeNav === 'apiDocs' && <ApiDocsView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Insight Arcs Zeiterfassung</span>
            <span>•</span>
            <span>Mandant: Insight Arcs GmbH</span>
            <span>•</span>
            <span>20 Nutzer</span>
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

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
