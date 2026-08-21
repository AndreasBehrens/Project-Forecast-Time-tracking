import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  ShieldCheck,
  Globe,
  UserCheck,
  ChevronDown,
  Building2,
  Play,
  Pause,
  Square,
  MapPin,
  Layers,
  LogOut,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { CompanyLocationModal } from './CompanyLocationModal';
import { CloudDatabaseModal } from './CloudDatabaseModal';
import { Database } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    users,
    switchUser,
    logout,
    language,
    setLanguage,
    t,
    activeTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    projects,
    organization,
    organizations,
    activeOrgId
  } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCloudDbModal, setShowCloudDbModal] = useState(false);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const activeProject = projects.find(p => p.id === activeTimer.projectId);

  const getRoleBadge = (role?: string) => {
    if (role === 'SUPERADMIN') return <span className="bg-purple-100 text-purple-900 border border-purple-300/80 text-xs font-bold px-2 py-0.5 rounded shadow-2xs">{t.roleSuperadmin}</span>;
    if (role === 'ADMIN') return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">{t.roleAdmin}</span>;
    if (role === 'PROJECT_MANAGER') return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">{t.rolePM}</span>;
    return <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">{t.roleEmp}</span>;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">Insight Arcs</span>
                <span className="hidden sm:inline-flex text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium px-1.5 py-0.5 rounded">
                  {t.navTimeTracker}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {t.multiTenantDataIsolation}
              </p>
            </div>
          </div>

          {/* Center: Running Timer Widget (if active) */}
          {activeTimer.isRunning && (
            <div className="hidden md:flex items-center gap-3 bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-md animate-pulse-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-mono text-base font-semibold tracking-wider">
                  {formatTimer(activeTimer.elapsedSeconds)}
                </span>
              </div>
              <div className="text-xs text-slate-300 max-w-[140px] truncate">
                {activeProject?.name || activeTimer.description || t.activeTimer}
              </div>
              <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                {activeTimer.isPaused ? (
                  <button
                    id="btn-resume-timer-header"
                    onClick={resumeTimer}
                    className="p-1 hover:bg-slate-800 rounded text-emerald-400"
                    title={t.resumeTimer}
                  >
                    <Play className="w-4 h-4 fill-emerald-400" />
                  </button>
                ) : (
                  <button
                    id="btn-pause-timer-header"
                    onClick={pauseTimer}
                    className="p-1 hover:bg-slate-800 rounded text-amber-400"
                    title={t.pauseTimer}
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="btn-stop-timer-header"
                  onClick={stopTimer}
                  className="p-1 hover:bg-slate-800 rounded text-rose-400"
                  title={t.stopTimer}
                >
                  <Square className="w-4 h-4 fill-rose-400" />
                </button>
              </div>
            </div>
          )}

          {/* Right Controls: Mandanten-Umschalter, EU Compliance, Location, Language, User */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Active Organization (Strikte Datenisolation) */}
            <div
              id="header-active-organization"
              className={`flex items-center gap-1.5 sm:gap-2 text-xs border px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-2xs ${
                organization?.id === 'org-insight-arcs-01' || organization?.name.toLowerCase().includes('test')
                  ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                  : 'bg-slate-100/90 border-slate-200/90 text-slate-800'
              }`}
              title={`${t.tenantBadge} (${t.multiTenantDataIsolation}) - ${organization?.name}`}
            >
              <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${organization?.id === 'org-insight-arcs-01' ? 'text-amber-700' : 'text-slate-700'}`} />
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider hidden xs:inline">{t.tenantBadge}</span>
                  {organization?.id === 'org-insight-arcs-01' && (
                    <span className="bg-amber-200 text-amber-900 text-[9px] font-extrabold px-1 rounded">TEST</span>
                  )}
                </div>
                <div className="font-bold text-slate-900 truncate max-w-[90px] xs:max-w-[130px] sm:max-w-[200px]">
                  {organization?.name || 'Insight Arcs GmbH'}
                </div>
              </div>
            </div>

            {/* PostgreSQL Database Badge */}
            <button
              id="btn-header-cloud-db"
              onClick={() => setShowCloudDbModal(true)}
              className="hidden md:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/90 hover:bg-blue-100/90 border border-blue-200/80 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
              title="PostgreSQL-Datenbank Status"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold">PostgreSQL</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>

            {/* EU Badge */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.euGdprBadge}</span>
            </div>

            {/* Location & Holiday Badge */}
            <button
              id="btn-header-location"
              onClick={() => setShowLocationModal(true)}
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-md transition-colors"
              title={t.locationAndHolidays}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">{organization?.locationCity || 'Berlin'}</span>
              <span className="text-[10px] text-slate-400">({organization?.stateLocation || 'DE-BE'})</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                id="btn-lang-de"
                onClick={() => setLanguage('de')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  language === 'de' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                DE
              </button>
              <button
                id="btn-lang-en"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* User Switcher Dropdown & Logout */}
            <div className="relative flex items-center gap-1.5">
              <button
                id="btn-user-switcher"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
                  {currentUser?.name.split(' ').map(n => n[0]).join('').substring(0, 2) || 'IA'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser?.name || t.loggedInAs}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>{currentUser?.role === 'SUPERADMIN' ? t.roleSuperadmin : currentUser?.role === 'ADMIN' ? t.roleAdmin : currentUser?.role === 'PROJECT_MANAGER' ? t.rolePM : t.roleEmp}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Direct Quick Logout Button */}
              <button
                id="btn-quick-logout"
                title={t.logout}
                onClick={() => logout()}
                className="hidden md:flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Current User Card */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                          {currentUser?.name.split(' ').map(n => n[0]).join('').substring(0, 2) || 'IA'}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{currentUser?.name}</div>
                          <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
                        </div>
                      </div>
                      {currentUser && getRoleBadge(currentUser.role)}
                    </div>
                    {currentUser?.employmentType === 'EXTERNAL' && (
                      <div className="mt-2 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200/60 font-medium">
                        🤝 {t.externalProvider} {currentUser.companyName ? `(${currentUser.companyName})` : ''}
                      </div>
                    )}
                  </div>

                  {/* Logout Action Button */}
                  <div className="p-2 border-b border-slate-100">
                    <button
                      id="btn-dropdown-logout"
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50/80 hover:bg-red-100 border border-red-200/60 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.logoutDesc}</span>
                    </button>
                  </div>

                  {/* Switch user header */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.switchUser} ({users.length})
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {t.switchUserHint}
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {users.map(u => {
                      const isExternal = u.employmentType === 'EXTERNAL';
                      const isCurrent = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          id={`btn-switch-user-${u.id}`}
                          onClick={() => {
                            switchUser(u.id);
                            setUserMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            isCurrent ? 'bg-emerald-50/80 font-semibold text-emerald-950 border-l-2 border-emerald-600' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-900">{u.name}</span>
                              {isExternal ? (
                                <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1 py-0.2 rounded">
                                  {t.externalContractor ? t.externalContractor.split(' ')[0] : 'Extern'}
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                  {t.internalEmployee ? t.internalEmployee.split(' ')[0] : 'Intern'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.email} {isExternal && u.companyName ? `• ${u.companyName}` : ''}
                            </div>
                            {u.memberships && u.memberships.length > 1 && (
                              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                                {u.memberships.length} {t.assignedTenants}
                              </div>
                            )}
                          </div>
                          {getRoleBadge(u.role)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CompanyLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />

      {showCloudDbModal && (
        <CloudDatabaseModal
          onClose={() => setShowCloudDbModal(false)}
        />
      )}
    </header>
  );
};
