import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Mail,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  Server,
  KeyRound,
  Search,
  ExternalLink,
  Info
} from 'lucide-react';
import { User, Organization } from '../types';

export const LoginView: React.FC = () => {
  const { login, users, organizations, jobRoles, organization } = useApp();

  const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || 'org-insight-arcs-01');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'PM' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Filter users for the Quick-Login tab
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.companyName && u.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesFilter = true;
    if (roleFilter === 'ADMIN') matchesFilter = u.role === 'ADMIN';
    else if (roleFilter === 'PM') matchesFilter = u.role === 'PROJECT_MANAGER';
    else if (roleFilter === 'INTERNAL') matchesFilter = u.employmentType !== 'EXTERNAL';
    else if (roleFilter === 'EXTERNAL') matchesFilter = u.employmentType === 'EXTERNAL';

    return matchesSearch && matchesFilter;
  });

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    setIsSubmitting(true);
    const res = await login({
      email: email.trim(),
      password,
      orgId: selectedOrgId
    });
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingabe.');
    }
  };

  const handleQuickLogin = async (user: User) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const res = await login({
      userId: user.id,
      orgId: user.orgId || selectedOrgId
    });
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Schnellanmeldung fehlgeschlagen.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-sm">
              IA
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                Insight Arcs
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Zeiterfassung & Arbeitszeit-Compliance</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>EU-Cloud (Frankfurt)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GoBD & ArbZG Konform</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header Banner inside card */}
          <div className="px-6 py-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Anmeldung am System
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Wählen Sie Ihr Benutzerprofil oder melden Sie sich mit Ihren Zugangsdaten an.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                id="tab-quick-login"
                type="button"
                onClick={() => {
                  setActiveTab('quick');
                  setErrorMessage(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'quick'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Schnellanmeldung (Profile)</span>
              </button>
              <button
                id="tab-manual-login"
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setErrorMessage(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'manual'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>E-Mail & Passwort</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: Schnellanmeldung / Benutzerverzeichnis */}
          {activeTab === 'quick' && (
            <div className="p-6 space-y-5">
              {/* Search and Role Filter */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-login-user-search"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Mitarbeiter nach Name, E-Mail oder Firma suchen..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${
                      roleFilter === 'ALL'
                        ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Alle ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('ADMIN')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${
                      roleFilter === 'ADMIN'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👑 Admin ({users.filter(u => u.role === 'ADMIN').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('PM')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${
                      roleFilter === 'PM'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/40'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📊 PM ({users.filter(u => u.role === 'PROJECT_MANAGER').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('INTERNAL')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${
                      roleFilter === 'INTERNAL'
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏢 Intern ({users.filter(u => u.employmentType !== 'EXTERNAL').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('EXTERNAL')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${
                      roleFilter === 'EXTERNAL'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/40'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🤝 Extern ({users.filter(u => u.employmentType === 'EXTERNAL').length})
                  </button>
                </div>
              </div>

              {/* Users Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredUsers.map(u => {
                  const jobRole = jobRoles.find(r => r.id === u.jobRoleId);
                  const isExternal = u.employmentType === 'EXTERNAL';

                  return (
                    <button
                      key={u.id}
                      id={`btn-quick-login-${u.id}`}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(u)}
                      className="group text-left p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm shrink-0 group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                          {u.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                              {u.name}
                            </span>
                            {u.role === 'ADMIN' && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                                Admin
                              </span>
                            )}
                            {u.role === 'PROJECT_MANAGER' && (
                              <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded shrink-0">
                                PM
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {u.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {isExternal ? (
                              <span className="text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded truncate">
                                🤝 Extern {u.companyName ? `• ${u.companyName}` : ''}
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400 truncate">
                                {jobRole?.name || 'Mitarbeiter'} • {u.weeklyTargetHours}h/Woche
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500">
                  Keine Benutzer für den Suchbegriff &quot;{searchQuery}&quot; gefunden.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Standard Login (E-Mail & Passwort) */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualLogin} className="p-6 sm:p-8 space-y-5 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-Mail-Adresse *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="z. B. andreas.behrens@insightarcs.de"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Tipp: Geben Sie eine E-Mail eines Mitarbeiters ein oder nutzen Sie den Schnellanmelde-Tab.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Passwort *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Organization / Mandant Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mandant / Unternehmen (Optional)
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="select-login-org"
                    value={selectedOrgId}
                    onChange={e => setSelectedOrgId(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  >
                    {organizations.map(o => (
                      <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 w-4 h-4"
                  />
                  <span className="text-xs text-slate-400">Angemeldet bleiben</span>
                </label>
              </div>

              <button
                id="btn-submit-manual-login"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Wird angemeldet...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Jetzt sicher anmelden</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note inside card */}
          <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Zwei-Faktor-Authentifizierung (2FA) und SSO für Enterprise aktiviert</span>
            </div>
            <span className="text-slate-600">v2.4.0 • Build 2026</span>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Passwort zurücksetzen</h3>
                <p className="text-xs text-slate-400">Demo-Modus & Unternehmenszugang</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In dieser Instanz ist der Direkt-Login für alle 20 Mitarbeiterkonten aktiv. Sie können sich im Tab <strong>&quot;Schnellanmeldung&quot;</strong> sofort mit jedem beliebigen Profil (Administrator, Projektleiter, Consultant oder externer Freelancer) ohne Kennworteingabe anmelden.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div><strong>Admin-Konto:</strong> andreas.behrens@insightarcs.de</div>
              <div><strong>PM-Konto:</strong> laura.klein@insightarcs.de</div>
              <div><strong>Extern-Konto:</strong> felix.bauer@freelance-tech.de</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Legal / Compliance Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-900/40 px-6 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Insight Arcs GmbH • Alle Rechte vorbehalten
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>DSGVO Konform</span>
            <span>•</span>
            <span>10 Jahre Revisionssicherheit</span>
            <span>•</span>
            <span>Frankfurt a. M. (DE)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
