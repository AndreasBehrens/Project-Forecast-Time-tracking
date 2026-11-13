-- Mandantenspezifische Import-Schemas (Konzept Datenimport §3.4)
CREATE TABLE IF NOT EXISTS "import_schemas" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_schemas_pkey" PRIMARY KEY ("seq")
);

CREATE INDEX IF NOT EXISTS "import_schemas_id_idx" ON "import_schemas"("id");

CREATE INDEX IF NOT EXISTS "import_schemas_orgId_idx" ON "import_schemas"("orgId");
