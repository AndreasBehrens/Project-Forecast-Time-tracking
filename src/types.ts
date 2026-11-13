export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'PROJECT_MANAGER' | 'EMPLOYEE';

export type BillingModel = 'TIME_AND_MATERIAL' | 'FIXED_PRICE';

export type ApprovalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type Language = 'de' | 'en';

export interface Organization {
  id: string;
  name: string;
  code?: string;
  defaultHourlyBillingRate: number;
  defaultHourlyCostRate: number;
  defaultCurrency: string;
  stateLocation: string; // e.g. 'DE-BE' for Berlin
  locationCity?: string; // e.g. 'Berlin'
  allowMobileWorkplaces?: boolean; // If true, fixed employees can define their own Bundesland
  logoColor?: string;
  createdAt: string;
  /** Import-Historie (Konzept Datenimport §7); persistiert im JSONB der Organisation */
  importBatches?: ImportBatch[];
  /** Gemerkte Stammdaten-Zuordnungen (Aliase) für Importe (Konzept §4) */
  importAliases?: ImportAlias[];
}

export type EmploymentType = 'INTERNAL' | 'EXTERNAL';

export interface UserOrganizationMembership {
  orgId: string;
  orgName: string;
  role: UserRole;
  employmentType?: EmploymentType;
  jobRoleId?: string;
  individualBillingRate?: number;
  individualCostRate?: number;
  isDefault?: boolean;
}

export interface GermanState {
  code: string;
  name: string;
  shortName: string;
  extraHolidaysDescription: string;
}

export interface HolidayInfo {
  date: string;
  name: string;
  isNationwide: boolean;
  applicableStates: string[];
}

export interface EmployeeJobRole {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  standardBillingRate: number;
  standardCostRate: number; // Only visible to ADMIN
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface EmployeeJobRoleAssignment {
  id: string;
  userId: string;
  jobRoleId: string;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: UserRole;
  employmentType?: EmploymentType; // 'INTERNAL' (Festangestellt / Intern) vs 'EXTERNAL' (Freiberufler / Subunternehmer / Extern)
  companyName?: string; // Für externe Dienstleister / Subunternehmer (z. B. "TechConsultants GbR")
  partnerId?: string; // Zuweisung zu einem Partner-Unternehmen
  partnerName?: string; // Denormalisierter Name des Partner-Unternehmens
  externalType?: 'PARTNER_EMPLOYEE' | 'FREELANCER'; // Subunternehmer-Mitarbeiter vs freier Freelancer
  // Freelancer & Externe MA Kontaktdaten, Adresse & Rechnungsemail:
  contactPerson?: string; // Ansprechpartner
  contactPhone?: string; // Telefon Ansprechpartner / MA
  contactEmail?: string; // Direkte Kontakt-Email
  billingEmail?: string; // Rechnungsemailadresse
  street?: string; // Straße & Hausnummer
  zip?: string; // PLZ
  city?: string; // Ort
  country?: string; // Land
  taxId?: string; // Steuernummer / USt-IdNr.
  jobRoleId?: string;
  individualBillingRate?: number;
  individualCostRate?: number; // Only visible to ADMIN
  weeklyTargetHours: number;
  dailyTargetHours: number;
  workDays: number[]; // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  stateLocation?: string; // Bundesland code for holidays if mobile workplaces enabled on tenant (e.g. 'DE-BY')
  holidayCalendar?: string;
  language: Language;
  timeZone?: string; // IANA-Zeitzone aus dem Profil (z. B. 'America/Sao_Paulo'); leer = automatisch (Gerät)
  deviceTimeZone?: string; // zuletzt vom Gerät erkannte Zeitzone (automatisch gepflegt)
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  invitationToken?: string;
  invitationExpiresAt?: string;
  memberships?: UserOrganizationMembership[];
  passwordHash?: string; // bcrypt-Hash des Passworts; fehlt = kein Passwort gesetzt. Verlässt NIE den Server.
  hasPassword?: boolean; // vom Server abgeleitetes Flag (aus passwordHash) für das Frontend
  requirePasswordChange?: boolean; // bei true muss Nutzer beim nächsten Login das Passwort ändern
  createdAt: string;
}

export interface Partner {
  id: string;
  orgId: string;
  name: string; // Partner- / Firmenname
  partnerNumber?: string; // z. B. "PART-001"
  contactPerson?: string; // Ansprechpartner (Vor- und Nachname)
  contactPhone?: string; // Telefon Ansprechpartner
  contactEmail?: string; // E-Mail Ansprechpartner
  billingEmail?: string; // Rechnungsemailadresse (z. B. "rechnung@partner.de")
  street?: string; // Straße & Hausnummer
  zip?: string; // PLZ
  city?: string; // Ort
  country?: string; // Land (z. B. "Deutschland")
  phone?: string; // Zentrale Telefonnummer
  website?: string; // Website / URL
  taxId?: string; // Steuernummer / USt-IdNr.
  defaultHourlyRate?: number; // Standard-Stundensatz
  notes?: string; // Notizen / Anmerkungen
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt?: string;
}

export type ProjectType = 'CUSTOMER_PROJECT' | 'INTERNAL_PROJECT';

export interface Client {
  id: string;
  orgId: string;
  name: string;
  clientNumber?: string;
  contactPerson?: string;
  email?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface ProjectFixedPriceAllocation {
  id: string;
  projectId: string;
  title: string;
  amount: number;
  targetDate: string;
  period?: string;
  status: 'PLANNED' | 'INVOICED' | 'PAID';
}

export interface ProjectMemberRate {
  id: string;
  projectId: string;
  userId: string;
  hourlyBillingRate?: number;
  hourlyCostRate?: number;
}

export interface Project {
  id: string;
  orgId: string;
  clientId: string;
  clientName?: string;
  name: string;
  projectNumber?: string;
  projectType?: ProjectType; // 'CUSTOMER_PROJECT' (default) | 'INTERNAL_PROJECT'
  isBillableDefault?: boolean; // default billability for bookings (customer=true, internal=false)
  allowInternalRebilling?: boolean; // for internal projects: allow billable exceptions for internal cost allocation
  projectManagerId?: string;
  projectManagerName?: string;
  managerUserIds?: string[];
  billingModel: BillingModel;
  totalFixedPrice?: number;
  budgetHours?: number;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  requireApproval: boolean;
  requiredFields: {
    description: boolean;
    task: boolean;
    breaks: boolean;
  };
  memberRates: ProjectMemberRate[];
  fixedPriceAllocations?: ProjectFixedPriceAllocation[];
  restrictToAssignedMembers?: boolean;
  assignedUserIds?: string[];
  excludedUserIds?: string[];
  allowPmViewCosts?: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  isBillableDefault: boolean; // Flag on task/activity level, inherited during booking
  budgetHours?: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface BillableSummaryTotals {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableSharePercent: number;
  totalBillingAmount: number; // calculated only for billable hours
  totalInternalCost: number; // calculated for ALL hours (billable + non-billable)
  grossMargin: number;
  grossMarginPercent: number;
}

export interface BillableProjectSummary {
  projectId: string;
  projectNumber?: string;
  projectName: string;
  projectType: ProjectType;
  billingModel: BillingModel;
  clientId: string;
  clientName: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableSharePercent: number;
  effectiveBillingRate: number;
  effectiveCostRate: number;
  totalBillingAmount: number;
  totalInternalCost: number;
  margin: number;
  marginPercent: number;
}

export interface BillableUserSummary {
  userId: string;
  userName: string;
  userRole: UserRole;
  employmentType: EmploymentType;
  jobRoleName?: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billableSharePercent: number;
  totalBillingAmount: number;
  totalInternalCost: number;
  margin: number;
}

export interface BillableSummaryReport {
  organization: string;
  queryPeriod: { from?: string; to?: string };
  totals: BillableSummaryTotals;
  byProject: BillableProjectSummary[];
  byUser: BillableUserSummary[];
  generatedAt: string;
}

export interface TimeEntry {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  taskId?: string;
  taskName?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number;
  durationHoursDecimal: number;
  breakMinutes: number;
  description: string;
  isBillable: boolean;
  hourlyBillingRate: number;
  calculatedAmount: number;
  hourlyCostRate?: number; // admin only
  calculatedCost?: number; // admin only
  currency: string;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  isCorrectedAfterApproval?: boolean;
  correctionNote?: string;
  isFavorite?: boolean;
  /** Herkunft aus einem Datenimport (Batch-ID, Fingerabdruck, Quelle + Zeile) */
  importBatchId?: string;
  fingerprint?: string;
  sourceRef?: string;
  createdAt: string;
  updatedAt: string;
}

// Art des Tageseintrags: Reguläre Arbeitszeit oder Abwesenheitsarten
export type DayType = 'REGULAR' | 'VACATION' | 'SICK' | 'SPECIAL_LEAVE' | 'PARENTAL_LEAVE';

export interface WorkingTimeEntry {
  id: string;
  orgId: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  dayType?: DayType; // Standard: 'REGULAR'
  halfDay?: boolean; // Nur bei Abwesenheiten: true = halber Tag (Zeitfelder sichtbar)
  partialAbsence?: boolean; // Teilzeitige Abwesenheit: Start/Ende = Abwesenheitszeitraum (wird angerechnet)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  totalGrossMinutes: number;
  totalNetMinutes: number;
  totalNetHoursDecimal: number;
  note?: string;
  /** Herkunft aus einem Datenimport (Batch-ID, Fingerabdruck, Quelle + Zeile) */
  importBatchId?: string;
  fingerprint?: string;
  sourceRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  entityType: 'TIME_ENTRY' | 'WORKING_TIME' | 'FORECAST' | 'PROJECT' | 'USER' | 'RATE' | 'ORGANIZATION' | 'CLIENT' | 'TASK' | 'JOB_ROLE' | 'PARTNER' | 'PERIOD_LOCK' | 'IMPORT_BATCH';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CORRECT_AFTER_APPROVAL' | 'LOCK_PERIOD' | 'UNLOCK_PERIOD' | 'IMPORT' | 'REVERT_IMPORT';
  userId: string;
  userName: string;
  timestamp: string;
  changes: AuditLogChange[];
  reason?: string;
  hash?: string; // Cryptographic SHA-256 hash
  previousHash?: string; // Blockchain-style integrity chain
}

export interface PeriodLock {
  id: string;
  orgId: string;
  periodKey: string; // YYYY-MM
  status: 'LOCKED' | 'OPEN' | 'ARCHIVED';
  reason?: string;
  lockedByUserId: string;
  lockedByUserName: string;
  lockedAt: string;
  unlockedAt?: string;
  unlockedByUserId?: string;
  unlockedByUserName?: string;
  unlockReason?: string;
  digitalSignatureHash: string; // SHA-256 digest of entries & totals at lock time
  entriesCount: number;
  totalHours: number;
  totalBillingAmount: number;
  totalInternalCost: number;
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
}

export interface AuditHashVerificationReport {
  isChainValid: boolean;
  totalEntriesChecked: number;
  tamperedEntryIds: string[];
  headHash: string;
  genesisTimestamp: string;
  verifiedAt: string;
}

export interface GoBDComplianceCertificate {
  certificateId: string;
  organizationId: string;
  organizationName: string;
  periodKey: string;
  periodLabel: string;
  issueTimestamp: string;
  auditedByUserName: string;
  auditedByUserId: string;
  digitalSignatureSha256: string;
  metrics: {
    totalBookings: number;
    totalWorkingDays: number;
    totalBillableHours: number;
    totalNonBillableHours: number;
    totalHours: number;
    totalRevenue: number;
    totalCost: number;
    grossMargin: number;
    grossMarginPercent: number;
  };
  arbzgCompliance: {
    maxDailyHoursViolationsCount: number;
    breakTimeViolationsCount: number;
    isArbzgCompliant: boolean;
  };
  hashChainHead: string;
}

export type ForecastChangeReason =
  | 'INITIAL_PLANNING'
  | 'URLEAVE'
  | 'REPRIORITIZATION'
  | 'SCOPE_CHANGE'
  | 'DELAY'
  | 'STAFFING'
  | 'CAPACITY_ADJUSTMENT'
  | 'OTHER';

export interface ForecastEntry {
  id: string;
  orgId: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  month: string; // YYYY-MM
  plannedHours: number;
  appliedBillingRate: number;
  appliedCostRate: number;
  plannedRevenue: number;
  plannedCost: number;
  plannedMargin: number;
  version: number;
  changeReason?: ForecastChangeReason | string;
  changeNote?: string;
  createdBy: string;
  createdAt: string;
}

export interface ForecastAuditHistoryItem {
  id: string;
  forecastId: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  month: string;
  plannedHours: number;
  previousPlannedHours?: number;
  version: number;
  changeReason?: string;
  changeNote?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface ForecastComparisonItem {
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  month: string;
  billingModel: BillingModel;
  plannedHours: number;
  plannedRevenue: number;
  plannedCost: number;
  actualHoursSoFar: number;
  actualRevenueSoFar: number;
  actualCostSoFar: number;
  extrapolatedHoursMonthEnd: number; // based on passed workdays
  extrapolatedRevenueMonthEnd: number;
  extrapolatedCostMonthEnd: number;
  hoursDeviationPercent: number; // (actual/extrapolated - planned) / planned * 100
  revenueDeviationPercent: number;
  costDeviationPercent: number;
  isHoursThresholdExceeded: boolean;
  isRevenueThresholdExceeded: boolean;
  isCostThresholdExceeded: boolean;
  isThresholdExceeded: boolean; // default > 20% in hours, revenue or costs
  lastNotifiedAt?: string;
  changeReason?: string;
  changeNote?: string;
  version?: number;
}

export interface ProjectTeamForecastAllocation {
  userId: string;
  userName: string;
  jobRoleName?: string;
  hourlyBillingRate: number;
  hourlyCostRate: number;
  plannedHours: number;
  actualHours: number;
  extrapolatedHours: number;
  plannedRevenue: number;
  plannedCost: number;
  plannedMargin: number;
  actualRevenue: number;
  actualCost: number;
  actualMargin: number;
  hoursDeviationPercent: number;
  revenueDeviationPercent: number;
  costDeviationPercent: number;
  isExceeded: boolean;
}

export interface ProjectMonthlyForecastBreakdown {
  month: string; // YYYY-MM
  monthLabel: string; // e.g. 'Aug 2026'
  plannedHours: number;
  actualHours: number;
  extrapolatedHours: number;
  plannedRevenue: number;
  actualRevenue: number;
  plannedCost: number;
  actualCost: number;
  plannedMargin: number;
}

export interface MilestoneProgressSummary {
  id: string;
  title: string;
  amount: number;
  targetDate: string;
  period?: string;
  status: 'PLANNED' | 'INVOICED' | 'PAID';
  percentageOfTotal: number;
  isPaidOrInvoiced: boolean;
}

export interface ProjectForecastSummary {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientId: string;
  clientName: string;
  billingModel: BillingModel;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  budgetHours?: number;
  totalFixedPrice?: number;
  
  // Period definition
  periodType: 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'CUSTOM';
  periodKey: string; // e.g. '2026-08', '2026-Q3', '2026'
  periodLabel: string; // e.g. 'August 2026', 'Q3 2026 (Jul - Sep)', 'Gesamtjahr 2026'
  startDate: string;
  endDate: string;
  totalWorkdaysInPeriod: number;
  passedWorkdaysInPeriod: number;
  
  // Hours (Aggregated)
  plannedHours: number;
  actualHoursSoFar: number;
  extrapolatedHoursEnd: number;
  remainingBudgetHours?: number;
  hoursBurnPercent?: number; // actual vs budget
  
  // Financials (€)
  plannedRevenue: number;
  plannedCost: number;
  plannedMargin: number;
  plannedMarginPercent: number;
  
  actualRevenueSoFar: number;
  actualCostSoFar: number;
  actualMarginSoFar: number;
  actualMarginPercentSoFar: number;
  
  extrapolatedRevenueEnd: number;
  extrapolatedCostEnd: number;
  extrapolatedMarginEnd: number;
  extrapolatedMarginPercentEnd: number;
  
  // Deviations & Alerts (Hours, Revenue, Cost)
  hoursDeviationPercent: number;
  revenueDeviationPercent: number;
  costDeviationPercent: number;
  isHoursThresholdExceeded: boolean;
  isRevenueThresholdExceeded: boolean;
  isCostThresholdExceeded: boolean;
  isThresholdExceeded: boolean; // >20% on any metric
  alertSeverity: 'OK' | 'WARNING' | 'CRITICAL';
  
  // Fixed-Price & Milestone Specifics (Fortschritt & Restbudget)
  remainingFixedPriceBudget?: number; // totalFixedPrice - actualCostSoFar (oder verrechnete Kosten)
  completionPercentagePoC?: number; // Percentage of Completion % (Meilensteine & Stunden)
  milestonesSummary?: MilestoneProgressSummary[];
  invoicedMilestonesTotal?: number;
  paidMilestonesTotal?: number;
  plannedMilestonesTotal?: number;

  // Detailed Drill-Downs
  teamBreakdown: ProjectTeamForecastAllocation[];
  monthlyBreakdown: ProjectMonthlyForecastBreakdown[];
}

export interface EmployeeProjectForecastAllocation {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientName: string;
  billingModel: BillingModel;
  plannedHours: number;
  actualHours: number;
  extrapolatedHours: number;
  plannedRevenue: number;
  plannedCost: number;
  plannedMargin: number;
  actualRevenue: number;
  actualCost: number;
  actualMargin: number;
}

export interface EmployeeCapacitySummaryItem {
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  employmentType: EmploymentType;
  companyName?: string;
  jobRoleName?: string;
  weeklyTargetHours: number;
  dailyTargetHours: number;
  stateLocation?: string;
  
  // Workdays & Target Capacity
  targetWorkdaysInPeriod: number;
  targetCapacityHours: number; // targetWorkdays × dailyTargetHours
  
  // Project Allocations (Sum across all parallel projects)
  totalPlannedHours: number;
  totalActualHours: number;
  totalExtrapolatedHours: number;
  
  // Capacity Utilization & Overbooking (Überbuchung)
  capacityUtilizationPlannedPercent: number; // (totalPlannedHours / targetCapacityHours) * 100
  capacityUtilizationActualPercent: number;
  capacityUtilizationExtrapolatedPercent: number;
  isOverbooked: boolean; // plannedHours > targetCapacityHours
  overbookingHours: number; // Math.max(0, totalPlannedHours - targetCapacityHours)
  freeCapacityHours: number; // Math.max(0, targetCapacityHours - totalPlannedHours)
  
  // Financial Totals
  totalPlannedRevenue: number;
  totalPlannedCost: number;
  totalPlannedMargin: number;
  totalActualRevenue: number;
  totalActualCost: number;
  totalActualMargin: number;
  
  // Parallel Projects List
  projects: EmployeeProjectForecastAllocation[];
}

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  key: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastUsedAt?: string;
  permissions: string[];
}

export interface ClockifyImportRow {
  Project?: string;
  Client?: string;
  User?: string;
  Email?: string;
  Task?: string;
  Description?: string;
  'Start Date'?: string;
  'Start Time'?: string;
  'End Date'?: string;
  'End Time'?: string;
  'Duration (h)'?: string;
  'Duration (decimal)'?: string;
  Billable?: string;
  'Billable Rate (EUR)'?: string;
  'Amount (EUR)'?: string;
  [key: string]: any;
}

export interface ClockifyImportReport {
  totalRows: number;
  importedEntries: number;
  skippedDuplicates: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  createdClients: string[];
  createdProjects: string[];
  createdTasks: string[];
  createdUsers: string[];
  timestamp: string;
  /** Neu: ID des Import-Batches (für Historie / Rückgängig machen) */
  batchId?: string;
  /** Neu: Status je Zeile (neu / Duplikat / Fehler / Warnung) */
  rowResults?: ImportRowResult[];
}

// =====================================================================
// Allgemeiner Datenimport (Konzept docs/KONZEPT_DATENIMPORT.md, Phase 1)
// =====================================================================

export type ImportTarget = 'TIME_ENTRY' | 'WORKING_TIME' | 'ABSENCE' | 'MASTER_DATA';

/** Kanonisches Zwischenformat: jede Quelle wird zuerst hierhin übersetzt. */
export interface ImportRecord {
  rowNumber: number;
  target: ImportTarget;
  externalId?: string;
  userRef: string;
  userEmail?: string;
  userGroup?: string;
  clientRef?: string;
  projectRef?: string;
  taskRef?: string;
  date: string; // YYYY-MM-DD (bei Stammdaten leer)
  /** Letzter Tag eines Abwesenheitszeitraums (inklusive), z. B. aus HR-Systemen */
  dateTo?: string;
  halfDay?: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number;
  breakMinutes?: number;
  description?: string;
  isBillable?: boolean;
  dayType?: DayType;
  hourlyBillingRate?: number;
  hourlyCostRate?: number;
  raw: Record<string, unknown>;
}

export type ImportRowStatus = 'NEW' | 'DUPLICATE' | 'ERROR' | 'WARNING' | 'SKIPPED';

export interface ImportRowResult {
  rowNumber: number;
  status: ImportRowStatus;
  messages: string[];
  record?: ImportRecord;
  fingerprint?: string;
}

export interface ImportDryRunResult {
  totalRows: number;
  counts: Record<ImportRowStatus, number>;
  totalMinutes: number;
  rows: ImportRowResult[];
  /** Stammdaten, die beim Ausführen neu angelegt würden */
  wouldCreate: { clients: string[]; projects: string[]; tasks: string[]; users: string[] };
  /** Gleiche Datei (SHA-256) wurde bereits importiert und nicht rückgängig gemacht */
  fileAlreadyImported?: { batchId: string; createdAt: string; fileName?: string };
}

/** Zuordnung je Quellwert (Kleinbuchstaben): ID eines vorhandenen Datensatzes, '__create__' (neu anlegen) oder '__skip__' (Zeilen überspringen) */
export interface ImportMappings {
  users?: Record<string, string>;
  projects?: Record<string, string>;
  clients?: Record<string, string>;
}

export type ImportAliasKind = 'user' | 'project' | 'client';

export interface ImportAlias {
  kind: ImportAliasKind;
  /** Quellwert in Kleinbuchstaben (Name, E-Mail, Projektname) */
  ref: string;
  targetId: string;
  createdAt: string;
  createdBy: string;
}

export interface MasterDataRef {
  ref: string;
  label: string;
  rowCount: number;
  matchedId?: string;
  matchType: 'exact' | 'alias' | 'none';
}

export interface MasterDataAnalysis {
  users: MasterDataRef[];
  projects: MasterDataRef[];
  clients: MasterDataRef[];
  canCreateUsers: boolean;
}

/** Mandantenspezifisch gespeichertes Import-Schema (Tabelle import_schemas) */
export interface StoredImportSchema {
  id: string;
  orgId: string;
  name: string;
  source: string;
  version: number;
  headerFingerprint?: string;
  schema: any;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  previousVersions?: Array<{ version: number; schema: any; updatedAt: string; updatedBy: string }>;
}

export interface ImportBatch {
  id: string;
  orgId: string;
  source: string; // z. B. 'clockify-csv', 'clockify-pdf'
  schemaId?: string;
  fileName?: string;
  target: ImportTarget;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  /** Anzahl angelegter Projektzeiten / Arbeitszeit- bzw. Abwesenheitseinträge.
   *  Die Einträge selbst tragen `importBatchId` (keine ID-Listen im Batch, damit die Organisation schlank bleibt). */
  timeEntryCount: number;
  workingTimeCount: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  /** Beim Stammdaten-Import angelegte Mitarbeitende */
  createdUserCount?: number;
  /** SHA-256 der importierten Datei */
  fileChecksum?: string;
  revertedAt?: string;
  revertedBy?: string;
  revertedByName?: string;
}

/** Batch inkl. berechneter Rückgängig-Information für die Import-Historie */
export interface ImportBatchView extends ImportBatch {
  /** Frühestes und spätestes Buchungsdatum der noch vorhandenen Einträge */
  dateFrom?: string;
  dateTo?: string;
  canUndo: boolean;
  undoBlockedReason?: 'ALREADY_REVERTED' | 'EXPIRED' | 'PERIOD_LOCKED' | 'NOT_SUPPORTED';
  undoDeadline: string;
}

