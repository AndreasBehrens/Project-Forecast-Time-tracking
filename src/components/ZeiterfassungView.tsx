import React from 'react';
import { useApp } from '../context/AppContext';
import { TimeTrackerView } from './TimeTrackerView';
import { WorkingTimeView } from './WorkingTimeView';
import { Briefcase, Clock } from 'lucide-react';

/**
 * Zusammengeführte Zeiterfassung:
 * - Externe Nutzer (ohne Admin-Rolle): nur Projektzeiterfassung, ohne Überschriften.
 * - Interne Nutzer & Admins: eine Seite mit zwei getrennten Bereichen
 *   ("Projektzeiterfassung" und "Allg. Arbeitszeit"), keine Tabs.
 */
export const ZeiterfassungView: React.FC = () => {
  const { t, currentUser } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);

  if (!isAdmin && !isInternal) {
    return <TimeTrackerView />;
  }

  return (
    <div className="space-y-8">
      <section id="section-project-time" className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
          <Briefcase className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t.tabProjectTime}</span>
        </h2>
        <TimeTrackerView />
      </section>

      <hr className="border-t border-slate-200" />

      <section id="section-working-time" className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
          <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t.tabWorkingTime}</span>
        </h2>
        <WorkingTimeView />
      </section>
    </div>
  );
};
