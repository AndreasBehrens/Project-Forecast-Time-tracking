import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GERMAN_STATES } from '../utils/holidays';
import { Organization, User } from '../types';
import {
  Building2,
  Plus,
  Edit3,
  MapPin,
  Laptop,
  Users,
  Briefcase,
  Layers,
  CheckCircle2,
  Shield,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Lock,
  KeyRound,
  Check,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

export const OrganizationsManagementView: React.FC = () => {
  const {
    organizations,
    organization,
    activeOrgId,
    currentUser,
    users,
    projects,
    clients,
    jobRoles,
    switchOrganization,
    createOrganization,
    updateOrganizationById,
    updateUser,
    inviteUser,
    deleteUser,
    refreshAllData
  } = useApp();

  const [activeTab, setActiveTab] = useState<'mandanten' | 'admins' | 'superadmins' | 'rbac'>('mandanten');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [switchingToOrgId, setSwitchingToOrgId] = useState<string | null>(null);

  // Superadmin Management States
  const [showCreateSuperadminModal, setShowCreateSuperadminModal] = useState(false);
  const [superadminName, setSuperadminName] = useState('');
  const [superadminEmail, setSuperadminEmail] = useState('');
  const [superadminMsg, setSuperadminMsg] = useState<string | null>(null);

  // Tenant Admin Assignment Modal
  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [selectedOrgForAdmin, setSelectedOrgForAdmin] = useState<Organization | null>(null);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  const [adminAssignMsg, setAdminAssignMsg] = useState<string | null>(null);

  // Form states for Create / Edit Tenant
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    defaultHourlyBillingRate: number;
    defaultHourlyCostRate: number;
    defaultCurrency: string;
    stateLocation: string;
    locationCity: string;
    allowMobileWorkplaces: boolean;
    logoColor: string;
  }>({
    name: '',
    code: '',
    defaultHourlyBillingRate: 130,
    defaultHourlyCostRate: 65,
    defaultCurrency: 'EUR',
    stateLocation: 'DE-BE',
    locationCity: 'Berlin',
    allowMobileWorkplaces: true,
    logoColor: 'emerald'
  });

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: `MND-0${organizations.length + 1}`,
      defaultHourlyBillingRate: 130,
      defaultHourlyCostRate: 65,
      defaultCurrency: 'EUR',
      stateLocation: 'DE-BE',
      locationCity: 'Berlin',
      allowMobileWorkplaces: true,
      logoColor: 'indigo'
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code || '',
      defaultHourlyBillingRate: org.defaultHourlyBillingRate,
      defaultHourlyCostRate: org.defaultHourlyCostRate,
      defaultCurrency: org.defaultCurrency || 'EUR',
      stateLocation: org.stateLocation || 'DE-BE',
      locationCity: org.locationCity || '',
      allowMobileWorkplaces: org.allowMobileWorkplaces ?? false,
      logoColor: org.logoColor || 'indigo'
    });
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const stateObj = GERMAN_STATES.find(s => s.code === formData.stateLocation);
    await createOrganization({
      name: formData.name,
      code: formData.code,
      defaultHourlyBillingRate: Number(formData.defaultHourlyBillingRate),
      defaultHourlyCostRate: Number(formData.defaultHourlyCostRate),
      defaultCurrency: formData.defaultCurrency,
      stateLocation: formData.stateLocation,
      locationCity: formData.locationCity || stateObj?.name || 'Berlin',
      allowMobileWorkplaces: formData.allowMobileWorkplaces,
      logoColor: formData.logoColor
    });

    setShowCreateModal(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg || !formData.name.trim()) return;

    const stateObj = GERMAN_STATES.find(s => s.code === formData.stateLocation);
    await updateOrganizationById(editingOrg.id, {
      name: formData.name,
      code: formData.code,
      defaultHourlyBillingRate: Number(formData.defaultHourlyBillingRate),
      defaultHourlyCostRate: Number(formData.defaultHourlyCostRate),
      defaultCurrency: formData.defaultCurrency,
      stateLocation: formData.stateLocation,
      locationCity: formData.locationCity || stateObj?.name,
      allowMobileWorkplaces: formData.allowMobileWorkplaces,
      logoColor: formData.logoColor
    });

    setEditingOrg(null);
  };

  const handleSwitchTenant = async (orgId: string) => {
    setSwitchingToOrgId(orgId);
    await switchOrganization(orgId);
    setSwitchingToOrgId(null);
  };

  // Handle assigning/promoting an Admin to a tenant
  const handleOpenAssignAdmin = (org: Organization) => {
    setSelectedOrgForAdmin(org);
    setSelectedUserIdForAdmin(users[0]?.id || '');
    setAdminAssignMsg(null);
    setShowAssignAdminModal(true);
  };

  const handleSaveAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForAdmin || !selectedUserIdForAdmin) return;

    const user = users.find(u => u.id === selectedUserIdForAdmin);
    if (!user) return;

    // Update user role to ADMIN
    await updateUser(user.id, {
      role: 'ADMIN'
    });

    setAdminAssignMsg(`Benutzer "${user.name}" wurde erfolgreich als Administrator für "${selectedOrgForAdmin.name}" ernannt.`);
    setTimeout(() => {
      setShowAssignAdminModal(false);
      setAdminAssignMsg(null);
    }, 1500);
  };

  // Handle creating a new Superadmin
  const handleSaveSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superadminName.trim() || !superadminEmail.trim()) return;

    await inviteUser({
      name: superadminName,
      email: superadminEmail,
      role: 'SUPERADMIN',
      employmentType: 'INTERNAL',
      weeklyTargetHours: 40
    });

    setSuperadminMsg(`Superadmin "${superadminName}" wurde erfolgreich angelegt.`);
    setSuperadminName('');
    setSuperadminEmail('');
    setTimeout(() => {
      setShowCreateSuperadminModal(false);
      setSuperadminMsg(null);
    }, 1500);
  };

  const superadmins = users.filter(u => u.role === 'SUPERADMIN' || u.id === 'u-1');
  const tenantAdmins = users.filter(u => u.role === 'ADMIN');
  const projectManagers = users.filter(u => u.role === 'PROJECT_MANAGER');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Superadmin-Zentrale &amp; Mandanten</h1>
                <span className="bg-purple-100 text-purple-900 border border-purple-300/80 text-xs font-bold px-2 py-0.5 rounded">
                  System-Administration
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Zentrale Steuerung aller Mandanten, Administratoren, System-Superadmins und strikter Datenisolationsregeln.
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <button
                id="btn-create-superadmin-header"
                onClick={() => setShowCreateSuperadminModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold rounded-lg text-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Superadmin anlegen
              </button>
              <button
                id="btn-create-organization-main"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Neuen Mandanten anlegen
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveTab('mandanten')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'mandanten'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Mandanten-Übersicht ({organizations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'admins'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Mandanten-Administratoren ({tenantAdmins.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('superadmins')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'superadmins'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-300" />
            <span>Superadmin-Verwaltung ({superadmins.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'rbac'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
            <span>5-Regeln-Architektur &amp; RBAC</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANDANTEN ÜBERSICHT */}
      {/* ========================================================================= */}
      {activeTab === 'mandanten' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Isolation Rules Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Strikte Mandanten-Isolation</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Kunden, Projekte, Zeiteinträge, Forecasts und Freigaben sind strikt an die Mandanten-ID gekoppelt.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
              <DollarSign className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Eigene Satzhierarchie je Mandant</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Jeder Mandant besitzt seine eigenen Standardsätze, fachlichen Rollen und individuellen Mitarbeiter-Kostensätze.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
              <Laptop className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standort &amp; Feiertage</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Der Feiertagskalender richtet sich primär nach dem Mandantensitz oder nach mobilen Arbeitsplätzen der festen Mitarbeiter.
                </p>
              </div>
            </div>
          </div>

          {/* Organizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {organizations.map(org => {
              const isActive = org.id === activeOrgId;
              const stateInfo = GERMAN_STATES.find(s => s.code === org.stateLocation);
              const orgUsers = users.filter(u => u.orgId === org.id || u.memberships?.some(m => m.orgId === org.id));
              const orgAdmins = orgUsers.filter(u => u.role === 'ADMIN');
              const orgProjectsCount = projects.filter(p => p.orgId === org.id).length;
              const orgClientsCount = clients.filter(c => c.orgId === org.id).length;

              return (
                <div
                  key={org.id}
                  className={`bg-white rounded-xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="p-6">
                    {/* Top Badge & Code */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {org.code || 'MND'}
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Aktiver Mandant
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Isolierter Mandant</span>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                      {org.name}
                    </h3>

                    {/* Assigned Admins */}
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-medium">Mandanten-Admin:</span>
                      {orgAdmins.length > 0 ? (
                        orgAdmins.map(a => (
                          <span key={a.id} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            {a.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Verwaltet via Superadmin</span>
                      )}
                    </div>

                    {/* Location & Holiday Info */}
                    <div className="mt-4 space-y-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          Hauptstandort:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {org.locationCity || stateInfo?.name || 'Berlin'} ({org.stateLocation || 'DE-BE'})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-purple-600" />
                          Mobile Arbeitsplätze:
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            org.allowMobileWorkplaces
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {org.allowMobileWorkplaces ? 'Aktiv (MA-Bundesland)' : 'Inaktiv (Fix Mandant)'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                          Standard-Sätze:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {org.defaultHourlyBillingRate} € / {org.defaultHourlyCostRate} €
                        </span>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-md py-1.5 px-1 border border-slate-100">
                        <div className="text-xs text-slate-500">Mitarbeiter</div>
                        <div className="text-sm font-bold text-slate-800">{orgUsers.length}</div>
                      </div>
                      <div className="bg-slate-50 rounded-md py-1.5 px-1 border border-slate-100">
                        <div className="text-xs text-slate-500">Kunden</div>
                        <div className="text-sm font-bold text-slate-800">{orgClientsCount}</div>
                      </div>
                      <div className="bg-slate-50 rounded-md py-1.5 px-1 border border-slate-100">
                        <div className="text-xs text-slate-500">Projekte</div>
                        <div className="text-sm font-bold text-slate-800">{orgProjectsCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-edit-org-${org.id}`}
                          onClick={() => handleOpenEdit(org)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Konfigurieren
                        </button>
                        <button
                          id={`btn-assign-admin-${org.id}`}
                          onClick={() => handleOpenAssignAdmin(org)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Admin zuweisen
                        </button>
                      </div>
                    )}

                    {isSuperAdmin && !isActive && (
                      <button
                        id={`btn-switch-org-${org.id}`}
                        onClick={() => handleSwitchTenant(org.id)}
                        disabled={switchingToOrgId === org.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors ml-auto shadow-2xs"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {switchingToOrgId === org.id ? 'Wechsle...' : 'In Mandanten wechseln'}
                      </button>
                    )}

                    {isActive && (
                      <span className="text-xs text-emerald-700 font-medium ml-auto flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Aktiver Workspace
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANDANTEN-ADMINISTRATOREN (RULE 4) */}
      {/* ========================================================================= */}
      {activeTab === 'admins' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Regel 4: Die Rolle eines Admin wird ausschließlich durch einen Superadmin verwaltet
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Mandanten-Administratoren besitzen volle Rechte innerhalb ihres zugewiesenen Mandanten (Stundensätze, Projekte, Freigaben, Mitarbeiter-Einladungen). Sie können jedoch keine weiteren Administratoren oder Superadmins ernennen. Die Ernennung und Verwaltung von Administratoren obliegt ausschließlich der Superadmin-Zentrale.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Aktive Mandanten-Administratoren</h3>
                <p className="text-xs text-slate-500">Übersicht aller Benutzer mit Mandanten-Administratorrechten</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Administrator</th>
                    <th className="px-4 py-3">E-Mail</th>
                    <th className="px-4 py-3">Zugeordneter Mandant</th>
                    <th className="px-4 py-3">Projektleiter-Status (Regel 5)</th>
                    <th className="px-4 py-3">Verwaltete Projekte</th>
                    <th className="px-4 py-3 text-right">Aktionen (Superadmin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantAdmins.map(admin => {
                    const org = organizations.find(o => o.id === admin.orgId);
                    const managedProjects = projects.filter(p => p.projectManagerId === admin.id || p.managerUserIds?.includes(admin.id));
                    const isAlsoPM = managedProjects.length > 0;

                    return (
                      <tr key={admin.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                              {admin.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{admin.name}</div>
                              <span className="text-[10px] text-amber-700 font-medium">Mandanten-Admin</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{admin.email}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{org?.name || 'Insight Arcs GmbH'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isAlsoPM ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Ja, ist Projektleiter ({managedProjects.length} Prj.)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Rein administratives Profil</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {managedProjects.length > 0 ? (
                            <span>{managedProjects.map(p => p.name).join(', ')}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async () => {
                              await updateUser(admin.id, { role: 'PROJECT_MANAGER' });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 transition-colors"
                          >
                            Auf Projektleiter herabstufen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tenantAdmins.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                        Keine separaten Mandanten-Administratoren ernannt. Superadmins agieren direkt als Administratoren für alle Mandanten (Regel 1).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUPERADMIN-VERWALTUNG (RULE 3) */}
      {/* ========================================================================= */}
      {activeTab === 'superadmins' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-purple-900 text-white rounded-xl p-5 flex items-start justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-800 border border-purple-700 text-purple-200 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Regel 3: Die Anlage und Verwaltung eines Superadmin kann nur durch einen Superadmin erfolgen
                </h3>
                <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                  Superadmins besitzen globale Systemverwaltungsprivilegien über alle Mandanten hinweg (Regel 1 &amp; 2). Aus Sicherheitsgründen können Superadmin-Konten ausschließlich von bestehenden Superadmins erstellt, editiert oder entfernt werden.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateSuperadminModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0 border border-purple-500 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Weiteren Superadmin anlegen
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">System-Superadmins</h3>
                <p className="text-xs text-slate-500">Globale Administratoren mit vollem Mandantenzugriff</p>
              </div>
              <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-full border border-purple-200">
                {superadmins.length} Superadmin(s) registriert
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Superadmin</th>
                    <th className="px-4 py-3">E-Mail</th>
                    <th className="px-4 py-3">Systemrolle</th>
                    <th className="px-4 py-3">Mandantenzugriff (Regel 1)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Sicherheit &amp; Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {superadmins.map(sa => (
                    <tr key={sa.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                            <Shield className="w-4 h-4 text-purple-300" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{sa.name}</span>
                              {sa.id === 'u-1' && (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  System-Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-purple-700 font-semibold">Globaler Superadmin</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">{sa.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Shield className="w-3 h-3 text-purple-700" />
                          SUPERADMIN
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Admin für alle {organizations.length} Mandanten
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Aktiv
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sa.id === 'u-1' || superadmins.length <= 1 ? (
                          <span className="text-[11px] text-slate-400 italic">Geschützter Haupt-Superadmin</span>
                        ) : (
                          <button
                            onClick={async () => {
                              if (confirm(`Möchten Sie den Superadmin-Status von "${sa.name}" wirklich entziehen?`)) {
                                await updateUser(sa.id, { role: 'ADMIN' });
                              }
                            }}
                            className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-xs font-semibold transition-colors"
                          >
                            Herabstufen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 5-REGELN-ARCHITEKTUR & RBAC */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <span>Die 5 Grundregeln des Mandanten- &amp; Rollenmodells</span>
            </h2>
            <p className="text-xs text-slate-600 mb-6">
              Vollständige Prüfung und formale Dokumentation der Mandantentrennung und Rollenhierarchie in Insight Arcs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Regel 1 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                  <h3 className="font-bold text-slate-900 text-sm">SuperAdmin wird zum Admin eines Mandanten</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Der SuperAdmin besitzt beim Wechsel in einen beliebigen Mandanten automatisch die volle administrative Handlungsfähigkeit (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">isAdmin: true</code>), ohne dass pro Mandant manuelle Mitgliedschaften gepflegt werden müssen.
                </p>
              </div>

              {/* Regel 2 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <h3 className="font-bold text-slate-900 text-sm">Superadmin verwaltet Mandanten &amp; deren Daten</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Die globale Rolle Superadmin verwaltet Mandanten, Firmenkonfigurationen, globale Grundeinstellungen sowie übergreifende Audit-Logs. Innerhalb der Mandanten gelten die mandantenspezifischen Daten.
                </p>
              </div>

              {/* Regel 3 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h3 className="font-bold text-slate-900 text-sm">Superadmin-Verwaltung nur durch Superadmin</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Die Anlage, Modifikation und Löschung eines Superadmins kann ausschließlich durch einen bereits authentifizierten Superadmin erfolgen. Mandanten-Admins haben keinen Zugriff auf diese Funktion.
                </p>
              </div>

              {/* Regel 4 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                  <h3 className="font-bold text-slate-900 text-sm">Admin-Rolle wird durch Superadmin verwaltet</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Die Ernennung von Mandanten-Administratoren erfolgt durch den SuperAdmin. Ein Mandanten-Admin kann Mitarbeiter und Projektleiter einladen, aber keine weiteren Mandanten-Admins ernennen.
                </p>
              </div>

              {/* Regel 5 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">5</span>
                  <h3 className="font-bold text-slate-900 text-sm">Ein Admin kann auch Projektleiter sein</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ein Mandanten-Administrator oder Superadmin kann bei Projekten direkt als verantwortlicher Projektleiter (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">projectManagerId</code>) hinterlegt werden. Er besitzt dann sowohl administrative Vollmachten als auch operative Projektleitungsrechte.
                </p>
              </div>
            </div>
          </div>

          {/* Role Hierarchy Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Berechtigungs-Matrix der 4 Rollenebenen</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Berechtigung / Funktion</th>
                    <th className="px-4 py-3 text-center">Superadmin</th>
                    <th className="px-4 py-3 text-center">Mandanten-Admin</th>
                    <th className="px-4 py-3 text-center">Projektleiter</th>
                    <th className="px-4 py-3 text-center">Mitarbeiter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Mandanten anlegen / konfigurieren</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja (Global)</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Superadmins verwalten (Regel 3)</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Mandanten-Admins ernennen (Regel 4)</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Stundensätze &amp; Mitarbeiter-Kostensätze</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Voll</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Im Mandanten</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Projekte anlegen &amp; leiten (Regel 5)</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Ja (eigene Prj.)</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Zeiteinträge freigeben (2-Stufen-Workflow)</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Stufe 1 &amp; 2</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓ Stufe 1 &amp; 2</td>
                    <td className="px-4 py-2.5 text-center text-blue-600 font-bold">✓ Stufe 1 (Fachlich)</td>
                    <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">Zeiterfassung &amp; Arbeitszeiterfassung</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                    <td className="px-4 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE ORGANIZATION */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Neuen Mandanten anlegen</h3>
                  <p className="text-xs text-slate-500">Erstellt einen isolierten Firmenmandanten</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firmenname des Mandanten *
                </label>
                <input
                  id="input-org-name"
                  type="text"
                  required
                  placeholder="z.B. NovaTech Solutions GmbH"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandanten-Kürzel *
                  </label>
                  <input
                    id="input-org-code"
                    type="text"
                    required
                    placeholder="z.B. NOV-MUC"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standort-Stadt
                  </label>
                  <input
                    id="input-org-city"
                    type="text"
                    placeholder="z.B. München"
                    value={formData.locationCity}
                    onChange={e => setFormData({ ...formData, locationCity: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primäres Bundesland (Feiertagskalender) *
                </label>
                <select
                  id="select-org-state"
                  value={formData.stateLocation}
                  onChange={e => {
                    const selected = GERMAN_STATES.find(s => s.code === e.target.value);
                    setFormData({
                      ...formData,
                      stateLocation: e.target.value,
                      locationCity: formData.locationCity || selected?.name || ''
                    });
                  }}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                >
                  {GERMAN_STATES.map(st => (
                    <option key={st.code} value={st.code}>
                      {st.name} ({st.code}) — {st.extraHolidaysDescription}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Workplaces Toggle */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="check-org-mobile-workplaces"
                    type="checkbox"
                    checked={formData.allowMobileWorkplaces}
                    onChange={e => setFormData({ ...formData, allowMobileWorkplaces: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">
                      Mobile Arbeitsplätze für feste Mitarbeiter gestatten
                    </span>
                    <span className="text-[11px] text-purple-700 block mt-0.5 leading-relaxed">
                      Wenn aktiv, greift für feste Mitarbeiter das im Profil hinterlegte Bundesland für Feiertage. Für freie/externe Mitarbeiter gilt stets der Mandantensitz.
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Abrechnungssatz (€/h)
                  </label>
                  <input
                    id="input-org-billing-rate"
                    type="number"
                    min="0"
                    step="5"
                    value={formData.defaultHourlyBillingRate}
                    onChange={e => setFormData({ ...formData, defaultHourlyBillingRate: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Kostensatz (€/h)
                  </label>
                  <input
                    id="input-org-cost-rate"
                    type="number"
                    min="0"
                    step="5"
                    value={formData.defaultHourlyCostRate}
                    onChange={e => setFormData({ ...formData, defaultHourlyCostRate: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  id="btn-submit-create-org"
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Mandanten erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Organization */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Mandant konfigurieren</h3>
                  <p className="text-xs text-slate-500">{editingOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firmenname des Mandanten *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandanten-Kürzel *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standort-Stadt
                  </label>
                  <input
                    type="text"
                    value={formData.locationCity}
                    onChange={e => setFormData({ ...formData, locationCity: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primäres Bundesland (Feiertagskalender) *
                </label>
                <select
                  value={formData.stateLocation}
                  onChange={e => {
                    const selected = GERMAN_STATES.find(s => s.code === e.target.value);
                    setFormData({
                      ...formData,
                      stateLocation: e.target.value,
                      locationCity: formData.locationCity || selected?.name || ''
                    });
                  }}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                >
                  {GERMAN_STATES.map(st => (
                    <option key={st.code} value={st.code}>
                      {st.name} ({st.code}) — {st.extraHolidaysDescription}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Workplaces Toggle */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowMobileWorkplaces}
                    onChange={e => setFormData({ ...formData, allowMobileWorkplaces: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">
                      Mobile Arbeitsplätze für feste Mitarbeiter gestatten
                    </span>
                    <span className="text-[11px] text-purple-700 block mt-0.5 leading-relaxed">
                      Wenn aktiv, greift für feste Mitarbeiter das im Profil hinterlegte Bundesland für Feiertage. Für freie/externe Mitarbeiter gilt stets der Mandantensitz.
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Abrechnungssatz (€/h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.defaultHourlyBillingRate}
                    onChange={e => setFormData({ ...formData, defaultHourlyBillingRate: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Kostensatz (€/h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formData.defaultHourlyCostRate}
                    onChange={e => setFormData({ ...formData, defaultHourlyCostRate: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Admin to Tenant (Rule 4) */}
      {showAssignAdminModal && selectedOrgForAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mandanten-Administrator ernennen</h3>
                  <p className="text-xs text-slate-500">{selectedOrgForAdmin.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {adminAssignMsg ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adminAssignMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveAssignAdmin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Benutzer auswählen (wird zum Admin befördert) *
                  </label>
                  <select
                    value={selectedUserIdForAdmin}
                    onChange={e => setSelectedUserIdForAdmin(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — Aktuell: {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 block mb-0.5">Hinweis gemäß Regel 4:</strong>
                  Der Benutzer erhält administrative Vollmachten für den Mandanten (Projekte, Stundensätze, Freigaben), kann jedoch keine weiteren Admins oder Superadmins erstellen.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignAdminModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                  >
                    Als Admin bestätigen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Superadmin (Rule 3) */}
      {showCreateSuperadminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Neuen System-Superadmin anlegen</h3>
                  <p className="text-xs text-slate-500">Regel 3: Nur durch Superadmin ausführbar</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateSuperadminModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {superadminMsg ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{superadminMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSaveSuperadmin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vollständiger Name des Superadmins *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Dr. Julia Sommer"
                    value={superadminName}
                    onChange={e => setSuperadminName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Offizielle E-Mail-Adresse *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="z.B. julia.sommer@insightarcs.de"
                    value={superadminEmail}
                    onChange={e => setSuperadminEmail(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] text-purple-900 leading-relaxed">
                  <strong className="block mb-0.5">Sicherheitshinweis:</strong>
                  Dieser Benutzer erhält globale Administrationsrechte über alle Mandanten sowie die Berechtigung, weitere Superadmins anzulegen.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateSuperadminModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-900 hover:bg-purple-800 rounded-lg shadow-xs"
                  >
                    Superadmin anlegen
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
