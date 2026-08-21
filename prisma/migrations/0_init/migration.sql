-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organizations" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "users" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "email" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "clients" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "partners" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "projects" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "clientId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "tasks" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "projectId" TEXT,
    "date" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "working_time_entries" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "date" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_time_entries_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "forecast_entries" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "month" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecast_entries_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "entityId" TEXT,
    "timestamp" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "period_locks" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "periodKey" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_locks_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "app_state" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_state_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "organizations_id_idx" ON "organizations"("id");

-- CreateIndex
CREATE INDEX "users_id_idx" ON "users"("id");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "job_roles_id_idx" ON "job_roles"("id");

-- CreateIndex
CREATE INDEX "job_roles_orgId_idx" ON "job_roles"("orgId");

-- CreateIndex
CREATE INDEX "clients_id_idx" ON "clients"("id");

-- CreateIndex
CREATE INDEX "clients_orgId_idx" ON "clients"("orgId");

-- CreateIndex
CREATE INDEX "partners_id_idx" ON "partners"("id");

-- CreateIndex
CREATE INDEX "partners_orgId_idx" ON "partners"("orgId");

-- CreateIndex
CREATE INDEX "projects_id_idx" ON "projects"("id");

-- CreateIndex
CREATE INDEX "projects_orgId_idx" ON "projects"("orgId");

-- CreateIndex
CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");

-- CreateIndex
CREATE INDEX "tasks_id_idx" ON "tasks"("id");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "time_entries_id_idx" ON "time_entries"("id");

-- CreateIndex
CREATE INDEX "time_entries_orgId_idx" ON "time_entries"("orgId");

-- CreateIndex
CREATE INDEX "time_entries_userId_idx" ON "time_entries"("userId");

-- CreateIndex
CREATE INDEX "time_entries_projectId_idx" ON "time_entries"("projectId");

-- CreateIndex
CREATE INDEX "time_entries_date_idx" ON "time_entries"("date");

-- CreateIndex
CREATE INDEX "working_time_entries_id_idx" ON "working_time_entries"("id");

-- CreateIndex
CREATE INDEX "working_time_entries_orgId_idx" ON "working_time_entries"("orgId");

-- CreateIndex
CREATE INDEX "working_time_entries_userId_idx" ON "working_time_entries"("userId");

-- CreateIndex
CREATE INDEX "working_time_entries_date_idx" ON "working_time_entries"("date");

-- CreateIndex
CREATE INDEX "forecast_entries_id_idx" ON "forecast_entries"("id");

-- CreateIndex
CREATE INDEX "forecast_entries_orgId_idx" ON "forecast_entries"("orgId");

-- CreateIndex
CREATE INDEX "forecast_entries_projectId_idx" ON "forecast_entries"("projectId");

-- CreateIndex
CREATE INDEX "forecast_entries_userId_idx" ON "forecast_entries"("userId");

-- CreateIndex
CREATE INDEX "forecast_entries_month_idx" ON "forecast_entries"("month");

-- CreateIndex
CREATE INDEX "audit_logs_id_idx" ON "audit_logs"("id");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "period_locks_id_idx" ON "period_locks"("id");

-- CreateIndex
CREATE INDEX "period_locks_orgId_idx" ON "period_locks"("orgId");

-- CreateIndex
CREATE INDEX "period_locks_periodKey_idx" ON "period_locks"("periodKey");

-- CreateIndex
CREATE INDEX "api_keys_id_idx" ON "api_keys"("id");

-- CreateIndex
CREATE INDEX "api_keys_orgId_idx" ON "api_keys"("orgId");

