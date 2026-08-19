import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

// Real Clockify CSV 1 (PitBIM / pit-cup)
const CSV_1_CONTENT = `"Project","Client","Description","Task","User","Group","Email","Tags","Billable","Start Date","Start Time","End Date","End Time","Duration (h)","Duration (decimal)","Billable Rate (EURO)","Billable Amount (EURO)","Date of creation"
"PitBIM","pit-cup","- 08:05 - 12:00: Refactor the source code and add hash query paramater to apis for the block library feature. - 13:00 - 15:00: Update documentation after refactoring. - 15:00 - 15:05: Daily meeting. - 15:05 - 17:05: Build the package and test all apis.","","u.lypham","Unitech","lypt@unitech.vn","","Yes","18.08.2026","04:00:00","18.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","18.08.2026"
"PitBIM","pit-cup","","","truongnv","Unitech","truongnv@unitech.vn","","Yes","18.08.2026","04:00:00","18.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","18.08.2026"
"PitBIM","pit-cup","08:02 - 12:03: Focused on investigating the INSERT entity snap-point issue 13:00 - 17:05: Analyzing the CDA tree.","","truongnv","Unitech","truongnv@unitech.vn","","Yes","17.08.2026","04:00:00","17.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","17.08.2026"
"PitBIM","pit-cup","- 08:00 - 12:00: Created documentation for the block library feature. - 13:00 - 14:30: Test and encountered an issue where file uploads to ODA with error message is Storage used is full. - 14:30 - 17:00: Investigate and fix the issue.","","u.lypham","Unitech","lypt@unitech.vn","","Yes","17.08.2026","04:00:00","17.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","17.08.2026"
"PitBIM","pit-cup","08:01 - 12:05: Focused on completing the BVH tree implementation. 13:01 - 17:06: Focused on completing the BVH tree implementation.","","truongnv","Unitech","truongnv@unitech.vn","","Yes","14.08.2026","04:00:00","14.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","14.08.2026"
"PitBIM","pit-cup","- 08:00 - 10:30: Refactored test cases according to the coding guidelines. - 10:30 - 12:00: Resolved ESLint issues and security vulnerabilities. Built and validated the deployment package. - 13:00 - 17:00: Created documentation for the Multi-Tenant Management feature.","","u.lypham","Unitech","lypt@unitech.vn","","Yes","14.08.2026","04:00:00","14.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","14.08.2026"
"PitBIM","pit-cup","08:04 - 12:03: Continued working on the BVH tree. Also tested hardcoding a heavy block and found that the snapping performance 13:01 - 17:10: Fixing an issue where some entities are not being selected correctly within the target bounding box","","truongnv","Unitech","truongnv@unitech.vn","","Yes","13.08.2026","04:00:00","13.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","13.08.2026"
"PitBIM","pit-cup","- 08:05 - 12:00: Add test cases for CPITRuntimeBlockLibraryService. - 13:00 - 15:00: Add test cases for CPITRuntimeBlockLibraryService. - 15:00 - 17:05: Test coverage and add more test cases for CPITRuntimeBlockLibraryService.","","u.lypham","Unitech","lypt@unitech.vn","","Yes","13.08.2026","04:00:00","13.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","13.08.2026"
"PitBIM","pit-cup","08:00 - 12:05: Built a cache tree for the extent entities of heavy blocks based on the BVH (Bounding Volume Hierarchy) technique. 13:02 - 17:05: Built a cache tree for the extent entities of heavy blocks based on the BVH (Bounding Volume Hierarchy) technique.","","truongnv","Unitech","truongnv@unitech.vn","","Yes","12.08.2026","04:00:00","12.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","13.08.2026"
"PitBIM","pit-cup","- 08:00 - 12:00: Add test cases for CPITRuntimeBlockLibraryRepository. - 13:00 - 14:00: Run all test and fix eslint issues. - 14:00 - 17:00: Add test cases for CPITRuntimeBlockLibraryService.","","u.lypham","Unitech","lypt@unitech.vn","","Yes","12.08.2026","04:00:00","12.08.2026","12:00:00","08:00:00","8.00","26.25","210.00","12.08.2026"
"PitBIM","pit-cup","PBI 9: Storage Summary - Unit tests & OpenAPI","","vunp","Unitech","vunp@unitech.vn","","Yes","03.07.2026","11:00:00","03.07.2026","12:00:00","01:00:00","1.00","26.25","26.25","27.07.2026"
"PitBIM","pit-cup","PBI 8: Common File Management - Code review fixes","","vunp","Unitech","vunp@unitech.vn","","Yes","02.07.2026","11:00:00","02.07.2026","12:00:00","01:00:00","1.00","26.25","26.25","27.07.2026"`;

// Real Clockify CSV 2 (Linde Nintex Migration / digital cuisine)
const CSV_2_CONTENT = `"Project","Client","Description","Task","User","Group","Email","Tags","Billable","Start Date","Start Time","End Date","End Time","Duration (h)","Duration (decimal)","Billable Rate (EURO)","Billable Amount (EURO)","Date of creation"
"Linde Nintex Migration","digital cuisine","TASK TASK 264617 - (alteração/adaptação)","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","17.08.2026","13:00:00","17.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","17.08.2026"
"Linde Nintex Migration","digital cuisine","TASK 264560 - 1-Fluxo FGM-Junto - Inicial_","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","14.08.2026","13:00:00","14.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","14.08.2026"
"Linde Nintex Migration","digital cuisine","TASK 264560 - 1-Fluxo FGM-Junto - Inicial_","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","13.08.2026","13:00:00","13.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","13.08.2026"
"Linde Nintex Migration","digital cuisine","TASK 264560 - 1-Fluxo FGM-Junto - Inicial_","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","12.08.2026","13:00:00","12.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","12.08.2026"
"Linde Nintex Migration","digital cuisine","TASK 264560 - FGM BR - Gerenciador Mod Permanente-0","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","11.08.2026","13:00:00","11.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","11.08.2026"
"Linde Nintex Migration","digital cuisine","TASK 264560 - FGM BR - Gerenciador Mod Permanente-0","","matheus.truyts","Pronext","matheus.truyts@pronext.com.br","","Yes","10.08.2026","13:00:00","10.08.2026","21:00:00","08:00:00","8.00","31.25","250.00","10.08.2026"
"Linde Nintex Migration","digital cuisine","","meeting","Alp Bilgin","Insight Arcs","alp.bilgin@insightarcs.com","","Yes","24.07.2026","17:00:00","24.07.2026","21:00:00","04:00:00","4.00","31.25","125.00","27.07.2026"
"Linde Nintex Migration","digital cuisine","264560 FGM Brasil - Análise do Flow -0 e -1 para inicio do desenvolvimento","","Henrique.santana","Pronext","henrique.santana@pronext.com.br","","Yes","28.05.2026","18:00:00","28.05.2026","19:00:00","01:00:00","1.00","31.25","31.25","28.05.2026"
"Linde Nintex Migration","digital cuisine","264560 - FGM Brasil","","Júlio Reis","Insight Arcs","julio.reis@insightarcs.com","","Yes","28.04.2026","09:00:00","28.04.2026","17:00:00","08:00:00","8.00","31.25","250.00","04.05.2026"
"Linde Nintex Migration","digital cuisine","260479","","anita.rijal","Insight Arcs","anita.rijal@insightarcs.com","","Yes","30.01.2026","09:00:00","30.01.2026","17:00:00","08:00:00","8.00","31.25","250.00","30.01.2026"
"Linde Nintex Migration","digital cuisine","260380 - West Region > Asset Requests Workflow","","Gustavo Salgado","Pronext","gustavo.salgado@pronext.com.br","","Yes","30.01.2026","13:00:00","30.01.2026","21:00:00","08:00:00","8.00","31.25","250.00","30.01.2026"
"Linde Nintex Migration","digital cuisine","264560 - Comunicação de Nivel.xoml","","Maisa.moreira","Pronext","maisa.moreira@pronext.com.br","","Yes","10.04.2026","14:00:00","10.04.2026","22:00:00","08:00:00","8.00","31.25","250.00","20.04.2026"`;

// Full RFC 4180 tokenizer
function parseCsvFull(text: string) {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!cleanText) return [];

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c.length > 0)) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c.length > 0)) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length < 2) return [];
  const headers = rawRows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const result: any[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const obj: any = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx].replace(/^["']|["']$/g, '').trim() : '';
    });
    result.push(obj);
  }
  return result;
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('   END-TO-END QUALITÄTSSICHERUNG & TESTSUITE');
  console.log('   1. Mandanten / Datensicherung & Persistenz');
  console.log('   2. Clockify-Import & Export mit echten CSV-Dateien');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [BESTANDEN] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FEHLER] ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TESTFALL 1: WERKSEINSTELLUNGEN & DATENSTRUKTUR
  // -------------------------------------------------------------
  console.log('--- TESTFALL 1: WERKSEINSTELLUNGEN (FACTORY RESET) ---');
  const resetRes = await fetch(`${BASE_URL}/api/database/reset`, { method: 'POST' }).then(r => r.json());
  assert(resetRes.success === true, 'POST /api/database/reset antwortet erfolgreich');

  const orgs = await fetch(`${BASE_URL}/api/organizations`).then(r => r.json());
  assert(orgs.length === 4, `Genau 4 Mandanten angelegt (Ist: ${orgs.length})`);

  const allUsers = await fetch(`${BASE_URL}/api/users?allOrgs=true`).then(r => r.json());
  const allProjects = await fetch(`${BASE_URL}/api/projects?allOrgs=true`).then(r => r.json());
  const allClients = await fetch(`${BASE_URL}/api/clients?allOrgs=true`).then(r => r.json());

  const prodUsers = allUsers.filter((u: any) => u.orgId === 'org-insight-arcs-prod' || u.memberships?.some((m: any) => m.orgId === 'org-insight-arcs-prod'));
  const testUsers = allUsers.filter((u: any) => u.orgId === 'org-insight-arcs-01' || u.memberships?.some((m: any) => m.orgId === 'org-insight-arcs-01'));
  const testProjects = allProjects.filter((p: any) => p.orgId === 'org-insight-arcs-01');
  const testClients = allClients.filter((c: any) => c.orgId === 'org-insight-arcs-01');

  assert(prodUsers.length === 1, `Hauptmandant hat genau 1 Benutzer (Superadmin): Ist ${prodUsers.length}`);
  assert(testUsers.length === 21, `Testmandant hat 21 Mitarbeiter: Ist ${testUsers.length}`);
  assert(testProjects.length === 5, `Testmandant hat 5 Projekte: Ist ${testProjects.length}`);
  assert(testClients.length === 5, `Testmandant hat 5 Kunden: Ist ${testClients.length}`);

  // -------------------------------------------------------------
  // TESTFALL 2: MANDANTENWECHSEL & DATENISOLATION
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 2: MANDANTENWECHSEL & DATENISOLATION ---');
  // 2.1 Zu NovaTech wechseln
  const switchNova = await fetch(`${BASE_URL}/api/organizations/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId: 'org-novatech-solutions-02' })
  }).then(r => r.json());
  assert(switchNova.success === true, 'Umschalten auf NovaTech Solutions GmbH erfolgreich');

  const novaProjects = await fetch(`${BASE_URL}/api/projects`).then(r => r.json());
  assert(novaProjects.length === 1, `NovaTech sieht isoliert genau 1 Projekt (Ist: ${novaProjects.length})`);
  assert(novaProjects[0].name === 'Autonomous Driving Sensor Data Ingestion', `Projektname: "${novaProjects[0].name}"`);

  // 2.2 Zu Helios wechseln
  const switchHelios = await fetch(`${BASE_URL}/api/organizations/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId: 'org-helios-consulting-03' })
  }).then(r => r.json());
  assert(switchHelios.success === true, 'Umschalten auf Helios Digital Advisory AG erfolgreich');

  const heliosProjects = await fetch(`${BASE_URL}/api/projects`).then(r => r.json());
  assert(heliosProjects.length === 1, `Helios sieht isoliert genau 1 Projekt (Ist: ${heliosProjects.length})`);
  assert(heliosProjects[0].name === 'Digital Port Twin Strategy & Roadmap', `Projektname: "${heliosProjects[0].name}"`);

  // -------------------------------------------------------------
  // TESTFALL 3: NEUANLAGE EINES MANDANTEN
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 3: NEUANLAGE EINES MANDANTEN ---');
  const createOrgRes = await fetch(`${BASE_URL}/api/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Skyline Cloud Systems GmbH',
      code: 'SKY-FRA',
      defaultHourlyBillingRate: 165,
      defaultHourlyCostRate: 85,
      defaultCurrency: 'EUR',
      stateLocation: 'DE-HE',
      locationCity: 'Frankfurt am Main',
      allowMobileWorkplaces: true,
      logoColor: 'blue'
    })
  }).then(r => r.json());

  assert(!!createOrgRes.id, `Mandant "Skyline Cloud Systems GmbH" erfolgreich angelegt (ID: ${createOrgRes.id})`);
  assert(createOrgRes.defaultHourlyBillingRate === 165, 'Stundensatz 165 EUR korrekt gespeichert');

  // -------------------------------------------------------------
  // TESTFALL 4: DATENSICHERUNG (DUMP EXPORT & RESTORE IMPORT)
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 4: DATENSICHERUNG (JSON DUMP EXPORT & IMPORT) ---');
  const backupDump = await fetch(`${BASE_URL}/api/database/export`).then(r => r.json());
  assert(Array.isArray(backupDump.organizations) && backupDump.organizations.length === 5, 'Backup Dump enthält alle 5 Mandanten');
  assert(Array.isArray(backupDump.users) && backupDump.users.length >= 21, 'Backup Dump enthält Benutzer');
  assert(Array.isArray(backupDump.timeEntries), 'Backup Dump enthält Zeiteinträge');

  // Jetzt Zurücksetzen auf 4 Mandanten per Reset
  await fetch(`${BASE_URL}/api/database/reset`, { method: 'POST' });
  const orgsAfterReset = await fetch(`${BASE_URL}/api/organizations`).then(r => r.json());
  assert(orgsAfterReset.length === 4, 'Nach Reset wieder 4 Mandanten');

  // Jetzt Backup Dump einspielen
  const importDumpRes = await fetch(`${BASE_URL}/api/database/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupDump)
  }).then(r => r.json());
  assert(importDumpRes.success === true, 'Backup Restore POST /api/database/import erfolgreich');

  const orgsAfterRestore = await fetch(`${BASE_URL}/api/organizations`).then(r => r.json());
  assert(orgsAfterRestore.length === 5, 'Nach Restore wieder alle 5 Mandanten vollständig hergestellt');

  // Reset wieder auf sauberen Zustand für Clockify-Tests
  await fetch(`${BASE_URL}/api/database/reset`, { method: 'POST' });

  // -------------------------------------------------------------
  // TESTFALL 5: CLOCKIFY IMPORT (CSV 1: PitBIM / pit-cup)
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 5: CLOCKIFY IMPORT (CSV 1: PitBIM / pit-cup) ---');
  // Zu Testmandant wechseln
  await fetch(`${BASE_URL}/api/organizations/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId: 'org-insight-arcs-01' })
  });

  const parsedCsv1 = parseCsvFull(CSV_1_CONTENT);
  assert(parsedCsv1.length === 12, `CSV 1 RFC-4180 Parsing: ${parsedCsv1.length} Zeilen erkannt`);

  const import1Res = await fetch(`${BASE_URL}/api/clockify/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: parsedCsv1 })
  }).then(r => r.json());

  assert(import1Res.importedEntries === 12, `12 Zeiteinträge importiert (Ergebnis: ${import1Res.importedEntries})`);
  assert(import1Res.createdProjects.includes('PitBIM'), 'Projekt "PitBIM" automatisch angelegt');
  assert(import1Res.createdClients.includes('pit-cup'), 'Kunde "pit-cup" automatisch angelegt');
  assert(import1Res.createdUsers.some((u: string) => u.includes('lypham') || u.includes('truongnv')), 'Mitarbeiter (u.lypham, truongnv) angelegt');

  // 5.2 Duplikatsprüfung bei erneutem Import von CSV 1
  const reimport1Res = await fetch(`${BASE_URL}/api/clockify/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: parsedCsv1 })
  }).then(r => r.json());
  assert(reimport1Res.skippedDuplicates === 12, `Duplikatsprüfung: Alle ${reimport1Res.skippedDuplicates} Zeilen als Duplikat übersprungen`);
  assert(reimport1Res.importedEntries === 0, 'Keine doppelten Zeiteinträge erstellt');

  // -------------------------------------------------------------
  // TESTFALL 6: CLOCKIFY IMPORT (CSV 2: Linde Nintex Migration / digital cuisine)
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 6: CLOCKIFY IMPORT (CSV 2: Linde Nintex Migration) ---');
  const parsedCsv2 = parseCsvFull(CSV_2_CONTENT);
  assert(parsedCsv2.length === 12, `CSV 2 RFC-4180 Parsing: ${parsedCsv2.length} Zeilen erkannt`);

  const import2Res = await fetch(`${BASE_URL}/api/clockify/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: parsedCsv2 })
  }).then(r => r.json());

  assert(import2Res.importedEntries === 12, `12 Zeiteinträge importiert (Ergebnis: ${import2Res.importedEntries})`);
  assert(import2Res.createdProjects.includes('Linde Nintex Migration'), 'Projekt "Linde Nintex Migration" automatisch angelegt');
  assert(import2Res.createdClients.includes('digital cuisine'), 'Kunde "digital cuisine" automatisch angelegt');

  // -------------------------------------------------------------
  // TESTFALL 7: ZEITERFASSUNGS-EXPORT (CSV & JSON)
  // -------------------------------------------------------------
  console.log('\n--- TESTFALL 7: ZEITERFASSUNGS-EXPORT (CSV & JSON) ---');
  const exportCsv = await fetch(`${BASE_URL}/api/export/time-entries?from=2025-01-01&to=2026-12-31&format=csv`).then(r => r.text());
  assert(exportCsv.includes('ID;Date;User;Client;Project;Task'), 'CSV-Export enthält standardkonformen Tabellen-Header mit Semikolon');
  assert(exportCsv.includes('PitBIM') && exportCsv.includes('Linde Nintex Migration'), 'CSV-Export enthält die importierten Buchungen von PitBIM und Linde Nintex');

  const exportJson = await fetch(`${BASE_URL}/api/export/time-entries?from=2025-01-01&to=2026-12-31&format=json`).then(r => r.json());
  assert(Array.isArray(exportJson) && exportJson.length >= 24, `JSON-Export liefert valides Daten-Array mit ${exportJson.length} Buchungen`);

  const pitBimEntry = exportJson.find((e: any) => e.projectName === 'PitBIM');
  assert(pitBimEntry && pitBimEntry.clientName === 'pit-cup', 'JSON-Export validiert Verknüpfung Projekt PitBIM -> Kunde pit-cup');
  assert(pitBimEntry.hourlyBillingRate === 26.25, `Stundensatz 26.25 EUR im Zeiteintrag korrekt hinterlegt (Ist: ${pitBimEntry.hourlyBillingRate})`);

  const lindeEntry = exportJson.find((e: any) => e.projectName === 'Linde Nintex Migration');
  assert(lindeEntry && lindeEntry.clientName === 'digital cuisine', 'JSON-Export validiert Verknüpfung Linde Nintex Migration -> digital cuisine');
  assert(lindeEntry.hourlyBillingRate === 31.25, `Stundensatz 31.25 EUR im Zeiteintrag korrekt hinterlegt (Ist: ${lindeEntry.hourlyBillingRate})`);

  console.log('\n===============================================================');
  console.log(`   GESAMTERGEBNIS: ${passed} von ${passed + failed} Tests erfolgreich bestanden`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error during E2E test execution:', err);
  process.exit(1);
});
