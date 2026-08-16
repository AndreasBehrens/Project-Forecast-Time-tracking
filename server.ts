import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage.js';
import { GERMAN_STATES, getGermanHolidays, getWorkingDaysInRange } from './server/holidays.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mock session: Current simulated logged in user (defaults to Admin Dr. Andreas Behrens)
  let currentUserId = 'u-1';

  const getActorId = (req: Request): string => {
    const headerUserId = req.headers['x-user-id'] as string;
    return headerUserId || currentUserId;
  };

  // --- API KEY AUTH MIDDLEWARE FOR EXTERNAL API (Section 12.3) ---
  const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req.headers['x-api-key'] as string) || (req.headers['authorization']?.replace('Bearer ', ''));
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized: API Key missing',
        message: 'Please provide a valid x-api-key header or Bearer token'
      });
    }

    if (!storage.validateApiKey(apiKey)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or revoked API Key',
        message: 'The provided API key is invalid or has been revoked.'
      });
    }

    next();
  };

  // -------------------------------------------------------------
  // INTERNAL APPLICATION API ROUTES
  // -------------------------------------------------------------

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Insight Arcs Zeiterfassung & Arbeitszeit API',
      euHostingLocation: 'europe-west3 (Frankfurt, Germany)',
      auditRetention: '10 years compliant',
      timestamp: new Date().toISOString()
    });
  });

  // Auth / Session Switching & Organization Management
  app.get('/api/auth/me', (req, res) => {
    const allUsers = storage.getUsers(true);
    const user = allUsers.find(u => u.id === currentUserId) || allUsers[0];
    res.json({
      user,
      organization: storage.getOrganization(),
      organizations: storage.getOrganizations(),
      activeOrgId: storage.getActiveOrgId(),
      roles: storage.getJobRoles()
    });
  });

  app.post('/api/auth/switch-user', (req, res) => {
    const { userId } = req.body;
    const allUsers = storage.getUsers(true);
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    currentUserId = userId;
    // Check if user has membership in current activeOrgId, if not switch to user's default/first org
    const userMemberships = user.memberships || [];
    const hasCurrentOrg = user.orgId === storage.getActiveOrgId() || userMemberships.some(m => m.orgId === storage.getActiveOrgId());
    if (!hasCurrentOrg && userMemberships.length > 0) {
      storage.setActiveOrgId(userMemberships[0].orgId);
    } else if (!hasCurrentOrg && user.orgId) {
      storage.setActiveOrgId(user.orgId);
    }
    res.json({ 
      success: true, 
      activeUser: user, 
      organization: storage.getOrganization(),
      activeOrgId: storage.getActiveOrgId()
    });
  });

  // Organization & Multi-Tenant Switcher (Section 2, 4)
  app.get('/api/organizations', (req, res) => {
    res.json(storage.getOrganizations());
  });

  app.post('/api/organizations', (req, res) => {
    const actorId = getActorId(req);
    const newOrg = storage.addOrganization(req.body, actorId);
    res.status(201).json(newOrg);
  });

  app.post('/api/organizations/switch', (req, res) => {
    const { orgId } = req.body;
    const org = storage.setActiveOrgId(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({
      success: true,
      activeOrgId: orgId,
      organization: org
    });
  });

  app.get('/api/organization', (req, res) => {
    res.json(storage.getOrganization());
  });

  app.put('/api/organization', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.updateOrganization(req.body, actorId);
    res.json(updated);
  });

  // German States & Feiertage (Berlin & alle Bundesländer)
  app.get('/api/german-states', (req, res) => {
    res.json(GERMAN_STATES);
  });

  app.get('/api/holidays', (req, res) => {
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
    const stateCode = (req.query.state as string) || storage.getOrganization().stateLocation || 'DE-BE';
    const holidays = getGermanHolidays(year, stateCode);
    res.json({
      year,
      stateCode,
      holidays
    });
  });

  // Users & Invitations (Section 4)
  app.get('/api/users', (req, res) => {
    res.json(storage.getUsers());
  });

  app.post('/api/users/invite', (req, res) => {
    const actorId = getActorId(req);
    const newUser = storage.addUser(req.body, actorId);
    res.status(201).json({
      success: true,
      user: newUser,
      invitationLink: `https://app.insightarcs.de/join?token=${newUser.invitationToken}`,
      message: `Einladungs-E-Mail wurde an ${newUser.email} simuliert versandt.`
    });
  });

  app.put('/api/users/:id', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.updateUser(req.params.id, req.body, actorId);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  // Fachliche Mitarbeiterrollen (Section 24)
  app.get('/api/employee-roles', (req, res) => {
    res.json(storage.getJobRoles());
  });

  app.post('/api/employee-roles', (req, res) => {
    const actorId = getActorId(req);
    const role = storage.addJobRole(req.body, actorId);
    res.status(201).json(role);
  });

  app.put('/api/employee-roles/:id', (req, res) => {
    const role = storage.updateJobRole(req.params.id, req.body);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  });

  // Clients & Projects & Tasks (Section 6)
  app.get('/api/clients', (req, res) => {
    res.json(storage.getClients());
  });

  app.post('/api/clients', (req, res) => {
    const client = storage.addClient(req.body);
    res.status(201).json(client);
  });

  app.get('/api/projects', (req, res) => {
    res.json(storage.getProjects());
  });

  app.post('/api/projects', (req, res) => {
    const actorId = getActorId(req);
    const project = storage.addProject(req.body, actorId);
    res.status(201).json(project);
  });

  app.put('/api/projects/:id', (req, res) => {
    const actorId = getActorId(req);
    const project = storage.updateProject(req.params.id, req.body, actorId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  });

  app.get('/api/tasks', (req, res) => {
    const { projectId } = req.query as { projectId?: string };
    res.json(storage.getTasks(projectId));
  });

  app.post('/api/tasks', (req, res) => {
    const task = storage.addTask(req.body);
    res.status(201).json(task);
  });

  // Rate Hierarchy Resolver Endpoint (Section 9, 24, 25)
  app.get('/api/rate-hierarchy/resolve', (req, res) => {
    const { userId, projectId, date } = req.query as { userId: string; projectId?: string; date?: string };
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const resolved = storage.resolveRates(userId, projectId, date);
    res.json(resolved);
  });

  // Time Entries (Section 7)
  app.get('/api/time-entries', (req, res) => {
    const { from, to, userId, projectId, clientId, approvalStatus, isBillable, page, limit, updatedAfter } = req.query as any;
    const result = storage.getTimeEntries({
      from,
      to,
      userId,
      projectId,
      clientId,
      approvalStatus,
      isBillable: isBillable !== undefined ? isBillable === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
      updatedAfter
    });
    res.json(result);
  });

  app.post('/api/time-entries', (req, res) => {
    const actorId = getActorId(req);
    const entry = storage.createTimeEntry(req.body, actorId);
    res.status(201).json(entry);
  });

  app.put('/api/time-entries/:id', (req, res) => {
    const actorId = getActorId(req);
    const { reason, ...updates } = req.body;
    const entry = storage.updateTimeEntry(req.params.id, updates, actorId, reason);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    res.json(entry);
  });

  app.delete('/api/time-entries/:id', (req, res) => {
    const actorId = getActorId(req);
    const ok = storage.deleteTimeEntry(req.params.id, actorId);
    if (!ok) return res.status(404).json({ error: 'Time entry not found' });
    res.json({ success: true });
  });

  app.post('/api/time-entries/split', (req, res) => {
    const actorId = getActorId(req);
    const { entryId, parts } = req.body;
    const result = storage.splitTimeEntry(entryId, parts, actorId);
    res.json({ success: true, createdEntries: result });
  });

  app.post('/api/time-entries/batch-update', (req, res) => {
    const actorId = getActorId(req);
    const { entryIds, updates } = req.body;
    const count = storage.batchUpdateTimeEntries(entryIds, updates, actorId);
    res.json({ success: true, updatedCount: count });
  });

  // Approvals & Audit (Section 8)
  app.post('/api/time-entries/approve', (req, res) => {
    const actorId = getActorId(req);
    const { entryIds, status } = req.body;
    const count = storage.setApprovalStatus(entryIds, status || 'APPROVED', actorId);
    res.json({ success: true, approvedCount: count });
  });

  app.get('/api/audit-logs', (req, res) => {
    res.json(storage.getAuditLogs());
  });

  // Working Time (Section 20)
  app.get('/api/working-time', (req, res) => {
    const { from, to, userId } = req.query as any;
    res.json(storage.getWorkingTimeEntries({ from, to, userId }));
  });

  app.post('/api/working-time', (req, res) => {
    const actorId = getActorId(req);
    const entry = storage.createOrUpdateWorkingTime(req.body, actorId);
    res.json(entry);
  });

  app.get('/api/working-time/summary', (req, res) => {
    const { userId, month } = req.query as { userId: string; month: string };
    const targetUserId = userId || getActorId(req);
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const summary = storage.getWorkingTimeSummary(targetUserId, targetMonth);
    res.json(summary);
  });

  // Forecast Planning (Section 21)
  app.get('/api/forecasts', (req, res) => {
    const { month, projectId } = req.query as any;
    res.json(storage.getForecasts(month, projectId));
  });

  app.post('/api/forecasts', (req, res) => {
    const actorId = getActorId(req);
    const fc = storage.saveForecast(req.body, actorId);
    res.status(201).json(fc);
  });

  app.get('/api/forecasts/plan-vs-actual', (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const comparison = storage.getForecastPlanVsActual(month);
    res.json({ month, comparison });
  });

  // Aggregated Project-Level Forecast Summary (Financials: Revenue, Margin, Costs with Period Filters & Berlin Holiday Calibration)
  app.get('/api/forecasts/project-summary', (req, res) => {
    const { periodType, periodKey, clientId, billingModel, search, thresholdPercent } = req.query as any;
    const summary = storage.getProjectForecastSummary({
      periodType,
      periodKey,
      clientId,
      billingModel,
      search,
      thresholdPercent: thresholdPercent ? parseFloat(thresholdPercent) : undefined
    });
    res.json(summary);
  });

  // Clockify CSV Import (Section 10)
  app.post('/api/clockify/import', (req, res) => {
    const actorId = getActorId(req);
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Rows array is required' });
    }
    const report = storage.importClockifyData(rows, actorId);
    res.json(report);
  });

  // CSV & Excel Raw Data Export (Section 11)
  app.get('/api/export/time-entries', (req, res) => {
    const { from, to, format } = req.query as any;
    const { data } = storage.getTimeEntries({ from, to, limit: 10000 });

    if (format === 'csv') {
      const headers = [
        'ID',
        'Date',
        'User',
        'Client',
        'Project',
        'Task',
        'Description',
        'Start Time',
        'End Time',
        'Duration (h)',
        'Break (min)',
        'Billable',
        'Hourly Rate (EUR)',
        'Amount (EUR)',
        'Approval Status',
        'Corrected After Approval',
        'Updated At'
      ];

      const csvRows = [
        headers.join(';'),
        ...data.map(d => [
          `"${d.id}"`,
          `"${d.date}"`,
          `"${d.userName}"`,
          `"${d.clientName}"`,
          `"${d.projectName}"`,
          `"${d.taskName || ''}"`,
          `"${(d.description || '').replace(/"/g, '""')}"`,
          `"${d.startTime || ''}"`,
          `"${d.endTime || ''}"`,
          d.durationHoursDecimal.toFixed(2),
          d.breakMinutes,
          d.isBillable ? 'Yes' : 'No',
          d.hourlyBillingRate.toFixed(2),
          d.calculatedAmount.toFixed(2),
          `"${d.approvalStatus}"`,
          d.isCorrectedAfterApproval ? 'Yes' : 'No',
          `"${d.updatedAt}"`
        ].join(';'))
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=zeiterfassung_${from || 'all'}_${to || 'all'}.csv`);
      return res.send(csvRows.join('\n'));
    }

    res.json(data);
  });

  // API Keys (Section 12.3)
  app.get('/api/api-keys', (req, res) => {
    res.json(storage.getApiKeys());
  });

  app.post('/api/api-keys', (req, res) => {
    const { name } = req.body;
    const key = storage.createApiKey(name || 'API Key');
    res.status(201).json(key);
  });

  app.delete('/api/api-keys/:id', (req, res) => {
    const ok = storage.revokeApiKey(req.params.id);
    if (!ok) return res.status(404).json({ error: 'API Key not found' });
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // EXTERNAL REST API V1 FOR POWER AUTOMATE / EXCEL / 3RD PARTY (Section 12)
  // -------------------------------------------------------------
  app.get('/api/v1/time-entries', requireApiKey, (req, res) => {
    const { from, to, userId, projectId, clientId, approvalStatus, isBillable, page, limit, updatedAfter } = req.query as any;

    const result = storage.getTimeEntries({
      from,
      to,
      userId,
      projectId,
      clientId,
      approvalStatus,
      isBillable: isBillable !== undefined ? isBillable === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
      updatedAfter
    });

    res.json({
      organization: 'Insight Arcs GmbH',
      queryPeriod: { from: from || 'any', to: to || 'any' },
      pagination: {
        page: result.page,
        limit: result.limit,
        totalRecords: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      },
      data: result.data.map(d => ({
        id: d.id,
        userId: d.userId,
        userName: d.userName,
        date: d.date,
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        durationMinutes: d.durationMinutes,
        durationHoursDecimal: d.durationHoursDecimal,
        breakMinutes: d.breakMinutes,
        clientId: d.clientId,
        clientName: d.clientName,
        projectId: d.projectId,
        projectName: d.projectName,
        taskId: d.taskId || null,
        taskName: d.taskName || null,
        description: d.description,
        isBillable: d.isBillable,
        hourlyRate: d.hourlyBillingRate,
        currency: d.currency,
        calculatedAmount: d.calculatedAmount,
        approvalStatus: d.approvalStatus,
        isCorrectedAfterApproval: !!d.isCorrectedAfterApproval,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }))
    });
  });

  app.get('/api/v1/working-time', requireApiKey, (req, res) => {
    const { from, to, userId } = req.query as any;
    const entries = storage.getWorkingTimeEntries({ from, to, userId });
    res.json({
      total: entries.length,
      data: entries
    });
  });

  app.get('/api/v1/forecasts', requireApiKey, (req, res) => {
    const { month } = req.query as any;
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const comparison = storage.getForecastPlanVsActual(targetMonth);
    res.json({
      month: targetMonth,
      comparison
    });
  });

  // -------------------------------------------------------------
  // VITE / STATIC SERVING
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Insight Arcs Zeiterfassung Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
