import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  User,
  Organization,
  EmployeeJobRole,
  Client,
  Project,
  Task,
  TimeEntry,
  WorkingTimeEntry,
  AuditLogEntry,
  ForecastEntry,
  ApiKey,
  Language,
  ClockifyImportReport,
  ForecastComparisonItem,
  ProjectForecastSummary
} from '../types';
import { translations } from '../i18n/translations';

interface ActiveTimer {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null; // timestamp ms
  elapsedSeconds: number;
  description: string;
  projectId: string;
  taskId: string;
  isBillable: boolean;
  breakMinutes: number;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations['de'];
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
  organization: Organization | null;
  organizations: Organization[];
  activeOrgId: string;
  jobRoles: EmployeeJobRole[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  workingTimeEntries: WorkingTimeEntry[];
  auditLogs: AuditLogEntry[];
  forecasts: ForecastEntry[];
  apiKeys: ApiKey[];
  isLoading: boolean;
  login: (credentials: { email?: string; password?: string; userId?: string; orgId?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Timer Actions
  activeTimer: ActiveTimer;
  startTimer: (entry?: Partial<ActiveTimer>) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<void>;
  updateTimerState: (updates: Partial<ActiveTimer>) => void;
  // Data actions
  refreshAllData: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (orgData: Partial<Organization>) => Promise<Organization>;
  createTimeEntry: (entry: Partial<TimeEntry>) => Promise<TimeEntry>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>, reason?: string) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
  splitTimeEntry: (id: string, parts: Array<{ durationMinutes: number; description?: string; taskId?: string }>) => Promise<void>;
  batchUpdateTimeEntries: (ids: string[], updates: Partial<TimeEntry>) => Promise<void>;
  approveTimeEntries: (ids: string[], status: 'APPROVED' | 'REJECTED') => Promise<void>;
  saveWorkingTime: (entry: Partial<WorkingTimeEntry>) => Promise<void>;
  saveForecast: (entry: Partial<ForecastEntry>) => Promise<void>;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;
  createClient: (client: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<{ success: boolean; error?: string }>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<{ success: boolean; error?: string }>;
  inviteUser: (userData: Partial<User>) => Promise<{ user: User; invitationLink: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  createApiKey: (name: string) => Promise<ApiKey>;
  revokeApiKey: (id: string) => Promise<void>;
  importClockify: (rows: any[]) => Promise<ClockifyImportReport>;
  resolveRate: (userId: string, projectId?: string) => Promise<{
    billingRate: number;
    costRate: number;
    billingSource: string;
    costSource: string;
    jobRoleName?: string;
  }>;
  getPlanVsActual: (month: string) => Promise<ForecastComparisonItem[]>;
  updateOrganization: (updates: Partial<Organization>) => Promise<Organization>;
  getProjectForecastSummary: (params: {
    periodType?: string;
    periodKey?: string;
    clientId?: string;
    billingModel?: string;
    search?: string;
    thresholdPercent?: number;
  }) => Promise<{
    periodType: string;
    periodKey: string;
    periodLabel: string;
    startDate: string;
    endDate: string;
    stateLocation: string;
    locationCity: string;
    holidaysInPeriod: any[];
    totalWorkdaysInPeriod: number;
    passedWorkdaysInPeriod: number;
    extrapolationFactor: number;
    kpis: {
      totalPlannedHours: number;
      totalActualHours: number;
      totalExtrapolatedHours: number;
      totalPlannedRevenue: number;
      totalActualRevenue: number;
      totalExtrapolatedRevenue: number;
      totalPlannedCost: number;
      totalActualCost: number;
      totalExtrapolatedCost: number;
      totalPlannedMargin: number;
      totalActualMargin: number;
      totalExtrapolatedMargin: number;
      plannedMarginPercent: number;
      actualMarginPercent: number;
      extrapolatedMarginPercent: number;
      criticalProjectsCount: number;
      totalProjectsCount: number;
    };
    projects: ProjectForecastSummary[];
  }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('de');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('org-insight-arcs-01');
  const [jobRoles, setJobRoles] = useState<EmployeeJobRole[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [workingTimeEntries, setWorkingTimeEntries] = useState<WorkingTimeEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [forecasts, setForecasts] = useState<ForecastEntry[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Timer state
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(() => {
    const saved = localStorage.getItem('insight_arcs_active_timer');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      description: '',
      projectId: '',
      taskId: '',
      isBillable: true,
      breakMinutes: 0
    };
  });

  const t = translations[language] || translations.de;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (currentUser) {
      fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ language: lang })
      }).catch(() => {});
    }
  };

  // Timer Tick Interval
  useEffect(() => {
    let interval: any;
    if (activeTimer.isRunning && !activeTimer.isPaused) {
      interval = setInterval(() => {
        setActiveTimer(prev => {
          const next = { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
          localStorage.setItem('insight_arcs_active_timer', JSON.stringify(next));
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer.isRunning, activeTimer.isPaused]);

  // Fetch All Core Data
  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [authRes, orgsRes, usersRes, rolesRes, clientsRes, projectsRes, tasksRes, timeRes, workRes, auditRes, fcRes, keysRes] = await Promise.all([
        fetch('/api/auth/me').then(r => r.json()),
        fetch('/api/organizations').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/employee-roles').then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/time-entries?limit=1000').then(r => r.json()),
        fetch('/api/working-time').then(r => r.json()),
        fetch('/api/audit-logs').then(r => r.json()),
        fetch('/api/forecasts').then(r => r.json()),
        fetch('/api/api-keys').then(r => r.json())
      ]);

      if (authRes.user) {
        setCurrentUser(authRes.user);
        if (authRes.user.language) setLanguageState(authRes.user.language);
      }
      if (authRes.organization) setOrganization(authRes.organization);
      if (authRes.activeOrgId) setActiveOrgId(authRes.activeOrgId);
      setOrganizations(orgsRes || authRes.organizations || []);
      setUsers(usersRes || []);
      setJobRoles(rolesRes || []);
      setClients(clientsRes || []);
      setProjects(projectsRes || []);
      setTasks(tasksRes || []);
      setTimeEntries(timeRes.data || []);
      setWorkingTimeEntries(workRes || []);
      setAuditLogs(auditRes || []);
      setForecasts(fcRes || []);
      setApiKeys(keysRes || []);

      // If active timer project is empty, select first project
      if (projectsRes && projectsRes.length > 0 && !projectsRes.some((p: any) => p.id === activeTimer.projectId)) {
        setActiveTimer(prev => ({ ...prev, projectId: projectsRes[0].id }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTimer.projectId]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Switch Active Organization / Mandant
  const switchOrganization = async (orgId: string) => {
    try {
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });
      const data = await res.json();
      if (data.success) {
        setActiveOrgId(orgId);
        if (data.organization) setOrganization(data.organization);
        await refreshAllData();
      }
    } catch (err) {
      console.error('Failed to switch organization:', err);
    }
  };

  // Create New Organization / Mandant
  const createOrganization = async (orgData: Partial<Organization>): Promise<Organization> => {
    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(orgData)
    });
    const newOrg = await res.json();
    await refreshAllData();
    return newOrg;
  };

  // Login Action
  const login = async (credentials: { email?: string; password?: string; userId?: string; orgId?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (data.user.language) setLanguageState(data.user.language);
        if (data.activeOrgId) setActiveOrgId(data.activeOrgId);
        if (data.organization) setOrganization(data.organization);
        localStorage.setItem('insight_arcs_logged_in_user', data.user.id);
        await refreshAllData();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Anmeldung fehlgeschlagen' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Verbindungsfehler beim Anmelden' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout Action
  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('insight_arcs_logged_in_user');
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Simulated User
  const switchUser = async (userId: string) => {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (data.success && data.activeUser) {
      setCurrentUser(data.activeUser);
      localStorage.setItem('insight_arcs_logged_in_user', data.activeUser.id);
      if (data.activeUser.language) setLanguageState(data.activeUser.language);
      if (data.activeOrgId) setActiveOrgId(data.activeOrgId);
      if (data.organization) setOrganization(data.organization);
      await refreshAllData();
    }
  };

  // Timer Handlers
  const startTimer = (entry?: Partial<ActiveTimer>) => {
    const newTimer: ActiveTimer = {
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      elapsedSeconds: entry?.elapsedSeconds || 0,
      description: entry?.description !== undefined ? entry.description : activeTimer.description,
      projectId: entry?.projectId || activeTimer.projectId || (projects[0]?.id || ''),
      taskId: entry?.taskId || activeTimer.taskId || '',
      isBillable: entry?.isBillable ?? activeTimer.isBillable,
      breakMinutes: entry?.breakMinutes || 0
    };
    setActiveTimer(newTimer);
    localStorage.setItem('insight_arcs_active_timer', JSON.stringify(newTimer));
  };

  const pauseTimer = () => {
    setActiveTimer(prev => {
      const next = { ...prev, isPaused: true };
      localStorage.setItem('insight_arcs_active_timer', JSON.stringify(next));
      return next;
    });
  };

  const resumeTimer = () => {
    setActiveTimer(prev => {
      const next = { ...prev, isPaused: false };
      localStorage.setItem('insight_arcs_active_timer', JSON.stringify(next));
      return next;
    });
  };

  const stopTimer = async () => {
    if (!activeTimer.isRunning) return;
    const durationMinutes = Math.max(1, Math.round(activeTimer.elapsedSeconds / 60));

    // Calculate times
    const now = new Date();
    const endTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startObj = new Date(now.getTime() - durationMinutes * 60 * 1000);
    const startTimeStr = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`;

    await createTimeEntry({
      projectId: activeTimer.projectId || projects[0]?.id,
      taskId: activeTimer.taskId || undefined,
      description: activeTimer.description || 'Arbeitszeit',
      durationMinutes,
      startTime: startTimeStr,
      endTime: endTimeStr,
      breakMinutes: activeTimer.breakMinutes,
      isBillable: activeTimer.isBillable,
      date: now.toISOString().split('T')[0]
    });

    const resetTimer: ActiveTimer = {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      description: '',
      projectId: activeTimer.projectId,
      taskId: '',
      isBillable: true,
      breakMinutes: 0
    };
    setActiveTimer(resetTimer);
    localStorage.removeItem('insight_arcs_active_timer');
  };

  const updateTimerState = (updates: Partial<ActiveTimer>) => {
    setActiveTimer(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('insight_arcs_active_timer', JSON.stringify(next));
      return next;
    });
  };

  // Data Mutation Handlers
  const createTimeEntry = async (entry: Partial<TimeEntry>): Promise<TimeEntry> => {
    const res = await fetch('/api/time-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(entry)
    });
    const created = await res.json();
    await refreshAllData();
    return created;
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>, reason?: string) => {
    await fetch(`/api/time-entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify({ ...updates, reason })
    });
    await refreshAllData();
  };

  const deleteTimeEntry = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': currentUser?.id || 'u-1' }
    });
    await refreshAllData();
  };

  const splitTimeEntry = async (id: string, parts: Array<{ durationMinutes: number; description?: string; taskId?: string }>) => {
    await fetch('/api/time-entries/split', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify({ entryId: id, parts })
    });
    await refreshAllData();
  };

  const batchUpdateTimeEntries = async (ids: string[], updates: Partial<TimeEntry>) => {
    await fetch('/api/time-entries/batch-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify({ entryIds: ids, updates })
    });
    await refreshAllData();
  };

  const approveTimeEntries = async (ids: string[], status: 'APPROVED' | 'REJECTED') => {
    await fetch('/api/time-entries/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify({ entryIds: ids, status })
    });
    await refreshAllData();
  };

  const saveWorkingTime = async (entry: Partial<WorkingTimeEntry>) => {
    await fetch('/api/working-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(entry)
    });
    await refreshAllData();
  };

  const saveForecast = async (entry: Partial<ForecastEntry>) => {
    await fetch('/api/forecasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(entry)
    });
    await refreshAllData();
  };

  const createProject = async (project: Partial<Project>): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(project)
    });
    const created = await res.json();
    await refreshAllData();
    return created;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(updates)
    });
    await refreshAllData();
  };

  const deleteProject = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': currentUser?.id || 'u-1'
      }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Fehler beim Löschen des Projekts' };
    }
    await refreshAllData();
    return { success: true };
  };

  const createClient = async (client: Partial<Client>): Promise<Client> => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    const created = await res.json();
    await refreshAllData();
    return created;
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<Client> => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(updates)
    });
    const updated = await res.json();
    await refreshAllData();
    return updated;
  };

  const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': currentUser?.id || 'u-1'
      }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Fehler beim Löschen des Kunden' };
    }
    await refreshAllData();
    return { success: true };
  };

  const createTask = async (task: Partial<Task>): Promise<Task> => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(task)
    });
    const created = await res.json();
    await refreshAllData();
    return created;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(updates)
    });
    const updated = await res.json();
    await refreshAllData();
    return updated;
  };

  const deleteTask = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': currentUser?.id || 'u-1'
      }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Fehler beim Löschen der Aufgabe' };
    }
    await refreshAllData();
    return { success: true };
  };

  const inviteUser = async (userData: Partial<User>) => {
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    await refreshAllData();
    return data;
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(updates)
    });
    const updated = await res.json();
    await refreshAllData();
    return updated;
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': currentUser?.id || 'u-1'
      }
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Fehler beim Löschen des Mitarbeiters' };
    }
    await refreshAllData();
    return { success: true };
  };

  const createApiKey = async (name: string): Promise<ApiKey> => {
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const created = await res.json();
    await refreshAllData();
    return created;
  };

  const revokeApiKey = async (id: string) => {
    await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    await refreshAllData();
  };

  const importClockify = async (rows: any[]): Promise<ClockifyImportReport> => {
    const res = await fetch('/api/clockify/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify({ rows })
    });
    const report = await res.json();
    await refreshAllData();
    return report;
  };

  const resolveRate = async (userId: string, projectId?: string) => {
    const params = new URLSearchParams({ userId });
    if (projectId) params.set('projectId', projectId);
    const res = await fetch(`/api/rate-hierarchy/resolve?${params.toString()}`);
    return await res.json();
  };

  const getPlanVsActual = async (month: string): Promise<ForecastComparisonItem[]> => {
    const res = await fetch(`/api/forecasts/plan-vs-actual?month=${month}`);
    const data = await res.json();
    return data.comparison || [];
  };

  const updateOrganization = async (updates: Partial<Organization>): Promise<Organization> => {
    const res = await fetch('/api/organization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'u-1'
      },
      body: JSON.stringify(updates)
    });
    const updated = await res.json();
    setOrganization(updated);
    await refreshAllData();
    return updated;
  };

  const getProjectForecastSummary = async (params: {
    periodType?: string;
    periodKey?: string;
    clientId?: string;
    billingModel?: string;
    search?: string;
    thresholdPercent?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.periodType) query.set('periodType', params.periodType);
    if (params.periodKey) query.set('periodKey', params.periodKey);
    if (params.clientId) query.set('clientId', params.clientId);
    if (params.billingModel) query.set('billingModel', params.billingModel);
    if (params.search) query.set('search', params.search);
    if (params.thresholdPercent !== undefined) query.set('thresholdPercent', String(params.thresholdPercent));

    const res = await fetch(`/api/forecasts/project-summary?${query.toString()}`);
    return await res.json();
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        currentUser,
        setCurrentUser,
        users,
        organization,
        organizations,
        activeOrgId,
        jobRoles,
        clients,
        projects,
        tasks,
        timeEntries,
        workingTimeEntries,
        auditLogs,
        forecasts,
        apiKeys,
        isLoading,
        login,
        logout,
        activeTimer,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        updateTimerState,
        refreshAllData,
        switchUser,
        switchOrganization,
        createOrganization,
        createTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        splitTimeEntry,
        batchUpdateTimeEntries,
        approveTimeEntries,
        saveWorkingTime,
        saveForecast,
        createProject,
        updateProject,
        deleteProject,
        createClient,
        updateClient,
        deleteClient,
        createTask,
        updateTask,
        deleteTask,
        inviteUser,
        updateUser,
        deleteUser,
        createApiKey,
        revokeApiKey,
        importClockify,
        resolveRate,
        getPlanVsActual,
        updateOrganization,
        getProjectForecastSummary
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
