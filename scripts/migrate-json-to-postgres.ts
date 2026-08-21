// One-off migration: import the legacy JSON storage file into PostgreSQL.
//
// Usage:
//   DATABASE_URL="postgresql://user:pw@host:5432/db" \
//     npx tsx scripts/migrate-json-to-postgres.ts [path/to/app_storage.json]
//
// If no path is given, it defaults to data/app_storage.json relative to the
// current working directory. The script reads the JSON file, maps it to the
// AppStateSnapshot shape, and calls prismaStore.saveAll() which writes every
// entity into its own table (full domain object in a JSONB `data` column).
//
// This is idempotent: saveAll() performs a full replace inside a transaction,
// so re-running it simply re-imports the same state.

import fs from 'fs';
import path from 'path';
import * as prismaStore from '../server/prismaStore.js';
import type { AppStateSnapshot } from '../server/prismaStore.js';

async function main() {
  const inputPath = process.argv[2] || path.join(process.cwd(), 'data', 'app_storage.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Legacy storage file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading legacy JSON storage from: ${inputPath}`);
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data || !Array.isArray(data.organizations) || data.organizations.length === 0) {
    console.error('Invalid or empty storage file: no organizations found.');
    process.exit(1);
  }

  const snapshot: AppStateSnapshot = {
    organizations: data.organizations ?? [],
    activeOrgId: data.activeOrgId ?? 'org-insight-arcs-prod',
    users: data.users ?? [],
    jobRoles: data.jobRoles ?? [],
    clients: data.clients ?? [],
    partners: data.partners ?? [],
    projects: data.projects ?? [],
    tasks: data.tasks ?? [],
    timeEntries: data.timeEntries ?? [],
    workingTimeEntries: data.workingTimeEntries ?? [],
    auditLogs: data.auditLogs ?? [],
    forecasts: data.forecasts ?? [],
    apiKeys: data.apiKeys ?? [],
    periodLocks: data.periodLocks ?? [],
    thresholdPercent: typeof data.thresholdPercent === 'number' ? data.thresholdPercent : 20,
  };

  console.log('Importing state into PostgreSQL...');
  console.log(
    `  organizations=${snapshot.organizations.length}` +
    ` users=${snapshot.users.length}` +
    ` clients=${snapshot.clients.length}` +
    ` projects=${snapshot.projects.length}` +
    ` timeEntries=${snapshot.timeEntries.length}` +
    ` auditLogs=${snapshot.auditLogs.length}` +
    ` periodLocks=${snapshot.periodLocks.length}`
  );

  await prismaStore.saveAll(snapshot);
  await prismaStore.prisma.$disconnect();

  console.log('Migration completed successfully.');
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try {
    await prismaStore.prisma.$disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
