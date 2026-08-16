import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Shield,
  Layers,
  ArrowRight,
  UserPlus,
  DollarSign,
  Briefcase,
  CheckCircle,
  HelpCircle,
  Mail,
  Copy,
  Check
} from 'lucide-react';

export const RateHierarchyView: React.FC = () => {
  const {
    t,
    users,
    jobRoles,
    projects,
    organization,
    resolveRate,
    inviteUser,
    currentUser
  } = useApp();

  // Rate Hierarchy Interactive Tester
  const [testUserId, setTestUserId] = useState(users[0]?.id || 'u-1');
  const [testProjectId, setTestProjectId] = useState(projects[0]?.id || 'p-1');
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EMPLOYEE' | 'PROJECT_MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [inviteJobRoleId, setInviteJobRoleId] = useState('role-mid');
  const [inviteWeeklyHours, setInviteWeeklyHours] = useState('40');
  const [invitationLinkResult, setInvitationLinkResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (testUserId) {
      resolveRate(testUserId, testProjectId).then(data => setResolvedResult(data));
    }
  }, [testUserId, testProjectId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await inviteUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      jobRoleId: inviteJobRoleId,
      weeklyTargetHours: parseFloat(inviteWeeklyHours) || 40
    });
    setInvitationLinkResult(res.invitationLink);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Hierarchy Explanation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              {t.rateHierarchyTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {t.rateHierarchyDesc}
            </p>
          </div>

          <button
            id="btn-open-invite"
            onClick={() => {
              setInvitationLinkResult(null);
              setShowInviteModal(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
          >
            <UserPlus className="w-4 h-4" />
            {t.inviteUser}
          </button>
        </div>

        {/* 4-Tier Visual Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">1. Höchste Priorität</div>
            <div className="text-xs font-bold text-slate-900">Projekt-Mitarbeitersatz</div>
            <p className="text-[11px] text-slate-500">Spezifischer Stundensatz für einen Mitarbeiter auf einem Projekt.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">2. Hohe Priorität</div>
            <div className="text-xs font-bold text-slate-900">Individueller Mitarbeitersatz</div>
            <p className="text-[11px] text-slate-500">Im Mitarbeiterprofil hinterlegter persönlicher Abrechnungssatz.</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">3. Mittlere Priorität</div>
            <div className="text-xs font-bold text-slate-900">Fachliche Mitarbeiterrolle</div>
            <p className="text-[11px] text-slate-500">Standard-Satz der Rolle (z.B. Junior, Consultant, Senior, Lead).</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">4. Basis / Fallback</div>
            <div className="text-xs font-bold text-slate-900">Organisations-Standard</div>
            <p className="text-[11px] text-slate-500">Unternehmensweiter Fallback-Satz ({organization?.defaultHourlyBillingRate} €/h).</p>
          </div>
        </div>
      </div>

      {/* Interactive Rate Resolution Simulator (Section 25 Verification) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-wide">{t.rateHierarchyTester}</h3>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
            Live Satzhierarchie Resolver
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs text-slate-400 font-medium">{t.selectUser}</label>
            <select
              id="select-sim-user"
              value={testUserId}
              onChange={e => setTestUserId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-xs text-slate-400 font-medium">{t.selectProject}</label>
            <select
              id="select-sim-project"
              value={testProjectId}
              onChange={e => setTestProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'T&M'})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">{t.resolvedRate}</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {resolvedResult?.billingRate || 0} €/h
            </div>
            <div className="text-[10px] text-slate-300 mt-1 font-medium bg-slate-700/60 py-0.5 px-2 rounded-full inline-block">
              {resolvedResult?.billingSource === 'PROJECT_MEMBER' && 'Stufe 1: Projekt-Mitarbeitersatz'}
              {resolvedResult?.billingSource === 'USER_INDIVIDUAL' && 'Stufe 2: Individueller Satz'}
              {resolvedResult?.billingSource === 'JOB_ROLE' && `Stufe 3: Rolle (${resolvedResult?.jobRoleName})`}
              {resolvedResult?.billingSource === 'ORG_DEFAULT' && 'Stufe 4: Org-Standard'}
            </div>
          </div>
        </div>

        {/* Cost Rate (Visible to Admins) */}
        {currentUser?.role === 'ADMIN' && (
          <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>
              🔒 <strong>{t.internalCostRate}:</strong> {resolvedResult?.costRate || 0} €/h ({resolvedResult?.costSource})
            </span>
            <span className="text-emerald-400 font-semibold">
              Erwartete Marge: {((resolvedResult?.billingRate || 0) - (resolvedResult?.costRate || 0))} €/h
            </span>
          </div>
        )}
      </div>

      {/* Team Members List (20 Employees) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            {t.teamMembers}
          </div>
          <span className="text-[11px] text-slate-500">
            Insight Arcs GmbH (Mandant 1)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Mitarbeiter</th>
                <th className="px-4 py-3">Berechtigungsrolle</th>
                <th className="px-4 py-3">Fachliche Rolle</th>
                <th className="px-4 py-3">Sollstunden</th>
                <th className="px-4 py-3">Individueller Satz</th>
                {currentUser?.role === 'ADMIN' && <th className="px-4 py-3">Interner Kostensatz</th>}
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const jobRole = jobRoles.find(r => r.id === u.jobRoleId);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' :
                        u.role === 'PROJECT_MANAGER' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {jobRole?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <strong>{u.weeklyTargetHours}h</strong> / Woche ({u.dailyTargetHours}h/Tag)
                    </td>
                    <td className="px-4 py-3">
                      {u.individualBillingRate ? (
                        <span className="font-bold text-slate-900">{u.individualBillingRate} €/h (Override)</span>
                      ) : (
                        <span className="text-slate-400 italic">Gemäß Rolle ({jobRole?.standardBillingRate || 130} €/h)</span>
                      )}
                    </td>
                    {currentUser?.role === 'ADMIN' && (
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {u.individualCostRate || jobRole?.standardCostRate || 65} €/h
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        Aktiv
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- INVITATION MODAL (Section 4: Einladungsprozess & Onboarding) --- */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              {t.inviteUserModalTitle}
            </h3>

            {!invitationLinkResult ? (
              <form onSubmit={handleSendInvite} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.fullName}</label>
                  <input
                    id="input-invite-name"
                    type="text"
                    required
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="z.B. Dr. Sandra Richter"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.emailAddress}</label>
                  <input
                    id="input-invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="sandra.richter@insightarcs.de"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Berechtigungsrolle</label>
                    <select
                      id="select-invite-role"
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                    >
                      <option value="EMPLOYEE">Mitarbeiter</option>
                      <option value="PROJECT_MANAGER">Projektleitung</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Fachliche Rolle</label>
                    <select
                      id="select-invite-jobrole"
                      value={inviteJobRoleId}
                      onChange={e => setInviteJobRoleId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                    >
                      {jobRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.weeklyHours}</label>
                  <input
                    id="input-invite-hours"
                    type="number"
                    value={inviteWeeklyHours}
                    onChange={e => setInviteWeeklyHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    {t.sendInvitation}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900">
                  <div className="font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" /> Einladung erfolgreich generiert!
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Einladungstoken wurde mit 7 Tagen Gültigkeit erstellt. Für Tests können Sie den Registrierungslink kopieren:
                  </p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] break-all">
                  {invitationLinkResult}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invitationLinkResult)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t.copied : t.copy}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
