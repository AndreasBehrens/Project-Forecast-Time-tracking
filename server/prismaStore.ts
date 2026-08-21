// PostgreSQL persistence layer for StorageService.
//
// Design note:
// StorageService keeps rich domain objects (see src/types.ts) as its runtime
// source of truth in in-memory arrays. To migrate persistence from a local JSON
// file to PostgreSQL without rewriting the ~4800 lines of synchronous business
// logic — and to guarantee lossless round-tripping (which the GoBD SHA-256 audit
// hash chain depends on) — each entity is stored in its own table with the full
// domain object serialized into a JSONB `data` column, plus indexed scalar
// columns (id, orgId, ...) for querying. Runtime singletons (activeOrgId,
// thresholdPercent) live in the AppState key/value table.
//
// This module is the ONLY place that talks to Prisma. StorageService calls
// loadAll() once at startup and saveAll() as a write-through on every mutation.

import { PrismaClient } from '@prisma/client';
import type {
  Organization,
  User,
  EmployeeJobRole,
  Client,
  Partner,
  Project,
  Task,
  TimeEntry,
  WorkingTimeEntry,
  AuditLogEntry,
  ForecastEntry,
  ApiKey,
  PeriodLock,
} from '../src/types.js';

export const prisma = new PrismaClient();

// Shape of the complete application state, mirroring the object that used to be
// serialized to data/app_storage.json by StorageService.saveToFile().
export interface AppStateSnapshot {
  organizations: Organization[];
  activeOrgId: string;
  users: User[];
  jobRoles: EmployeeJobRole[];
  clients: Client[];
  partners: Partner[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  workingTimeEntries: WorkingTimeEntry[];
  auditLogs: AuditLogEntry[];
  forecasts: ForecastEntry[];
  apiKeys: ApiKey[];
  periodLocks: PeriodLock[];
  thresholdPercent: number;
}

const APP_STATE_ACTIVE_ORG = 'activeOrgId';
const APP_STATE_THRESHOLD = 'thresholdPercent';

/**
 * Loads the entire application state from PostgreSQL.
 * Returns null when the database is empty (no organizations persisted yet),
 * so the caller can fall back to seeding + saving the initial state.
 */
export async function loadAll(): Promise<AppStateSnapshot | null> {
  const [
    organizations,
    users,
    jobRoles,
    clients,
    partners,
    projects,
    tasks,
    timeEntries,
    workingTimeEntries,
    auditLogs,
    forecasts,
    apiKeys,
    periodLocks,
    appState,
  ] = await Promise.all([
    prisma.organization.findMany(),
    prisma.user.findMany(),
    prisma.employeeJobRole.findMany(),
    prisma.client.findMany(),
    prisma.partner.findMany(),
    prisma.project.findMany(),
    prisma.task.findMany(),
    prisma.timeEntry.findMany(),
    prisma.workingTimeEntry.findMany(),
    prisma.auditLogEntry.findMany(),
    prisma.forecastEntry.findMany(),
    prisma.apiKey.findMany(),
    prisma.periodLock.findMany(),
    prisma.appState.findMany(),
  ]);

  if (organizations.length === 0) {
    return null;
  }

  const stateMap = new Map(appState.map((row) => [row.key, row.value]));
  const activeOrgId = (stateMap.get(APP_STATE_ACTIVE_ORG) as string) || 'org-insight-arcs-prod';
  const thresholdRaw = stateMap.get(APP_STATE_THRESHOLD);
  const thresholdPercent = typeof thresholdRaw === 'number' ? thresholdRaw : 20;

  const unwrap = <T>(rows: Array<{ data: unknown }>): T[] => rows.map((r) => r.data as T);

  return {
    organizations: unwrap<Organization>(organizations),
    activeOrgId,
    users: unwrap<User>(users),
    jobRoles: unwrap<EmployeeJobRole>(jobRoles),
    clients: unwrap<Client>(clients),
    partners: unwrap<Partner>(partners),
    projects: unwrap<Project>(projects),
    tasks: unwrap<Task>(tasks),
    timeEntries: unwrap<TimeEntry>(timeEntries),
    workingTimeEntries: unwrap<WorkingTimeEntry>(workingTimeEntries),
    auditLogs: unwrap<AuditLogEntry>(auditLogs),
    forecasts: unwrap<ForecastEntry>(forecasts),
    apiKeys: unwrap<ApiKey>(apiKeys),
    periodLocks: unwrap<PeriodLock>(periodLocks),
    thresholdPercent,
  };
}

/**
 * Persists the entire application state to PostgreSQL inside a single
 * transaction. Uses a full replace (deleteMany + createMany per table) so the
 * database is always an exact mirror of the in-memory arrays, preserving the
 * same "whole state snapshot" semantics the JSON file had. This keeps the GoBD
 * audit hash chain intact because objects are stored verbatim in JSONB.
 */
export async function saveAll(state: AppStateSnapshot): Promise<void> {
  const asData = (obj: any) => JSON.parse(JSON.stringify(obj));

  await prisma.$transaction([
    // Wipe existing rows.
    prisma.organization.deleteMany({}),
    prisma.user.deleteMany({}),
    prisma.employeeJobRole.deleteMany({}),
    prisma.client.deleteMany({}),
    prisma.partner.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.timeEntry.deleteMany({}),
    prisma.workingTimeEntry.deleteMany({}),
    prisma.auditLogEntry.deleteMany({}),
    prisma.forecastEntry.deleteMany({}),
    prisma.apiKey.deleteMany({}),
    prisma.periodLock.deleteMany({}),

    // Re-insert current state.
    prisma.organization.createMany({
      data: state.organizations.map((o) => ({ id: o.id, data: asData(o) })),
    }),
    prisma.user.createMany({
      data: state.users.map((u) => ({ id: u.id, orgId: u.orgId ?? null, email: u.email ?? null, data: asData(u) })),
    }),
    prisma.employeeJobRole.createMany({
      data: state.jobRoles.map((r) => ({ id: r.id, orgId: r.orgId ?? null, data: asData(r) })),
    }),
    prisma.client.createMany({
      data: state.clients.map((c) => ({ id: c.id, orgId: c.orgId ?? null, data: asData(c) })),
    }),
    prisma.partner.createMany({
      data: state.partners.map((p) => ({ id: p.id, orgId: p.orgId ?? null, data: asData(p) })),
    }),
    prisma.project.createMany({
      data: state.projects.map((p) => ({ id: p.id, orgId: p.orgId ?? null, clientId: p.clientId ?? null, data: asData(p) })),
    }),
    prisma.task.createMany({
      data: state.tasks.map((t) => ({ id: t.id, projectId: t.projectId ?? null, data: asData(t) })),
    }),
    prisma.timeEntry.createMany({
      data: state.timeEntries.map((te) => ({
        id: te.id,
        orgId: te.orgId ?? null,
        userId: te.userId ?? null,
        projectId: te.projectId ?? null,
        date: te.date ?? null,
        data: asData(te),
      })),
    }),
    prisma.workingTimeEntry.createMany({
      data: state.workingTimeEntries.map((w) => ({
        id: w.id,
        orgId: w.orgId ?? null,
        userId: w.userId ?? null,
        date: w.date ?? null,
        data: asData(w),
      })),
    }),
    prisma.auditLogEntry.createMany({
      data: state.auditLogs.map((a) => ({
        id: a.id,
        orgId: a.orgId ?? null,
        entityId: a.entityId ?? null,
        timestamp: a.timestamp ?? null,
        data: asData(a),
      })),
    }),
    prisma.forecastEntry.createMany({
      data: state.forecasts.map((f) => ({
        id: f.id,
        orgId: f.orgId ?? null,
        projectId: f.projectId ?? null,
        userId: f.userId ?? null,
        month: f.month ?? null,
        data: asData(f),
      })),
    }),
    prisma.apiKey.createMany({
      data: state.apiKeys.map((k) => ({ id: k.id, orgId: (k as any).orgId ?? null, data: asData(k) })),
    }),
    prisma.periodLock.createMany({
      data: state.periodLocks.map((pl) => ({
        id: pl.id,
        orgId: pl.orgId ?? null,
        periodKey: pl.periodKey ?? null,
        data: asData(pl),
      })),
    }),

    // Runtime singletons.
    prisma.appState.upsert({
      where: { key: APP_STATE_ACTIVE_ORG },
      create: { key: APP_STATE_ACTIVE_ORG, value: state.activeOrgId as any },
      update: { value: state.activeOrgId as any },
    }),
    prisma.appState.upsert({
      where: { key: APP_STATE_THRESHOLD },
      create: { key: APP_STATE_THRESHOLD, value: state.thresholdPercent as any },
      update: { value: state.thresholdPercent as any },
    }),
  ]);
}
