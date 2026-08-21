import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { storage } from './server/storage.js';
import { GERMAN_STATES, getGermanHolidays, getWorkingDaysInRange, resolveUserHolidayState } from './server/holidays.js';
import { generateJwtToken, verifyJwtToken } from './server/authService.js';
import {
  CreateTimeEntrySchema,
  UpdateTimeEntrySchema,
  CreateWorkingTimeSchema,
  CreateForecastSchema,
  PeriodLockSchema
} from './server/validationSchemas.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- CORS-HAERTUNG (Section: Security Hardening) ---
  // Erlaubte Origins werden zur Laufzeit aus der Umgebungsvariable ALLOWED_ORIGINS
  // (kommagetrennte Liste) eingelesen. Fallback fuer die Entwicklung.
  const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:4200'];
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const effectiveAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Requests ohne Origin-Header (z. B. curl, Server-zu-Server, gleiche Herkunft) zulassen.
      if (!origin) {
        return callback(null, true);
      }
      if (effectiveAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin '${origin}' ist nicht erlaubt`));
    },
    // Credentials nur bei definierten (whitelisted) Origins aktiv – kein Wildcard mit Credentials.
    credentials: true
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mock session: Current simulated logged in user (defaults to Admin Dr. Andreas Behrens)
  let currentUserId: string = 'u-1';

  const getActorId = (req: Request): string => {
    // 1. Check JWT Bearer Token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = verifyJwtToken(token);
      if (verified.valid && verified.payload) {
        return verified.payload.userId;
      }
    }

    // 2. Fallback to header or session
    const headerUserId = req.headers['x-user-id'] as string;
    return headerUserId || currentUserId || 'u-1';
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

  // --- ADMIN-ROUTENSCHUTZ (Section: Security Hardening) ---
  // Schuetzt alle Routen mit dem Praefix /admin bzw. /api/admin.
  // Konsistent zur bestehenden Auth-Logik: primaer JWT-Bearer-Token
  // (verifyJwtToken), alternativ die vorhandene Session ueber den
  // x-user-id-Header. Bei fehlendem/ungueltigem Token: HTTP 401.
  const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    // a) Bearer-Token im Authorization-Header pruefen
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      // verifyJwtToken kann bei manipulierten Tokens werfen -> absichern.
      let verified: ReturnType<typeof verifyJwtToken>;
      try {
        verified = verifyJwtToken(token);
      } catch {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (verified.valid && verified.payload) {
        // Nur ADMIN/SUPERADMIN duerfen Admin-Routen nutzen.
        const role = verified.payload.role;
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
          return next();
        }
        return res.status(403).json({ error: 'Forbidden' });
      }
      // Token vorhanden, aber ungueltig/abgelaufen
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // b) Fallback: bestehende Session-/Cookie-basierte Authentifizierung.
    // Nur ein EXPLIZIT gesetzter x-user-id-Header wird akzeptiert – der interne
    // Mock-Default (currentUserId) darf den Schutz nicht aushebeln.
    const sessionUserId = req.headers['x-user-id'] as string | undefined;
    if (sessionUserId) {
      const user = storage.getUsers().find((u) => u.id === sessionUserId);
      if (user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Kein Bearer-Token und keine Session -> nicht autorisiert.
    return res.status(401).json({ error: 'Unauthorized' });
  };

  // Admin-Routenschutz vor allen /admin- und /api/admin-Routen aktivieren.
  app.use('/admin', requireAdminAuth);
  app.use('/api/admin', requireAdminAuth);

  // -------------------------------------------------------------
  // INTERNAL APPLICATION API ROUTES
  // -------------------------------------------------------------

  // Health & Compliance Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Insight Arcs Zeiterfassung & Arbeitszeit API',
      euHostingLocation: 'Germany (netcup RZ Nürnberg)',
      database: 'Local JSON Storage (persistent)',
      auditRetention: '10 years GoBD & ArbZG compliant',
      securityEngine: 'JWT HMAC-SHA256 & SHA-256 Audit Blockchain',
      timestamp: new Date().toISOString()
    });
  });

  // Auth / Session Login, Logout, Switching & Organization Management
  app.get('/api/auth/me', (req, res) => {
    const targetId = getActorId(req);
    const allUsers = storage.getUsers(true);
    const user = targetId ? (allUsers.find(u => u.id === targetId) || null) : null;
    const org = user ? storage.getOrganization() : null;

    let tokenData = null;
    if (user && org) {
      tokenData = generateJwtToken(user, org.id, org.name);
    }
    
    res.json({
      user,
      organization: org,
      organizations: storage.getOrganizations(),
      activeOrgId: storage.getActiveOrgId(),
      roles: storage.getJobRoles(),
      token: tokenData?.token
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, userId, orgId } = req.body;
    const allUsers = storage.getUsers(true);
    let user = null;

    if (userId) {
      user = allUsers.find(u => u.id === userId);
    } else if (email) {
      const cleanEmail = email.trim().toLowerCase();
      user = allUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Kein Benutzer mit diesen Anmeldedaten gefunden. Bitte prüfen Sie Ihre E-Mail oder nutzen Sie die Profilauswahl.'
      });
    }

    currentUserId = user.id;

    // Switch org if specified, or pick user's active org
    if (orgId) {
      storage.setActiveOrgId(orgId);
    } else {
      const userMemberships = user.memberships || [];
      const hasCurrentOrg = user.orgId === storage.getActiveOrgId() || userMemberships.some(m => m.orgId === storage.getActiveOrgId());
      if (!hasCurrentOrg && userMemberships.length > 0) {
        storage.setActiveOrgId(userMemberships[0].orgId);
      } else if (!hasCurrentOrg && user.orgId) {
        storage.setActiveOrgId(user.orgId);
      }
    }

    const org = storage.getOrganization();
    const tokenData = generateJwtToken(user, org.id, org.name);

    res.json({
      success: true,
      user,
      organization: org,
      activeOrgId: storage.getActiveOrgId(),
      token: tokenData.token,
      expiresAt: tokenData.payload.exp
    });
  });

  app.post('/api/auth/verify-token', (req, res) => {
    const { token } = req.body;
    const result = verifyJwtToken(token);
    res.json(result);
  });

  app.post('/api/auth/logout', (req, res) => {
    currentUserId = '';
    res.json({ success: true, message: 'Erfolgreich abgemeldet' });
  });

  app.get('/api/auth/available-users', (req, res) => {
    const allUsers = storage.getUsers(true);
    res.json(allUsers);
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

  app.put('/api/organizations/:id', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.updateOrganizationById(req.params.id, req.body, actorId);
    if (!updated) return res.status(404).json({ error: 'Organization not found' });
    res.json(updated);
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
    const actorId = getActorId(req);
    const targetUserId = (req.query.userId as string) || actorId;
    const user = targetUserId ? storage.getUsers(true).find(u => u.id === targetUserId) : null;
    const org = storage.getOrganization();
    const stateCode = (req.query.state as string) || resolveUserHolidayState(user, org);
    const holidays = getGermanHolidays(year, stateCode);
    res.json({
      year,
      stateCode,
      holidays
    });
  });

  // Users & Invitations (Section 4)
  app.get('/api/users', (req, res) => {
    const { allOrgs } = req.query as { allOrgs?: string };
    res.json(storage.getUsers(allOrgs === 'true'));
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

  app.delete('/api/users/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deleteUser(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Mitarbeiter erfolgreich gelöscht' });
  });

  // Fachliche Mitarbeiterrollen (Section 24)
  app.get('/api/employee-roles', (req, res) => {
    const { allOrgs } = req.query as { allOrgs?: string };
    res.json(storage.getJobRoles(allOrgs === 'true'));
  });

  app.post('/api/employee-roles', (req, res) => {
    const actorId = getActorId(req);
    const role = storage.addJobRole(req.body, actorId);
    res.status(201).json(role);
  });

  app.put('/api/employee-roles/:id', (req, res) => {
    const actorId = getActorId(req);
    const role = storage.updateJobRole(req.params.id, req.body, actorId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  });

  app.delete('/api/employee-roles/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deleteJobRole(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Rolle erfolgreich gelöscht' });
  });

  // Clients & Projects & Tasks (Section 6)
  app.get('/api/clients', (req, res) => {
    const actorId = getActorId(req);
    const { allOrgs } = req.query as { allOrgs?: string };
    res.json(storage.getClients(actorId, allOrgs === 'true'));
  });

  app.post('/api/clients', (req, res) => {
    const client = storage.addClient(req.body);
    res.status(201).json(client);
  });

  app.put('/api/clients/:id', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.updateClient(req.params.id, req.body, actorId);
    if (!updated) return res.status(404).json({ error: 'Client not found' });
    res.json(updated);
  });

  app.delete('/api/clients/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deleteClient(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Kunde erfolgreich gelöscht' });
  });

  // Partners / Externe Dienstleister (Section Partner)
  app.get('/api/partners', (req, res) => {
    const actorId = getActorId(req);
    const { allOrgs } = req.query as { allOrgs?: string };
    res.json(storage.getPartners(actorId, allOrgs === 'true'));
  });

  app.post('/api/partners', (req, res) => {
    const actorId = getActorId(req);
    const partner = storage.addPartner(req.body, actorId);
    res.status(201).json(partner);
  });

  app.put('/api/partners/:id', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.updatePartner(req.params.id, req.body, actorId);
    if (!updated) return res.status(404).json({ error: 'Partner not found' });
    res.json(updated);
  });

  app.post('/api/partners/:id/archive', (req, res) => {
    const actorId = getActorId(req);
    const updated = storage.archivePartner(req.params.id, actorId);
    if (!updated) return res.status(404).json({ error: 'Partner not found' });
    res.json(updated);
  });

  app.delete('/api/partners/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deletePartner(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Partner erfolgreich gelöscht' });
  });

  app.get('/api/projects', (req, res) => {
    const actorId = getActorId(req);
    const { allOrgs } = req.query as { allOrgs?: string };
    res.json(storage.getProjects(actorId, allOrgs === 'true'));
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

  app.delete('/api/projects/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deleteProject(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Projekt erfolgreich gelöscht' });
  });

  app.get('/api/tasks', (req, res) => {
    const actorId = getActorId(req);
    const { projectId } = req.query as { projectId?: string };
    res.json(storage.getTasks(projectId, actorId));
  });

  app.post('/api/tasks', (req, res) => {
    const actorId = getActorId(req);
    const task = storage.addTask(req.body, actorId);
    res.status(201).json(task);
  });

  app.put('/api/tasks/:id', (req, res) => {
    const actorId = getActorId(req);
    const task = storage.updateTask(req.params.id, req.body, actorId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const actorId = getActorId(req);
    const result = storage.deleteTask(req.params.id, actorId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Aufgabe erfolgreich gelöscht' });
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
    const actorId = getActorId(req);
    const { from, to, userId, projectId, clientId, approvalStatus, isBillable, page, limit, updatedAfter, allOrgs } = req.query as any;
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
      updatedAfter,
      allOrgs: allOrgs === 'true'
    }, actorId);
    res.json(result);
  });

  app.post('/api/time-entries', (req, res) => {
    const actorId = getActorId(req);
    const parseResult = CreateTimeEntrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validierungsfehler bei Zeiterfassung',
        details: parseResult.error.issues.map(i => i.message).join(', ')
      });
    }

    try {
      const entry = storage.createTimeEntry(req.body, actorId);
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Erstellen der Zeiterfassung' });
    }
  });

  app.put('/api/time-entries/:id', (req, res) => {
    const actorId = getActorId(req);
    const parseResult = UpdateTimeEntrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validierungsfehler bei Zeiteintrags-Korrektur',
        details: parseResult.error.issues.map(i => i.message).join(', ')
      });
    }

    try {
      const { reason, ...updates } = req.body;
      const entry = storage.updateTimeEntry(req.params.id, updates, actorId, reason);
      if (!entry) return res.status(404).json({ error: 'Time entry not found' });
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Aktualisieren der Zeiterfassung' });
    }
  });

  app.delete('/api/time-entries/:id', (req, res) => {
    const actorId = getActorId(req);
    try {
      const ok = storage.deleteTimeEntry(req.params.id, actorId);
      if (!ok) return res.status(404).json({ error: 'Time entry not found' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Löschen des Zeiteintrags' });
    }
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
    const actorId = getActorId(req);
    res.json(storage.getAuditLogs(actorId));
  });

  // GoBD Revisionssicherheit, Period Locking & Hash-Chain Verifikation
  app.get('/api/gobd/period-locks', (req, res) => {
    res.json(storage.getPeriodLocks());
  });

  app.post('/api/gobd/lock-period', (req, res) => {
    const actorId = getActorId(req);
    const { periodKey, reason } = req.body;
    if (!periodKey || !/^\d{4}-\d{2}$/.test(periodKey)) {
      return res.status(400).json({ error: 'Ungültiges Periodenformat. Erwartet wird YYYY-MM.' });
    }
    try {
      const lock = storage.lockPeriod({ periodKey, reason, actorId });
      res.json({ success: true, lock });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Sperren der Periode' });
    }
  });

  app.post('/api/gobd/unlock-period', (req, res) => {
    const actorId = getActorId(req);
    const { periodKey, reason } = req.body;
    if (!periodKey || !reason) {
      return res.status(400).json({ error: 'Periode und gesetzlich vorgeschriebener Entsperr-Grund sind erforderlich.' });
    }
    try {
      const lock = storage.unlockPeriod({ periodKey, reason, actorId });
      res.json({ success: true, lock });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Entsperren der Periode' });
    }
  });

  app.get('/api/gobd/verify-hash-chain', (req, res) => {
    const report = storage.verifyAuditHashChain();
    res.json(report);
  });

  app.get('/api/gobd/certificate/:periodKey', (req, res) => {
    const actorId = getActorId(req);
    const { periodKey } = req.params;
    if (!periodKey || !/^\d{4}-\d{2}$/.test(periodKey)) {
      return res.status(400).json({ error: 'Ungültiges Periodenformat (YYYY-MM erwartet).' });
    }
    const cert = storage.generateGoBDCertificate(periodKey, actorId);
    res.json(cert);
  });

  // Working Time (Section 20)
  app.get('/api/working-time', (req, res) => {
    const actorId = getActorId(req);
    const { from, to, userId } = req.query as any;
    res.json(storage.getWorkingTimeEntries({ from, to, userId }, actorId));
  });

  app.post('/api/working-time', (req, res) => {
    const actorId = getActorId(req);
    const parseResult = CreateWorkingTimeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validierungsfehler bei Arbeitszeit',
        details: parseResult.error.issues.map(i => i.message).join(', ')
      });
    }

    try {
      const entry = storage.createOrUpdateWorkingTime(req.body, actorId);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Fehler beim Speichern der Arbeitszeit' });
    }
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
    const actorId = getActorId(req);
    const { month, projectId } = req.query as any;
    res.json(storage.getForecasts(month, projectId, actorId));
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

  app.get('/api/forecasts/history', (req, res) => {
    const { projectId, userId, month } = req.query as any;
    const history = storage.getForecastHistory(projectId, userId, month);
    res.json(history);
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

  // Cross-Project Employee Capacity & Overbooking Analysis (Plan vs. Ist pro Mitarbeiter)
  app.get('/api/forecasts/employee-capacity', (req, res) => {
    const { periodType, periodKey, employmentType, search, thresholdPercent } = req.query as any;
    const summary = storage.getEmployeeCapacitySummary({
      periodType,
      periodKey,
      employmentType,
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

  // Billable vs. Non-Billable Stundensummen Export / API (Anforderung: reiner Datenexport/API)
  app.get('/api/export/billable-summary', (req, res) => {
    const { from, to, projectId, userId, clientId, projectType, format } = req.query as any;
    const report = storage.getBillableSummary({
      from,
      to,
      projectId,
      userId,
      clientId,
      projectType
    });

    if (format === 'csv') {
      const projectHeaders = [
        'Projekt ID',
        'Projektnummer',
        'Projektname',
        'Projekttyp',
        'Abrechnungsmodell',
        'Auftraggeber/Kunde',
        'Gesamtstunden (h)',
        'Billable Stunden (h)',
        'Non-Billable Stunden (h)',
        'Billable-Anteil (%)',
        'Effektiver Stundensatz (EUR)',
        'Effektiver Kostensatz (EUR)',
        'Kundenabrechnungssumme (EUR)',
        'Interne Gesamtkosten (EUR)',
        'Marge (EUR)',
        'Marge (%)'
      ];

      const csvRows = [
        // Summary Block
        `"MANDANT";"${report.organization}"`,
        `"ZEITRAUM";"${report.queryPeriod.from || 'Alle'} bis ${report.queryPeriod.to || 'Alle'}"`,
        `"GESAMTSTUNDEN";"${report.totals.totalHours.toFixed(2)}"`,
        `"BILLABLE STUNDEN";"${report.totals.billableHours.toFixed(2)}"`,
        `"NON-BILLABLE STUNDEN";"${report.totals.nonBillableHours.toFixed(2)}"`,
        `"BILLABLE ANTEIL (%)";"${report.totals.billableSharePercent.toFixed(1)}%"`,
        `"ABRECHNUNGSSUMME GESAMT (EUR)";"${report.totals.totalBillingAmount.toFixed(2)}"`,
        `"INTERNE KOSTEN GESAMT (EUR)";"${report.totals.totalInternalCost.toFixed(2)}"`,
        `"BRUTTOMARGE (EUR)";"${report.totals.grossMargin.toFixed(2)}"`,
        `"MARGE (%)";"${report.totals.grossMarginPercent.toFixed(1)}%"`,
        '',
        // Project Detail Headers
        projectHeaders.join(';'),
        ...report.byProject.map(p => [
          `"${p.projectId}"`,
          `"${p.projectNumber}"`,
          `"${p.projectName}"`,
          `"${p.projectType === 'INTERNAL_PROJECT' ? 'Internes Projekt' : 'Kundenprojekt'}"`,
          `"${p.billingModel}"`,
          `"${p.clientName}"`,
          p.totalHours.toFixed(2),
          p.billableHours.toFixed(2),
          p.nonBillableHours.toFixed(2),
          `${p.billableSharePercent.toFixed(1)}%`,
          p.effectiveBillingRate.toFixed(2),
          p.effectiveCostRate.toFixed(2),
          p.totalBillingAmount.toFixed(2),
          p.totalInternalCost.toFixed(2),
          p.margin.toFixed(2),
          `${p.marginPercent.toFixed(1)}%`
        ].join(';'))
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=billable_summary_${from || 'all'}_${to || 'all'}.csv`);
      return res.send(csvRows.join('\n'));
    }

    res.json(report);
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

  // REST API V1: Billable vs. Non-Billable Stundensummen & Margen-Export
  app.get('/api/v1/billable-summary', requireApiKey, (req, res) => {
    const { from, to, projectId, userId, clientId, projectType } = req.query as any;
    const report = storage.getBillableSummary({
      from,
      to,
      projectId,
      userId,
      clientId,
      projectType
    });
    res.json(report);
  });

  // -------------------------------------------------------------
  // DATABASE PERSISTENCE & BACKUP / IMPORT API
  // -------------------------------------------------------------
  app.get('/api/database/export', (req, res) => {
    const data = storage.exportDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=insight_arcs_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json(data);
  });

  app.post('/api/database/import', (req, res) => {
    const backupData = req.body;
    if (!backupData || !backupData.organizations) {
      return res.status(400).json({ error: 'Ungültiges Sicherungsdatenformat' });
    }
    const success = storage.importDatabase(backupData);
    if (success) {
      res.json({ success: true, message: 'Datenbank erfolgreich wiederhergestellt und gespeichert' });
    } else {
      res.status(500).json({ error: 'Fehler beim Wiederherstellen der Daten' });
    }
  });

  app.post('/api/database/save', (req, res) => {
    storage.saveToFile();
    res.json({ success: true, message: 'Datenbank erfolgreich auf Datenträger gespeichert' });
  });

  app.post('/api/database/reset', (req, res) => {
    storage.resetToInitialData();
    res.json({ success: true, message: 'Datenbank auf Werkseinstellungen zurückgesetzt' });
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
