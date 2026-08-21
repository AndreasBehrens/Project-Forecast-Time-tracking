import { z } from 'zod';

export const UserRoleSchema = z.enum(['SUPERADMIN', 'ADMIN', 'PROJECT_MANAGER', 'EMPLOYEE']);
export const EmploymentTypeSchema = z.enum(['INTERNAL', 'EXTERNAL']);
export const BillingModelSchema = z.enum(['TIME_AND_MATERIAL', 'FIXED_PRICE']);
export const ApprovalStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']);
export const ProjectTypeSchema = z.enum(['CUSTOMER_PROJECT', 'INTERNAL_PROJECT']);

// Time Entry Schema
export const CreateTimeEntrySchema = z.object({
  projectId: z.string().min(1, 'Projekt ist erforderlich'),
  taskId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD vorliegen'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Startzeit muss im Format HH:MM sein').optional().or(z.literal('')),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Endzeit muss im Format HH:MM sein').optional().or(z.literal('')),
  durationMinutes: z.number().int().min(1, 'Mindestens 1 Minute').max(1440, 'Maximal 24 Stunden'),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  description: z.string().max(1000).default(''),
  isBillable: z.boolean().default(true),
  isFavorite: z.boolean().optional()
});

export const UpdateTimeEntrySchema = CreateTimeEntrySchema.partial().extend({
  reason: z.string().max(500).optional(),
  approvalStatus: ApprovalStatusSchema.optional()
});

// Working Time Schema (ArbZG Anwesenheit)
export const CreateWorkingTimeSchema = z.object({
  userId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD vorliegen'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Startzeit muss im Format HH:MM sein'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Endzeit muss im Format HH:MM sein'),
  breakMinutes: z.number().int().min(0).max(480).default(30),
  note: z.string().max(500).optional()
});

// Forecast Schema
export const CreateForecastSchema = z.object({
  projectId: z.string().min(1, 'Projekt ist erforderlich'),
  userId: z.string().min(1, 'Mitarbeiter ist erforderlich'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Monat muss im Format YYYY-MM sein'),
  plannedHours: z.number().min(0, 'Geplante Stunden können nicht negativ sein').max(720, 'Maximal 720 Stunden pro Monat'),
  changeReason: z.string().max(100).optional(),
  changeNote: z.string().max(500).optional()
});

// Organization Schema
export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  code: z.string().max(20).optional(),
  defaultHourlyBillingRate: z.number().positive('Stundensatz muss positiv sein'),
  defaultHourlyCostRate: z.number().nonnegative('Kostensatz darf nicht negativ sein'),
  defaultCurrency: z.string().default('EUR'),
  stateLocation: z.string().default('DE-BE'),
  locationCity: z.string().default('Berlin'),
  allowMobileWorkplaces: z.boolean().default(true),
  logoColor: z.string().default('emerald')
});

// Period Lock (GoBD Revisionssicherer Monatsabschluss)
export const PeriodLockSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-\d{2}$/, 'Periode muss im Format YYYY-MM sein'),
  orgId: z.string().min(1),
  status: z.enum(['LOCKED', 'OPEN', 'ARCHIVED']),
  reason: z.string().max(500).default('Regulärer Monatsabschluss'),
  lockedByUserId: z.string().min(1),
  lockedByUserName: z.string().min(1),
  digitalSignatureHash: z.string().optional(),
  entriesCount: z.number().int().nonnegative().optional(),
  totalHours: z.number().nonnegative().optional(),
  totalBillingAmount: z.number().nonnegative().optional(),
  complianceStatus: z.enum(['COMPLIANT', 'WARNING', 'NON_COMPLIANT']).default('COMPLIANT')
});
