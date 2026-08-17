import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
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
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  ShieldCheck,
  Clock,
  UserX,
  Lock
} from 'lucide-react';

export const RateHierarchyView: React.FC = () => {
  const {
    t,
    users,
    jobRoles,
    projects,
    organization,
    timeEntries,
    resolveRate,
    inviteUser,
    updateUser,
    deleteUser,
    currentUser
  } = useApp();

  // Rate Hierarchy Interactive Tester
  const [testUserId, setTestUserId] = useState(users[0]?.id || 'u-1');
  const [testProjectId, setTestProjectId] = useState(projects[0]?.id || 'p-1');
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  // Filter & Search States
  const [empTypeFilter, setEmpTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [empSearch, setEmpSearch] = useState('');

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmploymentType, setInviteEmploymentType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [inviteCompanyName, setInviteCompanyName] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EMPLOYEE' | 'PROJECT_MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [inviteJobRoleId, setInviteJobRoleId] = useState('role-mid');
  const [inviteWeeklyHours, setInviteWeeklyHours] = useState('40');
  const [invitationLinkResult, setInvitationLinkResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'EMPLOYEE' | 'PROJECT_MANAGER' | 'ADMIN'>('EMPLOYEE');
  const [editEmploymentType, setEditEmploymentType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editJobRoleId, setEditJobRoleId] = useState('');
  const [editWeeklyHours, setEditWeeklyHours] = useState('40');
  const [editDailyHours, setEditDailyHours] = useState('8');
  const [editBillingRate, setEditBillingRate] = useState('');
  const [editCostRate, setEditCostRate] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Delete User Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      employmentType: inviteEmploymentType,
      companyName: inviteEmploymentType === 'EXTERNAL' ? inviteCompanyName : undefined,
      jobRoleId: inviteJobRoleId,
      weeklyTargetHours: parseFloat(inviteWeeklyHours) || 40
    });
    setInvitationLinkResult(res.invitationLink);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditEmploymentType(user.employmentType || 'INTERNAL');
    setEditCompanyName(user.companyName || '');
    setEditJobRoleId(user.jobRoleId || jobRoles[0]?.id || '');
    setEditWeeklyHours(String(user.weeklyTargetHours || 40));
    setEditDailyHours(String(user.dailyTargetHours || 8));
    setEditBillingRate(user.individualBillingRate ? String(user.individualBillingRate) : '');
    setEditCostRate(user.individualCostRate ? String(user.individualCostRate) : '');
    setEditStatus((user.status as any) || 'ACTIVE');
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await updateUser(editingUser.id, {
      name: editName,
      email: editEmail,
      role: editRole,
      employmentType: editEmploymentType,
      companyName: editEmploymentType === 'EXTERNAL' ? editCompanyName : undefined,
      jobRoleId: editJobRoleId,
      weeklyTargetHours: parseFloat(editWeeklyHours) || 40,
      dailyTargetHours: parseFloat(editDailyHours) || 8,
      individualBillingRate: editBillingRate ? parseFloat(editBillingRate) : undefined,
      individualCostRate: editCostRate ? parseFloat(editCostRate) : undefined,
      status: editStatus
    });

    setEditingUser(null);
  };

  const handleOpenDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteError(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteUser(userToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      setUserToDelete(null);
    } else {
      setDeleteError(result.error || 'Fehler beim Löschen des Mitarbeiters.');
    }
  };

  const handleDeactivateUserDirectly = async (user: User) => {
    await updateUser(user.id, { status: 'INACTIVE' });
    setUserToDelete(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = users.filter(u => {
    const matchesType =
      empTypeFilter === 'ALL' ||
      (empTypeFilter === 'INTERNAL' && u.employmentType !== 'EXTERNAL') ||
      (empTypeFilter === 'EXTERNAL' && u.employmentType === 'EXTERNAL');

    const matchesSearch =
      u.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(empSearch.toLowerCase()) ||
      (u.companyName && u.companyName.toLowerCase().includes(empSearch.toLowerCase()));

    return matchesType && matchesSearch;
  });

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
            <span>Mitarbeiter einladen</span>
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

      {/* Interactive Rate Resolution Simulator */}
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
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-xs text-slate-400 font-medium">{t.selectProject}</label>
            <select
              id="select-sim-proj"
              value={testProjectId}
              onChange={e => setTestProjectId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 text-center pt-3 md:pt-0">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {resolvedResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">{t.billingRate} (Kunde)</div>
                <div className="text-xl font-extrabold text-emerald-400">{resolvedResult.billingRate} € / Std.</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  {resolvedResult.billingSource}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">{t.costRate} (Intern)</div>
                <div className="text-xl font-extrabold text-purple-400">{resolvedResult.costRate} € / Std.</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                  {resolvedResult.costSource}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Members List (Editable & Deletable) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {t.teamMembers} ({users.length})
            </div>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {organization?.name || 'Insight Arcs GmbH'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                placeholder="Mitarbeiter suchen..."
                className="pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Filter: Alle / Intern / Extern */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setEmpTypeFilter('ALL')}
                className={`px-2 py-1 font-semibold rounded-md transition-colors ${
                  empTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alle ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setEmpTypeFilter('INTERNAL')}
                className={`px-2 py-1 font-semibold rounded-md transition-colors ${
                  empTypeFilter === 'INTERNAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Intern ({users.filter(u => u.employmentType !== 'EXTERNAL').length})
              </button>
              <button
                type="button"
                onClick={() => setEmpTypeFilter('EXTERNAL')}
                className={`px-2 py-1 font-semibold rounded-md transition-colors ${
                  empTypeFilter === 'EXTERNAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Extern ({users.filter(u => u.employmentType === 'EXTERNAL').length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Mitarbeiter</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Berechtigungsrolle</th>
                <th className="px-4 py-3">Fachliche Rolle</th>
                <th className="px-4 py-3">Sollstunden</th>
                <th className="px-4 py-3">Individueller Satz</th>
                {currentUser?.role === 'ADMIN' && <th className="px-4 py-3">Interner Kostensatz</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const jobRole = jobRoles.find(r => r.id === u.jobRoleId);
                const isExternal = u.employmentType === 'EXTERNAL';
                const userEntries = timeEntries.filter(e => e.userId === u.id);
                const canDelete = userEntries.length === 0;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                      {isExternal && u.companyName && (
                        <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                          Firma: {u.companyName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isExternal ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200/60 px-2 py-0.5 rounded">
                          Extern (Freelancer)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded">
                          Intern (Festangestellt)
                        </span>
                      )}
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
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        u.status === 'INACTIVE'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      }`}>
                        {u.status === 'INACTIVE' ? 'Inaktiv' : 'Aktiv'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Bearbeiten</span>
                        </button>
                        <button
                          id={`btn-del-user-${u.id}`}
                          onClick={() => handleOpenDeleteUser(u)}
                          title={canDelete ? 'Mitarbeiter löschen' : `${userEntries.length} Zeiteinträge vorhanden (GoBD geschützt)`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                            canDelete
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Löschen</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                    Keine Mitarbeiter für den aktuellen Suchbegriff gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT USER */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              <span>Mitarbeiterprofil bearbeiten: {editingUser.name}</span>
            </h3>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">E-Mail-Adresse *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              {/* Intern vs. Extern */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mitarbeitertyp *</label>
                  <select
                    value={editEmploymentType}
                    onChange={e => setEditEmploymentType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="INTERNAL">🏢 Festangestellt (Intern)</option>
                    <option value="EXTERNAL">🤝 Freelancer (Extern)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Aktiv</option>
                    <option value="INACTIVE">Inaktiv (Gesperrt)</option>
                  </select>
                </div>
              </div>

              {editEmploymentType === 'EXTERNAL' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subunternehmer- / Firmenname</label>
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={e => setEditCompanyName(e.target.value)}
                    placeholder="z.B. AI Cloud Solutions GmbH"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Systemrolle *</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <option value="EMPLOYEE">Mitarbeiter</option>
                    <option value="PROJECT_MANAGER">Projektleiter</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fachliche Rolle</label>
                  <select
                    value={editJobRoleId}
                    onChange={e => setEditJobRoleId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    {jobRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.standardBillingRate} €/h)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Soll-Wochenarbeitszeit (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editWeeklyHours}
                    onChange={e => setEditWeeklyHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Soll-Tagesarbeitszeit (h)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editDailyHours}
                    onChange={e => setEditDailyHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Rate Overrides */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-semibold text-slate-800">Individuelle Satz-Overrides (Stufe 2 der Satzhierarchie)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">Indiv. Kundensatz (€/h)</label>
                    <input
                      type="number"
                      placeholder="Leer = Rolle"
                      value={editBillingRate}
                      onChange={e => setEditBillingRate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">Indiv. Kostensatz (€/h)</label>
                    <input
                      type="number"
                      placeholder="Leer = Rolle"
                      value={editCostRate}
                      onChange={e => setEditCostRate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE USER CONFIRMATION */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const entries = timeEntries.filter(e => e.userId === userToDelete.id);
              const hasEntries = entries.length > 0;

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${hasEntries ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {hasEntries ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hasEntries ? 'Mitarbeiter nicht löschbar (GoBD-Schutz)' : 'Mitarbeiter wirklich löschen?'}
                      </h3>
                      <div className="text-xs text-slate-500">{userToDelete.name} ({userToDelete.email})</div>
                    </div>
                  </div>

                  {hasEntries ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 text-amber-900">
                        <div className="font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-700" />
                          <span>Revisionssicherheit & gesetzliche Aufbewahrungspflicht</span>
                        </div>
                        <p className="leading-relaxed">
                          Für <strong>{userToDelete.name}</strong> existieren bereits <strong>{entries.length} erfasste Zeiteinträge</strong> ({entries.reduce((s, e) => s + e.durationHoursDecimal, 0).toFixed(1)} Stunden).
                          Aus Gründen der GoBD-Konformität und Lohn-/Projektprüfbarkeit kann dieses Benutzerkonto nicht gelöscht werden.
                        </p>
                      </div>

                      <p className="text-slate-700">
                        <strong>Empfohlene Lösung:</strong> Setzen Sie das Benutzerkonto auf <strong>"Inaktiv"</strong>. Der Mitarbeiter kann sich nicht mehr anmelden oder Zeiten buchen, während historische Daten unberührt bleiben.
                      </p>

                      {deleteError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setUserToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Schließen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivateUserDirectly(userToDelete)}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Mitarbeiter auf "Inaktiv" setzen</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600">
                      <p>
                        Möchten Sie das Mitarbeiterprofil von <strong>"{userToDelete.name}"</strong> wirklich unwiderruflich löschen?
                      </p>
                      <p className="text-slate-500">
                        Es wurden <strong>0 Zeiteinträge</strong> für diesen Benutzer erfasst. Das Profil und Zugangsdaten werden restlos entfernt.
                      </p>

                      {deleteError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setUserToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleConfirmDeleteUser}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeleting ? 'Wird gelöscht...' : 'Mitarbeiter löschen'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- INVITATION MODAL --- */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              {t.inviteUserModalTitle}
            </h3>

            {!invitationLinkResult ? (
              <form onSubmit={handleSendInvite} className="space-y-3 text-xs">
                {/* Intern vs. Extern Selection */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mitarbeitertyp *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteEmploymentType('INTERNAL')}
                      className={`p-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                        inviteEmploymentType === 'INTERNAL'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">🏢 Intern (Festangestellt)</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">ArbZG & Urlaubskonto aktiv</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteEmploymentType('EXTERNAL')}
                      className={`p-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                        inviteEmploymentType === 'EXTERNAL'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">🤝 Extern (Freelancer)</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Keine ArbZG-Grenzwerte</div>
                    </button>
                  </div>
                </div>

                {inviteEmploymentType === 'EXTERNAL' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Subunternehmer- / Firmenname</label>
                    <input
                      type="text"
                      value={inviteCompanyName}
                      onChange={e => setInviteCompanyName(e.target.value)}
                      placeholder="z.B. AI Cloud Solutions GmbH"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vollständiger Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="z.B. Dr. Clara Schumann"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-Mail-Adresse *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="clara.schumann@insightarcs.de"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Berechtigungsrolle *</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="EMPLOYEE">Mitarbeiter</option>
                      <option value="PROJECT_MANAGER">Projektleiter</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Fachliche Rolle *</label>
                    <select
                      value={inviteJobRoleId}
                      onChange={e => setInviteJobRoleId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    >
                      {jobRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.standardBillingRate} €/h)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Soll-Wochenarbeitszeit (Stunden)</label>
                  <input
                    type="number"
                    value={inviteWeeklyHours}
                    onChange={e => setInviteWeeklyHours(e.target.value)}
                    placeholder="40"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                    Einladung generieren
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Einladungslink für <strong>{inviteEmail}</strong> wurde erfolgreich erzeugt!</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium">Magischer Registrierungslink (Gültig 7 Tage):</label>
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700">
                    <span className="truncate flex-1">{invitationLinkResult}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(invitationLinkResult)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInvitationLinkResult(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Fertig
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
