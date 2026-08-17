import React, { useState, useEffect } from 'react';
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
  UserMinus,
  UserPlus,
  Ban,
  Search,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  Archive,
  Info,
  ExternalLink,
  ShieldCheck,
  Calendar,
  DollarSign,
  Eye,
  EyeOff
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
    deleteProject,
    createClient,
    updateClient,
    deleteClient,
    createTask,
    updateTask,
    deleteTask
  } = useApp();

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';

  // Active view tab: Projects vs Clients
  const [activeTab, setActiveTab] = useState<'PROJECTS' | 'CLIENTS'>('PROJECTS');

  // Search & Filters
  const [projectSearch, setProjectSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [projectBillingFilter, setProjectBillingFilter] = useState<'ALL' | 'TIME_AND_MATERIAL' | 'FIXED_PRICE'>('ALL');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'>('ALL');

  // --- Create Project Modal State ---
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projClientId, setProjClientId] = useState(clients[0]?.id || '');
  const [projProjectManagerId, setProjProjectManagerId] = useState('');
  const [projBillingModel, setProjBillingModel] = useState<'TIME_AND_MATERIAL' | 'FIXED_PRICE'>('TIME_AND_MATERIAL');
  const [projFixedPrice, setProjFixedPrice] = useState('50000');
  const [projBudgetHours, setProjBudgetHours] = useState('200');
  const [projStatus, setProjStatus] = useState<'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [projRequireApproval, setProjRequireApproval] = useState(true);
  const [projReqDesc, setProjReqDesc] = useState(true);
  const [projReqTask, setProjReqTask] = useState(false);
  const [projReqBreaks, setProjReqBreaks] = useState(false);
  const [projRestrictMembers, setProjRestrictMembers] = useState(false);
  const [projAssignedUsers, setProjAssignedUsers] = useState<string[]>([]);
  const [projAllowPmViewCosts, setProjAllowPmViewCosts] = useState(true);

  // --- Edit Project Modal State ---
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjName, setEditProjName] = useState('');
  const [editProjClientId, setEditProjClientId] = useState('');
  const [editProjProjectManagerId, setEditProjProjectManagerId] = useState('');
  const [editProjBillingModel, setEditProjBillingModel] = useState<'TIME_AND_MATERIAL' | 'FIXED_PRICE'>('TIME_AND_MATERIAL');
  const [editProjFixedPrice, setEditProjFixedPrice] = useState('');
  const [editProjBudgetHours, setEditProjBudgetHours] = useState('');
  const [editProjStatus, setEditProjStatus] = useState<'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');
  const [editProjRequireApproval, setEditProjRequireApproval] = useState(true);
  const [editProjReqDesc, setEditProjReqDesc] = useState(true);
  const [editProjReqTask, setEditProjReqTask] = useState(false);
  const [editProjReqBreaks, setEditProjReqBreaks] = useState(false);
  const [editProjRestrictMembers, setEditProjRestrictMembers] = useState(false);
  const [editProjAssignedUsers, setEditProjAssignedUsers] = useState<string[]>([]);
  const [editProjAllowPmViewCosts, setEditProjAllowPmViewCosts] = useState(true);

  // --- Delete Project Confirmation State ---
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteProjError, setDeleteProjError] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // --- Create Client Modal State ---
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // --- Edit Client Modal State ---
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientNumber, setEditClientNumber] = useState('');
  const [editClientContact, setEditClientContact] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientStatus, setEditClientStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // --- Delete Client Confirmation State ---
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteClientError, setDeleteClientError] = useState<string | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // --- Selected Project for details & Tasks ---
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIsBillable, setNewTaskIsBillable] = useState(true);
  const [newTaskBudgetHours, setNewTaskBudgetHours] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');

  // --- Edit Task Modal State ---
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskIsBillable, setEditTaskIsBillable] = useState(true);
  const [editTaskBudgetHours, setEditTaskBudgetHours] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // --- Delete Task Confirmation State ---
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteTaskError, setDeleteTaskError] = useState<string | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // --- Exclude Member Confirmation State ---
  const [memberToExclude, setMemberToExclude] = useState<{
    uid: string;
    name: string;
    role?: string;
    isExternal?: boolean;
    hours: number;
    revenue: number;
    bookingsCount: number;
  } | null>(null);
  const [isExcludingMember, setIsExcludingMember] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const projectTasks = tasks.filter(t => t.projectId === selectedProject?.id);

  // Project Stats
  const projectEntries = timeEntries.filter(e => e.projectId === selectedProject?.id);
  const totalLoggedHours = projectEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
  const totalBilledAmount = projectEntries.reduce((sum, e) => sum + e.calculatedAmount, 0);

  // --- Handlers for Projects ---
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const pm = users.find(u => u.id === projProjectManagerId);
    const created = await createProject({
      name: projName,
      clientId: projClientId || clients[0]?.id,
      projectManagerId: projProjectManagerId || (isPM ? currentUser?.id : undefined),
      projectManagerName: pm?.name || (isPM ? currentUser?.name : undefined),
      managerUserIds: projProjectManagerId ? [projProjectManagerId] : (isPM && currentUser?.id ? [currentUser.id] : []),
      billingModel: projBillingModel,
      totalFixedPrice: projBillingModel === 'FIXED_PRICE' ? parseFloat(projFixedPrice) : undefined,
      budgetHours: parseFloat(projBudgetHours) || 100,
      status: projStatus,
      requireApproval: projRequireApproval,
      requiredFields: {
        description: projReqDesc,
        task: projReqTask,
        breaks: projReqBreaks
      },
      restrictToAssignedMembers: projRestrictMembers,
      assignedUserIds: projAssignedUsers,
      allowPmViewCosts: projAllowPmViewCosts
    });
    setShowNewProjectModal(false);
    setProjName('');
    setProjProjectManagerId('');
    setProjStatus('ACTIVE');
    setProjRestrictMembers(false);
    setProjAssignedUsers([]);
    setProjAllowPmViewCosts(true);
    if (created?.id) setSelectedProjectId(created.id);
  };

  const handleOpenEditProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setEditProjName(proj.name);
    setEditProjClientId(proj.clientId);
    setEditProjProjectManagerId(proj.projectManagerId || '');
    setEditProjBillingModel(proj.billingModel);
    setEditProjFixedPrice(proj.totalFixedPrice ? String(proj.totalFixedPrice) : '50000');
    setEditProjBudgetHours(proj.budgetHours ? String(proj.budgetHours) : '100');
    setEditProjStatus((proj.status as any) || 'ACTIVE');
    setEditProjRequireApproval(proj.requireApproval ?? true);
    setEditProjReqDesc(proj.requiredFields?.description ?? true);
    setEditProjReqTask(proj.requiredFields?.task ?? false);
    setEditProjReqBreaks(proj.requiredFields?.breaks ?? false);
    setEditProjRestrictMembers(proj.restrictToAssignedMembers ?? false);
    setEditProjAssignedUsers(proj.assignedUserIds || []);
    setEditProjAllowPmViewCosts(proj.allowPmViewCosts ?? true);
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const pm = users.find(u => u.id === editProjProjectManagerId);

    await updateProject(editingProject.id, {
      name: editProjName,
      clientId: editProjClientId,
      clientName: clients.find(c => c.id === editProjClientId)?.name || editingProject.clientName,
      projectManagerId: editProjProjectManagerId || undefined,
      projectManagerName: pm?.name || undefined,
      managerUserIds: editProjProjectManagerId ? [editProjProjectManagerId] : [],
      billingModel: editProjBillingModel,
      totalFixedPrice: editProjBillingModel === 'FIXED_PRICE' ? parseFloat(editProjFixedPrice) : undefined,
      budgetHours: parseFloat(editProjBudgetHours) || undefined,
      status: editProjStatus,
      requireApproval: editProjRequireApproval,
      requiredFields: {
        description: editProjReqDesc,
        task: editProjReqTask,
        breaks: editProjReqBreaks
      },
      restrictToAssignedMembers: editProjRestrictMembers,
      assignedUserIds: editProjAssignedUsers,
      allowPmViewCosts: editProjAllowPmViewCosts
    });

    setEditingProject(null);
  };

  const handleToggleAllowPmCosts = async (allow: boolean) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, {
      allowPmViewCosts: allow
    });
  };

  const handleOpenDeleteProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjectToDelete(proj);
    setDeleteProjError(null);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    setDeleteProjError(null);

    const result = await deleteProject(projectToDelete.id);
    setIsDeletingProject(false);

    if (result.success) {
      if (selectedProjectId === projectToDelete.id) {
        const remaining = projects.filter(p => p.id !== projectToDelete.id);
        if (remaining.length > 0) setSelectedProjectId(remaining[0].id);
      }
      setProjectToDelete(null);
    } else {
      setDeleteProjError(result.error || 'Fehler beim Löschen des Projekts.');
    }
  };

  const handleArchiveProjectDirectly = async (proj: Project) => {
    await updateProject(proj.id, { status: 'ARCHIVED' });
    setProjectToDelete(null);
  };

  const handleToggleProjectRestriction = async (restrict: boolean) => {
    if (!selectedProject) return;
    const currentAssigned = selectedProject.assignedUserIds || [];
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
    const currentExcluded = selectedProject.excludedUserIds || [];
    const isAssigned = currentAssigned.includes(userId);

    if (isAssigned) {
      // Unassign & exclude
      const newAssigned = currentAssigned.filter(id => id !== userId);
      const newExcluded = Array.from(new Set([...currentExcluded, userId]));
      await updateProject(selectedProject.id, {
        assignedUserIds: newAssigned,
        excludedUserIds: newExcluded
      });
    } else {
      // Reassign & unexclude
      const newAssigned = [...currentAssigned, userId];
      const newExcluded = currentExcluded.filter(id => id !== userId);
      await updateProject(selectedProject.id, {
        assignedUserIds: newAssigned,
        excludedUserIds: newExcluded
      });
    }
  };

  const handleOpenExcludeMember = (memberData: {
    uid: string;
    name: string;
    role?: string;
    isExternal?: boolean;
    hours: number;
    revenue: number;
    bookingsCount: number;
  }) => {
    setMemberToExclude(memberData);
  };

  const handleConfirmExcludeMember = async () => {
    if (!selectedProject || !memberToExclude) return;
    setIsExcludingMember(true);
    try {
      const uid = memberToExclude.uid;
      const currentAssigned = selectedProject.assignedUserIds || [];
      const currentExcluded = selectedProject.excludedUserIds || [];

      const newAssigned = currentAssigned.filter(id => id !== uid);
      const newExcluded = Array.from(new Set([...currentExcluded, uid]));

      await updateProject(selectedProject.id, {
        assignedUserIds: newAssigned,
        excludedUserIds: newExcluded
      });

      setMemberToExclude(null);
    } finally {
      setIsExcludingMember(false);
    }
  };

  const handleReassignMember = async (userId: string) => {
    if (!selectedProject) return;
    const currentAssigned = selectedProject.assignedUserIds || [];
    const currentExcluded = selectedProject.excludedUserIds || [];

    const newAssigned = Array.from(new Set([...currentAssigned, userId]));
    const newExcluded = currentExcluded.filter(id => id !== userId);

    await updateProject(selectedProject.id, {
      assignedUserIds: newAssigned,
      excludedUserIds: newExcluded
    });
  };

  const handleAssignAllUsers = async (assignAll: boolean) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, {
      assignedUserIds: assignAll ? users.map(u => u.id) : [],
      excludedUserIds: assignAll ? [] : users.map(u => u.id)
    });
  };

  // --- Handlers for Clients ---
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createClient({
      name: clientName,
      clientNumber: clientNumber.trim() || undefined,
      contactPerson: clientContact,
      email: clientEmail
    });
    setProjClientId(created.id);
    setShowNewClientModal(false);
    setClientName('');
    setClientNumber('');
    setClientContact('');
    setClientEmail('');
  };

  const handleOpenEditClient = (c: Client) => {
    setEditingClient(c);
    setEditClientName(c.name);
    setEditClientNumber(c.clientNumber || '');
    setEditClientContact(c.contactPerson || '');
    setEditClientEmail(c.email || '');
    setEditClientStatus((c.status as any) || 'ACTIVE');
  };

  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    await updateClient(editingClient.id, {
      name: editClientName,
      clientNumber: editClientNumber,
      contactPerson: editClientContact,
      email: editClientEmail,
      status: editClientStatus
    });

    setEditingClient(null);
  };

  const handleOpenDeleteClient = (c: Client) => {
    setClientToDelete(c);
    setDeleteClientError(null);
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    setDeleteClientError(null);

    const result = await deleteClient(clientToDelete.id);
    setIsDeletingClient(false);

    if (result.success) {
      setClientToDelete(null);
    } else {
      setDeleteClientError(result.error || 'Fehler beim Löschen des Kunden.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedProject) return;
    await createTask({
      projectId: selectedProject.id,
      name: newTaskName.trim(),
      isBillableDefault: newTaskIsBillable,
      budgetHours: newTaskBudgetHours.trim() ? parseFloat(newTaskBudgetHours) : undefined,
      status: 'ACTIVE'
    });
    setNewTaskName('');
    setNewTaskBudgetHours('');
    setNewTaskIsBillable(true);
  };

  const handleOpenEditTask = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setEditTaskName(task.name);
    setEditTaskIsBillable(task.isBillableDefault ?? true);
    setEditTaskBudgetHours(task.budgetHours ? String(task.budgetHours) : '');
    setEditTaskStatus(task.status || 'ACTIVE');
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      name: editTaskName.trim(),
      isBillableDefault: editTaskIsBillable,
      budgetHours: editTaskBudgetHours.trim() ? parseFloat(editTaskBudgetHours) : undefined,
      status: editTaskStatus
    });
    setEditingTask(null);
  };

  const handleOpenDeleteTask = (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTaskToDelete(task);
    setDeleteTaskError(null);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    setDeleteTaskError(null);

    const result = await deleteTask(taskToDelete.id);
    setIsDeletingTask(false);

    if (result.success) {
      setTaskToDelete(null);
    } else {
      setDeleteTaskError(result.error || 'Fehler beim Löschen der Aufgabe.');
    }
  };

  const handleArchiveTaskInstead = async () => {
    if (!taskToDelete) return;
    await updateTask(taskToDelete.id, {
      status: 'ARCHIVED'
    });
    setTaskToDelete(null);
  };

  // Filtered lists
  const filteredProjects = projects.filter(p => {
    // If user is a Project Manager (and not admin), only show projects they manage
    if (!isAdmin && isPM && currentUser) {
      const isMyProject = p.projectManagerId === currentUser.id || p.managerUserIds?.includes(currentUser.id);
      if (!isMyProject) return false;
    }

    const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          p.clientName.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          (p.projectNumber && p.projectNumber.toLowerCase().includes(projectSearch.toLowerCase()));
    const matchesModel = projectBillingFilter === 'ALL' || p.billingModel === projectBillingFilter;
    const matchesStatus = projectStatusFilter === 'ALL' || (p.status || 'ACTIVE') === projectStatusFilter;
    return matchesSearch && matchesModel && matchesStatus;
  });

  // Auto-sync selected project if previous selection is not in filteredProjects
  useEffect(() => {
    if (filteredProjects.length > 0) {
      if (!filteredProjects.some(p => p.id === selectedProjectId)) {
        setSelectedProjectId(filteredProjects[0].id);
      }
    }
  }, [filteredProjects, selectedProjectId]);

  const filteredClients = clients.filter(c => {
    return c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
           (c.contactPerson && c.contactPerson.toLowerCase().includes(clientSearch.toLowerCase())) ||
           (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
           (c.clientNumber && c.clientNumber.toLowerCase().includes(clientSearch.toLowerCase()));
  });

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
            Verwalten, bearbeiten und bereinigen Sie Kunden, Projekte, Abrechnungsmodelle (T&M / Festpreis) und Aufgaben. Projekte ohne Zeiteinträge können revisionskonform gelöscht werden.
          </p>
        </div>

        {/* Action Switcher & Buttons */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs mr-2">
            <button
              id="tab-btn-projects"
              type="button"
              onClick={() => setActiveTab('PROJECTS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'PROJECTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projekte ({projects.length})</span>
            </button>
            <button
              id="tab-btn-clients"
              type="button"
              onClick={() => setActiveTab('CLIENTS')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'CLIENTS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Kunden ({clients.length})</span>
            </button>
          </div>

          <button
            id="btn-add-client"
            onClick={() => setShowNewClientModal(true)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Building className="w-4 h-4 text-slate-500" />
            <span>Kunde anlegen</span>
          </button>
          <button
            id="btn-add-project"
            onClick={() => setShowNewProjectModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Projekt anlegen</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROJECTS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'PROJECTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Projects Overview List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Projekte ({filteredProjects.length})
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setProjectBillingFilter('ALL')}
                  className={`px-2 py-0.5 rounded ${projectBillingFilter === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setProjectBillingFilter('TIME_AND_MATERIAL')}
                  className={`px-2 py-0.5 rounded ${projectBillingFilter === 'TIME_AND_MATERIAL' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  T&M
                </button>
                <button
                  type="button"
                  onClick={() => setProjectBillingFilter('FIXED_PRICE')}
                  className={`px-2 py-0.5 rounded ${projectBillingFilter === 'FIXED_PRICE' ? 'bg-purple-700 text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Festpreis
                </button>
              </div>
            </div>

            {/* Status Filter Pill Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {[
                { key: 'ALL', label: 'Alle Status' },
                { key: 'ACTIVE', label: 'Aktiv' },
                { key: 'ON_HOLD', label: 'Pausiert' },
                { key: 'COMPLETED', label: 'Abgeschlossen' },
                { key: 'ARCHIVED', label: 'Archiviert' }
              ].map(st => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setProjectStatusFilter(st.key as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 ${
                    projectStatusFilter === st.key
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder="Projekt, Kunde oder PRJ-Nummer suchen..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredProjects.map(project => {
                const isSelected = project.id === selectedProject?.id;
                const entries = timeEntries.filter(e => e.projectId === project.id);
                const hours = entries.reduce((s, e) => s + e.durationHoursDecimal, 0);
                const hasEntries = entries.length > 0;
                const st = project.status || 'ACTIVE';

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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 truncate">{project.clientName}</span>
                          {st === 'ARCHIVED' && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              Archiviert
                            </span>
                          )}
                          {st === 'ON_HOLD' && (
                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200">
                              Pausiert
                            </span>
                          )}
                          {st === 'COMPLETED' && (
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                              Abgeschlossen
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm text-slate-900 mt-0.5 truncate">{project.name}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          project.billingModel === 'FIXED_PRICE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {project.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'T&M'}
                        </span>
                        {/* Quick action: Edit & Delete buttons */}
                        <button
                          id={`btn-edit-proj-list-${project.id}`}
                          title="Projekt bearbeiten"
                          onClick={(e) => handleOpenEditProject(project, e)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-del-proj-list-${project.id}`}
                          title={hasEntries ? `Projekt hat ${entries.length} Zeiteinträge (GoBD-Schutz)` : 'Projekt löschen'}
                          onClick={(e) => handleOpenDeleteProject(project, e)}
                          className={`p-1 rounded-md transition-colors ${
                            hasEntries
                              ? 'text-slate-300 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <div>
                        Ist: <strong className="text-slate-800">{hours.toFixed(1)}h</strong>
                        {project.budgetHours && ` / ${project.budgetHours}h`}
                        {hasEntries ? (
                          <span className="ml-2 text-[10px] text-slate-400">({entries.length} Einträge)</span>
                        ) : (
                          <span className="ml-2 text-[10px] text-emerald-600 font-semibold">(0 Einträge • Löschbar)</span>
                        )}
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
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
                  Keine Projekte für den aktuellen Suchbegriff gefunden.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Project Detail, Config & Tasks */}
          <div className="lg:col-span-7 space-y-4">
            {selectedProject ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
                {/* Project Header with Edit & Delete Actions */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">{selectedProject.clientName}</span>
                      <select
                        id="select-quick-project-status"
                        value={selectedProject.status || 'ACTIVE'}
                        onChange={(e) => updateProject(selectedProject.id, { status: e.target.value as any })}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedProject.status === 'ARCHIVED'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : selectedProject.status === 'ON_HOLD'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : selectedProject.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                        title="Projektstatus ändern (Aktiv / Pausiert / Abgeschlossen / Archiviert)"
                      >
                        <option value="ACTIVE">● Aktiv</option>
                        <option value="ON_HOLD">● Pausiert</option>
                        <option value="COMPLETED">● Abgeschlossen</option>
                        <option value="ARCHIVED">● Archiviert</option>
                      </select>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                      <span>{selectedProject.name}</span>
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-3">
                      <span>Nummer: {selectedProject.projectNumber || 'PRJ-2026'}</span>
                      <span>•</span>
                      <span>{projectEntries.length} Zeiteinträge erfasst</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-edit-selected-project"
                        onClick={() => handleOpenEditProject(selectedProject)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Projekt bearbeiten</span>
                      </button>

                      <button
                        id="btn-delete-selected-project"
                        onClick={() => handleOpenDeleteProject(selectedProject)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          projectEntries.length > 0
                            ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                            : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{projectEntries.length > 0 ? 'Löschen (Gesperrt)' : 'Projekt löschen'}</span>
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase font-semibold">Abrechnungsmodell</div>
                      <div className="text-sm font-bold text-slate-900">
                        {selectedProject.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'Time & Material'}
                      </div>
                      {selectedProject.totalFixedPrice && (
                        <div className="text-base font-extrabold text-purple-700">
                          {selectedProject.totalFixedPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specific Configurations: Required Fields & Approval */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Pflichtfelder bei Erfassung
                      </div>
                      <button
                        onClick={() => handleOpenEditProject(selectedProject)}
                        className="text-[11px] text-emerald-700 font-semibold hover:underline"
                      >
                        Ändern
                      </button>
                    </div>
                    <div className="space-y-1.5 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields?.description ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>Beschreibung: <strong>{selectedProject.requiredFields?.description ? 'Pflicht' : 'Optional'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields?.task ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>Aufgabe: <strong>{selectedProject.requiredFields?.task ? 'Pflicht' : 'Optional'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selectedProject.requiredFields?.breaks ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span>Pausen: <strong>{selectedProject.requiredFields?.breaks ? 'Pflicht' : 'Optional'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Freigabeprozess
                      </div>
                      <button
                        onClick={() => handleOpenEditProject(selectedProject)}
                        className="text-[11px] text-emerald-700 font-semibold hover:underline"
                      >
                        Ändern
                      </button>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedProject.requireApproval
                        ? 'Freigabe ist für dieses Projekt verpflichtend. Einträge erhalten zunächst den Status "Eingereicht".'
                        : 'Direkte Freigabe aktiv. Zeiteinträge werden automatisch als freigegeben verbucht.'}
                    </p>
                  </div>
                </div>

                {/* Team Assignment & Restricted Member Access */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        Mitarbeiter-Berechtigung (Buchungsschutz)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {selectedProject.restrictToAssignedMembers
                          ? `Nur ${assignedCount} von ${users.length} Mitarbeitern dürfen Zeiten auf dieses Projekt buchen.`
                          : `Offenes Projekt: Alle ${users.length} Mitarbeiter können Zeiten erfassen.`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleProjectRestriction(!selectedProject.restrictToAssignedMembers)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                          selectedProject.restrictToAssignedMembers
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {selectedProject.restrictToAssignedMembers ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Beschränkung Aktiv</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span>Auf Team beschränken</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* If Restricted: Interactive User Checkboxes */}
                  {selectedProject.restrictToAssignedMembers && (
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Member Search & Role Filter */}
                        <div className="flex items-center gap-2 flex-1">
                          <div className="relative flex-1 max-w-xs">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                            <input
                              type="text"
                              value={memberSearchQuery}
                              onChange={e => setMemberSearchQuery(e.target.value)}
                              placeholder="Mitarbeiter filtern..."
                              className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-md text-[11px]"
                            />
                          </div>

                          <select
                            value={memberRoleFilter}
                            onChange={e => setMemberRoleFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-md text-[11px] py-1 px-2 text-slate-700 font-medium"
                          >
                            <option value="ALL">Alle Rollen</option>
                            <option value="INTERNAL_ONLY">Nur Festangestellte</option>
                            <option value="EXTERNAL_ONLY">Nur Freelancer (Extern)</option>
                            {jobRoles.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleAssignAllUsers(true)}
                            className="text-blue-700 hover:underline font-semibold"
                          >
                            Alle zuweisen
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleAssignAllUsers(false)}
                            className="text-slate-500 hover:underline"
                          >
                            Alle abwählen
                          </button>
                        </div>
                      </div>

                      {/* Grid of Users */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {filteredUsers.map(user => {
                          const isAssigned = (selectedProject.assignedUserIds || []).includes(user.id);
                          const isExternal = user.employmentType === 'EXTERNAL';

                          return (
                            <div
                              key={user.id}
                              onClick={() => handleToggleMember(user.id)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                                isAssigned
                                  ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-semibold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="truncate text-[11px]">{user.name}</div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {isExternal ? `Extern (${user.companyName || 'Freelance'})` : user.role}
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                isAssigned ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Projekt-Mitarbeiter, Stundensätze & Wirtschaftlichkeit */}
                {(() => {
                  const canViewProjectCosts = isAdmin || (isPM && selectedProject?.allowPmViewCosts !== false);

                  const projectMemberIds = Array.from(new Set([
                    ...(selectedProject?.assignedUserIds || []),
                    ...(selectedProject?.excludedUserIds || []),
                    ...projectEntries.map(e => e.userId)
                  ]));

                  const projectMembersData = projectMemberIds.map(uid => {
                    const user = users.find(u => u.id === uid);
                    const userEntries = projectEntries.filter(e => e.userId === uid);
                    const userHours = userEntries.reduce((s, e) => s + e.durationHoursDecimal, 0);
                    const userRevenue = userEntries.reduce((s, e) => s + e.calculatedAmount, 0);
                    
                    const memberRateObj = selectedProject?.memberRates?.find(mr => mr.userId === uid);
                    const jobRoleObj = jobRoles.find(jr => jr.id === user?.jobRoleId);
                    
                    const billingRate = memberRateObj?.hourlyBillingRate ?? user?.individualBillingRate ?? jobRoleObj?.defaultHourlyBillingRate ?? 100;
                    const costRate = memberRateObj?.hourlyCostRate ?? user?.individualCostRate ?? jobRoleObj?.defaultHourlyCostRate ?? 50;
                    
                    const userCost = canViewProjectCosts 
                      ? userEntries.reduce((s, e) => s + (e.calculatedCost ?? (e.durationHoursDecimal * (e.hourlyCostRate ?? costRate))), 0) 
                      : null;
                    const userMargin = userCost !== null ? (userRevenue - userCost) : null;
                    const userMarginPercent = (userMargin !== null && userRevenue > 0) ? (userMargin / userRevenue) * 100 : null;

                    const isExplicitlyExcluded = (selectedProject?.excludedUserIds || []).includes(uid);
                    const isRestricted = !!selectedProject?.restrictToAssignedMembers;
                    const isAssigned = (selectedProject?.assignedUserIds || []).includes(uid);

                    // A member can book if not explicitly excluded AND (not restricted OR assigned)
                    const canBook = !isExplicitlyExcluded && (!isRestricted || isAssigned);

                    return {
                      user,
                      uid,
                      name: user?.name || uid,
                      isExternal: user?.employmentType === 'EXTERNAL',
                      companyName: user?.companyName,
                      role: user?.role,
                      userHours,
                      userEntriesCount: userEntries.length,
                      billingRate,
                      costRate,
                      userRevenue,
                      userCost,
                      userMargin,
                      userMarginPercent,
                      isAssigned,
                      isExplicitlyExcluded,
                      canBook
                    };
                  });

                  const totalProjectCosts = canViewProjectCosts 
                    ? projectMembersData.reduce((s, m) => s + (m.userCost || 0), 0)
                    : null;
                  const totalProjectMargin = totalProjectCosts !== null ? (totalBilledAmount - totalProjectCosts) : null;
                  const totalProjectMarginPercent = (totalProjectMargin !== null && totalBilledAmount > 0) ? (totalProjectMargin / totalBilledAmount) * 100 : null;

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-indigo-600" />
                          Projekt-Mitarbeiter, Stundensätze & Kosten ({projectMembersData.length})
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs transition-colors">
                              <input
                                id="toggle-allow-pm-view-costs"
                                type="checkbox"
                                checked={selectedProject.allowPmViewCosts !== false}
                                onChange={e => handleToggleAllowPmCosts(e.target.checked)}
                                className="rounded text-indigo-600 w-3.5 h-3.5"
                              />
                              <span className="text-[11px] font-medium text-slate-700">
                                PMs Kostenansicht: <strong className={selectedProject.allowPmViewCosts !== false ? 'text-emerald-700' : 'text-amber-700'}>{selectedProject.allowPmViewCosts !== false ? 'Freigegeben' : 'Gesperrt'}</strong>
                              </span>
                            </label>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                              canViewProjectCosts
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {canViewProjectCosts ? (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  Kostenansicht aktiv
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  Kostenansicht gesperrt
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* GoBD Integrity & Member Exclusion Banner */}
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold">Mitarbeiter-Ausschluss & Revisionssicherheit:</span>
                          <p className="text-blue-800 text-[11px] leading-relaxed">
                            Das Ausschließen eines Mitarbeiters sperrt <strong>ausschließlich zukünftige Zeiterfassungen</strong> für dieses Projekt. Sämtliche historischen Buchungen, Soll/Ist-Vergleiche und Forecast-Versionen bleiben GoBD-konform und vollständig unverändert erhalten.
                          </p>
                        </div>
                      </div>

                      {/* Summary KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Erfasste Stunden</span>
                          <span className="text-sm font-black text-slate-900 mt-0.5 block font-mono">
                            {totalLoggedHours.toFixed(1)}h
                          </span>
                          <span className="text-[10px] text-slate-500">{projectEntries.length} Buchungen</span>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/70">
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Gesamtumsatz</span>
                          <span className="text-sm font-black text-emerald-950 mt-0.5 block font-mono">
                            € {totalBilledAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-700">Kundenvolumen</span>
                        </div>
                        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/70">
                          <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">Personalkosten</span>
                          <span className="text-sm font-black text-rose-950 mt-0.5 block font-mono">
                            {canViewProjectCosts && totalProjectCosts !== null
                              ? `€ ${totalProjectCosts.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '🔒 Verborgen'}
                          </span>
                          <span className="text-[10px] text-rose-700">
                            {canViewProjectCosts ? 'Interner Aufwand' : 'Keine Berechtigung'}
                          </span>
                        </div>
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/70">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">Deckungsbeitrag</span>
                          <span className="text-sm font-black text-indigo-950 mt-0.5 block font-mono">
                            {canViewProjectCosts && totalProjectMargin !== null
                              ? `€ ${totalProjectMargin.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '🔒 Verborgen'}
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold">
                            {canViewProjectCosts && totalProjectMarginPercent !== null
                              ? `${totalProjectMarginPercent.toFixed(1)}% Marge`
                              : 'PM-Kostenschutz aktiv'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Team & Rates Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                              <th className="py-2.5 px-3">Mitarbeiter</th>
                              <th className="py-2.5 px-2">Typ</th>
                              <th className="py-2.5 px-2">Buchungsstatus</th>
                              <th className="py-2.5 px-2 text-right">Stunden</th>
                              <th className="py-2.5 px-2 text-right">Kundensatz</th>
                              <th className="py-2.5 px-2 text-right">Kostensatz</th>
                              <th className="py-2.5 px-2 text-right">Umsatz</th>
                              <th className="py-2.5 px-2 text-right">Kosten</th>
                              <th className="py-2.5 px-2 text-right">Marge</th>
                              <th className="py-2.5 px-3 text-right">Aktion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projectMembersData.map(m => (
                              <tr key={m.uid} className={`transition-colors ${!m.canBook ? 'bg-slate-50/40 opacity-90' : 'hover:bg-slate-50/70'}`}>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900 truncate">{m.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {m.user?.email || m.role}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    m.isExternal
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {m.isExternal ? (m.companyName ? `Extern (${m.companyName})` : 'Extern') : 'Intern'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2">
                                  {m.canBook ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      Aktiv im Team
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                      title="Für zukünftige Buchungen gesperrt. Bisherige Buchungen und Forecasts bleiben vollständig erhalten."
                                    >
                                      <Lock className="w-3 h-3 text-amber-600" />
                                      {m.userHours > 0 ? 'Gesperrt (Historie erhalten)' : 'Gesperrt'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-800">
                                  {m.userHours.toFixed(1)}h
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                                  € {m.billingRate.toFixed(2)}/h
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono">
                                  {canViewProjectCosts ? (
                                    <span className="text-slate-700">€ {m.costRate.toFixed(2)}/h</span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">🔒 Maskiert</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">
                                  € {m.userRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono">
                                  {canViewProjectCosts && m.userCost !== null ? (
                                    <span className="font-semibold text-rose-700">
                                      € {m.userCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">🔒 Maskiert</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-right font-mono">
                                  {canViewProjectCosts && m.userMargin !== null ? (
                                    <div>
                                      <span className={`font-bold ${m.userMargin >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                                        € {m.userMargin.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      {m.userMarginPercent !== null && (
                                        <span className="block text-[9px] text-slate-400 font-sans">
                                          {m.userMarginPercent.toFixed(1)}%
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">🔒 Maskiert</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {m.canBook ? (
                                    <button
                                      type="button"
                                      id={`btn-exclude-member-${m.uid}`}
                                      onClick={() => handleOpenExcludeMember({
                                        uid: m.uid,
                                        name: m.name,
                                        role: m.role,
                                        isExternal: m.isExternal,
                                        hours: m.userHours,
                                        revenue: m.userRevenue,
                                        bookingsCount: m.userEntriesCount
                                      })}
                                      title="Mitarbeiter aus dem laufenden Projekt ausschließen (sperrt zukünftige Buchungen, historische Daten bleiben erhalten)"
                                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                    >
                                      <UserMinus className="w-3 h-3 text-amber-700" />
                                      <span>Ausschließen</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      id={`btn-reassign-member-${m.uid}`}
                                      onClick={() => handleReassignMember(m.uid)}
                                      title="Mitarbeiter wieder zuweisen und für zukünftige Buchungen freischalten"
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                    >
                                      <UserPlus className="w-3 h-3 text-blue-700" />
                                      <span>Freigeben</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {projectMembersData.length === 0 && (
                              <tr>
                                <td colSpan={10} className="py-6 text-center text-slate-400 italic">
                                  Noch keine Mitarbeiter diesem Projekt zugewiesen oder gebucht.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Tasks Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Aufgaben & Tätigkeiten ({projectTasks.length})
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Tätigkeiten definieren, editieren und Budgets steuern
                    </span>
                  </div>

                  <form onSubmit={handleAddTask} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex gap-2">
                      <input
                        id="input-new-task-name"
                        type="text"
                        placeholder="Neue Aufgabe / Tätigkeit anlegen (z.B. Backend API, Design System)..."
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                      />
                      <button
                        id="btn-add-task-submit"
                        type="submit"
                        disabled={!newTaskName.trim()}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Hinzufügen</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium select-none">
                          <input
                            type="checkbox"
                            checked={newTaskIsBillable}
                            onChange={e => setNewTaskIsBillable(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 w-3.5 h-3.5"
                          />
                          Standardmäßig abrechenbar
                        </label>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span>Budget (Stunden):</span>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="z.B. 20"
                            value={newTaskBudgetHours}
                            onChange={e => setNewTaskBudgetHours(e.target.value)}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {projectTasks.map(t => {
                      const taskEntries = timeEntries.filter(e => e.taskId === t.id);
                      const taskHours = taskEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
                      const isArchived = t.status === 'ARCHIVED';

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isArchived
                              ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                              : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                          } flex items-center justify-between text-xs gap-2`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold truncate ${isArchived ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                {t.name}
                              </span>
                              {isArchived && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                                  Archiviert
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                              <span className={`font-semibold px-1.5 py-0.2 rounded border ${
                                t.isBillableDefault
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {t.isBillableDefault ? 'Abrechenbar' : 'Nicht abrechenbar'}
                              </span>
                              {t.budgetHours !== undefined && t.budgetHours > 0 && (
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                  Budget: {t.budgetHours}h
                                </span>
                              )}
                              <span className="text-slate-400 font-mono">
                                {taskHours.toFixed(1)}h ({taskEntries.length})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              id={`btn-edit-task-${t.id}`}
                              onClick={(e) => handleOpenEditTask(t, e)}
                              title="Aufgabe bearbeiten"
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-delete-task-${t.id}`}
                              onClick={(e) => handleOpenDeleteTask(t, e)}
                              title="Aufgabe löschen"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {projectTasks.length === 0 && (
                      <div className="col-span-2 text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Noch keine spezifischen Aufgaben für dieses Projekt definiert. Erstellen Sie oben eine Aufgabe.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center text-slate-400 text-xs">
                Bitte wählen Sie ein Projekt aus der linken Liste aus.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLIENTS VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'CLIENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Kunden nach Name, Kundennr., Kontakt oder E-Mail durchsuchen..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Gesamt: <strong className="text-slate-900">{clients.length} Kunden</strong> ({filteredClients.length} gefiltert)
            </div>
          </div>

          {/* Clients Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Kundennummer</th>
                    <th className="px-4 py-3">Kundenname / Firma</th>
                    <th className="px-4 py-3">Ansprechpartner</th>
                    <th className="px-4 py-3">E-Mail</th>
                    <th className="px-4 py-3">Zugeordnete Projekte</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map(client => {
                    const clientProjects = projects.filter(p => p.clientId === client.id);
                    const canDeleteClient = clientProjects.length === 0;

                    return (
                      <tr key={client.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {client.clientNumber || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{client.name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {client.contactPerson || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {client.email || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{clientProjects.length} Projekt(e)</span>
                            {clientProjects.length > 0 && (
                              <span className="text-[10px] text-slate-400">
                                ({clientProjects.map(p => p.name).slice(0, 2).join(', ')}{clientProjects.length > 2 ? '...' : ''})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            client.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {client.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`btn-edit-client-${client.id}`}
                              onClick={() => handleOpenEditClient(client)}
                              className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              <span>Bearbeiten</span>
                            </button>
                            <button
                              id={`btn-del-client-${client.id}`}
                              onClick={() => handleOpenDeleteClient(client)}
                              title={canDeleteClient ? 'Kunde löschen' : 'Kunde kann nicht gelöscht werden, da noch Projekte zugeordnet sind.'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                                canDeleteClient
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
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                        Keine Kunden für den aktuellen Suchbegriff gefunden.
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
      {/* MODAL: CREATE PROJECT */}
      {/* ========================================================================= */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">{t.addProject}</h3>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Projektname *</label>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.client} *</label>
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
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    id="select-create-proj-status"
                    value={projStatus}
                    onChange={e => setProjStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <option value="ACTIVE">Aktiv (Buchbar)</option>
                    <option value="ON_HOLD">Pausiert</option>
                    <option value="COMPLETED">Abgeschlossen</option>
                    <option value="ARCHIVED">Archiviert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Projektleiter (PM)</label>
                <select
                  id="select-create-proj-pm"
                  value={projProjectManagerId}
                  onChange={e => setProjProjectManagerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="">-- Kein fester PM --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'PROJECT_MANAGER' ? 'Projektleitung' : u.role === 'ADMIN' ? 'Admin' : 'Mitarbeiter'})
                    </option>
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
                <div className="font-semibold text-slate-800">Projektspezifische Konfiguration</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={projRequireApproval}
                    onChange={e => setProjRequireApproval(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Freigabepflicht für Zeiteinträge aktivieren</span>
                </label>
                
                {/* PM Cost Visibility Setting */}
                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-200/70">
                  <input
                    id="checkbox-create-proj-allow-pm-costs"
                    type="checkbox"
                    checked={projAllowPmViewCosts}
                    onChange={e => setProjAllowPmViewCosts(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-slate-900">Projektleitern Einsicht in Mitarbeiterkosten gewähren</span>
                    <p className="text-[10px] text-slate-500">Wenn deaktiviert, sehen Projektleiter nur erfasste Stunden und Umsätze, interne Kostensätze bleiben maskiert.</p>
                  </div>
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
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={projReqBreaks}
                      onChange={e => setProjReqBreaks(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Pausen Pflicht</span>
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

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROJECT */}
      {/* ========================================================================= */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                <span>Projekt bearbeiten: {editingProject.name}</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">{editingProject.projectNumber}</span>
            </div>

            <form onSubmit={handleSaveEditProject} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Projektname *</label>
                <input
                  id="input-edit-proj-name"
                  type="text"
                  required
                  value={editProjName}
                  onChange={e => setEditProjName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.client} *</label>
                  <select
                    id="select-edit-proj-client"
                    value={editProjClientId}
                    onChange={e => setEditProjClientId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status *</label>
                  <select
                    id="select-edit-proj-status"
                    value={editProjStatus}
                    onChange={e => setEditProjStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Aktiv (Buchbar)</option>
                    <option value="ON_HOLD">Pausiert (Gestoppt)</option>
                    <option value="COMPLETED">Abgeschlossen (Projekt beendet)</option>
                    <option value="ARCHIVED">Archiviert (Buchungssperre)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Projektleiter (PM)</label>
                <select
                  id="select-edit-proj-pm"
                  value={editProjProjectManagerId}
                  onChange={e => setEditProjProjectManagerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="">-- Kein fester PM --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'PROJECT_MANAGER' ? 'Projektleitung' : u.role === 'ADMIN' ? 'Admin' : 'Mitarbeiter'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.billingModel}</label>
                  <select
                    value={editProjBillingModel}
                    onChange={e => setEditProjBillingModel(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="TIME_AND_MATERIAL">Time & Material</option>
                    <option value="FIXED_PRICE">Festpreisprojekt</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {editProjBillingModel === 'FIXED_PRICE' ? 'Gesamtfestpreis (€)' : 'Budget (Stunden)'}
                  </label>
                  <input
                    type="number"
                    value={editProjBillingModel === 'FIXED_PRICE' ? editProjFixedPrice : editProjBudgetHours}
                    onChange={e => editProjBillingModel === 'FIXED_PRICE' ? setEditProjFixedPrice(e.target.value) : setEditProjBudgetHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Projektspezifische Konfiguration</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProjRequireApproval}
                    onChange={e => setEditProjRequireApproval(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Freigabepflicht für Zeiteinträge aktivieren</span>
                </label>

                {/* PM Cost Visibility Setting */}
                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-200/70">
                  <input
                    id="checkbox-edit-proj-allow-pm-costs"
                    type="checkbox"
                    checked={editProjAllowPmViewCosts}
                    onChange={e => setEditProjAllowPmViewCosts(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <div className="text-xs">
                    <span className="font-medium text-slate-900">Projektleitern Einsicht in Mitarbeiterkosten gewähren</span>
                    <p className="text-[10px] text-slate-500">Wenn deaktiviert, sehen Projektleiter nur erfasste Stunden und Umsätze, interne Kostensätze bleiben maskiert.</p>
                  </div>
                </label>

                <div className="pt-1 flex items-center gap-4 text-slate-600">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editProjReqDesc}
                      onChange={e => setEditProjReqDesc(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Beschreibung Pflicht</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editProjReqTask}
                      onChange={e => setEditProjReqTask(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Aufgabe Pflicht</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={editProjReqBreaks}
                      onChange={e => setEditProjReqBreaks(e.target.checked)}
                      className="rounded text-slate-900"
                    />
                    <span>Pausen Pflicht</span>
                  </label>
                </div>
              </div>

              {/* Team Restriction in Edit Modal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Mitarbeiter-Zugriff (Buchungsbeschränkung)
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProjRestrictMembers}
                    onChange={e => setEditProjRestrictMembers(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Buchung nur auf zugewiesenes Team beschränken</span>
                </label>

                {editProjRestrictMembers && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] text-slate-500">Wählen Sie berechtigte Mitarbeiter:</div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {users.map(u => {
                        const checked = editProjAssignedUsers.includes(u.id);
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
                                  setEditProjAssignedUsers(prev => [...prev, u.id]);
                                } else {
                                  setEditProjAssignedUsers(prev => prev.filter(id => id !== u.id));
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
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
      {/* MODAL: DELETE PROJECT CONFIRMATION */}
      {/* ========================================================================= */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const entries = timeEntries.filter(e => e.projectId === projectToDelete.id);
              const hasEntries = entries.length > 0;

              return (
                <>
                  <div className="flex items-center gap-3 text-red-600">
                    <div className={`p-2.5 rounded-xl ${hasEntries ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {hasEntries ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hasEntries ? 'Projekt nicht löschbar (GoBD-Schutz)' : 'Projekt wirklich löschen?'}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono">{projectToDelete.name} ({projectToDelete.projectNumber})</div>
                    </div>
                  </div>

                  {hasEntries ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5 text-amber-900">
                        <div className="font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-700" />
                          <span>Revisionssicherheit nach GoBD</span>
                        </div>
                        <p className="leading-relaxed">
                          Auf dieses Projekt wurden bereits <strong>{entries.length} Zeiteinträge</strong> ({entries.reduce((s, e) => s + e.durationHoursDecimal, 0).toFixed(1)} Stunden) gebucht.
                          Um die steuerliche und gesetzliche Nachvollziehbarkeit zu gewährleisten, darf dieses Projekt nicht physisch gelöscht werden.
                        </p>
                      </div>

                      <p className="text-slate-700">
                        <strong>Empfohlene Lösung:</strong> Setzen Sie das Projekt auf <strong>"Archiviert"</strong>. Dadurch können Mitarbeiter keine neuen Zeiten mehr buchen, während alle bisherigen Einträge und Auswertungen erhalten bleiben.
                      </p>

                      {deleteProjError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteProjError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Schließen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveProjectDirectly(projectToDelete)}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Projekt jetzt archivieren</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600">
                      <p>
                        Auf das Projekt <strong>"{projectToDelete.name}"</strong> wurden <strong>noch keine Zeiteinträge erfasst</strong>.
                      </p>
                      <p className="text-red-700 font-medium">
                        Das Projekt und alle zugehörigen Aufgaben werden unwiderruflich aus der Datenbank entfernt.
                      </p>

                      {deleteProjError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteProjError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingProject}
                          onClick={handleConfirmDeleteProject}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingProject ? 'Wird gelöscht...' : 'Unwiderruflich löschen'}</span>
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

      {/* ========================================================================= */}
      {/* MODAL: CREATE CLIENT */}
      {/* ========================================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Neuen Auftraggeber / Kunden anlegen</span>
            </h3>

            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kundenname / Firma *</label>
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
                <label className="font-semibold text-slate-700 block mb-1">Kundennummer (Optional)</label>
                <input
                  type="text"
                  value={clientNumber}
                  onChange={e => setClientNumber(e.target.value)}
                  placeholder={`z.B. KND-${1000 + clients.length + 1}`}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Kunde anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CLIENT */}
      {/* ========================================================================= */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              <span>Kunde bearbeiten: {editingClient.name}</span>
            </h3>

            <form onSubmit={handleSaveEditClient} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kundenname / Firma *</label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={e => setEditClientName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kundennummer</label>
                  <input
                    type="text"
                    value={editClientNumber}
                    onChange={e => setEditClientNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editClientStatus}
                    onChange={e => setEditClientStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Aktiv</option>
                    <option value="INACTIVE">Inaktiv</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ansprechpartner</label>
                <input
                  type="text"
                  value={editClientContact}
                  onChange={e => setEditClientContact(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">E-Mail</label>
                <input
                  type="email"
                  value={editClientEmail}
                  onChange={e => setEditClientEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
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
      {/* MODAL: DELETE CLIENT CONFIRMATION */}
      {/* ========================================================================= */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const assignedProjects = projects.filter(p => p.clientId === clientToDelete.id);
              const hasProjects = assignedProjects.length > 0;

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${hasProjects ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {hasProjects ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hasProjects ? 'Kunde kann nicht gelöscht werden' : 'Kunde wirklich löschen?'}
                      </h3>
                      <div className="text-xs text-slate-500">{clientToDelete.name} ({clientToDelete.clientNumber})</div>
                    </div>
                  </div>

                  {hasProjects ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                        Dem Kunden <strong>"{clientToDelete.name}"</strong> sind aktuell noch <strong>{assignedProjects.length} Projekt(e)</strong> zugeordnet:
                        <ul className="list-disc list-inside mt-1.5 font-medium space-y-0.5">
                          {assignedProjects.map(p => (
                            <li key={p.id}>{p.name} ({p.projectNumber})</li>
                          ))}
                        </ul>
                      </div>
                      <p>
                        Bitte weisen Sie diese Projekte einem anderen Kunden zu oder löschen Sie zuerst die Projekte, bevor Sie den Kunden löschen können.
                      </p>

                      {deleteClientError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteClientError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setClientToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Verstanden / Schließen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600">
                      <p>
                        Möchten Sie den Kunden <strong>"{clientToDelete.name}"</strong> wirklich unwiderruflich löschen?
                      </p>
                      <p className="text-slate-500">
                        Dem Kunden sind keine Projekte zugeordnet. Der Datensatz wird vollständig entfernt.
                      </p>

                      {deleteClientError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteClientError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setClientToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingClient}
                          onClick={handleConfirmDeleteClient}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingClient ? 'Wird gelöscht...' : 'Kunde löschen'}</span>
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
      {/* ========================================================================= */}
      {/* MODAL: EDIT TASK */}
      {/* ========================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              <span>Aufgabe / Tätigkeit bearbeiten</span>
            </h3>

            <form onSubmit={handleSaveEditTask} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bezeichnung der Aufgabe *</label>
                <input
                  type="text"
                  required
                  value={editTaskName}
                  onChange={e => setEditTaskName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Budget (Stunden)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Kein Limit"
                    value={editTaskBudgetHours}
                    onChange={e => setEditTaskBudgetHours(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editTaskStatus}
                    onChange={e => setEditTaskStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Aktiv (Auswählbar)</option>
                    <option value="ARCHIVED">Archiviert (Gesperrt)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={editTaskIsBillable}
                    onChange={e => setEditTaskIsBillable(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0 w-4 h-4"
                  />
                  <span>Standardmäßig abrechenbar für Zeiterfassung</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
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
      {/* MODAL: DELETE TASK CONFIRMATION (GoBD Revisionsschutz) */}
      {/* ========================================================================= */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const entriesUsingTask = timeEntries.filter(e => e.taskId === taskToDelete.id);
              const hasEntries = entriesUsingTask.length > 0;
              const totalHours = entriesUsingTask.reduce((sum, e) => sum + e.durationHoursDecimal, 0);

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${hasEntries ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {hasEntries ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hasEntries ? 'Aufgabe kann nicht gelöscht werden' : 'Aufgabe wirklich löschen?'}
                      </h3>
                      <div className="text-xs text-slate-500">{taskToDelete.name}</div>
                    </div>
                  </div>

                  {hasEntries ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                        Auf diese Aufgabe wurden bereits <strong>{entriesUsingTask.length} Zeiteintrag/Zeiteinträge ({totalHours.toFixed(1)} Stunden)</strong> erfasst.
                        <div className="mt-1 text-[11px] text-amber-800">
                          Gemäß GoBD-Vorgaben dürfen referenzierte Aufgaben historischer Zeiteinträge nicht gelöscht werden.
                        </div>
                      </div>
                      <p>
                        Möchten Sie die Aufgabe stattdessen <strong>archivieren</strong>? Dadurch bleibt sie in bisherigen Berichten und Zeiteinträgen erhalten, kann aber für neue Erfassungen nicht mehr ausgewählt werden.
                      </p>

                      {deleteTaskError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteTaskError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={handleArchiveTaskInstead}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Aufgabe archivieren</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600">
                      <p>
                        Möchten Sie die Aufgabe <strong>"{taskToDelete.name}"</strong> wirklich unwiderruflich löschen?
                      </p>
                      <p className="text-slate-500">
                        Da noch keine Zeiteinträge auf diese Aufgabe gebucht wurden, kann sie rückstandslos entfernt werden.
                      </p>

                      {deleteTaskError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteTaskError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingTask}
                          onClick={handleConfirmDeleteTask}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeletingTask ? 'Wird gelöscht...' : 'Aufgabe löschen'}</span>
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

      {/* ========================================================================= */}
      {/* MODAL: EXCLUDE MEMBER FROM PROJECT (Zukünftige Buchungen sperren, Historie erhalten) */}
      {/* ========================================================================= */}
      {memberToExclude && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
                <UserMinus className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Mitarbeiter aus Projekt ausschließen
                </h3>
                <div className="text-xs text-slate-500">
                  {memberToExclude.name} • {selectedProject.name}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Möchten Sie <strong>{memberToExclude.name}</strong> aus dem Projekt <strong>"{selectedProject.name}"</strong> ausschließen?
              </p>

              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Revisionssichere Auswirkung des Ausschlusses:</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-amber-900/90 pl-1 leading-relaxed">
                  <li>
                    <strong>Zukünftige Buchungen gesperrt:</strong> Der Mitarbeiter kann dieses Projekt ab sofort nicht mehr im Zeiterfassungsmenü auswählen.
                  </li>
                  <li>
                    <strong>Sämtliche historischen Daten bleiben erhalten:</strong> Die bisher erfassten <strong>{memberToExclude.hours.toFixed(1)} Stunden</strong> ({memberToExclude.bookingsCount} Buchungen, € {memberToExclude.revenue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) bleiben unverändert in Projektberichten, Soll/Ist-Vergleichen und Leistungsnachweisen gespeichert.
                  </li>
                  <li>
                    <strong>Forecast-Versionen unverändert:</strong> Alle bisherigen Projekt- und Forecast-Snapshots behalten ihre Gültigkeit.
                  </li>
                  <li>
                    <strong>Jederzeit reaktivierbar:</strong> Sie können den Mitarbeiter bei Bedarf jederzeit wieder freischalten.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToExclude(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                id="btn-confirm-exclude-member"
                disabled={isExcludingMember}
                onClick={handleConfirmExcludeMember}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>{isExcludingMember ? 'Wird ausgeschlossen...' : 'Mitarbeiter ausschließen & Buchungen sperren'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
