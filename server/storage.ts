import {
  Organization,
  User,
  UserRole,
  UserOrganizationMembership,
  EmployeeJobRole,
  Client,
  Project,
  Task,
  TimeEntry,
  WorkingTimeEntry,
  AuditLogEntry,
  ForecastEntry,
  ApiKey,
  ClockifyImportReport,
  ForecastComparisonItem,
  ProjectForecastSummary
} from '../src/types.js';
import { getGermanHolidays, getWorkingDaysInRange, GERMAN_STATES, HolidayInfo } from './holidays.js';

export class StorageService {
  private organizations: Organization[] = [];
  private activeOrgId: string = 'org-insight-arcs-01';
  private users: User[] = [];
  private jobRoles: EmployeeJobRole[] = [];
  private clients: Client[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private timeEntries: TimeEntry[] = [];
  private workingTimeEntries: WorkingTimeEntry[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private forecasts: ForecastEntry[] = [];
  private apiKeys: ApiKey[] = [];
  private thresholdPercent: number = 20;

  constructor() {
    this.organizations = [
      {
        id: 'org-insight-arcs-01',
        name: 'Insight Arcs GmbH (Hauptmandant)',
        code: 'IA-BERLIN',
        defaultHourlyBillingRate: 130,
        defaultHourlyCostRate: 65,
        defaultCurrency: 'EUR',
        stateLocation: 'DE-BE', // Berlin (Hauptsitz)
        locationCity: 'Berlin',
        logoColor: 'emerald',
        createdAt: '2025-01-01T08:00:00.000Z'
      },
      {
        id: 'org-novatech-solutions-02',
        name: 'NovaTech Solutions GmbH',
        code: 'NOV-MUC',
        defaultHourlyBillingRate: 150,
        defaultHourlyCostRate: 75,
        defaultCurrency: 'EUR',
        stateLocation: 'DE-BY', // Bayern (München)
        locationCity: 'München',
        logoColor: 'blue',
        createdAt: '2025-02-01T08:00:00.000Z'
      },
      {
        id: 'org-helios-consulting-03',
        name: 'Helios Digital Advisory AG',
        code: 'HEL-HAM',
        defaultHourlyBillingRate: 180,
        defaultHourlyCostRate: 90,
        defaultCurrency: 'EUR',
        stateLocation: 'DE-HH', // Hamburg
        locationCity: 'Hamburg',
        logoColor: 'amber',
        createdAt: '2025-03-01T08:00:00.000Z'
      }
    ];

    this.seedInitialData();
  }

  private get organization(): Organization {
    return this.organizations.find(o => o.id === this.activeOrgId) || this.organizations[0];
  }

  private seedInitialData() {
    const org1 = this.organizations[0].id;
    const org2 = this.organizations[1].id;
    const org3 = this.organizations[2].id;

    // 1. Fachliche Mitarbeiterrollen für Org 1
    this.jobRoles = [
      { id: 'role-jr', orgId: org1, name: 'Junior Consultant / Developer', standardBillingRate: 95, standardCostRate: 45, status: 'ACTIVE' },
      { id: 'role-mid', orgId: org1, name: 'Consultant / Engineer', standardBillingRate: 130, standardCostRate: 65, status: 'ACTIVE' },
      { id: 'role-sr', orgId: org1, name: 'Senior Consultant / Specialist', standardBillingRate: 165, standardCostRate: 85, status: 'ACTIVE' },
      { id: 'role-lead', orgId: org1, name: 'Lead Architect / Principal', standardBillingRate: 200, standardCostRate: 105, status: 'ACTIVE' },
      
      // Org 2 Job Roles
      { id: 'role-nova-dev', orgId: org2, name: 'Senior Cloud Engineer', standardBillingRate: 155, standardCostRate: 75, status: 'ACTIVE' },
      { id: 'role-nova-pm', orgId: org2, name: 'Agile Delivery Lead', standardBillingRate: 170, standardCostRate: 85, status: 'ACTIVE' },

      // Org 3 Job Roles
      { id: 'role-hel-adv', orgId: org3, name: 'Strategy Advisor', standardBillingRate: 210, standardCostRate: 100, status: 'ACTIVE' },
    ];

    // 2. 20 Users
    const team = [
      { id: 'u-1', name: 'Dr. Andreas Behrens', email: 'andreas.behrens@insightarcs.de', role: 'SUPERADMIN', jobRoleId: 'role-lead', targetH: 40, indBilling: 220, indCost: 110, empType: 'INTERNAL' },
      { id: 'u-2', name: 'Laura Klein', email: 'laura.klein@insightarcs.de', role: 'PROJECT_MANAGER', jobRoleId: 'role-sr', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-3', name: 'Markus Weber', email: 'markus.weber@insightarcs.de', role: 'PROJECT_MANAGER', jobRoleId: 'role-lead', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-4', name: 'Sophie Becker', email: 'sophie.becker@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-sr', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-5', name: 'Tobias Fischer', email: 'tobias.fischer@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-6', name: 'Julia Hoffmann', email: 'julia.hoffmann@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-sr', targetH: 32, empType: 'INTERNAL' }, // part time
      { id: 'u-7', name: 'Dennis Wagner', email: 'dennis.wagner@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-8', name: 'Elena Meyer', email: 'elena.meyer@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-9', name: 'Jan Richter', email: 'jan.richter@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-10', name: 'Sarah Koch', email: 'sarah.koch@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-11', name: 'Felix Bauer', email: 'felix.bauer@freelance-tech.de', role: 'EMPLOYEE', jobRoleId: 'role-sr', targetH: 40, empType: 'EXTERNAL', company: 'Bauer Cloud Consulting' },
      { id: 'u-12', name: 'Miriam Wolf', email: 'miriam.wolf@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 30, empType: 'INTERNAL' },
      { id: 'u-13', name: 'Patrick Schwarz', email: 'patrick.schwarz@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-jr', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-14', name: 'Hanna Zimmermann', email: 'hanna.zimmermann@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-jr', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-15', name: 'Christian Braun', email: 'c.braun@braun-security.com', role: 'EMPLOYEE', jobRoleId: 'role-sr', targetH: 40, empType: 'EXTERNAL', company: 'Braun IT-Security Services' },
      { id: 'u-16', name: 'Lisa Krüger', email: 'lisa.krueger@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-17', name: 'David Schmitt', email: 'd.schmitt@devcontractors.eu', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'EXTERNAL', company: 'DevContractors EU' },
      { id: 'u-18', name: 'Anja Frank', email: 'anja.frank@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 20, empType: 'INTERNAL' },
      { id: 'u-19', name: 'Stefan Lange', email: 'stefan.lange@insightarcs.de', role: 'EMPLOYEE', jobRoleId: 'role-mid', targetH: 40, empType: 'INTERNAL' },
      { id: 'u-20', name: 'Vanessa Hartmann', email: 'v.hartmann@external-expert.de', role: 'EMPLOYEE', jobRoleId: 'role-jr', targetH: 40, empType: 'EXTERNAL', company: 'Hartmann Consulting & Support' },
    ];

    this.users = team.map((t, idx) => {
      // Dr. Andreas Behrens, Laura Klein, Markus Weber, Tobias Fischer sind mehreren Mandanten zugeordnet
      let memberships: UserOrganizationMembership[] = [
        { orgId: org1, orgName: 'Insight Arcs GmbH (Hauptmandant)', role: t.role as any, employmentType: (t as any).empType || 'INTERNAL', jobRoleId: t.jobRoleId, individualBillingRate: (t as any).indBilling, individualCostRate: (t as any).indCost, isDefault: true }
      ];

      if (t.id === 'u-1') {
        memberships.push(
          { orgId: org2, orgName: 'NovaTech Solutions GmbH', role: 'SUPERADMIN', employmentType: 'INTERNAL', individualBillingRate: 240, individualCostRate: 120 },
          { orgId: org3, orgName: 'Helios Digital Advisory AG', role: 'SUPERADMIN', employmentType: 'INTERNAL', individualBillingRate: 260, individualCostRate: 130 }
        );
      } else if (t.id === 'u-2' || t.id === 'u-3') {
        memberships.push(
          { orgId: org2, orgName: 'NovaTech Solutions GmbH', role: 'PROJECT_MANAGER', employmentType: 'INTERNAL', jobRoleId: 'role-nova-pm', individualBillingRate: 180, individualCostRate: 90 }
        );
      } else if (t.id === 'u-5' || t.id === 'u-8') {
        memberships.push(
          { orgId: org2, orgName: 'NovaTech Solutions GmbH', role: 'EMPLOYEE', employmentType: 'INTERNAL', jobRoleId: 'role-nova-dev', individualBillingRate: 160, individualCostRate: 80 },
          { orgId: org3, orgName: 'Helios Digital Advisory AG', role: 'EMPLOYEE', employmentType: 'EXTERNAL', individualBillingRate: 190, individualCostRate: 95 }
        );
      }

      return {
        id: t.id,
        orgId: org1,
        name: t.name,
        email: t.email,
        role: t.role as any,
        employmentType: ((t as any).empType || 'INTERNAL') as any,
        companyName: (t as any).company,
        jobRoleId: t.jobRoleId,
        individualBillingRate: (t as any).indBilling,
        individualCostRate: (t as any).indCost,
        weeklyTargetHours: t.targetH,
        dailyTargetHours: t.targetH / 5,
        workDays: [1, 2, 3, 4, 5],
        holidayCalendar: 'DE-BE',
        language: idx % 3 === 2 ? 'en' : 'de',
        status: 'ACTIVE',
        memberships,
        createdAt: '2025-01-01T09:00:00.000Z'
      };
    });

    const orgId = org1;

    // 3. Clients
    this.clients = [
      // Org 1 (Insight Arcs) Clients
      { id: 'c-1', orgId: org1, name: 'MedTech Solutions AG', clientNumber: 'KND-1001', contactPerson: 'Dr. Michael Hansen', email: 'hansen@medtech-sol.de', status: 'ACTIVE', createdAt: '2025-01-10T10:00:00Z' },
      { id: 'c-2', orgId: org1, name: 'FinSecure Bank SE', clientNumber: 'KND-1002', contactPerson: 'Claudia von Berg', email: 'c.berg@finsecure.de', status: 'ACTIVE', createdAt: '2025-01-12T11:00:00Z' },
      { id: 'c-3', orgId: org1, name: 'LogiChain Mobility GmbH', clientNumber: 'KND-1003', contactPerson: 'Ralf Richter', email: 'r.richter@logichain.com', status: 'ACTIVE', createdAt: '2025-01-15T09:30:00Z' },
      { id: 'c-4', orgId: org1, name: 'GreenEnergy Systems AG', clientNumber: 'KND-1004', contactPerson: 'Sarah Vogt', email: 'vogt@greenenergy.de', status: 'ACTIVE', createdAt: '2025-02-01T08:00:00Z' },
      { id: 'c-5', orgId: org1, name: 'Insight Arcs (Intern)', clientNumber: 'INT-0001', contactPerson: 'Internal Operations', email: 'ops@insightarcs.de', status: 'ACTIVE', createdAt: '2025-01-01T08:00:00Z' },

      // Org 2 (NovaTech Solutions) Clients
      { id: 'c-nov-1', orgId: org2, name: 'Bavaria Automotive Group', clientNumber: 'NOV-KND-01', contactPerson: 'Maximilian Huber', email: 'm.huber@bavaria-auto.de', status: 'ACTIVE', createdAt: '2025-02-05T09:00:00Z' },
      { id: 'c-nov-2', orgId: org2, name: 'Munich Quantum Labs', clientNumber: 'NOV-KND-02', contactPerson: 'Prof. Dr. Clara Eder', email: 'eder@quantum-muc.de', status: 'ACTIVE', createdAt: '2025-02-10T10:00:00Z' },

      // Org 3 (Helios Digital Advisory) Clients
      { id: 'c-hel-1', orgId: org3, name: 'Hanseatic Port Logistics AG', clientNumber: 'HEL-KND-01', contactPerson: 'Thorsten Jensen', email: 'jensen@hanse-port.de', status: 'ACTIVE', createdAt: '2025-03-05T09:00:00Z' },
    ];

    // 4. Projects with Project Managers and Team Allocations
    this.projects = [
      {
        id: 'p-1',
        orgId: org1,
        clientId: 'c-1',
        clientName: 'MedTech Solutions AG',
        name: 'AI-Clinical-Workflow Assistant',
        projectNumber: 'PRJ-2025-01',
        projectManagerId: 'u-2',
        projectManagerName: 'Laura Klein',
        managerUserIds: ['u-2'],
        billingModel: 'TIME_AND_MATERIAL',
        budgetHours: 250,
        status: 'ACTIVE',
        requireApproval: true,
        requiredFields: { description: true, task: true, breaks: false },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-2', 'u-4', 'u-5', 'u-6'],
        memberRates: [
          { id: 'pmr-1', projectId: 'p-1', userId: 'u-1', hourlyBillingRate: 230, hourlyCostRate: 110 },
          { id: 'pmr-2', projectId: 'p-1', userId: 'u-2', hourlyBillingRate: 175, hourlyCostRate: 85 }
        ],
        createdAt: '2025-01-15T09:00:00Z'
      },
      {
        id: 'p-2',
        orgId: org1,
        clientId: 'c-2',
        clientName: 'FinSecure Bank SE',
        name: 'Banking Core Cloud Migration',
        projectNumber: 'PRJ-2025-02',
        projectManagerId: 'u-3',
        projectManagerName: 'Markus Weber',
        managerUserIds: ['u-3'],
        billingModel: 'FIXED_PRICE',
        totalFixedPrice: 85000,
        budgetHours: 500,
        status: 'ACTIVE',
        requireApproval: true,
        requiredFields: { description: true, task: true, breaks: true },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-3', 'u-7', 'u-8', 'u-9', 'u-10'],
        memberRates: [],
        fixedPriceAllocations: [
          { id: 'fpa-1', projectId: 'p-2', title: 'Phase 1: Architektur & PoC', amount: 25000, targetDate: '2025-03-31', status: 'PAID' },
          { id: 'fpa-2', projectId: 'p-2', title: 'Phase 2: Core Microservices', amount: 35000, targetDate: '2025-07-31', status: 'INVOICED' },
          { id: 'fpa-3', projectId: 'p-2', title: 'Phase 3: Rollout & Cutover', amount: 25000, targetDate: '2025-11-30', status: 'PLANNED' },
        ],
        createdAt: '2025-01-20T10:00:00Z'
      },
      {
        id: 'p-3',
        orgId: org1,
        clientId: 'c-3',
        clientName: 'LogiChain Mobility GmbH',
        name: 'Fleet Telematics Cloud Hub',
        projectNumber: 'PRJ-2025-03',
        projectManagerId: 'u-2',
        projectManagerName: 'Laura Klein',
        managerUserIds: ['u-2'],
        billingModel: 'TIME_AND_MATERIAL',
        budgetHours: 320,
        status: 'ACTIVE',
        requireApproval: false,
        requiredFields: { description: true, task: false, breaks: false },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-2', 'u-4', 'u-11', 'u-12', 'u-13'],
        memberRates: [],
        createdAt: '2025-02-01T14:00:00Z'
      },
      {
        id: 'p-4',
        orgId: org1,
        clientId: 'c-4',
        clientName: 'GreenEnergy Systems AG',
        name: 'Solar Yield Forecast Engine',
        projectNumber: 'PRJ-2025-04',
        projectManagerId: 'u-3',
        projectManagerName: 'Markus Weber',
        managerUserIds: ['u-3'],
        billingModel: 'TIME_AND_MATERIAL',
        budgetHours: 200,
        status: 'ACTIVE',
        requireApproval: true,
        requiredFields: { description: true, task: true, breaks: false },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-3', 'u-5', 'u-13', 'u-14', 'u-15'],
        memberRates: [],
        createdAt: '2025-03-01T08:00:00Z'
      },
      {
        id: 'p-5',
        orgId: org1,
        clientId: 'c-5',
        clientName: 'Insight Arcs (Intern)',
        name: 'Allgemeine Verwaltung & Weiterbildung',
        projectNumber: 'INT-ADM-01',
        projectManagerId: 'u-1',
        projectManagerName: 'Dr. Andreas Behrens',
        managerUserIds: ['u-1'],
        billingModel: 'TIME_AND_MATERIAL',
        status: 'ACTIVE',
        requireApproval: false,
        requiredFields: { description: false, task: false, breaks: false },
        restrictToAssignedMembers: false,
        assignedUserIds: [],
        memberRates: [],
        createdAt: '2025-01-01T08:00:00Z'
      },

      // Org 2 (NovaTech) Projects
      {
        id: 'p-nov-1',
        orgId: org2,
        clientId: 'c-nov-1',
        clientName: 'Bavaria Automotive Group',
        name: 'Autonomous Driving Sensor Data Ingestion',
        projectNumber: 'NOV-2025-01',
        projectManagerId: 'u-2',
        projectManagerName: 'Laura Klein',
        managerUserIds: ['u-2'],
        billingModel: 'TIME_AND_MATERIAL',
        budgetHours: 400,
        status: 'ACTIVE',
        requireApproval: true,
        requiredFields: { description: true, task: true, breaks: false },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-2', 'u-5'],
        memberRates: [
          { id: 'pmr-nov-1', projectId: 'p-nov-1', userId: 'u-1', hourlyBillingRate: 240, hourlyCostRate: 120 }
        ],
        createdAt: '2025-02-15T08:00:00Z'
      },

      // Org 3 (Helios) Projects
      {
        id: 'p-hel-1',
        orgId: org3,
        clientId: 'c-hel-1',
        clientName: 'Hanseatic Port Logistics AG',
        name: 'Digital Port Twin Strategy & Roadmap',
        projectNumber: 'HEL-2025-01',
        projectManagerId: 'u-3',
        projectManagerName: 'Markus Weber',
        managerUserIds: ['u-3'],
        billingModel: 'FIXED_PRICE',
        totalFixedPrice: 120000,
        budgetHours: 600,
        status: 'ACTIVE',
        requireApproval: true,
        requiredFields: { description: true, task: true, breaks: false },
        restrictToAssignedMembers: true,
        assignedUserIds: ['u-1', 'u-3', 'u-8'],
        memberRates: [],
        createdAt: '2025-03-10T08:00:00Z'
      }
    ];

    // 5. Tasks
    this.tasks = [
      { id: 't-1', projectId: 'p-1', name: 'Architektur & Schnittstellen-Design', isBillableDefault: true, budgetHours: 60, status: 'ACTIVE' },
      { id: 't-2', projectId: 'p-1', name: 'LLM Prompt-Engineering & Test', isBillableDefault: true, budgetHours: 100, status: 'ACTIVE' },
      { id: 't-3', projectId: 'p-1', name: 'Backend Integration & Security Audit', isBillableDefault: true, budgetHours: 90, status: 'ACTIVE' },
      { id: 't-4', projectId: 'p-2', name: 'Legacy Code Analyse', isBillableDefault: true, budgetHours: 80, status: 'ACTIVE' },
      { id: 't-5', projectId: 'p-2', name: 'Cloud Native Refactoring', isBillableDefault: true, budgetHours: 280, status: 'ACTIVE' },
      { id: 't-6', projectId: 'p-2', name: 'E2E Testing & Performance-Validierung', isBillableDefault: true, budgetHours: 140, status: 'ACTIVE' },
      { id: 't-7', projectId: 'p-3', name: 'Kafka Data Streaming Pipeline', isBillableDefault: true, budgetHours: 160, status: 'ACTIVE' },
      { id: 't-8', projectId: 'p-3', name: 'Frontend Telematics Dashboard', isBillableDefault: true, budgetHours: 160, status: 'ACTIVE' },
      { id: 't-9', projectId: 'p-4', name: 'Wetterdaten-Konnektor & Ingestion', isBillableDefault: true, budgetHours: 70, status: 'ACTIVE' },
      { id: 't-10', projectId: 'p-4', name: 'ML-Modelltraining & Validierung', isBillableDefault: true, budgetHours: 130, status: 'ACTIVE' },
      { id: 't-11', projectId: 'p-5', name: 'Interne Teambesprechung & Standup', isBillableDefault: false, status: 'ACTIVE' },
      { id: 't-12', projectId: 'p-5', name: 'Zertifizierung & Schulung', isBillableDefault: false, status: 'ACTIVE' },

      // Org 2 Tasks
      { id: 't-nov-1', projectId: 'p-nov-1', name: 'Sensor Telemetrie Architektur', isBillableDefault: true, budgetHours: 80, status: 'ACTIVE' },
      { id: 't-nov-2', projectId: 'p-nov-1', name: 'Edge Gateway Protokolle', isBillableDefault: true, budgetHours: 120, status: 'ACTIVE' },

      // Org 3 Tasks
      { id: 't-hel-1', projectId: 'p-hel-1', name: 'Strategie-Workshop & Stakeholder-Interviews', isBillableDefault: true, budgetHours: 150, status: 'ACTIVE' },
    ];

    // 6. Time Entries (Sample 2025 and 2026 data)
    this.timeEntries = [
      {
        id: 'te-101',
        orgId,
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        clientId: 'c-1',
        clientName: 'MedTech Solutions AG',
        taskId: 't-1',
        taskName: 'Architektur & Schnittstellen-Design',
        date: '2026-08-11',
        startTime: '09:00',
        endTime: '12:30',
        durationMinutes: 210,
        durationHoursDecimal: 3.5,
        breakMinutes: 0,
        description: 'FHIR API Datenfluss und Verschlüsselungsarchitektur definiert',
        isBillable: true,
        hourlyBillingRate: 230,
        calculatedAmount: 805,
        hourlyCostRate: 110,
        calculatedCost: 385,
        currency: 'EUR',
        approvalStatus: 'APPROVED',
        approvedBy: 'u-1',
        approvedAt: '2026-08-11T17:00:00Z',
        isFavorite: true,
        createdAt: '2026-08-11T12:30:00Z',
        updatedAt: '2026-08-11T17:00:00Z'
      },
      {
        id: 'te-102',
        orgId,
        userId: 'u-2',
        userName: 'Laura Klein',
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        clientId: 'c-1',
        clientName: 'MedTech Solutions AG',
        taskId: 't-2',
        taskName: 'LLM Prompt-Engineering & Test',
        date: '2026-08-12',
        startTime: '08:30',
        endTime: '13:30',
        durationMinutes: 300,
        durationHoursDecimal: 5.0,
        breakMinutes: 30,
        description: 'Evaluation von medizinischen Klassifikations-Prompts und Grounding',
        isBillable: true,
        hourlyBillingRate: 175,
        calculatedAmount: 875,
        hourlyCostRate: 85,
        calculatedCost: 425,
        currency: 'EUR',
        approvalStatus: 'APPROVED',
        approvedBy: 'u-1',
        approvedAt: '2026-08-12T18:00:00Z',
        isFavorite: true,
        createdAt: '2026-08-12T13:30:00Z',
        updatedAt: '2026-08-12T18:00:00Z'
      },
      {
        id: 'te-103',
        orgId,
        userId: 'u-3',
        userName: 'Markus Weber',
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        clientId: 'c-2',
        clientName: 'FinSecure Bank SE',
        taskId: 't-5',
        taskName: 'Cloud Native Refactoring',
        date: '2026-08-13',
        startTime: '09:00',
        endTime: '17:00',
        durationMinutes: 450,
        durationHoursDecimal: 7.5,
        breakMinutes: 30,
        description: 'Account Ledger Service auf Kubernetes migriert und Lasttests aufgesetzt',
        isBillable: true,
        hourlyBillingRate: 200,
        calculatedAmount: 1500,
        hourlyCostRate: 105,
        calculatedCost: 787.5,
        currency: 'EUR',
        approvalStatus: 'SUBMITTED',
        isFavorite: false,
        createdAt: '2026-08-13T17:00:00Z',
        updatedAt: '2026-08-13T17:00:00Z'
      },
      {
        id: 'te-104',
        orgId,
        userId: 'u-5',
        userName: 'Tobias Fischer',
        projectId: 'p-3',
        projectName: 'Fleet Telematics Cloud Hub',
        clientId: 'c-3',
        clientName: 'LogiChain Mobility GmbH',
        taskId: 't-7',
        taskName: 'Kafka Data Streaming Pipeline',
        date: '2026-08-14',
        startTime: '08:00',
        endTime: '12:00',
        durationMinutes: 240,
        durationHoursDecimal: 4.0,
        breakMinutes: 0,
        description: 'GPS Ingestion Consumer Fehlerbehandlung und Dead Letter Queue',
        isBillable: true,
        hourlyBillingRate: 130,
        calculatedAmount: 520,
        hourlyCostRate: 65,
        calculatedCost: 260,
        currency: 'EUR',
        approvalStatus: 'DRAFT',
        isFavorite: true,
        createdAt: '2026-08-14T12:00:00Z',
        updatedAt: '2026-08-14T12:00:00Z'
      },
      {
        id: 'te-105',
        orgId,
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        projectId: 'p-5',
        projectName: 'Allgemeine Verwaltung & Weiterbildung',
        clientId: 'c-5',
        clientName: 'Insight Arcs (Intern)',
        taskId: 't-11',
        taskName: 'Interne Teambesprechung & Standup',
        date: '2026-08-14',
        startTime: '13:00',
        endTime: '14:30',
        durationMinutes: 90,
        durationHoursDecimal: 1.5,
        breakMinutes: 0,
        description: 'Wöchentliches All-Hands Meeting und Projektstatusberichte',
        isBillable: false,
        hourlyBillingRate: 0,
        calculatedAmount: 0,
        hourlyCostRate: 110,
        calculatedCost: 165,
        currency: 'EUR',
        approvalStatus: 'APPROVED',
        createdAt: '2026-08-14T14:30:00Z',
        updatedAt: '2026-08-14T14:30:00Z'
      }
    ];

    // 7. Working Time Entries (Allgemeine Tagesarbeitszeit)
    this.workingTimeEntries = [
      {
        id: 'wte-1',
        orgId,
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        date: '2026-08-11',
        startTime: '08:45',
        endTime: '17:30',
        breakMinutes: 45,
        totalGrossMinutes: 525,
        totalNetMinutes: 480,
        totalNetHoursDecimal: 8.0,
        note: 'Büro München',
        createdAt: '2026-08-11T17:30:00Z',
        updatedAt: '2026-08-11T17:30:00Z'
      },
      {
        id: 'wte-2',
        orgId,
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        date: '2026-08-12',
        startTime: '08:30',
        endTime: '17:30',
        breakMinutes: 60,
        totalGrossMinutes: 540,
        totalNetMinutes: 480,
        totalNetHoursDecimal: 8.0,
        note: 'Home Office',
        createdAt: '2026-08-12T17:30:00Z',
        updatedAt: '2026-08-12T17:30:00Z'
      },
      {
        id: 'wte-3',
        orgId,
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        date: '2026-08-14',
        startTime: '08:15',
        endTime: '16:45',
        breakMinutes: 30,
        totalGrossMinutes: 510,
        totalNetMinutes: 480,
        totalNetHoursDecimal: 8.0,
        note: 'Büro München',
        createdAt: '2026-08-14T16:45:00Z',
        updatedAt: '2026-08-14T16:45:00Z'
      },
      {
        id: 'wte-4',
        orgId,
        userId: 'u-2',
        userName: 'Laura Klein',
        date: '2026-08-12',
        startTime: '08:15',
        endTime: '17:00',
        breakMinutes: 45,
        totalGrossMinutes: 525,
        totalNetMinutes: 480,
        totalNetHoursDecimal: 8.0,
        createdAt: '2026-08-12T17:00:00Z',
        updatedAt: '2026-08-12T17:00:00Z'
      }
    ];

    // 8. Forecast Entries (Q3 and Q4 2026 for comprehensive monthly/quarterly aggregated forecasting)
    this.forecasts = [
      // Project 1: AI-Clinical-Workflow Assistant (T&M) - Jul, Aug, Sep (Q3) & Q4
      {
        id: 'fc-p1-jul-u1',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        month: '2026-07',
        plannedHours: 45,
        appliedBillingRate: 230,
        appliedCostRate: 110,
        plannedRevenue: 10350,
        plannedCost: 4950,
        plannedMargin: 5400,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-07-01T08:00:00Z'
      },
      {
        id: 'fc-p1-jul-u2',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-2',
        userName: 'Laura Klein',
        month: '2026-07',
        plannedHours: 55,
        appliedBillingRate: 175,
        appliedCostRate: 85,
        plannedRevenue: 9625,
        plannedCost: 4675,
        plannedMargin: 4950,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-07-01T08:00:00Z'
      },
      {
        id: 'fc-1',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        month: '2026-08',
        plannedHours: 40,
        appliedBillingRate: 230,
        appliedCostRate: 110,
        plannedRevenue: 9200,
        plannedCost: 4400,
        plannedMargin: 4800,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-2',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-2',
        userName: 'Laura Klein',
        month: '2026-08',
        plannedHours: 60,
        appliedBillingRate: 175,
        appliedCostRate: 85,
        plannedRevenue: 10500,
        plannedCost: 5100,
        plannedMargin: 5400,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p1-aug-u4',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-4',
        userName: 'Sophie Becker',
        month: '2026-08',
        plannedHours: 35,
        appliedBillingRate: 165,
        appliedCostRate: 85,
        plannedRevenue: 5775,
        plannedCost: 2975,
        plannedMargin: 2800,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p1-sep-u1',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        month: '2026-09',
        plannedHours: 40,
        appliedBillingRate: 230,
        appliedCostRate: 110,
        plannedRevenue: 9200,
        plannedCost: 4400,
        plannedMargin: 4800,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p1-sep-u2',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-2',
        userName: 'Laura Klein',
        month: '2026-09',
        plannedHours: 60,
        appliedBillingRate: 175,
        appliedCostRate: 85,
        plannedRevenue: 10500,
        plannedCost: 5100,
        plannedMargin: 5400,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p1-oct-u1',
        orgId,
        projectId: 'p-1',
        projectName: 'AI-Clinical-Workflow Assistant',
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        month: '2026-10',
        plannedHours: 45,
        appliedBillingRate: 230,
        appliedCostRate: 110,
        plannedRevenue: 10350,
        plannedCost: 4950,
        plannedMargin: 5400,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },

      // Project 2: Banking Core Cloud Migration (Festpreis 85.000 €) - Markus Weber & Team
      {
        id: 'fc-p2-jul-u3',
        orgId,
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        userId: 'u-3',
        userName: 'Markus Weber',
        month: '2026-07',
        plannedHours: 75,
        appliedBillingRate: 200,
        appliedCostRate: 105,
        plannedRevenue: 15000,
        plannedCost: 7875,
        plannedMargin: 7125,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-07-01T08:00:00Z'
      },
      {
        id: 'fc-3',
        orgId,
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        userId: 'u-3',
        userName: 'Markus Weber',
        month: '2026-08',
        plannedHours: 80,
        appliedBillingRate: 200,
        appliedCostRate: 105,
        plannedRevenue: 16000,
        plannedCost: 8400,
        plannedMargin: 7600,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p2-aug-u7',
        orgId,
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        userId: 'u-7',
        userName: 'Dennis Wagner',
        month: '2026-08',
        plannedHours: 60,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 7800,
        plannedCost: 3900,
        plannedMargin: 3900,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p2-sep-u3',
        orgId,
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        userId: 'u-3',
        userName: 'Markus Weber',
        month: '2026-09',
        plannedHours: 80,
        appliedBillingRate: 200,
        appliedCostRate: 105,
        plannedRevenue: 16000,
        plannedCost: 8400,
        plannedMargin: 7600,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p2-oct-u3',
        orgId,
        projectId: 'p-2',
        projectName: 'Banking Core Cloud Migration',
        userId: 'u-3',
        userName: 'Markus Weber',
        month: '2026-10',
        plannedHours: 70,
        appliedBillingRate: 200,
        appliedCostRate: 105,
        plannedRevenue: 14000,
        plannedCost: 7350,
        plannedMargin: 6650,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },

      // Project 3: Fleet Telematics Cloud Hub (T&M) - Tobias Fischer
      {
        id: 'fc-p3-jul-u5',
        orgId,
        projectId: 'p-3',
        projectName: 'Fleet Telematics Cloud Hub',
        userId: 'u-5',
        userName: 'Tobias Fischer',
        month: '2026-07',
        plannedHours: 45,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 5850,
        plannedCost: 2925,
        plannedMargin: 2925,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-07-01T08:00:00Z'
      },
      {
        id: 'fc-4',
        orgId,
        projectId: 'p-3',
        projectName: 'Fleet Telematics Cloud Hub',
        userId: 'u-5',
        userName: 'Tobias Fischer',
        month: '2026-08',
        plannedHours: 50,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 6500,
        plannedCost: 3250,
        plannedMargin: 3250,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p3-sep-u5',
        orgId,
        projectId: 'p-3',
        projectName: 'Fleet Telematics Cloud Hub',
        userId: 'u-5',
        userName: 'Tobias Fischer',
        month: '2026-09',
        plannedHours: 50,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 6500,
        plannedCost: 3250,
        plannedMargin: 3250,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p3-oct-u5',
        orgId,
        projectId: 'p-3',
        projectName: 'Fleet Telematics Cloud Hub',
        userId: 'u-5',
        userName: 'Tobias Fischer',
        month: '2026-10',
        plannedHours: 50,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 6500,
        plannedCost: 3250,
        plannedMargin: 3250,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },

      // Project 4: Solar Yield Forecast Engine (T&M) - Elena Meyer & Patrick Schwarz
      {
        id: 'fc-p4-aug-u8',
        orgId,
        projectId: 'p-4',
        projectName: 'Solar Yield Forecast Engine',
        userId: 'u-8',
        userName: 'Elena Meyer',
        month: '2026-08',
        plannedHours: 40,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 5200,
        plannedCost: 2600,
        plannedMargin: 2600,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p4-aug-u13',
        orgId,
        projectId: 'p-4',
        projectName: 'Solar Yield Forecast Engine',
        userId: 'u-13',
        userName: 'Patrick Schwarz',
        month: '2026-08',
        plannedHours: 30,
        appliedBillingRate: 95,
        appliedCostRate: 45,
        plannedRevenue: 2850,
        plannedCost: 1350,
        plannedMargin: 1500,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p4-sep-u8',
        orgId,
        projectId: 'p-4',
        projectName: 'Solar Yield Forecast Engine',
        userId: 'u-8',
        userName: 'Elena Meyer',
        month: '2026-09',
        plannedHours: 45,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 5850,
        plannedCost: 2925,
        plannedMargin: 2925,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      },
      {
        id: 'fc-p4-oct-u8',
        orgId,
        projectId: 'p-4',
        projectName: 'Solar Yield Forecast Engine',
        userId: 'u-8',
        userName: 'Elena Meyer',
        month: '2026-10',
        plannedHours: 40,
        appliedBillingRate: 130,
        appliedCostRate: 65,
        plannedRevenue: 5200,
        plannedCost: 2600,
        plannedMargin: 2600,
        version: 1,
        createdBy: 'u-1',
        createdAt: '2026-08-01T08:00:00Z'
      }
    ];

    // 9. API Keys
    this.apiKeys = [
      {
        id: 'apk-1',
        orgId,
        name: 'Power Automate - Excel Sync',
        key: 'ia_live_9b83f4a01c8942b0a1d48293e8749102',
        status: 'ACTIVE',
        createdAt: '2025-02-01T10:00:00Z',
        lastUsedAt: '2026-08-14T08:00:00Z',
        permissions: ['read:time-entries', 'read:working-time', 'read:forecasts']
      }
    ];

    // 10. Audit Logs
    this.auditLogs = [
      {
        id: 'aud-1',
        orgId,
        entityType: 'TIME_ENTRY',
        entityId: 'te-101',
        action: 'APPROVE',
        userId: 'u-1',
        userName: 'Dr. Andreas Behrens',
        timestamp: '2026-08-11T17:00:00Z',
        changes: [{ field: 'approvalStatus', oldValue: 'SUBMITTED', newValue: 'APPROVED' }],
        reason: 'Monatsfreigabe'
      }
    ];
  }

  // --- Rate Hierarchy Resolver (Section 9, 24, 25) ---
  public resolveRates(userId: string, projectId?: string, targetDate?: string): {
    billingRate: number;
    costRate: number;
    billingSource: 'PROJECT_MEMBER' | 'USER_INDIVIDUAL' | 'JOB_ROLE' | 'ORG_DEFAULT';
    costSource: 'PROJECT_MEMBER' | 'USER_INDIVIDUAL' | 'JOB_ROLE' | 'ORG_DEFAULT';
    jobRoleName?: string;
  } {
    const user = this.users.find(u => u.id === userId);
    const project = projectId ? this.projects.find(p => p.id === projectId) : undefined;
    const jobRole = user?.jobRoleId ? this.jobRoles.find(r => r.id === user.jobRoleId) : undefined;

    let billingRate = this.organization.defaultHourlyBillingRate;
    let billingSource: any = 'ORG_DEFAULT';

    let costRate = this.organization.defaultHourlyCostRate;
    let costSource: any = 'ORG_DEFAULT';

    // 1. Check Job Role first as base
    if (jobRole) {
      if (jobRole.standardBillingRate > 0) {
        billingRate = jobRole.standardBillingRate;
        billingSource = 'JOB_ROLE';
      }
      if (jobRole.standardCostRate > 0) {
        costRate = jobRole.standardCostRate;
        costSource = 'JOB_ROLE';
      }
    }

    // 2. Check User Individual override
    if (user?.individualBillingRate !== undefined && user.individualBillingRate > 0) {
      billingRate = user.individualBillingRate;
      billingSource = 'USER_INDIVIDUAL';
    }
    if (user?.individualCostRate !== undefined && user.individualCostRate > 0) {
      costRate = user.individualCostRate;
      costSource = 'USER_INDIVIDUAL';
    }

    // 3. Check Project-specific Member Rate override (highest priority)
    if (project && project.memberRates) {
      const pmr = project.memberRates.find(r => r.userId === userId);
      if (pmr?.hourlyBillingRate !== undefined && pmr.hourlyBillingRate > 0) {
        billingRate = pmr.hourlyBillingRate;
        billingSource = 'PROJECT_MEMBER';
      }
      if (pmr?.hourlyCostRate !== undefined && pmr.hourlyCostRate > 0) {
        costRate = pmr.hourlyCostRate;
        costSource = 'PROJECT_MEMBER';
      }
    }

    return {
      billingRate,
      costRate,
      billingSource,
      costSource,
      jobRoleName: jobRole?.name
    };
  }

  // --- Multi-Organization / Tenant Switcher ---
  public getOrganizations(): Organization[] {
    return this.organizations;
  }

  public getActiveOrgId(): string {
    return this.activeOrgId;
  }

  public setActiveOrgId(orgId: string): Organization | null {
    const org = this.organizations.find(o => o.id === orgId);
    if (!org) return null;
    this.activeOrgId = orgId;
    return org;
  }

  public addOrganization(orgData: Partial<Organization>, actorId: string): Organization {
    const newOrg: Organization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      name: orgData.name || 'Neuer Mandant',
      code: orgData.code || `MND-${this.organizations.length + 1}`,
      defaultHourlyBillingRate: orgData.defaultHourlyBillingRate || 130,
      defaultHourlyCostRate: orgData.defaultHourlyCostRate || 65,
      defaultCurrency: orgData.defaultCurrency || 'EUR',
      stateLocation: orgData.stateLocation || 'DE-BE',
      locationCity: orgData.locationCity || 'Berlin',
      logoColor: orgData.logoColor || 'indigo',
      createdAt: new Date().toISOString()
    };
    this.organizations.push(newOrg);

    // Add actor as admin membership
    const user = this.users.find(u => u.id === actorId);
    if (user) {
      if (!user.memberships) user.memberships = [];
      user.memberships.push({
        orgId: newOrg.id,
        orgName: newOrg.name,
        role: 'ADMIN',
        isDefault: false
      });
    }

    this.logAudit({
      entityType: 'ORGANIZATION',
      entityId: newOrg.id,
      action: 'CREATE',
      userId: actorId,
      userName: user?.name || 'Admin',
      changes: [{ field: 'name', oldValue: null, newValue: newOrg.name }],
      reason: 'Neuer Mandant im System angelegt'
    });

    return newOrg;
  }

  // --- CRUD getters (Filtered by active tenant) ---
  public getOrganization() { return this.organization; }
  public updateOrganization(updates: Partial<Organization>, actorId: string): Organization {
    const idx = this.organizations.findIndex(o => o.id === this.activeOrgId);
    if (idx === -1) return this.organization;

    const oldState = this.organizations[idx].stateLocation;
    const oldCity = this.organizations[idx].locationCity;
    const stateObj = updates.stateLocation ? GERMAN_STATES.find(s => s.code === updates.stateLocation) : undefined;
    
    this.organizations[idx] = {
      ...this.organizations[idx],
      ...updates,
      locationCity: updates.locationCity || (stateObj ? stateObj.name : this.organizations[idx].locationCity)
    };

    if (updates.stateLocation && updates.stateLocation !== oldState) {
      this.logAudit({
        entityType: 'ORGANIZATION',
        entityId: this.organizations[idx].id,
        action: 'UPDATE',
        userId: actorId,
        userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
        changes: [
          { field: 'stateLocation', oldValue: oldState, newValue: updates.stateLocation },
          { field: 'locationCity', oldValue: oldCity, newValue: this.organizations[idx].locationCity }
        ],
        reason: 'Unternehmensstandort und Feiertagskalender angepasst'
      });
    }

    return this.organizations[idx];
  }
  
  public getActorRoleInfo(actorId?: string): { 
    user: User | null; 
    isSuperAdmin: boolean; 
    isAdmin: boolean; 
    isProjectManager: boolean; 
    isEmployee: boolean; 
    role: UserRole;
  } {
    if (!actorId) {
      return { user: null, isSuperAdmin: false, isAdmin: false, isProjectManager: false, isEmployee: false, role: 'EMPLOYEE' };
    }
    const user = this.users.find(u => u.id === actorId) || null;
    if (!user) {
      return { user: null, isSuperAdmin: false, isAdmin: false, isProjectManager: false, isEmployee: false, role: 'EMPLOYEE' };
    }
    const isSuperAdmin = user.role === 'SUPERADMIN' || user.id === 'u-1';
    
    // Check membership role in current activeOrgId or fallback to user.role
    const activeMembership = user.memberships?.find(m => m.orgId === this.activeOrgId);
    const orgRole: UserRole = isSuperAdmin ? 'SUPERADMIN' : (activeMembership?.role || user.role);
    
    const isAdmin = isSuperAdmin || orgRole === 'ADMIN';
    const isProjectManager = !isSuperAdmin && !isAdmin && orgRole === 'PROJECT_MANAGER';
    const isEmployee = !isSuperAdmin && !isAdmin && !isProjectManager;

    return { 
      user, 
      isSuperAdmin, 
      isAdmin, 
      isProjectManager, 
      isEmployee,
      role: orgRole 
    };
  }

  public getUsers(allOrgs: boolean = false) { 
    if (allOrgs) return this.users;
    // Return users that are either directly in this org or have a membership for this org
    return this.users.filter(u => u.orgId === this.activeOrgId || u.memberships?.some(m => m.orgId === this.activeOrgId));
  }
  
  public getJobRoles() { return this.jobRoles.filter(r => r.orgId === this.activeOrgId); }

  public getClients(actorId?: string, allOrgs: boolean = false): Client[] { 
    const roleInfo = this.getActorRoleInfo(actorId);
    if (roleInfo.isSuperAdmin && allOrgs) {
      return this.clients;
    }
    const orgClients = this.clients.filter(c => c.orgId === this.activeOrgId);
    // SuperAdmin or Admin sees all clients in the tenant
    if (!actorId || roleInfo.isSuperAdmin || roleInfo.isAdmin) {
      return orgClients;
    }
    // Employee or Project Manager sees clients of their visible projects
    const visibleProjectClientIds = this.getProjects(actorId).map(p => p.clientId);
    return orgClients.filter(c => visibleProjectClientIds.includes(c.id));
  }

  public getProjects(actorId?: string, allOrgs: boolean = false): Project[] { 
    const roleInfo = this.getActorRoleInfo(actorId);
    if (roleInfo.isSuperAdmin && allOrgs) {
      return this.projects;
    }
    const orgProjects = this.projects.filter(p => p.orgId === this.activeOrgId);
    
    // Unrestricted or Admin/SuperAdmin sees all projects for the organization
    if (!actorId || roleInfo.isSuperAdmin || roleInfo.isAdmin) {
      return orgProjects;
    }

    // Project Manager sees projects they manage OR are assigned to OR open projects
    if (roleInfo.isProjectManager) {
      return orgProjects.filter(p => 
        p.projectManagerId === actorId ||
        p.managerUserIds?.includes(actorId) ||
        (p.assignedUserIds && p.assignedUserIds.includes(actorId)) ||
        (p.memberRates && p.memberRates.some(mr => mr.userId === actorId)) ||
        !p.restrictToAssignedMembers
      );
    }

    // Regular Employee sees ONLY assigned projects (or unrestricted projects if not restricted)
    return orgProjects.filter(p => 
      (p.assignedUserIds && p.assignedUserIds.includes(actorId)) ||
      (p.memberRates && p.memberRates.some(mr => mr.userId === actorId)) ||
      !p.restrictToAssignedMembers
    );
  }

  public getTasks(projectId?: string, actorId?: string): Task[] {
    const allowedProjects = this.getProjects(actorId).map(p => p.id);
    if (projectId) {
      if (actorId && !allowedProjects.includes(projectId)) {
        return [];
      }
      return this.tasks.filter(t => t.projectId === projectId);
    }
    return this.tasks.filter(t => allowedProjects.includes(t.projectId));
  }

  public getApiKeys() { return this.apiKeys.filter(k => k.orgId === this.activeOrgId); }

  public getAuditLogs(actorId?: string): AuditLogEntry[] { 
    const roleInfo = this.getActorRoleInfo(actorId);
    let list = this.auditLogs;
    if (!roleInfo.isSuperAdmin) {
      list = list.filter(a => a.orgId === this.activeOrgId);
    }
    if (actorId && !roleInfo.isSuperAdmin && !roleInfo.isAdmin) {
      if (roleInfo.isProjectManager) {
        const managedProjectIds = this.projects
          .filter(p => p.orgId === this.activeOrgId && (p.projectManagerId === actorId || p.managerUserIds?.includes(actorId)))
          .map(p => p.id);
        list = list.filter(a => a.userId === actorId || (a.entityType === 'PROJECT' && managedProjectIds.includes(a.entityId)));
      } else {
        list = list.filter(a => a.userId === actorId);
      }
    }
    return list;
  }

  // --- User / Auth ---
  public addUser(userData: Partial<User>, inviterId: string): User {
    const newUser: User = {
      id: 'u-' + (this.users.length + 1),
      orgId: this.activeOrgId || this.organization.id,
      name: userData.name || 'Neuer Mitarbeiter',
      email: userData.email || '',
      role: userData.role || 'EMPLOYEE',
      employmentType: userData.employmentType || 'INTERNAL',
      companyName: userData.companyName,
      jobRoleId: userData.jobRoleId || 'role-mid',
      individualBillingRate: userData.individualBillingRate,
      individualCostRate: userData.individualCostRate,
      weeklyTargetHours: userData.weeklyTargetHours || 40,
      dailyTargetHours: (userData.weeklyTargetHours || 40) / 5,
      workDays: userData.workDays || [1, 2, 3, 4, 5],
      holidayCalendar: userData.holidayCalendar || 'DE-BE',
      language: userData.language || 'de',
      status: userData.status || 'INVITED',
      invitationToken: 'inv-' + Math.random().toString(36).substring(2, 12),
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      memberships: [
        {
          orgId: this.activeOrgId || this.organization.id,
          orgName: this.organization?.name || 'Mandant',
          role: userData.role || 'EMPLOYEE',
          employmentType: userData.employmentType || 'INTERNAL',
          jobRoleId: userData.jobRoleId,
          individualBillingRate: userData.individualBillingRate,
          individualCostRate: userData.individualCostRate,
          isDefault: true
        }
      ],
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);

    this.logAudit({
      entityType: 'USER',
      entityId: newUser.id,
      action: 'CREATE',
      userId: inviterId,
      userName: this.users.find(u => u.id === inviterId)?.name || 'Admin',
      changes: [{ field: 'user', oldValue: null, newValue: newUser.email }]
    });

    return newUser;
  }

  public updateUser(userId: string, updates: Partial<User>, actorId: string): User | null {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    const old = { ...this.users[idx] };
    this.users[idx] = { ...this.users[idx], ...updates };

    const changes = Object.keys(updates).map(k => ({
      field: k,
      oldValue: (old as any)[k],
      newValue: (updates as any)[k]
    }));

    this.logAudit({
      entityType: 'USER',
      entityId: userId,
      action: 'UPDATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes
    });

    return this.users[idx];
  }

  public deleteUser(userId: string, actorId: string): { success: boolean; error?: string } {
    const user = this.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'Benutzer nicht gefunden' };

    const entriesCount = this.timeEntries.filter(te => te.userId === userId).length;
    if (entriesCount > 0) {
      return {
        success: false,
        error: `Mitarbeiter "${user.name}" kann nicht gelöscht werden, da bereits ${entriesCount} Zeiteintrag/Zeiteinträge erfasst wurden (GoBD-Revisionssicherheit). Sie können das Profil stattdessen deaktivieren.`
      };
    }

    this.users = this.users.filter(u => u.id !== userId);

    this.logAudit({
      entityType: 'USER',
      entityId: userId,
      action: 'DELETE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: [{ field: 'user', oldValue: user.email, newValue: null }]
    });

    return { success: true };
  }

  // --- Job Roles CRUD ---
  public addJobRole(roleData: Partial<EmployeeJobRole>, actorId: string): EmployeeJobRole {
    const role: EmployeeJobRole = {
      id: 'role-' + (this.jobRoles.length + 1),
      orgId: this.organization.id,
      name: roleData.name || 'Neue Rolle',
      standardBillingRate: roleData.standardBillingRate || 100,
      standardCostRate: roleData.standardCostRate || 50,
      status: 'ACTIVE'
    };
    this.jobRoles.push(role);
    return role;
  }

  public updateJobRole(roleId: string, updates: Partial<EmployeeJobRole>): EmployeeJobRole | null {
    const idx = this.jobRoles.findIndex(r => r.id === roleId);
    if (idx === -1) return null;
    this.jobRoles[idx] = { ...this.jobRoles[idx], ...updates };
    return this.jobRoles[idx];
  }

  // --- Clients & Projects ---
  public addClient(clientData: Partial<Client>): Client {
    const client: Client = {
      id: 'c-' + (this.clients.length + 1),
      orgId: this.organization.id,
      name: clientData.name || 'Neuer Kunde',
      clientNumber: clientData.clientNumber || `KND-${1000 + this.clients.length + 1}`,
      contactPerson: clientData.contactPerson,
      email: clientData.email,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    this.clients.push(client);
    return client;
  }

  public updateClient(clientId: string, updates: Partial<Client>, actorId: string): Client | null {
    const idx = this.clients.findIndex(c => c.id === clientId);
    if (idx === -1) return null;
    const old = { ...this.clients[idx] };
    this.clients[idx] = { ...this.clients[idx], ...updates };

    // If client name changed, update denormalized clientName in projects
    if (updates.name && updates.name !== old.name) {
      this.projects.forEach(p => {
        if (p.clientId === clientId) {
          p.clientName = updates.name!;
        }
      });
    }

    this.logAudit({
      entityType: 'CLIENT',
      entityId: clientId,
      action: 'UPDATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: Object.keys(updates).map(k => ({ field: k, oldValue: (old as any)[k], newValue: (updates as any)[k] }))
    });

    return this.clients[idx];
  }

  public deleteClient(clientId: string, actorId: string): { success: boolean; error?: string } {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return { success: false, error: 'Kunde nicht gefunden' };

    const associatedProjects = this.projects.filter(p => p.clientId === clientId);
    if (associatedProjects.length > 0) {
      return {
        success: false,
        error: `Kunde "${client.name}" kann nicht gelöscht werden, da noch ${associatedProjects.length} Projekt(e) zugeordnet sind. Bitte löschen oder verschieben Sie zuerst die Projekte.`
      };
    }

    this.clients = this.clients.filter(c => c.id !== clientId);

    this.logAudit({
      entityType: 'CLIENT',
      entityId: clientId,
      action: 'DELETE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: [{ field: 'client', oldValue: client.name, newValue: null }]
    });

    return { success: true };
  }

  public addProject(projectData: Partial<Project>, actorId: string): Project {
    const client = this.clients.find(c => c.id === projectData.clientId);
    const pm = projectData.projectManagerId ? this.users.find(u => u.id === projectData.projectManagerId) : undefined;
    const project: Project = {
      id: 'p-' + (this.projects.length + 1),
      orgId: this.organization.id,
      clientId: projectData.clientId || this.clients[0].id,
      clientName: client?.name || '',
      name: projectData.name || 'Neues Projekt',
      projectNumber: projectData.projectNumber || `PRJ-${new Date().getFullYear()}-${String(this.projects.length + 1).padStart(2, '0')}`,
      projectManagerId: projectData.projectManagerId,
      projectManagerName: pm?.name || projectData.projectManagerName,
      managerUserIds: projectData.managerUserIds || (projectData.projectManagerId ? [projectData.projectManagerId] : []),
      billingModel: projectData.billingModel || 'TIME_AND_MATERIAL',
      totalFixedPrice: projectData.totalFixedPrice,
      budgetHours: projectData.budgetHours,
      status: 'ACTIVE',
      requireApproval: projectData.requireApproval ?? true,
      requiredFields: projectData.requiredFields || { description: true, task: false, breaks: false },
      restrictToAssignedMembers: projectData.restrictToAssignedMembers ?? false,
      assignedUserIds: projectData.assignedUserIds || [],
      memberRates: projectData.memberRates || [],
      fixedPriceAllocations: projectData.fixedPriceAllocations || [],
      createdAt: new Date().toISOString()
    };
    this.projects.push(project);

    this.logAudit({
      entityType: 'PROJECT',
      entityId: project.id,
      action: 'CREATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: [{ field: 'project', oldValue: null, newValue: project.name }]
    });

    return project;
  }

  public updateProject(projectId: string, updates: Partial<Project>, actorId: string): Project | null {
    const idx = this.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;
    const old = { ...this.projects[idx] };
    
    if (updates.projectManagerId && !updates.projectManagerName) {
      const pm = this.users.find(u => u.id === updates.projectManagerId);
      if (pm) updates.projectManagerName = pm.name;
    }
    if (updates.projectManagerId && (!updates.managerUserIds || updates.managerUserIds.length === 0)) {
      updates.managerUserIds = [updates.projectManagerId];
    }

    this.projects[idx] = { ...this.projects[idx], ...updates };

    this.logAudit({
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'UPDATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: Object.keys(updates).map(k => ({ field: k, oldValue: (old as any)[k], newValue: (updates as any)[k] }))
    });

    return this.projects[idx];
  }

  public deleteProject(projectId: string, actorId: string): { success: boolean; error?: string } {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Projekt nicht gefunden' };

    const entriesCount = this.timeEntries.filter(te => te.projectId === projectId).length;
    if (entriesCount > 0) {
      return {
        success: false,
        error: `Projekt "${project.name}" kann nicht gelöscht werden, da bereits ${entriesCount} Zeiteintrag/Zeiteinträge erfasst wurden (GoBD-Revisionssicherheit). Sie können das Projekt stattdessen archivieren oder auf inaktiv setzen.`
      };
    }

    this.projects = this.projects.filter(p => p.id !== projectId);
    this.tasks = this.tasks.filter(t => t.projectId !== projectId);

    this.logAudit({
      entityType: 'PROJECT',
      entityId: projectId,
      action: 'DELETE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: [{ field: 'project', oldValue: project.name, newValue: null }]
    });

    return { success: true };
  }

  public addTask(taskData: Partial<Task>, actorId?: string): Task {
    const task: Task = {
      id: 't-' + (this.tasks.length + 1) + '-' + Date.now().toString().slice(-4),
      projectId: taskData.projectId || this.projects[0]?.id || 'p-1',
      name: taskData.name || 'Neue Aufgabe',
      isBillableDefault: taskData.isBillableDefault ?? true,
      budgetHours: taskData.budgetHours,
      status: taskData.status || 'ACTIVE'
    };
    this.tasks.push(task);

    if (actorId) {
      this.logAudit({
        entityType: 'TASK',
        entityId: task.id,
        action: 'CREATE',
        userId: actorId,
        userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
        changes: [{ field: 'name', oldValue: null, newValue: task.name }]
      });
    }

    return task;
  }

  public updateTask(taskId: string, updates: Partial<Task>, actorId?: string): Task | null {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;

    const old = this.tasks[index];
    const updated: Task = {
      ...old,
      ...updates,
      id: old.id,
      projectId: updates.projectId || old.projectId
    };

    this.tasks[index] = updated;

    // Synchronize taskName in time entries if name changed
    if (updates.name && updates.name !== old.name) {
      this.timeEntries = this.timeEntries.map(e => {
        if (e.taskId === taskId) {
          return { ...e, taskName: updates.name };
        }
        return e;
      });
    }

    if (actorId) {
      this.logAudit({
        entityType: 'TASK',
        entityId: taskId,
        action: 'UPDATE',
        userId: actorId,
        userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
        changes: [
          { field: 'name', oldValue: old.name, newValue: updated.name },
          { field: 'isBillableDefault', oldValue: old.isBillableDefault, newValue: updated.isBillableDefault },
          { field: 'status', oldValue: old.status, newValue: updated.status }
        ]
      });
    }

    return updated;
  }

  public deleteTask(taskId: string, actorId?: string): { success: boolean; error?: string } {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Aufgabe nicht gefunden' };

    const entriesCount = this.timeEntries.filter(te => te.taskId === taskId).length;
    if (entriesCount > 0) {
      return {
        success: false,
        error: `Aufgabe "${task.name}" kann nicht gelöscht werden, da bereits ${entriesCount} Zeiteintrag/Zeiteinträge darauf gebucht wurden (GoBD-Revisionsschutz). Sie können die Aufgabe stattdessen archivieren.`
      };
    }

    this.tasks = this.tasks.filter(t => t.id !== taskId);

    if (actorId) {
      this.logAudit({
        entityType: 'TASK',
        entityId: taskId,
        action: 'DELETE',
        userId: actorId,
        userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
        changes: [{ field: 'task', oldValue: task.name, newValue: null }]
      });
    }

    return { success: true };
  }

  // --- Time Entries CRUD & Filtering ---
  public getTimeEntries(params?: {
    from?: string;
    to?: string;
    userId?: string;
    projectId?: string;
    clientId?: string;
    approvalStatus?: string;
    isBillable?: boolean;
    page?: number;
    limit?: number;
    updatedAfter?: string;
    allOrgs?: boolean;
  }, actorId?: string): { data: TimeEntry[]; total: number; page: number; limit: number } {
    const roleInfo = this.getActorRoleInfo(actorId);

    let list: TimeEntry[];
    if (roleInfo.isSuperAdmin && params?.allOrgs) {
      list = [...this.timeEntries];
    } else {
      list = this.timeEntries.filter(e => e.orgId === this.activeOrgId);
    }

    // Role-Based Access Control Filtering
    if (actorId && !roleInfo.isSuperAdmin && !roleInfo.isAdmin) {
      if (roleInfo.isProjectManager) {
        // Project Manager sees all entries on projects they manage PLUS their own entries on any project
        const managedProjectIds = this.projects
          .filter(p => p.orgId === this.activeOrgId && (p.projectManagerId === actorId || p.managerUserIds?.includes(actorId)))
          .map(p => p.id);

        list = list.filter(e => managedProjectIds.includes(e.projectId) || e.userId === actorId);
      } else {
        // Regular Employee sees ONLY their own time entries!
        list = list.filter(e => e.userId === actorId);
      }
    }

    if (params?.from) {
      list = list.filter(e => e.date >= params.from!);
    }
    if (params?.to) {
      list = list.filter(e => e.date <= params.to!);
    }
    if (params?.userId) {
      list = list.filter(e => e.userId === params.userId);
    }
    if (params?.projectId) {
      list = list.filter(e => e.projectId === params.projectId);
    }
    if (params?.clientId) {
      list = list.filter(e => e.clientId === params.clientId);
    }
    if (params?.approvalStatus) {
      list = list.filter(e => e.approvalStatus === params.approvalStatus);
    }
    if (params?.isBillable !== undefined) {
      list = list.filter(e => e.isBillable === params.isBillable);
    }
    if (params?.updatedAfter) {
      list = list.filter(e => e.updatedAt > params.updatedAfter!);
    }

    // Sort newest first
    list.sort((a, b) => (b.date + (b.startTime || '00:00')).localeCompare(a.date + (a.startTime || '00:00')));

    const total = list.length;
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const startIndex = (page - 1) * limit;
    const data = list.slice(startIndex, startIndex + limit);

    return { data, total, page, limit };
  }

  public createTimeEntry(entryData: Partial<TimeEntry>, actorId: string): TimeEntry {
    const user = this.users.find(u => u.id === (entryData.userId || actorId));
    const project = this.projects.find(p => p.id === entryData.projectId);
    const client = project ? this.clients.find(c => c.id === project.clientId) : undefined;
    const task = entryData.taskId ? this.tasks.find(t => t.id === entryData.taskId) : undefined;

    // Rate resolution
    const rateInfo = this.resolveRates(user?.id || actorId, project?.id, entryData.date);
    const isBillable = entryData.isBillable ?? (task ? task.isBillableDefault : true);

    const durationMinutes = entryData.durationMinutes || (
      entryData.startTime && entryData.endTime
        ? this.calculateMinutes(entryData.startTime, entryData.endTime)
        : 60
    );
    const durationHoursDecimal = Math.round((durationMinutes / 60) * 100) / 100;

    const hourlyBillingRate = isBillable ? (entryData.hourlyBillingRate || rateInfo.billingRate) : 0;
    const calculatedAmount = Math.round(durationHoursDecimal * hourlyBillingRate * 100) / 100;
    const hourlyCostRate = rateInfo.costRate;
    const calculatedCost = Math.round(durationHoursDecimal * hourlyCostRate * 100) / 100;

    const entry: TimeEntry = {
      id: 'te-' + (Date.now() + Math.floor(Math.random() * 1000)),
      orgId: this.organization.id,
      userId: user?.id || actorId,
      userName: user?.name || 'Mitarbeiter',
      projectId: project?.id || '',
      projectName: project?.name || 'Allgemein',
      clientId: client?.id || '',
      clientName: client?.name || '',
      taskId: task?.id,
      taskName: task?.name,
      date: entryData.date || new Date().toISOString().split('T')[0],
      startTime: entryData.startTime,
      endTime: entryData.endTime,
      durationMinutes,
      durationHoursDecimal,
      breakMinutes: entryData.breakMinutes || 0,
      description: entryData.description || '',
      isBillable,
      hourlyBillingRate,
      calculatedAmount,
      hourlyCostRate,
      calculatedCost,
      currency: 'EUR',
      approvalStatus: entryData.approvalStatus || (project?.requireApproval ? 'DRAFT' : 'APPROVED'),
      isFavorite: entryData.isFavorite || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.timeEntries.push(entry);

    this.logAudit({
      entityType: 'TIME_ENTRY',
      entityId: entry.id,
      action: 'CREATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'User',
      changes: [{ field: 'entry', oldValue: null, newValue: `${entry.date} - ${entry.durationHoursDecimal}h` }]
    });

    return entry;
  }

  public updateTimeEntry(entryId: string, updates: Partial<TimeEntry>, actorId: string, reason?: string): TimeEntry | null {
    const idx = this.timeEntries.findIndex(e => e.id === entryId);
    if (idx === -1) return null;

    const oldEntry = { ...this.timeEntries[idx] };
    const wasApproved = oldEntry.approvalStatus === 'APPROVED';

    let durationMinutes = updates.durationMinutes ?? oldEntry.durationMinutes;
    if (updates.startTime && updates.endTime) {
      durationMinutes = this.calculateMinutes(updates.startTime, updates.endTime);
    }
    const durationHoursDecimal = Math.round((durationMinutes / 60) * 100) / 100;

    const isBillable = updates.isBillable ?? oldEntry.isBillable;
    const hourlyBillingRate = isBillable ? (updates.hourlyBillingRate ?? oldEntry.hourlyBillingRate) : 0;
    const calculatedAmount = Math.round(durationHoursDecimal * hourlyBillingRate * 100) / 100;
    const hourlyCostRate = updates.hourlyCostRate ?? oldEntry.hourlyCostRate ?? 65;
    const calculatedCost = Math.round(durationHoursDecimal * hourlyCostRate * 100) / 100;

    const isCorrectedAfterApproval = wasApproved;

    const updated: TimeEntry = {
      ...this.timeEntries[idx],
      ...updates,
      durationMinutes,
      durationHoursDecimal,
      isBillable,
      hourlyBillingRate,
      calculatedAmount,
      hourlyCostRate,
      calculatedCost,
      isCorrectedAfterApproval: isCorrectedAfterApproval || oldEntry.isCorrectedAfterApproval,
      correctionNote: isCorrectedAfterApproval
        ? `Nachträglich korrigiert am ${new Date().toLocaleDateString('de-DE')} durch ${this.users.find(u => u.id === actorId)?.name || 'Admin'}${reason ? `: ${reason}` : ''}`
        : oldEntry.correctionNote,
      updatedAt: new Date().toISOString()
    };

    this.timeEntries[idx] = updated;

    // Audit Logging: Section 8 requires complete audit record when editing (especially after approval)
    const changes = Object.keys(updates).map(k => ({
      field: k,
      oldValue: (oldEntry as any)[k],
      newValue: (updates as any)[k]
    })).filter(c => JSON.stringify(c.oldValue) !== JSON.stringify(c.newValue));

    if (changes.length > 0) {
      this.logAudit({
        entityType: 'TIME_ENTRY',
        entityId: entryId,
        action: wasApproved ? 'CORRECT_AFTER_APPROVAL' : 'UPDATE',
        userId: actorId,
        userName: this.users.find(u => u.id === actorId)?.name || 'User',
        changes,
        reason: reason || (wasApproved ? 'Nachträgliche Korrektur freigegebener Eintrag' : undefined)
      });
    }

    return updated;
  }

  public deleteTimeEntry(entryId: string, actorId: string): boolean {
    const idx = this.timeEntries.findIndex(e => e.id === entryId);
    if (idx === -1) return false;
    const deleted = this.timeEntries[idx];
    this.timeEntries.splice(idx, 1);

    this.logAudit({
      entityType: 'TIME_ENTRY',
      entityId: entryId,
      action: 'DELETE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'User',
      changes: [{ field: 'entry', oldValue: `${deleted.date} ${deleted.description}`, newValue: null }]
    });

    return true;
  }

  public splitTimeEntry(entryId: string, parts: Array<{ durationMinutes: number; description?: string; taskId?: string }>, actorId: string): TimeEntry[] {
    const original = this.timeEntries.find(e => e.id === entryId);
    if (!original) return [];

    // Delete or replace original
    this.deleteTimeEntry(entryId, actorId);

    const created: TimeEntry[] = [];
    parts.forEach((p, i) => {
      const entry = this.createTimeEntry({
        ...original,
        id: undefined,
        durationMinutes: p.durationMinutes,
        description: p.description || `${original.description} (Teil ${i + 1})`,
        taskId: p.taskId || original.taskId,
        approvalStatus: 'DRAFT'
      }, actorId);
      created.push(entry);
    });

    return created;
  }

  public batchUpdateTimeEntries(entryIds: string[], updates: Partial<TimeEntry>, actorId: string): number {
    let count = 0;
    entryIds.forEach(id => {
      const res = this.updateTimeEntry(id, updates, actorId);
      if (res) count++;
    });
    return count;
  }

  public setApprovalStatus(entryIds: string[], status: 'APPROVED' | 'REJECTED', approverId: string): number {
    const roleInfo = this.getActorRoleInfo(approverId);
    // Regular employees cannot approve/reject
    if (roleInfo.isEmployee) {
      return 0;
    }
    const approver = roleInfo.user || this.users.find(u => u.id === approverId);
    let count = 0;
    const managedProjectIds = roleInfo.isProjectManager
      ? this.projects.filter(p => p.orgId === this.activeOrgId && (p.projectManagerId === approverId || p.managerUserIds?.includes(approverId))).map(p => p.id)
      : [];

    entryIds.forEach(id => {
      const idx = this.timeEntries.findIndex(e => e.id === id);
      if (idx !== -1) {
        const entry = this.timeEntries[idx];
        // Project managers can only approve entries for projects they manage
        if (roleInfo.isProjectManager && !managedProjectIds.includes(entry.projectId)) {
          return;
        }

        const old = this.timeEntries[idx].approvalStatus;
        this.timeEntries[idx].approvalStatus = status;
        this.timeEntries[idx].approvedBy = approver?.name || approverId;
        this.timeEntries[idx].approvedAt = new Date().toISOString();
        this.timeEntries[idx].updatedAt = new Date().toISOString();

        this.logAudit({
          entityType: 'TIME_ENTRY',
          entityId: id,
          action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
          userId: approverId,
          userName: approver?.name || 'Approver',
          changes: [{ field: 'approvalStatus', oldValue: old, newValue: status }]
        });
        count++;
      }
    });
    return count;
  }

  // --- Working Time (Allgemeine Tagesarbeitszeit - Section 20) ---
  public getWorkingTimeEntries(params?: { from?: string; to?: string; userId?: string }, actorId?: string): WorkingTimeEntry[] {
    const roleInfo = this.getActorRoleInfo(actorId);
    let list = this.workingTimeEntries.filter(w => w.orgId === this.activeOrgId);

    // Regular employees only see their own working times
    if (actorId && !roleInfo.isSuperAdmin && !roleInfo.isAdmin) {
      list = list.filter(w => w.userId === actorId);
    } else if (params?.userId) {
      list = list.filter(w => w.userId === params.userId);
    }

    if (params?.from) list = list.filter(w => w.date >= params.from!);
    if (params?.to) list = list.filter(w => w.date <= params.to!);
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }

  public createOrUpdateWorkingTime(entryData: Partial<WorkingTimeEntry>, actorId: string): WorkingTimeEntry {
    const user = this.users.find(u => u.id === (entryData.userId || actorId));
    const grossMinutes = (entryData.startTime && entryData.endTime)
      ? this.calculateMinutes(entryData.startTime, entryData.endTime)
      : 480;
    const breakMin = entryData.breakMinutes || 0;
    const netMinutes = Math.max(0, grossMinutes - breakMin);
    const netHours = Math.round((netMinutes / 60) * 100) / 100;

    const existingIdx = this.workingTimeEntries.findIndex(
      w => w.userId === (user?.id || actorId) && w.date === entryData.date
    );

    if (existingIdx !== -1) {
      this.workingTimeEntries[existingIdx] = {
        ...this.workingTimeEntries[existingIdx],
        ...entryData,
        totalGrossMinutes: grossMinutes,
        totalNetMinutes: netMinutes,
        totalNetHoursDecimal: netHours,
        updatedAt: new Date().toISOString()
      };
      return this.workingTimeEntries[existingIdx];
    } else {
      const entry: WorkingTimeEntry = {
        id: 'wte-' + (Date.now() + Math.floor(Math.random() * 1000)),
        orgId: this.organization.id,
        userId: user?.id || actorId,
        userName: user?.name,
        date: entryData.date || new Date().toISOString().split('T')[0],
        startTime: entryData.startTime || '09:00',
        endTime: entryData.endTime || '17:00',
        breakMinutes: breakMin,
        totalGrossMinutes: grossMinutes,
        totalNetMinutes: netMinutes,
        totalNetHoursDecimal: netHours,
        note: entryData.note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.workingTimeEntries.push(entry);
      return entry;
    }
  }

  // --- Working Time Summary & Sanity Check (Section 20) ---
  public getWorkingTimeSummary(userId: string, month: string) {
    const user = this.users.find(u => u.id === userId);
    const from = `${month}-01`;
    const to = `${month}-31`;

    const workingEntries = this.workingTimeEntries.filter(w => w.userId === userId && w.date >= from && w.date <= to);
    const projectEntries = this.timeEntries.filter(t => t.userId === userId && t.date >= from && t.date <= to);

    const actualWorkingHours = workingEntries.reduce((sum, w) => sum + w.totalNetHoursDecimal, 0);
    const actualProjectHours = projectEntries.reduce((sum, t) => sum + t.durationHoursDecimal, 0);

    // Calculate Target hours for workdays in month, accounting for configured state holidays (e.g. Berlin Frauentag 8. März)
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const userWorkDays = user?.workDays || [1, 2, 3, 4, 5];
    const stateCode = this.organization.stateLocation || 'DE-BE';

    const workdaysData = getWorkingDaysInRange(startDate, endDate, stateCode, userWorkDays);
    const targetWorkDays = workdaysData.totalWorkdays;

    const targetHoursTotal = targetWorkDays * (user?.dailyTargetHours || 8.0);
    const balanceHours = Math.round((actualWorkingHours - targetHoursTotal) * 100) / 100;

    // Daily Sanity Check: Warn if project time > working time
    const daysMap = new Map<string, { workH: number; projectH: number }>();
    workingEntries.forEach(w => {
      const d = daysMap.get(w.date) || { workH: 0, projectH: 0 };
      d.workH += w.totalNetHoursDecimal;
      daysMap.set(w.date, d);
    });
    projectEntries.forEach(t => {
      const d = daysMap.get(t.date) || { workH: 0, projectH: 0 };
      d.projectH += t.durationHoursDecimal;
      daysMap.set(t.date, d);
    });

    const sanityDiscrepancies: Array<{ date: string; workHours: number; projectHours: number; diff: number }> = [];
    daysMap.forEach((v, date) => {
      if (v.projectH > v.workH && v.workH > 0) {
        sanityDiscrepancies.push({
          date,
          workHours: v.workH,
          projectHours: v.projectH,
          diff: Math.round((v.projectH - v.workH) * 100) / 100
        });
      }
    });

    return {
      userId,
      userName: user?.name,
      month,
      stateLocation: stateCode,
      holidaysInMonth: workdaysData.holidaysInRange,
      targetWorkDays,
      targetHoursTotal,
      actualWorkingHours: Math.round(actualWorkingHours * 100) / 100,
      actualProjectHours: Math.round(actualProjectHours * 100) / 100,
      balanceHours,
      isOvertime: balanceHours > 0,
      sanityDiscrepancies
    };
  }

  // --- Forecast Planning (Plan vs. Ist - Section 21) ---
  public getForecasts(month?: string, projectId?: string, actorId?: string): ForecastEntry[] {
    const roleInfo = this.getActorRoleInfo(actorId);
    let list = this.forecasts.filter(f => f.orgId === this.activeOrgId);

    if (actorId && !roleInfo.isSuperAdmin && !roleInfo.isAdmin) {
      if (roleInfo.isProjectManager) {
        const managedProjectIds = this.projects
          .filter(p => p.orgId === this.activeOrgId && (p.projectManagerId === actorId || p.managerUserIds?.includes(actorId)))
          .map(p => p.id);
        list = list.filter(f => managedProjectIds.includes(f.projectId) || f.userId === actorId);
      } else {
        list = list.filter(f => f.userId === actorId);
      }
    }

    if (month) list = list.filter(f => f.month === month);
    if (projectId) list = list.filter(f => f.projectId === projectId);
    return list;
  }

  public saveForecast(entry: Partial<ForecastEntry>, actorId: string): ForecastEntry {
    const user = this.users.find(u => u.id === entry.userId);
    const project = this.projects.find(p => p.id === entry.projectId);

    // Rate resolution at time of forecast planning
    const rates = this.resolveRates(entry.userId!, entry.projectId, `${entry.month}-01`);
    const appliedBillingRate = project?.billingModel === 'FIXED_PRICE' ? 0 : rates.billingRate;
    const appliedCostRate = rates.costRate;

    const plannedHours = entry.plannedHours || 0;
    const plannedRevenue = project?.billingModel === 'FIXED_PRICE'
      ? (project.totalFixedPrice || 0)
      : Math.round(plannedHours * appliedBillingRate * 100) / 100;
    const plannedCost = Math.round(plannedHours * appliedCostRate * 100) / 100;
    const plannedMargin = plannedRevenue - plannedCost;

    // Check existing version
    const existing = this.forecasts.filter(f => f.projectId === entry.projectId && f.userId === entry.userId && f.month === entry.month);
    const nextVersion = existing.length > 0 ? Math.max(...existing.map(e => e.version)) + 1 : 1;

    const newForecast: ForecastEntry = {
      id: 'fc-' + (Date.now() + Math.floor(Math.random() * 1000)),
      orgId: this.organization.id,
      projectId: entry.projectId!,
      projectName: project?.name || '',
      userId: entry.userId!,
      userName: user?.name || '',
      month: entry.month || new Date().toISOString().substring(0, 7),
      plannedHours,
      appliedBillingRate,
      appliedCostRate,
      plannedRevenue,
      plannedCost,
      plannedMargin,
      version: nextVersion,
      createdBy: actorId,
      createdAt: new Date().toISOString()
    };

    this.forecasts.push(newForecast);

    this.logAudit({
      entityType: 'FORECAST',
      entityId: newForecast.id,
      action: 'CREATE',
      userId: actorId,
      userName: this.users.find(u => u.id === actorId)?.name || 'Admin',
      changes: [{ field: 'forecast', oldValue: null, newValue: `v${nextVersion}: ${plannedHours}h on ${newForecast.projectName}` }]
    });

    return newForecast;
  }

  public getForecastPlanVsActual(month: string): ForecastComparisonItem[] {
    const list: ForecastComparisonItem[] = [];
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const stateCode = this.organization.stateLocation || 'DE-BE';

    // Calculate passed workdays in month for extrapolation taking into account state holidays
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;

    const workdaysInfo = getWorkingDaysInRange(startDate, endDate, stateCode);
    const totalWorkDays = workdaysInfo.totalWorkdays;
    const passedWorkDays = isCurrentMonth
      ? workdaysInfo.workdayDates.filter(d => d <= todayStr).length
      : (endDate < todayStr ? totalWorkDays : 0);

    const extrapolationFactor = (passedWorkDays > 0 && isCurrentMonth) ? (totalWorkDays / passedWorkDays) : 1;

    // Group active forecasts by project & user (latest version)
    const activeForecasts = this.forecasts.filter(f => f.month === month);
    const map = new Map<string, ForecastEntry>();
    activeForecasts.forEach(f => {
      const key = `${f.projectId}_${f.userId}`;
      const prev = map.get(key);
      if (!prev || prev.version < f.version) {
        map.set(key, f);
      }
    });

    map.forEach(fc => {
      const project = this.projects.find(p => p.id === fc.projectId);
      const from = `${month}-01`;
      const to = `${month}-${daysInMonth}`;
      const actualEntries = this.timeEntries.filter(t => t.projectId === fc.projectId && t.userId === fc.userId && t.date >= from && t.date <= to);

      const actualHoursSoFar = actualEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
      const actualRevenueSoFar = actualEntries.reduce((sum, e) => sum + e.calculatedAmount, 0);
      const actualCostSoFar = actualEntries.reduce((sum, e) => sum + (e.calculatedCost || 0), 0);

      const extrapolatedHoursMonthEnd = Math.round(actualHoursSoFar * extrapolationFactor * 10) / 10;
      const extrapolatedRevenueMonthEnd = Math.round(actualRevenueSoFar * extrapolationFactor * 100) / 100;
      const extrapolatedCostMonthEnd = Math.round(actualCostSoFar * extrapolationFactor * 100) / 100;

      const deviationHours = fc.plannedHours > 0 ? ((extrapolatedHoursMonthEnd - fc.plannedHours) / fc.plannedHours) * 100 : 0;
      const isThresholdExceeded = Math.abs(deviationHours) >= this.thresholdPercent;

      list.push({
        projectId: fc.projectId,
        projectName: fc.projectName,
        userId: fc.userId,
        userName: fc.userName,
        month: fc.month,
        billingModel: project?.billingModel || 'TIME_AND_MATERIAL',
        plannedHours: fc.plannedHours,
        plannedRevenue: fc.plannedRevenue,
        plannedCost: fc.plannedCost,
        actualHoursSoFar: Math.round(actualHoursSoFar * 10) / 10,
        actualRevenueSoFar: Math.round(actualRevenueSoFar * 100) / 100,
        actualCostSoFar: Math.round(actualCostSoFar * 100) / 100,
        extrapolatedHoursMonthEnd,
        extrapolatedRevenueMonthEnd,
        extrapolatedCostMonthEnd,
        hoursDeviationPercent: Math.round(deviationHours * 10) / 10,
        isThresholdExceeded
      });
    });

    return list;
  }

  /**
   * Aggregated Project Forecast Planning with Period Filters (Monthly, Quarterly, Yearly, Custom)
   * Includes revenue (€), margin (€ / %), costs, capacity, holiday calibration, and drilldowns.
   */
  public getProjectForecastSummary(options: {
    periodType?: 'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR' | 'CUSTOM';
    periodKey?: string;
    clientId?: string;
    billingModel?: string;
    search?: string;
    thresholdPercent?: number;
  }) {
    const periodType = options.periodType || 'MONTH';
    const periodKey = options.periodKey || '2026-08';
    const threshold = options.thresholdPercent !== undefined ? options.thresholdPercent : this.thresholdPercent;
    const stateCode = this.organization.stateLocation || 'DE-BE';

    const monthNamesDE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const monthShortDE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    let months: string[] = [];
    let startDate = '';
    let endDate = '';
    let periodLabel = '';

    if (periodType === 'MONTH' || /^\d{4}-\d{2}$/.test(periodKey)) {
      const [yStr, mStr] = periodKey.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const days = new Date(y, m, 0).getDate();
      months = [periodKey];
      startDate = `${periodKey}-01`;
      endDate = `${periodKey}-${String(days).padStart(2, '0')}`;
      periodLabel = `${monthNamesDE[m - 1]} ${y}`;
    } else if (periodType === 'QUARTER' || /^\d{4}-Q[1-4]$/.test(periodKey)) {
      const y = parseInt(periodKey.substring(0, 4), 10);
      const q = parseInt(periodKey.substring(6, 7), 10);
      if (q === 1) {
        months = [`${y}-01`, `${y}-02`, `${y}-03`];
        startDate = `${y}-01-01`;
        endDate = `${y}-03-31`;
        periodLabel = `Q1 ${y} (Jan - Mär)`;
      } else if (q === 2) {
        months = [`${y}-04`, `${y}-05`, `${y}-06`];
        startDate = `${y}-04-01`;
        endDate = `${y}-06-30`;
        periodLabel = `Q2 ${y} (Apr - Jun)`;
      } else if (q === 3) {
        months = [`${y}-07`, `${y}-08`, `${y}-09`];
        startDate = `${y}-07-01`;
        endDate = `${y}-09-30`;
        periodLabel = `Q3 ${y} (Jul - Sep)`;
      } else {
        months = [`${y}-10`, `${y}-11`, `${y}-12`];
        startDate = `${y}-10-01`;
        endDate = `${y}-12-31`;
        periodLabel = `Q4 ${y} (Okt - Dez)`;
      }
    } else if (periodType === 'HALF_YEAR' || /^\d{4}-H[1-2]$/.test(periodKey)) {
      const y = parseInt(periodKey.substring(0, 4), 10);
      const h = parseInt(periodKey.substring(6, 7), 10);
      if (h === 1) {
        months = [`${y}-01`, `${y}-02`, `${y}-03`, `${y}-04`, `${y}-05`, `${y}-06`];
        startDate = `${y}-01-01`;
        endDate = `${y}-06-30`;
        periodLabel = `H1 ${y} (1. Halbjahr)`;
      } else {
        months = [`${y}-07`, `${y}-08`, `${y}-09`, `${y}-10`, `${y}-11`, `${y}-12`];
        startDate = `${y}-07-01`;
        endDate = `${y}-12-31`;
        periodLabel = `H2 ${y} (2. Halbjahr)`;
      }
    } else if (periodType === 'YEAR' || /^\d{4}$/.test(periodKey)) {
      const y = parseInt(periodKey.substring(0, 4), 10);
      months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
      startDate = `${y}-01-01`;
      endDate = `${y}-12-31`;
      periodLabel = `Gesamtjahr ${y}`;
    } else {
      months = ['2026-08'];
      startDate = '2026-08-01';
      endDate = '2026-08-31';
      periodLabel = 'August 2026';
    }

    // Workdays in the entire period with holiday awareness
    const periodWorkdaysInfo = getWorkingDaysInRange(startDate, endDate, stateCode);
    const totalWorkdaysInPeriod = periodWorkdaysInfo.totalWorkdays;

    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const isPastPeriod = endDate < todayStr;
    const isFuturePeriod = startDate > todayStr;
    const passedWorkdaysInPeriod = isPastPeriod
      ? totalWorkdaysInPeriod
      : isFuturePeriod
        ? 0
        : periodWorkdaysInfo.workdayDates.filter(d => d <= todayStr).length;

    const periodExtrapolationFactor = (passedWorkdaysInPeriod > 0 && !isPastPeriod && !isFuturePeriod)
      ? (totalWorkdaysInPeriod / passedWorkdaysInPeriod)
      : 1;

    // Filter active contracted projects (Requirement: vorerst nur beauftragte Projekte)
    let projectList = this.projects.filter(p => p.status === 'ACTIVE' && p.clientId !== 'c-5');

    if (options.clientId) {
      projectList = projectList.filter(p => p.clientId === options.clientId);
    }
    if (options.billingModel) {
      projectList = projectList.filter(p => p.billingModel === options.billingModel);
    }
    if (options.search) {
      const s = options.search.toLowerCase();
      projectList = projectList.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.projectNumber.toLowerCase().includes(s) ||
        p.clientName.toLowerCase().includes(s)
      );
    }

    const projectsSummary: ProjectForecastSummary[] = [];

    projectList.forEach(project => {
      // 1. Gather all forecast entries for this project in the period
      const projectForecasts = this.forecasts.filter(f => f.projectId === project.id && months.includes(f.month));
      // Deduplicate to latest version per user per month
      const forecastMap = new Map<string, ForecastEntry>();
      projectForecasts.forEach(f => {
        const key = `${f.month}_${f.userId}`;
        const existing = forecastMap.get(key);
        if (!existing || existing.version < f.version) {
          forecastMap.set(key, f);
        }
      });
      const activePeriodForecasts = Array.from(forecastMap.values());

      // 2. Gather all actual time entries for this project in the period
      const actualEntries = this.timeEntries.filter(
        t => t.projectId === project.id && t.date >= startDate && t.date <= endDate
      );

      const actualHoursSoFar = Math.round(actualEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0) * 10) / 10;
      const actualRevenueSoFar = Math.round(actualEntries.reduce((sum, e) => sum + e.calculatedAmount, 0) * 100) / 100;
      const actualCostSoFar = Math.round(actualEntries.reduce((sum, e) => sum + (e.calculatedCost || 0), 0) * 100) / 100;
      const actualMarginSoFar = Math.round((actualRevenueSoFar - actualCostSoFar) * 100) / 100;
      const actualMarginPercentSoFar = actualRevenueSoFar > 0 ? Math.round((actualMarginSoFar / actualRevenueSoFar) * 1000) / 10 : 0;

      // 3. Calculate Planned Totals
      let plannedHours = 0;
      let plannedRevenue = 0;
      let plannedCost = 0;

      activePeriodForecasts.forEach(fc => {
        plannedHours += fc.plannedHours;
        plannedRevenue += fc.plannedRevenue;
        plannedCost += fc.plannedCost;
      });

      plannedHours = Math.round(plannedHours * 10) / 10;
      plannedRevenue = Math.round(plannedRevenue * 100) / 100;
      plannedCost = Math.round(plannedCost * 100) / 100;
      const plannedMargin = Math.round((plannedRevenue - plannedCost) * 100) / 100;
      const plannedMarginPercent = plannedRevenue > 0 ? Math.round((plannedMargin / plannedRevenue) * 1000) / 10 : 0;

      // 4. Extrapolations (Hochrechnungen)
      let extrapolatedHoursEnd = 0;
      let extrapolatedRevenueEnd = 0;
      let extrapolatedCostEnd = 0;

      if (isPastPeriod) {
        extrapolatedHoursEnd = actualHoursSoFar;
        extrapolatedRevenueEnd = actualRevenueSoFar;
        extrapolatedCostEnd = actualCostSoFar;
      } else if (isFuturePeriod) {
        extrapolatedHoursEnd = plannedHours;
        extrapolatedRevenueEnd = plannedRevenue;
        extrapolatedCostEnd = plannedCost;
      } else {
        // Ongoing period: monthly weighted extrapolation
        let extHours = 0;
        let extRev = 0;
        let extCost = 0;

        months.forEach(m => {
          const [mY, mM] = m.split('-').map(Number);
          const mDays = new Date(mY, mM, 0).getDate();
          const mStart = `${m}-01`;
          const mEnd = `${m}-${String(mDays).padStart(2, '0')}`;
          const mEntries = actualEntries.filter(t => t.date >= mStart && t.date <= mEnd);
          const mActualH = mEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
          const mActualRev = mEntries.reduce((sum, e) => sum + e.calculatedAmount, 0);
          const mActualCost = mEntries.reduce((sum, e) => sum + (e.calculatedCost || 0), 0);

          const mForecasts = activePeriodForecasts.filter(f => f.month === m);
          const mPlannedH = mForecasts.reduce((sum, f) => sum + f.plannedHours, 0);
          const mPlannedRev = mForecasts.reduce((sum, f) => sum + f.plannedRevenue, 0);
          const mPlannedCost = mForecasts.reduce((sum, f) => sum + f.plannedCost, 0);

          if (mEnd < todayStr) {
            // Past month in quarter
            extHours += mActualH;
            extRev += mActualRev;
            extCost += mActualCost;
          } else if (mStart > todayStr) {
            // Future month in quarter
            extHours += mPlannedH;
            extRev += mPlannedRev;
            extCost += mPlannedCost;
          } else {
            // Current month in quarter
            const mWorkdaysInfo = getWorkingDaysInRange(mStart, mEnd, stateCode);
            const mPassedWorkdays = mWorkdaysInfo.workdayDates.filter(d => d <= todayStr).length;
            const mFactor = (mPassedWorkdays > 0) ? (mWorkdaysInfo.totalWorkdays / mPassedWorkdays) : 1;
            extHours += mActualH * mFactor;
            extRev += mActualRev * mFactor;
            extCost += mActualCost * mFactor;
          }
        });

        extrapolatedHoursEnd = Math.round(extHours * 10) / 10;
        extrapolatedRevenueEnd = Math.round(extRev * 100) / 100;
        extrapolatedCostEnd = Math.round(extCost * 100) / 100;
      }

      // For Fixed Price, revenue is the fixed price allocation/total
      if (project.billingModel === 'FIXED_PRICE') {
        extrapolatedRevenueEnd = project.totalFixedPrice || plannedRevenue;
      }

      const extrapolatedMarginEnd = Math.round((extrapolatedRevenueEnd - extrapolatedCostEnd) * 100) / 100;
      const extrapolatedMarginPercentEnd = extrapolatedRevenueEnd > 0
        ? Math.round((extrapolatedMarginEnd / extrapolatedRevenueEnd) * 1000) / 10
        : 0;

      // 5. Deviations & Alerts
      const hoursDeviationPercent = plannedHours > 0
        ? Math.round(((extrapolatedHoursEnd - plannedHours) / plannedHours) * 1000) / 10
        : 0;
      const revenueDeviationPercent = plannedRevenue > 0
        ? Math.round(((extrapolatedRevenueEnd - plannedRevenue) / plannedRevenue) * 1000) / 10
        : 0;

      const isThresholdExceeded = Math.abs(hoursDeviationPercent) >= threshold;
      const alertSeverity = isThresholdExceeded ? 'CRITICAL' : Math.abs(hoursDeviationPercent) >= 10 ? 'WARNING' : 'OK';

      const remainingBudgetHours = project.budgetHours ? Math.round(Math.max(0, project.budgetHours - actualHoursSoFar) * 10) / 10 : undefined;
      const hoursBurnPercent = project.budgetHours ? Math.round((actualHoursSoFar / project.budgetHours) * 100) : undefined;

      // 6. Member Breakdown
      const userIds = new Set<string>();
      activePeriodForecasts.forEach(f => userIds.add(f.userId));
      actualEntries.forEach(e => userIds.add(e.userId));

      const teamBreakdown = Array.from(userIds).map(uid => {
        const userObj = this.users.find(u => u.id === uid);
        const roleObj = userObj?.jobRoleId ? this.jobRoles.find(r => r.id === userObj.jobRoleId) : undefined;
        const uForecasts = activePeriodForecasts.filter(f => f.userId === uid);
        const uEntries = actualEntries.filter(t => t.userId === uid);

        const uPlannedH = Math.round(uForecasts.reduce((sum, f) => sum + f.plannedHours, 0) * 10) / 10;
        const uPlannedRev = Math.round(uForecasts.reduce((sum, f) => sum + f.plannedRevenue, 0) * 100) / 100;
        const uPlannedCost = Math.round(uForecasts.reduce((sum, f) => sum + f.plannedCost, 0) * 100) / 100;
        const uPlannedMargin = Math.round((uPlannedRev - uPlannedCost) * 100) / 100;

        const uActualH = Math.round(uEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0) * 10) / 10;
        const uActualRev = Math.round(uEntries.reduce((sum, e) => sum + e.calculatedAmount, 0) * 100) / 100;
        const uActualCost = Math.round(uEntries.reduce((sum, e) => sum + (e.calculatedCost || 0), 0) * 100) / 100;
        const uActualMargin = Math.round((uActualRev - uActualCost) * 100) / 100;

        const uExtrapolatedH = isPastPeriod
          ? uActualH
          : isFuturePeriod
            ? uPlannedH
            : Math.round(uActualH * periodExtrapolationFactor * 10) / 10;

        const uDevPercent = uPlannedH > 0 ? Math.round(((uExtrapolatedH - uPlannedH) / uPlannedH) * 1000) / 10 : 0;
        const isExceeded = Math.abs(uDevPercent) >= threshold;

        const rates = this.resolveRates(uid, project.id);

        return {
          userId: uid,
          userName: userObj?.name || 'Mitarbeiter',
          jobRoleName: roleObj?.name,
          hourlyBillingRate: rates.billingRate,
          hourlyCostRate: rates.costRate,
          plannedHours: uPlannedH,
          actualHours: uActualH,
          extrapolatedHours: uExtrapolatedH,
          plannedRevenue: uPlannedRev,
          plannedCost: uPlannedCost,
          plannedMargin: uPlannedMargin,
          actualRevenue: uActualRev,
          actualCost: uActualCost,
          actualMargin: uActualMargin,
          hoursDeviationPercent: uDevPercent,
          isExceeded
        };
      });

      // 7. Monthly Breakdown
      const monthlyBreakdown = months.map(m => {
        const [mY, mM] = m.split('-').map(Number);
        const mDays = new Date(mY, mM, 0).getDate();
        const mStart = `${m}-01`;
        const mEnd = `${m}-${String(mDays).padStart(2, '0')}`;

        const mEntries = actualEntries.filter(t => t.date >= mStart && t.date <= mEnd);
        const mForecasts = activePeriodForecasts.filter(f => f.month === m);

        const mPlannedH = Math.round(mForecasts.reduce((sum, f) => sum + f.plannedHours, 0) * 10) / 10;
        const mPlannedRev = Math.round(mForecasts.reduce((sum, f) => sum + f.plannedRevenue, 0) * 100) / 100;
        const mPlannedCost = Math.round(mForecasts.reduce((sum, f) => sum + f.plannedCost, 0) * 100) / 100;

        const mActualH = Math.round(mEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0) * 10) / 10;
        const mActualRev = Math.round(mEntries.reduce((sum, e) => sum + e.calculatedAmount, 0) * 100) / 100;
        const mActualCost = Math.round(mEntries.reduce((sum, e) => sum + (e.calculatedCost || 0), 0) * 100) / 100;

        const mWorkdays = getWorkingDaysInRange(mStart, mEnd, stateCode);
        const mPassed = mWorkdays.workdayDates.filter(d => d <= todayStr).length;
        const mFactor = (mPassed > 0 && mStart <= todayStr && mEnd >= todayStr) ? (mWorkdays.totalWorkdays / mPassed) : 1;
        const mExtrapolatedH = (mEnd < todayStr) ? mActualH : (mStart > todayStr) ? mPlannedH : Math.round(mActualH * mFactor * 10) / 10;

        return {
          month: m,
          monthLabel: `${monthShortDE[mM - 1]} ${mY}`,
          plannedHours: mPlannedH,
          actualHours: mActualH,
          extrapolatedHours: mExtrapolatedH,
          plannedRevenue: mPlannedRev,
          actualRevenue: mActualRev,
          plannedCost: mPlannedCost,
          actualCost: mActualCost,
          plannedMargin: Math.round((mPlannedRev - mPlannedCost) * 100) / 100
        };
      });

      projectsSummary.push({
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        billingModel: project.billingModel,
        status: project.status,
        budgetHours: project.budgetHours,
        totalFixedPrice: project.totalFixedPrice,
        periodType,
        periodKey,
        periodLabel,
        startDate,
        endDate,
        totalWorkdaysInPeriod,
        passedWorkdaysInPeriod,
        plannedHours,
        actualHoursSoFar,
        extrapolatedHoursEnd,
        remainingBudgetHours,
        hoursBurnPercent,
        plannedRevenue,
        plannedCost,
        plannedMargin,
        plannedMarginPercent,
        actualRevenueSoFar,
        actualCostSoFar,
        actualMarginSoFar,
        actualMarginPercentSoFar,
        extrapolatedRevenueEnd,
        extrapolatedCostEnd,
        extrapolatedMarginEnd,
        extrapolatedMarginPercentEnd,
        hoursDeviationPercent,
        revenueDeviationPercent,
        isThresholdExceeded,
        alertSeverity,
        teamBreakdown,
        monthlyBreakdown
      });
    });

    // 8. Overall KPI Aggregations across all projects
    const totalPlannedHours = Math.round(projectsSummary.reduce((sum, p) => sum + p.plannedHours, 0) * 10) / 10;
    const totalActualHours = Math.round(projectsSummary.reduce((sum, p) => sum + p.actualHoursSoFar, 0) * 10) / 10;
    const totalExtrapolatedHours = Math.round(projectsSummary.reduce((sum, p) => sum + p.extrapolatedHoursEnd, 0) * 10) / 10;

    const totalPlannedRevenue = Math.round(projectsSummary.reduce((sum, p) => sum + p.plannedRevenue, 0) * 100) / 100;
    const totalActualRevenue = Math.round(projectsSummary.reduce((sum, p) => sum + p.actualRevenueSoFar, 0) * 100) / 100;
    const totalExtrapolatedRevenue = Math.round(projectsSummary.reduce((sum, p) => sum + p.extrapolatedRevenueEnd, 0) * 100) / 100;

    const totalPlannedCost = Math.round(projectsSummary.reduce((sum, p) => sum + p.plannedCost, 0) * 100) / 100;
    const totalActualCost = Math.round(projectsSummary.reduce((sum, p) => sum + p.actualCostSoFar, 0) * 100) / 100;
    const totalExtrapolatedCost = Math.round(projectsSummary.reduce((sum, p) => sum + p.extrapolatedCostEnd, 0) * 100) / 100;

    const totalPlannedMargin = Math.round((totalPlannedRevenue - totalPlannedCost) * 100) / 100;
    const totalActualMargin = Math.round((totalActualRevenue - totalActualCost) * 100) / 100;
    const totalExtrapolatedMargin = Math.round((totalExtrapolatedRevenue - totalExtrapolatedCost) * 100) / 100;

    const plannedMarginPercent = totalPlannedRevenue > 0 ? Math.round((totalPlannedMargin / totalPlannedRevenue) * 1000) / 10 : 0;
    const actualMarginPercent = totalActualRevenue > 0 ? Math.round((totalActualMargin / totalActualRevenue) * 1000) / 10 : 0;
    const extrapolatedMarginPercent = totalExtrapolatedRevenue > 0 ? Math.round((totalExtrapolatedMargin / totalExtrapolatedRevenue) * 1000) / 10 : 0;

    const criticalProjectsCount = projectsSummary.filter(p => p.isThresholdExceeded).length;

    const stateObj = GERMAN_STATES.find(s => s.code === stateCode);

    return {
      periodType,
      periodKey,
      periodLabel,
      startDate,
      endDate,
      stateLocation: stateCode,
      locationCity: this.organization.locationCity || stateObj?.name || 'Berlin',
      holidaysInPeriod: periodWorkdaysInfo.holidaysInRange,
      totalWorkdaysInPeriod,
      passedWorkdaysInPeriod,
      extrapolationFactor: Math.round(periodExtrapolationFactor * 100) / 100,
      kpis: {
        totalPlannedHours,
        totalActualHours,
        totalExtrapolatedHours,
        totalPlannedRevenue,
        totalActualRevenue,
        totalExtrapolatedRevenue,
        totalPlannedCost,
        totalActualCost,
        totalExtrapolatedCost,
        totalPlannedMargin,
        totalActualMargin,
        totalExtrapolatedMargin,
        plannedMarginPercent,
        actualMarginPercent,
        extrapolatedMarginPercent,
        criticalProjectsCount,
        totalProjectsCount: projectsSummary.length
      },
      projects: projectsSummary
    };
  }

  // --- Clockify CSV Importer (Section 10) ---
  public importClockifyData(rows: any[], actorId: string): ClockifyImportReport {
    const report: ClockifyImportReport = {
      totalRows: rows.length,
      importedEntries: 0,
      skippedDuplicates: 0,
      errors: [],
      createdClients: [],
      createdProjects: [],
      createdTasks: [],
      createdUsers: [],
      timestamp: new Date().toISOString()
    };

    rows.forEach((row, index) => {
      try {
        const clientName = row['Client'] || row['Kunde'] || 'Standard Kunde';
        const projectName = row['Project'] || row['Projekt'] || 'Standard Projekt';
        const userName = row['User'] || row['Benutzer'] || row['Mitarbeiter'] || 'Importierter Mitarbeiter';
        const userEmail = row['Email'] || row['E-Mail'] || `${userName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        const taskName = row['Task'] || row['Aufgabe'];
        const description = row['Description'] || row['Beschreibung'] || '';
        const date = row['Start Date'] || row['Datum'] || row['Date'] || new Date().toISOString().split('T')[0];
        const startTime = row['Start Time'] || row['Startzeit'];
        const endTime = row['End Time'] || row['Endzeit'];

        // Duration parsing
        let durationMinutes = 60;
        if (row['Duration (decimal)']) {
          durationMinutes = Math.round(parseFloat(row['Duration (decimal)']) * 60);
        } else if (row['Duration (h)']) {
          const parts = String(row['Duration (h)']).split(':');
          if (parts.length >= 2) {
            durationMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        } else if (startTime && endTime) {
          durationMinutes = this.calculateMinutes(startTime, endTime);
        }

        const isBillable = String(row['Billable'] || row['Abrechenbar'] || 'Yes').toLowerCase().includes('y') ||
                           String(row['Billable'] || '').toLowerCase().includes('ja') ||
                           row['Billable'] === true;

        // 1. Ensure Client exists
        let client = this.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (!client) {
          client = this.addClient({ name: clientName });
          report.createdClients.push(clientName);
        }

        // 2. Ensure Project exists
        let project = this.projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
        if (!project) {
          project = this.addProject({ name: projectName, clientId: client.id, billingModel: 'TIME_AND_MATERIAL' }, actorId);
          report.createdProjects.push(projectName);
        }

        // 3. Ensure Task exists if provided
        let task: Task | undefined;
        if (taskName) {
          task = this.tasks.find(t => t.projectId === project!.id && t.name.toLowerCase() === taskName.toLowerCase());
          if (!task) {
            task = this.addTask({ projectId: project.id, name: taskName, isBillableDefault: isBillable });
            report.createdTasks.push(taskName);
          }
        }

        // 4. Ensure User exists
        let user = this.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase() || u.name.toLowerCase() === userName.toLowerCase());
        if (!user) {
          user = this.addUser({ name: userName, email: userEmail, role: 'EMPLOYEE' }, actorId);
          report.createdUsers.push(userName);
        }

        // 5. Duplicate Check
        const isDuplicate = this.timeEntries.some(e =>
          e.userId === user!.id &&
          e.projectId === project!.id &&
          e.date === date &&
          e.startTime === startTime &&
          e.durationMinutes === durationMinutes &&
          e.description === description
        );

        if (isDuplicate) {
          report.skippedDuplicates++;
          return;
        }

        // 6. Create Entry
        this.createTimeEntry({
          userId: user.id,
          userName: user.name,
          projectId: project.id,
          projectName: project.name,
          clientId: client.id,
          clientName: client.name,
          taskId: task?.id,
          taskName: task?.name,
          date,
          startTime,
          endTime,
          durationMinutes,
          description,
          isBillable,
          approvalStatus: 'APPROVED'
        }, actorId);

        report.importedEntries++;
      } catch (err: any) {
        report.errors.push({ row: index + 1, error: err.message || 'Parsing error', data: row });
      }
    });

    return report;
  }

  // --- API Key Management (Section 12.3) ---
  public createApiKey(name: string): ApiKey {
    const key: ApiKey = {
      id: 'apk-' + Date.now(),
      orgId: this.organization.id,
      name,
      key: 'ia_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      permissions: ['read:time-entries', 'read:working-time', 'read:forecasts']
    };
    this.apiKeys.push(key);
    return key;
  }

  public revokeApiKey(keyId: string): boolean {
    const key = this.apiKeys.find(k => k.id === keyId);
    if (!key) return false;
    key.status = 'REVOKED';
    return true;
  }

  public validateApiKey(apiKeyString: string): boolean {
    const found = this.apiKeys.find(k => k.key === apiKeyString && k.status === 'ACTIVE');
    if (found) {
      found.lastUsedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // --- Helpers ---
  private calculateMinutes(start: string, end: string): number {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let min = (eh * 60 + em) - (sh * 60 + sm);
      if (min < 0) min += 24 * 60; // Overnight handling
      return min;
    } catch {
      return 60;
    }
  }

  private logAudit(entry: Omit<AuditLogEntry, 'id' | 'orgId' | 'timestamp'>) {
    this.auditLogs.unshift({
      id: 'aud-' + (Date.now() + Math.floor(Math.random() * 1000)),
      orgId: this.organization.id,
      timestamp: new Date().toISOString(),
      ...entry
    });
  }
}

export const storage = new StorageService();
