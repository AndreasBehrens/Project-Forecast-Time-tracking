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
  stateLocation?: string; // e.g. 'DE-BE' for Berlin
  locationCity?: string; // e.g. 'Berlin'
  logoColor?: string;
  createdAt: string;
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
  jobRoleId?: string;
  individualBillingRate?: number;
  individualCostRate?: number; // Only visible to ADMIN
  weeklyTargetHours: number;
  dailyTargetHours: number;
  workDays: number[]; // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  holidayCalendar: string;
  language: Language;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  invitationToken?: string;
  invitationExpiresAt?: string;
  memberships?: UserOrganizationMembership[];
  createdAt: string;
}

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
  projectManagerId?: string;
  projectManagerName?: string;
  managerUserIds?: string[];
  billingModel: BillingModel;
  totalFixedPrice?: number;
  budgetHours?: number;
  status: 'ACTIVE' | 'ARCHIVED';
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
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  isBillableDefault: boolean;
  budgetHours?: number;
  status: 'ACTIVE' | 'ARCHIVED';
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
  createdAt: string;
  updatedAt: string;
}

export interface WorkingTimeEntry {
  id: string;
  orgId: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
  totalGrossMinutes: number;
  totalNetMinutes: number;
  totalNetHoursDecimal: number;
  note?: string;
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
  entityType: 'TIME_ENTRY' | 'WORKING_TIME' | 'FORECAST' | 'PROJECT' | 'USER' | 'RATE' | 'ORGANIZATION' | 'CLIENT' | 'TASK';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CORRECT_AFTER_APPROVAL';
  userId: string;
  userName: string;
  timestamp: string;
  changes: AuditLogChange[];
  reason?: string;
}

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
  createdBy: string;
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
  isThresholdExceeded: boolean; // default > 20%
  lastNotifiedAt?: string;
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

export interface ProjectForecastSummary {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientId: string;
  clientName: string;
  billingModel: BillingModel;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
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
  
  // Deviations & Alerts
  hoursDeviationPercent: number;
  revenueDeviationPercent: number;
  isThresholdExceeded: boolean; // >20%
  alertSeverity: 'OK' | 'WARNING' | 'CRITICAL';
  
  // Detailed Drill-Downs
  teamBreakdown: ProjectTeamForecastAllocation[];
  monthlyBreakdown: ProjectMonthlyForecastBreakdown[];
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
}
