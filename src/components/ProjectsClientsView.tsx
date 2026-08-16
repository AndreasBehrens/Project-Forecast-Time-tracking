import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Project, Client, Task } from '../types';
import {
  FolderKanban,
  Building,
  Plus,
  CheckCircle,
  FileCheck,
  Tag,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  Settings,
  Users,
  Lock,
  Globe,
  UserCheck,
  UserX,
  Search,
  Check
} from 'lucide-react';

export const ProjectsClientsView: React.FC = () => {
  const {
    t,
    projects,
    clients,
    tasks,
    timeEntries,
    users,
    jobRoles,
    currentUser,
    createProject,
    updateProject,
    createClient,
    createTask
  } = useApp();

  // Create Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projClientId, setProjClientId] = useState(clients[0]?.id || '');
  const [projBillingModel, setProjBillingModel] = useState<'TIME_AND_MATERIAL' | 'FIXED_PRICE'>('TIME_AND_MATERIAL');
  const [projFixedPrice, setProjFixedPrice] = useState('50000');
  const [projBudgetHours, setProjBudgetHours] = useState('200');
  const [projRequireApproval, setProjRequireApproval] = useState(true);
  const [projReqDesc, setProjReqDesc] = useState(true);
  const [projReqTask, setProjReqTask] = useState(false);
  const [projReqBreaks, setProjReqBreaks] = useState(false);
  const [projRestrictMembers, setProjRestrictMembers] = useState(false);
  const [projAssignedUsers, setProjAssignedUsers] = useState<string[]>([]);

  // Create Client Modal State
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Selected Project for details & Tasks
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [newTaskName, setNewTaskName] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);

  // Project Stats
  const projectEntries = timeEntries.filter(e => e.projectId === selectedProjectId);
  const totalLoggedHours = projectEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
  const totalBilledAmount = projectEntries.reduce((sum, e) => sum + e.calculatedAmount, 0);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject({
      name: projName,
      clientId: projClientId,
      billingModel: projBillingModel,
      totalFixedPrice: projBillingModel === 'FIXED_PRICE' ? parseFloat(projFixedPrice) : undefined,
      budgetHours: parseFloat(projBudgetHours) || 100,
      requireApproval: projRequireApproval,
      requiredFields: {
        description: projReqDesc,
        task: projReqTask,
        breaks: projReqBreaks
      },
      restrictToAssignedMembers: projRestrictMembers,
      assignedUserIds: projAssignedUsers
    });
    setShowNewProjectModal(false);
    setProjName('');
    setProjRestrictMembers(false);
    setProjAssignedUsers([]);
  };

  const handleToggleProjectRestriction = async (restrict: boolean) => {
    if (!selectedProject) return;
    const currentAssigned = selectedProject.assignedUserIds || [];
    // If enabling restriction and no users are assigned, assign current user / admin as fallback
    const newAssigned = restrict && currentAssigned.length === 0 
      ? [currentUser?.id || 'u-1'] 
      : currentAssigned;

    await updateProject(selectedProject.id, {
      restrictToAssignedMembers: restrict,
      assignedUserIds: newAssigned
    });
  };

  const handleToggleMember = async (userId: string) => {
    if (!selectedProject) return;
    const currentAssigned = selectedProject.assignedUserIds || [];
    const isAssigned = currentAssigned.includes(userId);
    const newAssigned = isAssigned 
      ? currentAssigned.filter(id => id !== userId)
      : [...currentAssigned, userId];

    await updateProject(selectedProject.id, {
      assignedUserIds: newAssigned
    });
  };

  const handleAssignAllUsers = async (assignAll: boolean) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, {
      assignedUserIds: assignAll ? users.map(u => u.id) : []
    });
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createClient({
      name: clientName,
      contactPerson: clientContact,
      email: clientEmail
    });
    setProjClientId(created.id);
    setShowNewClientModal(false);
    setClientName('');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedProjectId) return;
    await createTask({
      projectId: selectedProjectId,
      name: newTaskName.trim(),
      isBillableDefault: true
    });
    setNewTaskName('');
  };

  // Filtered users for project assignment
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          (u.companyName && u.companyName.toLowerCase().includes(memberSearchQuery.toLowerCase()));
    
    let matchesRole = true;
    if (memberRoleFilter === 'INTERNAL_ONLY') {
      matchesRole = u.employmentType !== 'EXTERNAL';
    } else if (memberRoleFilter === 'EXTERNAL_ONLY') {
      matchesRole = u.employmentType === 'EXTERNAL';
    } else if (memberRoleFilter !== 'ALL') {
      matchesRole = u.jobRoleId === memberRoleFilter;
    }

    return matchesSearch && matchesRole;
  });

  const assignedCount = (selectedProject?.assignedUserIds || []).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-600" />
              {t.projectsClientsTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verwalten Sie Auftraggeber, Kundenprojekte, Abrechnungsmodelle (T&M / Festpreis) und Mitarbeiter-Zuordnungen für den aktiven Mandanten.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-client"
            onClick={() => setShowNewClientModal(true)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Building className="w-4 h-4 text-slate-500" />
            {t.addClient}
          </button>
          <button
            id="btn-add-project"
            onClick={() => setShowNewProjectModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.addProject}
          </button>
        </div>
      </div>

      {/* Grid: Projects List & Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Projects Overview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Aktive Kundenprojekte ({projects.length})
          </div>

          <div className="space-y-2.5">
            {projects.map(project => {
              const isSelected = project.id === selectedProjectId;
              const entries = timeEntries.filter(e => e.projectId === project.id);
              const hours = entries.reduce((s, e) => s + e.durationHoursDecimal, 0);

              return (
                <div
                  key={project.id}
                  id={`card-project-${project.id}`}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400">{project.clientName}</div>
                      <div className="font-bold text-sm text-slate-900 mt-0.5">{project.name}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      project.billingModel === 'FIXED_PRICE'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {project.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'T&M'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                      Ist: <strong className="text-slate-800">{hours.toFixed(1)}h</strong>
                      {project.budgetHours && ` / ${project.budgetHours}h`}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      {project.restrictToAssignedMembers ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                          <Lock className="w-3 h-3" />
                          <span>{project.assignedUserIds?.length || 0} MA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>Alle MA</span>
                        </span>
                      )}
                      {project.requireApproval ? (
                        <span className="text-emerald-700 font-medium">Freigabe</span>
                      ) : (
                        <span className="text-slate-400">Direkt</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Project Detail, Config & Tasks */}
        <div className="lg:col-span-7 space-y-4">
          {selectedProject ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              {/* Project Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-medium">{selectedProject.clientName}</div>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">{selectedProject.name}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    Nummer: {selectedProject.projectNumber || 'PRJ-2025'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Abrechnungsmodell</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProject.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'Time & Material'}
                  </div>
                  {selectedProject.totalFixedPrice && (
                    <div className="text-base font-extrabold text-purple-700">
                      {selectedProject.totalFixedPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Specific Configurations: Required Fields & Approval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Pflichtfelder bei Erfassung
                  </div>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields.description ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>Beschreibung: <strong>{selectedProject.requiredFields.description ? 'Pflicht' : 'Optional'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields.task ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>Aufgabe: <strong>{selectedProject.requiredFields.task ? 'Pflicht' : 'Optional'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields.breaks ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>Pausen: <strong>{selectedProject.requiredFields.breaks ? 'Pflicht' : 'Optional'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Freigabeprozess (Section 8)
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedProject.requireApproval
                      ? 'Freigabe ist für dieses Projekt verpflichtend. Einträge erhalten zunächst den Status "Eingereicht".'
                      : 'Direkte Freigabe aktiv. Zeiteinträge werden automatisch als freigegeben verbucht.'}
                  </p>
                </div>
              </div>

              {/* Fixed Price Milestones / Teilbudgets (Section 9) */}
              {selectedProject.billingModel === 'FIXED_PRICE' && selectedProject.fixedPriceAllocations && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {t.milestones} / Teilbudgets & monatliche Verteilung
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {selectedProject.fixedPriceAllocations.map(fpa => (
                      <div key={fpa.id} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="font-semibold text-slate-900">{fpa.title}</div>
                          <div className="text-[10px] text-slate-400">Stichtag: {fpa.targetDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">
                            {fpa.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            fpa.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                            fpa.status === 'INVOICED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {fpa.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team & Buchungsberechtigungen (Mitarbeiter einschränken) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <Users className="w-4 h-4 text-blue-600" />
                      Projekt-Team & Buchungsberechtigungen
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Legen Sie fest, wer Zeiten auf dieses Projekt erfassen darf.
                    </p>
                  </div>

                  {/* Toggle Restriction Switch */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      id="btn-restrict-off"
                      onClick={() => handleToggleProjectRestriction(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        !selectedProject.restrictToAssignedMembers
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Offen für alle
                    </button>
                    <button
                      type="button"
                      id="btn-restrict-on"
                      onClick={() => handleToggleProjectRestriction(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        selectedProject.restrictToAssignedMembers
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Eingeschränkt ({assignedCount})
                    </button>
                  </div>
                </div>

                {selectedProject.restrictToAssignedMembers ? (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-blue-900 bg-blue-50/80 border border-blue-200/70 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>
                          <strong>Zugriffs-Sperre aktiv:</strong> Nur die <strong>{assignedCount}</strong> ausgewählten Mitarbeiter können auf <em>{selectedProject.name}</em> buchen.
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleAssignAllUsers(true)}
                          className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          Alle auswählen
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleAssignAllUsers(false)}
                          className="text-slate-500 hover:text-slate-700 font-medium underline"
                        >
                          Alle abwählen
                        </button>
                      </div>
                    </div>

                    {/* Member search & filter */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={memberSearchQuery}
                          onChange={e => setMemberSearchQuery(e.target.value)}
                          placeholder="Mitarbeiter suchen..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <select
                        value={memberRoleFilter}
                        onChange={e => setMemberRoleFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        <option value="ALL">Alle Rollen</option>
                        <option value="INTERNAL_ONLY">🏢 Nur Interne</option>
                        <option value="EXTERNAL_ONLY">🤝 Nur Externe</option>
                        {jobRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Employee Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {filteredUsers.map(u => {
                        const isAssigned = (selectedProject.assignedUserIds || []).includes(u.id);
                        const roleObj = jobRoles.find(r => r.id === u.jobRoleId);
                        const isExternal = u.employmentType === 'EXTERNAL';

                        return (
                          <div
                            key={u.id}
                            id={`member-assign-${u.id}`}
                            onClick={() => handleToggleMember(u.id)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isAssigned
                                ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                                : 'bg-white border-slate-200/80 hover:border-slate-300 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isAssigned ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {u.name.charAt(0)}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-semibold truncate ${isAssigned ? 'text-blue-950' : 'text-slate-800'}`}>
                                    {u.name}
                                  </span>
                                  {isExternal ? (
                                    <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded shrink-0">
                                      Extern
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                                      Intern
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {roleObj?.name || u.role} {isExternal && u.companyName ? `• ${u.companyName}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-2 border ${
                              isAssigned 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-lg p-2.5 text-[11px] text-emerald-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Offenes Projekt:</strong> Alle Mitarbeiter des Unternehmens können für dieses Projekt Zeiten buchen. Klicken Sie oben auf <em>„Eingeschränkt“</em>, um den Zugriff nur auf bestimmte Mitarbeiter zu limitieren.
                    </span>
                  </div>
                )}
              </div>

              {/* Tasks / Tätigkeitskategorien */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    Aufgaben & Tätigkeiten ({projectTasks.length})
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {projectTasks.map(tsk => (
                    <div
                      key={tsk.id}
                      className="bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2"
                    >
                      <span className="font-semibold text-slate-800">{tsk.name}</span>
                      {tsk.budgetHours && (
                        <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded">
                          {tsk.budgetHours}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add task inline */}
                <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                  <input
                    id="input-new-task-name"
                    type="text"
                    value={newTaskName}
                    onChange={e => setNewTaskName(e.target.value)}
                    placeholder="Neue Aufgabe hinzufügen..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white"
                  />
                  <button
                    id="btn-add-task-submit"
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                  >
                    + Aufgabe
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Wählen Sie ein Projekt aus.
            </div>
          )}
        </div>
      </div>

      {/* --- CREATE PROJECT MODAL --- */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t.addProject}</h3>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Projektname</label>
                <input
                  id="input-create-proj-name"
                  type="text"
                  required
                  value={projName}
                  onChange={e => setProjName(e.target.value)}
                  placeholder="z.B. AI Clinical Workflow"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.client}</label>
                <select
                  id="select-create-proj-client"
                  value={projClientId}
                  onChange={e => setProjClientId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.billingModel}</label>
                  <select
                    id="select-create-proj-model"
                    value={projBillingModel}
                    onChange={e => setProjBillingModel(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="TIME_AND_MATERIAL">Time & Material</option>
                    <option value="FIXED_PRICE">Festpreisprojekt</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {projBillingModel === 'FIXED_PRICE' ? 'Gesamtfestpreis (€)' : 'Budget (Stunden)'}
                  </label>
                  <input
                    id="input-create-proj-budget"
                    type="number"
                    value={projBillingModel === 'FIXED_PRICE' ? projFixedPrice : projBudgetHours}
                    onChange={e => projBillingModel === 'FIXED_PRICE' ? setProjFixedPrice(e.target.value) : setProjBudgetHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Projektspezifische Konfiguration (Section 6)</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projRequireApproval}
                    onChange={e => setProjRequireApproval(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Freigabepflicht für Zeiteinträge aktivieren</span>
                </label>
                <div className="pt-1 flex items-center gap-4 text-slate-600">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={projReqDesc}
                      onChange={e => setProjReqDesc(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Beschreibung Pflicht</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={projReqTask}
                      onChange={e => setProjReqTask(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Aufgabe Pflicht</span>
                  </label>
                </div>
              </div>

              {/* Team Restriction in Create Modal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Mitarbeiter-Zugriff (Buchungsbeschränkung)
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projRestrictMembers}
                    onChange={e => {
                      setProjRestrictMembers(e.target.checked);
                      if (e.target.checked && projAssignedUsers.length === 0) {
                        setProjAssignedUsers([currentUser?.id || 'u-1']);
                      }
                    }}
                    className="rounded text-slate-900"
                  />
                  <span>Buchung nur auf zugewiesenes Team beschränken</span>
                </label>

                {projRestrictMembers && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] text-slate-500">Wählen Sie berechtigte Mitarbeiter:</div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {users.map(u => {
                        const checked = projAssignedUsers.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50 border-blue-200 font-semibold text-blue-900' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setProjAssignedUsers(prev => [...prev, u.id]);
                                } else {
                                  setProjAssignedUsers(prev => prev.filter(id => id !== u.id));
                                }
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="truncate">{u.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Projekt anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE CLIENT MODAL --- */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">{t.addClient}</h3>

            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kundenname / Firma</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="z.B. BioTech Labs SE"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ansprechpartner</label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={e => setClientContact(e.target.value)}
                  placeholder="z.B. Dr. Stefan Meier"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">E-Mail</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="kontakt@biotech-labs.de"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Kunde anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
