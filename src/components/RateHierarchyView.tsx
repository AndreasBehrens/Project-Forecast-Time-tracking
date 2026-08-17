import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, EmployeeJobRole } from '../types';
import { GERMAN_STATES, resolveUserHolidayState } from '../utils/holidays';
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
  Lock,
  Building2,
  Laptop,
  MapPin,
  Plus,
  Sparkles
} from 'lucide-react';

export const RateHierarchyView: React.FC = () => {
  const {
    t,
    users,
    jobRoles,
    projects,
    organization,
    activeOrgId,
    timeEntries,
    resolveRate,
    inviteUser,
    updateUser,
    deleteUser,
    createJobRole,
    updateJobRole,
    deleteJobRole,
    currentUser
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';

  // Rate Hierarchy Interactive Tester
  const [testUserId, setTestUserId] = useState(users[0]?.id || 'u-1');
  const [testProjectId, setTestProjectId] = useState(projects[0]?.id || 'p-1');
  const [resolvedResult, setResolvedResult] = useState<any>(null);

  // Filter & Search States
  const [empTypeFilter, setEmpTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [empSearch, setEmpSearch] = useState('');

  // Job Role Management Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<EmployeeJobRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleBillingRate, setRoleBillingRate] = useState('130');
  const [roleCostRate, setRoleCostRate] = useState('65');

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmploymentType, setInviteEmploymentType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [inviteCompanyName, setInviteCompanyName] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EMPLOYEE' | 'PROJECT_MANAGER' | 'ADMIN' | 'SUPERADMIN'>('EMPLOYEE');
  const [inviteJobRoleId, setInviteJobRoleId] = useState(jobRoles[0]?.id || 'role-mid');
  const [inviteStateLocation, setInviteStateLocation] = useState(organization?.stateLocation || 'DE-BE');
  const [inviteCostRate, setInviteCostRate] = useState('65');
  const [inviteWeeklyHours, setInviteWeeklyHours] = useState('40');
  const [invitationLinkResult, setInvitationLinkResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'EMPLOYEE' | 'PROJECT_MANAGER' | 'ADMIN' | 'SUPERADMIN'>('EMPLOYEE');
  const [editEmploymentType, setEditEmploymentType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editJobRoleId, setEditJobRoleId] = useState('');
  const [editStateLocation, setEditStateLocation] = useState('DE-BE');
  const [editWeeklyHours, setEditWeeklyHours] = useState('40');
  const [editDailyHours, setEditDailyHours] = useState('8');
  const [editBillingRate, setEditBillingRate] = useState('');
  const [editCostRate, setEditCostRate] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Delete User Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Role Confirmation
  const [roleToDelete, setRoleToDelete] = useState<EmployeeJobRole | null>(null);
  const [roleDeleteError, setRoleDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (testUserId) {
      resolveRate(testUserId, testProjectId).then(data => setResolvedResult(data));
    }
  }, [testUserId, testProjectId]);

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleBillingRate('130');
    setRoleCostRate('65');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role: EmployeeJobRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleBillingRate(String(role.standardBillingRate));
    setRoleCostRate(String(role.standardCostRate));
    setShowRoleModal(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    if (editingRole) {
      await updateJobRole(editingRole.id, {
        name: roleName,
        description: roleDescription,
        standardBillingRate: parseFloat(roleBillingRate) || 130,
        standardCostRate: parseFloat(roleCostRate) || 65
      });
    } else {
      await createJobRole({
        name: roleName,
        description: roleDescription,
        standardBillingRate: parseFloat(roleBillingRate) || 130,
        standardCostRate: parseFloat(roleCostRate) || 65
      });
    }

    setShowRoleModal(false);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setRoleDeleteError(null);
    const res = await deleteJobRole(roleToDelete.id);
    if (res.success) {
      setRoleToDelete(null);
    } else {
      setRoleDeleteError(res.error || 'Rolle konnte nicht gelöscht werden.');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await inviteUser({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      employmentType: inviteEmploymentType,
      companyName: inviteEmploymentType === 'EXTERNAL' ? inviteCompanyName : undefined,
      jobRoleId: inviteJobRoleId,
      stateLocation: inviteEmploymentType === 'INTERNAL' && organization?.allowMobileWorkplaces ? inviteStateLocation : organization?.stateLocation,
      individualCostRate: parseFloat(inviteCostRate) || undefined,
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
    setEditStateLocation(user.stateLocation || organization?.stateLocation || 'DE-BE');
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
      stateLocation: editEmploymentType === 'INTERNAL' && organization?.allowMobileWorkplaces ? editStateLocation : organization?.stateLocation,
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

  const tenantJobRoles = jobRoles.filter(r => !r.orgId || r.orgId === activeOrgId);
  const tenantState = GERMAN_STATES.find(s => s.code === (organization?.stateLocation || 'DE-BE'));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Hierarchy Explanation Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                {t.rateHierarchyTitle} &amp; Mandanten-Regeln
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">
                Mandant: {organization?.name.split(' (')[0]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Stundensätze sind je Rolle definierbar. Kostensätze pro Mitarbeiter. Feiertagskalender richten sich nach Mandantenstandort oder Mobile-Workplace-Freigabe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-create-role"
              onClick={handleOpenCreateRole}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-300/80"
            >
              <Plus className="w-4 h-4" />
              <span>Rolle definieren</span>
            </button>

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
        </div>

        {/* Holiday & Workplace Context Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Mandanten-Hauptstandort &amp; Feiertagskalender</span>
              <span className="text-slate-600 block mt-0.5">
                {organization?.locationCity || 'Berlin'} ({tenantState?.name || 'Berlin'} • {tenantState?.code}) — {tenantState?.extraHolidaysDescription}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Mobile Arbeitsplätze Status</span>
              <span className="text-slate-600 block mt-0.5">
                {organization?.allowMobileWorkplaces ? (
                  <span className="text-purple-900 font-semibold">
                    ✓ Aktiviert — Feste MA können individuelles Bundesland wählen. Für Externe gilt stets {organization?.locationCity || 'Berlin'}.
                  </span>
                ) : (
                  <span className="text-slate-700">
                    ✕ Deaktiviert — Alle Mitarbeiter &amp; Externe nutzen fix den Mandantenstandort ({organization?.locationCity || 'Berlin'}).
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Tier Visual Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
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
            <p className="text-[11px] text-slate-500">Stundensatz der Rolle je Mandant (z.B. Junior, Consultant, Senior, Lead).</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">4. Basis / Fallback</div>
            <div className="text-xs font-bold text-slate-900">Organisations-Standard</div>
            <p className="text-[11px] text-slate-500">Mandantenweiter Fallback-Satz ({organization?.defaultHourlyBillingRate} €/h).</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: FACHLICHE ROLLEN & STUNDENSÄTZE JE MANDANT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Fachliche Rollen &amp; Stundensätze ({tenantJobRoles.length})</h3>
              <p className="text-xs text-slate-500">Stundensätze sind je Rolle separat für diesen Mandanten definiert.</p>
            </div>
          </div>

          <button
            id="btn-add-job-role"
            onClick={handleOpenCreateRole}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Rolle anlegen
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {tenantJobRoles.map(role => {
            const usersWithRole = users.filter(u => u.jobRoleId === role.id).length;

            return (
              <div
                key={role.id}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{role.name}</h4>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                      {usersWithRole} MA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {role.description || 'Fachliche Rolle im Mandanten'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Stundensatz (Kunde):</span>
                    <span className="font-bold text-emerald-700">{role.standardBillingRate} €/h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Kostensatz (Basis):</span>
                    <span className="font-bold text-purple-700">{role.standardCostRate} €/h</span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2">
                    <button
                      id={`btn-edit-role-${role.id}`}
                      onClick={() => handleOpenEditRole(role)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-xs"
                      title="Rolle bearbeiten"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-del-role-${role.id}`}
                      onClick={() => {
                        setRoleToDelete(role);
                        setRoleDeleteError(null);
                      }}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs"
                      title="Rolle löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
            Live Satzhierarchie Resolver (4 Stufen)
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
                <option key={u.id} value={u.id}>{u.name} ({u.role} • {u.employmentType === 'EXTERNAL' ? 'Extern' : 'Intern'})</option>
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
                <div className="text-[10px] uppercase font-bold text-slate-400">{t.costRate} (Kostensatz MA)</div>
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

      {/* ========================================================================= */}
      {/* SECTION: MITARBEITER, KOSTENSÄTZE & STANDORT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {t.teamMembers} ({users.length})
            </div>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Mandant: {organization?.name || 'Insight Arcs GmbH'}
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
                <th className="px-4 py-3">Systemrolle</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Fachliche Rolle (Stundensatz)</th>
                <th className="px-4 py-3">Kostensatz / MA</th>
                <th className="px-4 py-3">Standort &amp; Feiertagskalender</th>
                <th className="px-4 py-3">Sollstunden</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const jobRole = jobRoles.find(r => r.id === u.jobRoleId);
                const isExternal = u.employmentType === 'EXTERNAL';
                const resolvedStateCode = resolveUserHolidayState(u, organization);
                const userStateObj = GERMAN_STATES.find(s => s.code === resolvedStateCode);
                const userEntries = timeEntries.filter(e => e.userId === u.id);
                const hasTimeEntries = userEntries.length > 0;
                
                // RBAC Protection: Non-superadmins cannot delete Admins or Superadmins
                const isProtectedAdmin = (u.role === 'SUPERADMIN' || u.role === 'ADMIN') && !isSuperAdmin;
                const canDelete = !hasTimeEntries && !isProtectedAdmin;

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
                      {u.role === 'SUPERADMIN' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3 text-purple-700" />
                          <span>Superadmin</span>
                        </span>
                      ) : u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-amber-700" />
                          <span>Mandanten-Admin</span>
                        </span>
                      ) : u.role === 'PROJECT_MANAGER' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full">
                          <Briefcase className="w-3 h-3 text-blue-700" />
                          <span>Projektleitung</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>Mitarbeiter</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isExternal ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200/60 px-2 py-0.5 rounded">
                          Extern (Frei)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded">
                          Intern (Fest)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{jobRole?.name || '—'}</div>
                      <div className="text-[10px] text-slate-500">
                        {u.individualBillingRate ? (
                          <span className="text-emerald-700 font-semibold">{u.individualBillingRate} €/h (Override)</span>
                        ) : (
                          <span>{jobRole?.standardBillingRate || 130} €/h (Rolle)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-800">
                        {u.individualCostRate || jobRole?.standardCostRate || 65} €/h
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{userStateObj?.name || 'Berlin'} ({resolvedStateCode})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {isExternal ? (
                          <span className="text-purple-700">Mandantenstandort (fix)</span>
                        ) : organization?.allowMobileWorkplaces && u.stateLocation && u.stateLocation !== organization.stateLocation ? (
                          <span className="text-purple-700 font-medium">Mobiler Arbeitsplatz</span>
                        ) : (
                          <span>Mandantenstandort</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <strong>{u.weeklyTargetHours}h</strong> / Wo
                    </td>
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
                          disabled={!canDelete}
                          title={
                            isProtectedAdmin
                              ? 'Administratoren & Superadmins können nur über die Superadmin-Zentrale verwaltet werden'
                              : hasTimeEntries
                              ? `${userEntries.length} Zeiteinträge vorhanden (GoBD geschützt)`
                              : 'Mitarbeiter löschen'
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                            canDelete
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
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
                    Keine Mitarbeiter für den aktuellen Filter gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT JOB ROLE */}
      {/* ========================================================================= */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>{editingRole ? 'Fachliche Rolle bearbeiten' : 'Neue fachliche Rolle anlegen'}</span>
            </h3>

            <form onSubmit={handleSaveRole} className="space-y-3 text-xs text-left">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rollenbezeichnung *</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Senior Cloud Architect"
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Beschreibung</label>
                <input
                  type="text"
                  placeholder="z.B. Leitende Architektur & Technologieberatung"
                  value={roleDescription}
                  onChange={e => setRoleDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stundensatz (€/h) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5"
                    value={roleBillingRate}
                    onChange={e => setRoleBillingRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Kundensatz dieser Rolle</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Standard-Kostensatz (€/h) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="5"
                    value={roleCostRate}
                    onChange={e => setRoleCostRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-700"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Interne Kosten dieser Rolle</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Rolle speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE ROLE CONFIRMATION */}
      {/* ========================================================================= */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Fachliche Rolle löschen?</span>
            </h3>
            <p className="text-xs text-slate-600">
              Möchten Sie die Rolle <strong>"{roleToDelete.name}"</strong> wirklich entfernen?
            </p>

            {roleDeleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {roleDeleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Rolle löschen
              </button>
            </div>
          </div>
        </div>
      )}

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

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs text-left">
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
                    <option value="EXTERNAL">🤝 Freier Mitarbeiter / Extern</option>
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

              {/* Feiertagskalender & Standort Konfiguration */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Standort &amp; Feiertagskalender
                </label>

                {editEmploymentType === 'EXTERNAL' ? (
                  <div className="text-[11px] text-slate-600 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                    <span className="font-bold text-purple-900 block">Mandantenstandort fix für Externe</span>
                    Gemäß Vorgabe gilt für freie &amp; externe Mitarbeiter stets der Hauptstandort des Mandanten (<strong>{organization?.locationCity || 'Berlin'} • {organization?.stateLocation || 'DE-BE'}</strong>).
                  </div>
                ) : organization?.allowMobileWorkplaces ? (
                  <div>
                    <select
                      value={editStateLocation}
                      onChange={e => setEditStateLocation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      {GERMAN_STATES.map(st => (
                        <option key={st.code} value={st.code}>
                          {st.name} ({st.code}) — {st.extraHolidaysDescription}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-purple-700 block mt-1">
                      ✓ Mobile Arbeitsplätze aktiv: Das Bundesland bestimmt die Feiertage dieses festen Mitarbeiters.
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block">Fix am Mandanten gebunden ({organization?.locationCity || 'Berlin'})</span>
                    Der Mandant hat Mobile Arbeitsplätze deaktiviert. Alle Mitarbeiter nutzen den Feiertagskalender von {organization?.locationCity || 'Berlin'}.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Systemrolle *</label>
                  {isSuperAdmin ? (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as any)}
                      className="w-full border border-purple-200 bg-purple-50/40 rounded-xl px-3 py-2 text-xs font-semibold text-purple-900"
                    >
                      <option value="EMPLOYEE">Mitarbeiter (EMPLOYEE)</option>
                      <option value="PROJECT_MANAGER">Projektleiter (PROJECT_MANAGER)</option>
                      <option value="ADMIN">Mandanten-Administrator (ADMIN)</option>
                      <option value="SUPERADMIN">System-Superadmin (SUPERADMIN)</option>
                    </select>
                  ) : editingUser?.role === 'SUPERADMIN' || editingUser?.role === 'ADMIN' ? (
                    <div className="w-full border border-slate-200 bg-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{editingUser.role === 'SUPERADMIN' ? 'System-Superadmin' : 'Mandanten-Administrator'}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  ) : (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <option value="EMPLOYEE">Mitarbeiter (EMPLOYEE)</option>
                      <option value="PROJECT_MANAGER">Projektleiter (PROJECT_MANAGER)</option>
                    </select>
                  )}
                  {!isSuperAdmin && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Admin-Rollen werden über die Superadmin-Zentrale verwaltet.
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fachliche Rolle (Stundensatz) *</label>
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

              {/* Kostensatz pro Mitarbeiter */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kostensatz pro Mitarbeiter (€/h)</label>
                  <input
                    type="number"
                    step="5"
                    placeholder="Leer = Rolle"
                    value={editCostRate}
                    onChange={e => setEditCostRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-700"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Individueller Kostensatz dieses MA</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Indiv. Kundensatz (€/h Override)</label>
                  <input
                    type="number"
                    step="5"
                    placeholder="Leer = Rolle"
                    value={editBillingRate}
                    onChange={e => setEditBillingRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Stufe 2 Stundensatz-Override</span>
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
                          <span>Revisionssicherheit &amp; gesetzliche Aufbewahrungspflicht</span>
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
              <form onSubmit={handleSendInvite} className="space-y-3 text-xs text-left">
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
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">ArbZG &amp; Urlaubskonto aktiv</div>
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
                      <div className="font-bold">🤝 Extern (Freier MA)</div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">Fixer Mandantenstandort</div>
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

                {/* Standort & Feiertagskalender */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Standort &amp; Feiertagskalender
                  </label>

                  {inviteEmploymentType === 'EXTERNAL' ? (
                    <div className="text-[11px] text-slate-600">
                      Standort: <strong>{organization?.locationCity || 'Berlin'} ({organization?.stateLocation || 'DE-BE'})</strong> (Mandantenstandort gilt fix für Externe).
                    </div>
                  ) : organization?.allowMobileWorkplaces ? (
                    <div>
                      <select
                        value={inviteStateLocation}
                        onChange={e => setInviteStateLocation(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        {GERMAN_STATES.map(st => (
                          <option key={st.code} value={st.code}>
                            {st.name} ({st.code}) — {st.extraHolidaysDescription}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-600">
                      Standort: <strong>{organization?.locationCity || 'Berlin'}</strong> (Mandant hat mobile Arbeitsplätze deaktiviert).
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Berechtigungsrolle *</label>
                    {isSuperAdmin ? (
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        className="w-full border border-purple-200 bg-purple-50/40 rounded-xl px-3 py-2 text-xs font-semibold text-purple-900"
                      >
                        <option value="EMPLOYEE">Mitarbeiter (EMPLOYEE)</option>
                        <option value="PROJECT_MANAGER">Projektleiter (PROJECT_MANAGER)</option>
                        <option value="ADMIN">Mandanten-Administrator (ADMIN)</option>
                        <option value="SUPERADMIN">System-Superadmin (SUPERADMIN)</option>
                      </select>
                    ) : (
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                      >
                        <option value="EMPLOYEE">Mitarbeiter (EMPLOYEE)</option>
                        <option value="PROJECT_MANAGER">Projektleiter (PROJECT_MANAGER)</option>
                      </select>
                    )}
                    {!isSuperAdmin && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Administratoren werden zentral durch Superadmins ernannt.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Fachliche Rolle (Stundensatz) *</label>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kostensatz pro MA (€/h)</label>
                    <input
                      type="number"
                      step="5"
                      value={inviteCostRate}
                      onChange={e => setInviteCostRate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-700"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Soll-Wochenarbeitszeit (h)</label>
                    <input
                      type="number"
                      value={inviteWeeklyHours}
                      onChange={e => setInviteWeeklyHours(e.target.value)}
                      placeholder="40"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
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
              <div className="space-y-3 text-xs text-left">
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
