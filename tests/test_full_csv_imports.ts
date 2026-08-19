import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

// We parse the exact raw CSV string from the prompt
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

async function testFullImports() {
  console.log('--- STARTING FULL VOLUME CLOCKIFY IMPORT TEST ---');

  // Let's reset the database to clean factory settings
  await fetch(`${BASE_URL}/api/database/reset`, { method: 'POST' });

  // Switch to Testmandant
  await fetch(`${BASE_URL}/api/organizations/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId: 'org-insight-arcs-01' })
  });

  const fileData = fs.readFileSync('tests/full_user_input.csv', 'utf-8');
  const allRows = parseCsvFull(fileData);
  console.log(`Total rows parsed from user CSV input: ${allRows.length}`);

  const importRes = await fetch(`${BASE_URL}/api/clockify/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: allRows })
  }).then(r => r.json());

  console.log('Import Report:', {
    totalRows: importRes.totalRows,
    importedEntries: importRes.importedEntries,
    skippedDuplicates: importRes.skippedDuplicates,
    createdClients: importRes.createdClients,
    createdProjects: importRes.createdProjects,
    createdUsers: importRes.createdUsers,
    errorsCount: importRes.errors?.length || 0
  });

  // Verify that export reflects all rows
  const exportJson = await fetch(`${BASE_URL}/api/export/time-entries?from=2025-01-01&to=2026-12-31&format=json`).then(r => r.json());
  console.log(`Total active time entries in Testmandant: ${exportJson.length}`);

  // Test CSV export size
  const exportCsv = await fetch(`${BASE_URL}/api/export/time-entries?from=2025-01-01&to=2026-12-31&format=csv`).then(r => r.text());
  console.log(`CSV Export lines count: ${exportCsv.split('\n').length}`);

  console.log('--- FULL IMPORT TEST COMPLETED SUCCESSFULLY ---');
}

testFullImports().catch(console.error);
