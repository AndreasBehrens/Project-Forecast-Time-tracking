import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const TEST_PORT = 3000;

// Helper to make HTTP requests
function request(path: string, options: any = {}): Promise<{ status: number; data: any; headers: any; text: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:${TEST_PORT}${path}`,
      {
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = null;
          }
          resolve({
            status: res.statusCode || 0,
            data,
            headers: res.headers,
            text: raw
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testProductionDeployment() {
  console.log('=== TESTE PRODUKTIONS-DEPLOYMENT / PUBLISHING DER DATEN ===\n');

  // 1. Verify physical storage file
  const hasStorageFile = fs.existsSync('data/app_storage.json');
  console.log(`1. Prüfe physische Datendatei data/app_storage.json: ${hasStorageFile ? 'VORHANDEN' : 'NICHT VORHANDEN'}`);
  if (hasStorageFile) {
    const stats = fs.statSync('data/app_storage.json');
    console.log(`   Dateigröße: ${(stats.size / 1024).toFixed(2)} KB`);
    const content = JSON.parse(fs.readFileSync('data/app_storage.json', 'utf-8'));
    console.log(`   Enthaltene Mandanten im Dateisystem: ${content.organizations?.length}`);
    console.log(`   Enthaltene Benutzer im Dateisystem: ${content.users?.length}`);
    console.log(`   Enthaltene Projekte im Dateisystem: ${content.projects?.length}`);
    console.log(`   Enthaltene Buchungen im Dateisystem: ${content.timeEntries?.length}`);
  }

  // 2. Check production bundle exists
  const hasServerBundle = fs.existsSync('dist/server.cjs');
  const hasIndexHtml = fs.existsSync('dist/index.html');
  console.log(`2. Prüfe Produktions-Build dist/server.cjs: ${hasServerBundle ? 'VORHANDEN' : 'NICHT VORHANDEN'}`);
  console.log(`3. Prüfe SPA-Frontend dist/index.html: ${hasIndexHtml ? 'VORHANDEN' : 'NICHT VORHANDEN'}`);

  let passed = 0;
  let failed = 0;
  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(`  ✓ [BESTANDEN] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FEHLER] ${msg}`);
      failed++;
    }
  }

  assert(hasStorageFile, 'data/app_storage.json ist im Dateisystem vorhanden und wird beim Publishen mitkopiert');
  assert(hasServerBundle, 'dist/server.cjs ist erfolgreich kompiliert');
  assert(hasIndexHtml, 'dist/index.html ist für die Produktionsauslieferung vorhanden');

  // Test live endpoints
  const orgsRes = await request('/api/organizations');
  assert(orgsRes.status === 200 && Array.isArray(orgsRes.data) && orgsRes.data.length >= 4, `Mandanten via API abrufbar (${orgsRes.data?.length} Mandanten)`);

  const usersRes = await request('/api/users?allOrgs=true');
  assert(usersRes.status === 200 && Array.isArray(usersRes.data) && usersRes.data.length >= 21, `Benutzer & Rollen via API abrufbar (${usersRes.data?.length} Benutzer)`);

  const projRes = await request('/api/projects?allOrgs=true');
  assert(projRes.status === 200 && Array.isArray(projRes.data) && projRes.data.length >= 5, `Projekte via API abrufbar (${projRes.data?.length} Projekte)`);

  const backupRes = await request('/api/database/export');
  assert(backupRes.status === 200 && !!backupRes.data?.organizations, 'Datenbank-Sicherung ist vollständig exportierbar');

  console.log(`\n=== ERGEBNIS PRODUKTIONS- & PUBLISHING-TEST: ${passed}/${passed + failed} Tests bestanden ===\n`);
}

testProductionDeployment().catch(err => {
  console.error('Fehler bei Produktionsprüfung:', err);
  process.exit(1);
});
