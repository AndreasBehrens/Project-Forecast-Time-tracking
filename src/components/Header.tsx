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
import { OrganizationSwitcherModal } from './OrganizationSwitcherModal';

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
  const [showOrgModal, setShowOrgModal] = useState(false);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const activeProject = projects.find(p => p.id === activeTimer.projectId);

  const getRoleBadge = (role?: string) => {
    if (role === 'ADMIN') return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">Admin</span>;
    if (role === 'PROJECT_MANAGER') return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">Projektleitung</span>;
    return <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">Mitarbeiter</span>;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Insight Arcs</span>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium px-1.5 py-0.5 rounded">
                  Zeiterfassung
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Mandantenfähig • 4-Stufige Satzhierarchie • EU-Hosted (Frankfurt)
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
                {activeProject?.name || activeTimer.description || 'Aktiver Timer'}
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
          <div className="flex items-center gap-2.5">
            {/* Active Organization / Mandanten-Umschalter */}
            <button
              id="btn-organization-switcher"
              onClick={() => setShowOrgModal(true)}
              className="flex items-center gap-2 text-xs text-slate-800 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-300/70 px-3 py-1.5 rounded-lg transition-all shadow-2xs group"
              title="Aktiven Mandanten wechseln oder verwalten"
            >
              <Building2 className="w-4 h-4 text-emerald-700" />
              <div className="text-left">
                <div className="text-[9px] uppercase font-bold text-emerald-700 tracking-wider">Mandant</div>
                <div className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[170px]">
                  {organization?.name.split(' (')[0] || 'Insight Arcs'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* EU Badge */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>EU DSGVO</span>
            </div>

            {/* Location & Holiday Badge */}
            <button
              id="btn-header-location"
              onClick={() => setShowLocationModal(true)}
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-md transition-colors"
              title="Standort & Feiertagskalender konfigurieren"
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
                    {currentUser?.name || 'Angemeldet'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>{currentUser?.role === 'ADMIN' ? 'Admin' : currentUser?.role === 'PROJECT_MANAGER' ? 'Projektleitung' : 'Mitarbeiter'}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Direct Quick Logout Button */}
              <button
                id="btn-quick-logout"
                title="Abmelden"
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
                        🤝 Externer Dienstleister {currentUser.companyName ? `(${currentUser.companyName})` : ''}
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
                      <span>Abmelden / Logout</span>
                    </button>
                  </div>

                  {/* Switch user header */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.switchUser} ({users.length} Konten)
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Testen Sie die Ansicht für eine andere Rolle oder Mandantenzugriff:
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
                                  Extern
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                  Intern
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {u.email} {isExternal && u.companyName ? `• ${u.companyName}` : ''}
                            </div>
                            {u.memberships && u.memberships.length > 1 && (
                              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                                {u.memberships.length} Mandanten zugeordnet
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

      <OrganizationSwitcherModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
      />

      <CompanyLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </header>
  );
};
