import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ClockifyImportReport, ImportDryRunResult, ImportBatchView, ImportRowStatus } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Database,
  FileText,
  Building2,
  Users,
  Eye,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Undo2,
  History,
  SearchCheck,
  Wand2
} from 'lucide-react';
import { ImportWizard } from './ImportWizard';
import { ExportPanel } from './ExportPanel';

export const ClockifyMigrationView: React.FC = () => {
  const {
    t,
    importClockify,
    timeEntries,
    organization,
    organizations,
    switchOrganization,
    activeOrgId,
    refreshAllData,
    users,
    projects,
    parseClockifyPdf,
    executeClockifyPdfImport,
    currentUser
  } = useApp();

  // Rollen: Importe (inkl. Historie, Werksreset, Mandantenwahl) nur Admins;
  // XLSX-Exporte für Admins und interne Projektmanager; Rohdatenexport nur Admins.
  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === 'u-1';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';
  const isInternal = currentUser?.employmentType === 'INTERNAL' || (!currentUser?.employmentType && !currentUser?.companyName);
  const canXlsxExport = (isAdmin || isPM) && isInternal;

  const [csvContent, setCsvContent] = useState<string>('');
  const [importReport, setImportReport] = useState<ClockifyImportReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // --- Probelauf & Import-Historie (Datenimport Phase 1) ---
  const [dryRun, setDryRun] = useState<ImportDryRunResult | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [batches, setBatches] = useState<ImportBatchView[] | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const loadBatches = useCallback(async () => {
    if (!isAdmin) { setBatches(null); return; }
    setBatchesLoading(true);
    try {
      const res = await fetch('/api/import/batches');
      if (res.ok) setBatches(await res.json());
      else setBatches(null); // z. B. 403 für Rollen ohne Importrecht
    } catch {
      setBatches(null);
    } finally {
      setBatchesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadBatches(); }, [loadBatches, activeOrgId]);

  // --- Bereich: Import-Assistent, Clockify CSV, Clockify PDF oder Export (PMs landen direkt im Export) ---
  type PageTab = 'wizard' | 'csv' | 'pdf' | 'export';
  const [importSource, setImportSource] = useState<PageTab>(isAdmin ? 'wizard' : 'export');
  useEffect(() => { if (!isAdmin && importSource !== 'export') setImportSource('export'); }, [isAdmin, importSource]);
  const [pdfChecksum, setPdfChecksum] = useState<string | undefined>(undefined);

  // --- PDF-Import Workflow ---
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStep, setPdfStep] = useState<1 | 2 | 3>(1);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfEntries, setPdfEntries] = useState<any[]>([]);
  const [pdfUsers, setPdfUsers] = useState<string[]>([]);
  const [pdfProjects, setPdfProjects] = useState<string[]>([]);
  const [pdfImportType, setPdfImportType] = useState<'working-time' | 'time-entries'>('working-time');
  const [pdfUserMapping, setPdfUserMapping] = useState<Record<string, string>>({});
  const [pdfProjectMapping, setPdfProjectMapping] = useState<Record<string, string>>({});
  const [pdfSkipDuplicates, setPdfSkipDuplicates] = useState(true);
  const [pdfResult, setPdfResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const pdfDateRange = useMemo(() => {
    if (!pdfEntries.length) return null;
    const dates = pdfEntries.map(e => e.date).sort();
    return { from: dates[0], to: dates[dates.length - 1] };
  }, [pdfEntries]);

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfError(null);
    }
  };

  const handleParsePdf = async () => {
    if (!pdfFile) return;
    setPdfParsing(true);
    setPdfError(null);
    try {
      const result = await parseClockifyPdf(pdfFile);
      if (!result.totalEntries) {
        setPdfError('Es konnten keine Einträge aus der PDF gelesen werden. Bitte prüfen, ob es sich um einen Clockify "Detailed Report" handelt.');
        setPdfParsing(false);
        return;
      }
      setPdfEntries(result.entries);
      setPdfChecksum(result.checksum);
      setPdfUsers(result.users);
      setPdfProjects(result.projects);
      // Auto-Mapping: Clockify-Name -> App-User mit exakt gleichem Namen
      const autoUserMapping: Record<string, string> = {};
      result.users.forEach(cn => {
        const match = users.find(u => u.name.toLowerCase().trim() === cn.toLowerCase().trim());
        if (match) autoUserMapping[cn] = match.id;
      });
      setPdfUserMapping(autoUserMapping);
      setPdfProjectMapping({});
      setPdfStep(2);
    } catch (err: any) {
      setPdfError(err?.message || 'Fehler beim Analysieren der PDF');
    } finally {
      setPdfParsing(false);
    }
  };

  const handleExecutePdfImport = async () => {
    setPdfImporting(true);
    setPdfError(null);
    try {
      const projectMapping: Record<string, { projectId: string; clientId: string }> = {};
      if (pdfImportType === 'time-entries') {
        Object.keys(pdfProjectMapping).forEach(pt => {
          const projId = pdfProjectMapping[pt];
          if (projId && projId !== '__skip__') {
            const proj = projects.find(p => p.id === projId);
            projectMapping[pt] = { projectId: projId, clientId: proj?.clientId || '' };
          }
        });
      }
      const result = await executeClockifyPdfImport({
        entries: pdfEntries,
        importType: pdfImportType,
        userMapping: pdfUserMapping,
        projectMapping,
        skipDuplicates: pdfSkipDuplicates,
        fileName: pdfFile?.name,
        fileChecksum: pdfChecksum
      });
      setPdfResult(result);
      setPdfStep(3);
      loadBatches();
    } catch (err: any) {
      setPdfError(err?.message || 'Fehler beim Import');
    } finally {
      setPdfImporting(false);
    }
  };

  const resetPdfWorkflow = () => {
    setPdfFile(null);
    setPdfStep(1);
    setPdfEntries([]);
    setPdfUsers([]);
    setPdfProjects([]);
    setPdfUserMapping({});
    setPdfProjectMapping({});
    setPdfResult(null);
    setPdfError(null);
  };

  // Sample CSV helper to let user test immediately with Clockify format
  const loadSampleClockifyCsv = () => {
    const sample = `Project,Client,User,Email,Task,Description,Start Date,Start Time,End Date,End Time,Duration (h),Duration (decimal),Billable
AI-Clinical-Workflow Assistant,MedTech Solutions AG,Dr. Andreas Behrens,andreas.behrens@insightarcs.de,Architektur & Schnittstellen-Design,Klinische Schnittstellen evaluiert,2025-06-15,09:00,2025-06-15,12:30,03:30,3.50,Yes
Fleet Telematics Cloud Hub,LogiChain Mobility GmbH,Tobias Fischer,tobias.fischer@insightarcs.de,Kafka Data Streaming Pipeline,GPS Broker Config,2025-08-20,08:00,2025-08-20,12:00,04:00,4.00,Yes
Banking Core Cloud Migration,FinSecure Bank SE,Markus Weber,markus.weber@insightarcs.de,Legacy Code Analyse,Batch Job Review,2025-11-10,13:00,2025-11-10,17:30,04:30,4.50,Yes`;
    setCsvContent(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setCsvContent(evt.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const parseCsvToObjects = (text: string) => {
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!cleanText) return [];

    // Delimiter detection from first line
    const firstLine = cleanText.split('\n').find(l => l.trim().length > 0) || '';
    let commaCount = 0;
    let semiCount = 0;
    let inQ = false;
    for (let i = 0; i < firstLine.length; i++) {
      const char = firstLine[i];
      if (char === '"') inQ = !inQ;
      else if (!inQ) {
        if (char === ',') commaCount++;
        else if (char === ';') semiCount++;
      }
    }
    const delimiter = semiCount > commaCount ? ';' : ',';

    // Full RFC 4180 CSV Tokenizer
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
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
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

    // Primary Headers
    const headers = rawRows[0].map(h => h.replace(/^["']|["']$/g, '').trim());

    const result: any[] = [];
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      // Skip redundant header rows if multiple CSV files are pasted back-to-back
      const isHeaderRow = row.some((val) => {
        const v = val.toLowerCase().replace(/^["']|["']$/g, '').trim();
        return v === 'project' || v === 'client' || (v === 'start date' && row.length > 5);
      });
      if (isHeaderRow) continue;

      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? row[idx].replace(/^["']|["']$/g, '').trim() : '';
      });
      result.push(obj);
    }
    return result;
  };

  // Live Pre-Import Analysis
  const preImportAnalysis = useMemo(() => {
    if (!csvContent.trim()) return null;
    const parsedRows = parseCsvToObjects(csvContent);
    if (parsedRows.length === 0) return null;

    const clients = new Set<string>();
    const projects = new Set<string>();
    const usersMap = new Map<string, { email: string; group: string; count: number; hours: number }>();
    let totalDurationHours = 0;

    parsedRows.forEach(row => {
      const c = (row['Client'] || row['Kunde'] || '').trim();
      const p = (row['Project'] || row['Projekt'] || '').trim();
      const u = (row['User'] || row['Benutzer'] || row['Mitarbeiter'] || '').trim();
      const e = (row['Email'] || row['E-Mail'] || '').trim();
      const g = (row['Group'] || row['Gruppe'] || '').trim();

      if (c) clients.add(c);
      if (p) projects.add(p);

      let durH = 0;
      if (row['Duration (decimal)']) {
        durH = parseFloat(String(row['Duration (decimal)']).replace(',', '.')) || 0;
      } else if (row['Duration (h)']) {
        const parts = String(row['Duration (h)']).split(':');
        if (parts.length >= 2) {
          durH = (parseInt(parts[0], 10) || 0) + ((parseInt(parts[1], 10) || 0) / 60);
        }
      }
      totalDurationHours += durH;

      if (u) {
        const existing = usersMap.get(u) || { email: e, group: g, count: 0, hours: 0 };
        existing.count += 1;
        existing.hours += durH;
        if (!existing.email && e) existing.email = e;
        if (!existing.group && g) existing.group = g;
        usersMap.set(u, existing);
      }
    });

    return {
      rowCount: parsedRows.length,
      clients: Array.from(clients),
      projects: Array.from(projects),
      users: Array.from(usersMap.entries()).map(([name, data]) => ({ name, ...data })),
      totalHours: totalDurationHours
    };
  }, [csvContent]);

  useEffect(() => { setDryRun(null); setDryRunError(null); }, [csvContent, activeOrgId]);

  const handleDryRun = async () => {
    if (!csvContent.trim()) return;
    const rows = parseCsvToObjects(csvContent);
    if (rows.length === 0) { setDryRunError(t.impRowErrors); return; }
    setDryRunLoading(true);
    setDryRunError(null);
    try {
      const res = await fetch('/api/import/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDryRun(data);
    } catch (err: any) {
      setDryRunError(err?.message || 'Error');
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleUndoBatch = async (batch: ImportBatchView) => {
    if (!window.confirm(t.impUndoConfirm.replace('{count}', String(batch.importedCount)))) return;
    setUndoingId(batch.id);
    setHistoryMessage(null);
    try {
      const res = await fetch(`/api/import/batches/${encodeURIComponent(batch.id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const count = (data.deletedTimeEntries || 0) + (data.deletedWorkingTimes || 0);
      setHistoryMessage({ kind: 'ok', text: t.impUndoDone.replace('{count}', String(count)) });
      await refreshAllData();
    } catch (err: any) {
      setHistoryMessage({ kind: 'error', text: `${t.impUndoFailed}: ${err?.message || ''}` });
    } finally {
      setUndoingId(null);
      loadBatches();
    }
  };

  const statusLabel = (s: ImportRowStatus) => ({
    NEW: t.impStatusNew, DUPLICATE: t.impStatusDuplicate, ERROR: t.impStatusError, WARNING: t.impStatusWarning, SKIPPED: t.impStatusSkipped
  }[s]);

  const handleExecuteImport = async () => {
    if (!csvContent.trim()) return;
    try {
      setIsProcessing(true);
      const rows = parseCsvToObjects(csvContent);
      if (rows.length === 0) {
        alert('Keine gültigen Zeilen im CSV gefunden.');
        return;
      }
      const report = await importClockify(rows);
      setImportReport(report);
      setDryRun(null);
      await refreshAllData();
      loadBatches();
    } catch (err: any) {
      alert('Importfehler: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteResetDatabase = async () => {
    try {
      setIsResetting(true);
      const res = await fetch('/api/database/reset', { method: 'POST' });
      const data = await res.json();
      setResetMessage(data.message || 'Datenbank erfolgreich auf Werkseinstellungen zurückgesetzt.');
      setShowResetModal(false);
      await refreshAllData();
      setTimeout(() => setResetMessage(null), 4000);
    } catch {
      setResetMessage('Fehler beim Zurücksetzen der Datenbank.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              {t.clockifyImportTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t.clockifyImportSubtitle}
            </p>
          </div>

          {isAdmin && <button
            id="btn-trigger-factory-reset"
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Datenbank auf Werkseinstellungen zurücksetzen
          </button>}
        </div>

        {resetMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {resetMessage}
          </div>
        )}

        {/* Active Mandant Info & Switcher */}
        {isAdmin && <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                <span>Ziel-Mandant für Import:</span>
                <span className="bg-emerald-700 text-white text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                  {organization?.name || 'Insight Arcs GmbH (Hauptmandant)'}
                </span>
                <span className="text-[10px] text-emerald-800 font-mono bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">
                  {organization?.code || 'IA-BERLIN'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Alle importierten Datensätze (Kunden, Projekte, Aufgaben, Zeiteinträge) werden isoliert in diesem Mandanten abgelegt.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="select-import-mandant" className="text-slate-600 font-medium whitespace-nowrap">Zielmandant wählen:</label>
            <select
              id="select-import-mandant"
              value={activeOrgId}
              onChange={(e) => switchOrganization(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>
        </div>}
      </div>

      {/* Bereiche: Import-Assistent | Clockify CSV | Clockify PDF | Export */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex flex-wrap gap-1.5 w-fit">
        {isAdmin && <>
        <button
          type="button"
          id="tab-import-wizard"
          onClick={() => setImportSource('wizard')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${importSource === 'wizard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Wand2 className="w-4 h-4" /> {t.tabImportWizard}
        </button>
        <button
          type="button"
          onClick={() => setImportSource('csv')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${importSource === 'csv' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <FileSpreadsheet className="w-4 h-4" /> {t.csvImportTab}
        </button>
        <button
          type="button"
          onClick={() => setImportSource('pdf')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${importSource === 'pdf' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <FileText className="w-4 h-4" /> {t.pdfImportTab}
        </button>
        </>}
        <button
          type="button"
          id="tab-export"
          onClick={() => setImportSource('export')}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${importSource === 'export' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Download className="w-4 h-4" /> {t.tabExport}
        </button>
      </div>

      {importSource === 'wizard' && isAdmin && <ImportWizard onImported={loadBatches} />}

      {importSource === 'export' && <ExportPanel showXlsxExports={canXlsxExport} showRawExport={isAdmin} />}

      {importSource === 'csv' && isAdmin && (
      <div className="grid grid-cols-1 gap-6">
        {/* Clockify CSV Importer (Rohdatenexport befindet sich jetzt im Bereich „Export") */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              {t.importClockifyCsvTitle}
            </h3>
            <button
              id="btn-sample-csv"
              type="button"
              onClick={loadSampleClockifyCsv}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline"
            >
              {t.loadSampleClockifyData}
            </button>
          </div>

          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-slate-50/50">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              {t.dragDropCsv}
            </span>
            <span className="text-[10px] text-slate-400">
              {t.supportedClockifyFieldsHint}
            </span>
            <input
              id="input-clockify-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Raw Text Preview */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              {t.csvPreviewOrDirectInput}
            </label>
            <textarea
              id="textarea-csv-content"
              rows={5}
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder="Project, Client, User, Email, Task, Description, Start Date, Duration..."
              className="w-full font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Live Pre-Import Parser Validation */}
          {preImportAnalysis && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Geprüfte CSV-Struktur ({preImportAnalysis.rowCount} Zeilen erkannt)
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Gesamt: {preImportAnalysis.totalHours.toFixed(2)} Std.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Kunden ({preImportAnalysis.clients.length})</div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={preImportAnalysis.clients.join(', ')}>
                    {preImportAnalysis.clients.join(', ') || '—'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Projekte ({preImportAnalysis.projects.length})</div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={preImportAnalysis.projects.join(', ')}>
                    {preImportAnalysis.projects.join(', ') || '—'}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="text-slate-400 text-[10px]">Mitarbeiter ({preImportAnalysis.users.length})</div>
                  <div className="text-xs font-bold text-emerald-700">
                    {preImportAnalysis.users.length} Personen erkannt
                  </div>
                </div>
              </div>

              {/* Recognized Users Table */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Erkannte Mitarbeiter:</div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {preImportAnalysis.users.map((u, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({u.email || 'keine E-Mail'})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        {u.group && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {u.group}
                          </span>
                        )}
                        <span className="font-bold text-slate-700">{u.hours.toFixed(1)} h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            id="btn-dry-run-import"
            type="button"
            disabled={!csvContent.trim() || dryRunLoading || isProcessing}
            onClick={handleDryRun}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
              !csvContent.trim() || dryRunLoading || isProcessing
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <SearchCheck className="w-4 h-4" />
            {dryRunLoading ? t.impDryRunRunning : t.impDryRunButton}
          </button>

          {dryRunError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {dryRunError}
            </div>
          )}

          {dryRun && (
            <div id="dry-run-result" className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" /> {t.impDryRunTitle}
              </div>
              <p className="text-[11px] text-slate-500">{t.impDryRunHint} {t.impPendingApprovalHint}</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                {([
                  ['NEW', 'text-emerald-600'],
                  ['WARNING', 'text-amber-600'],
                  ['DUPLICATE', 'text-slate-500'],
                  ['ERROR', 'text-rose-600'],
                ] as Array<[ImportRowStatus, string]>).map(([k, cls]) => (
                  <div key={k} className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px]">{statusLabel(k)}</div>
                    <div className={`text-base font-bold ${cls}`}>{dryRun.counts[k]}</div>
                  </div>
                ))}
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">{t.impTotalHours}</div>
                  <div className="text-base font-bold text-slate-800">{(dryRun.totalMinutes / 60).toFixed(2)} h</div>
                </div>
              </div>
              {(dryRun.wouldCreate.clients.length + dryRun.wouldCreate.projects.length + dryRun.wouldCreate.tasks.length + dryRun.wouldCreate.users.length) > 0 && (
                <div className="text-[11px] text-slate-600 space-y-0.5 border-t border-slate-200 pt-2">
                  <div className="font-semibold text-slate-700">{t.impWouldCreate}:</div>
                  {dryRun.wouldCreate.clients.length > 0 && <div>{t.impWouldCreateClients}: <strong>{dryRun.wouldCreate.clients.join(', ')}</strong></div>}
                  {dryRun.wouldCreate.projects.length > 0 && <div>{t.impWouldCreateProjects}: <strong>{dryRun.wouldCreate.projects.join(', ')}</strong></div>}
                  {dryRun.wouldCreate.tasks.length > 0 && <div>{t.impWouldCreateTasks}: <strong>{dryRun.wouldCreate.tasks.join(', ')}</strong></div>}
                  {dryRun.wouldCreate.users.length > 0 && <div>{t.impWouldCreateUsers}: <strong>{dryRun.wouldCreate.users.join(', ')}</strong></div>}
                </div>
              )}
              {(() => {
                const problems = dryRun.rows.filter(r => r.status !== 'NEW');
                if (problems.length === 0) return null;
                return (
                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="font-semibold text-slate-700">{t.impProblemRows}:</div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {problems.slice(0, 100).map(r => (
                        <div key={r.rowNumber} className="flex items-start gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            r.status === 'ERROR' ? 'bg-rose-100 text-rose-700' : r.status === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>{statusLabel(r.status)}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">{t.impRow} {r.rowNumber}</span>
                          <span className="text-[11px] text-slate-700">{r.messages.join(' · ')}</span>
                        </div>
                      ))}
                      {problems.length > 100 && <div className="text-[11px] text-slate-400">+ {problems.length - 100} {t.impMoreRows}</div>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <button
            id="btn-run-clockify-import"
            type="button"
            disabled={!csvContent.trim() || isProcessing}
            onClick={handleExecuteImport}
            className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 shadow-xs transition-all ${
              !csvContent.trim() || isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            {isProcessing ? t.importing : t.runImport}
          </button>

          {/* Import Results Summary (Section 10) */}
          {importReport && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {t.importResults}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">{t.importedRecords}</div>
                  <div className="text-base font-bold text-emerald-600">{importReport.importedEntries}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">{t.skippedDuplicates}</div>
                  <div className="text-base font-bold text-amber-600">{importReport.skippedDuplicates}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">{t.error}</div>
                  <div className="text-base font-bold text-rose-600">{importReport.errors.length}</div>
                </div>
              </div>

              {importReport.errors.length > 0 && (
                <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200">
                  <div className="font-semibold text-slate-700">{t.impRowErrors}:</div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {importReport.errors.slice(0, 100).map((e, i) => (
                      <div key={i} className="text-rose-700">{t.impRow} {e.row}: {e.error}</div>
                    ))}
                    {importReport.errors.length > 100 && <div className="text-slate-400">+ {importReport.errors.length - 100} {t.impMoreRows}</div>}
                  </div>
                </div>
              )}

              {(importReport.createdClients.length > 0 || importReport.createdProjects.length > 0 || importReport.createdUsers.length > 0) && (
                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                  {importReport.createdClients.length > 0 && (
                    <div>{t.tabClients} erstellt: <strong>{importReport.createdClients.join(', ')}</strong></div>
                  )}
                  {importReport.createdProjects.length > 0 && (
                    <div>{t.tabProjects} erstellt: <strong>{importReport.createdProjects.join(', ')}</strong></div>
                  )}
                  {importReport.createdUsers.length > 0 && (
                    <div>{t.tabRates} angelegt: <strong>{importReport.createdUsers.join(', ')}</strong></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      )}

      {importSource === 'pdf' && isAdmin && (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {t.pdfImportTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t.pdfImportSubtitle}</p>
          </div>
          {pdfStep > 1 && (
            <button
              type="button"
              onClick={resetPdfWorkflow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t.pdfStartOver}
            </button>
          )}
        </div>

        {/* Schritt-Indikator */}
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${pdfStep >= s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</span>
              <span className={pdfStep >= s ? 'text-slate-800' : 'text-slate-400'}>
                {s === 1 ? t.pdfStep1 : s === 2 ? t.pdfStep2 : t.pdfStep3}
              </span>
              {s < 3 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        {pdfError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            {pdfError}
          </div>
        )}

        {/* SCHRITT 1: PDF hochladen */}
        {pdfStep === 1 && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-slate-50/50">
              <FileText className="w-9 h-9 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {pdfFile ? pdfFile.name : t.uploadPdf}
              </span>
              <span className="text-[10px] text-slate-400">{t.pdfUploadHint}</span>
              <input
                id="input-clockify-pdf"
                type="file"
                accept=".pdf"
                onChange={handlePdfFileSelect}
                className="hidden"
              />
            </label>
            <button
              type="button"
              disabled={!pdfFile || pdfParsing}
              onClick={handleParsePdf}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {pdfParsing ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t.pdfParsing}</> : <><Eye className="w-4 h-4" /> {t.parsePdf}</>}
            </button>
          </div>
        )}

        {/* SCHRITT 2: Vorschau & Mapping */}
        {pdfStep === 2 && (
          <div className="space-y-5">
            {/* Übersicht */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-semibold uppercase">{t.pdfDetectedEntries}</div>
                <div className="text-lg font-bold text-emerald-900">{pdfEntries.length}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">{t.pdfPeriod}</div>
                <div className="text-xs font-bold text-slate-800">{pdfDateRange ? `${pdfDateRange.from} – ${pdfDateRange.to}` : '—'}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">{t.pdfEmployees}</div>
                <div className="text-lg font-bold text-slate-800">{pdfUsers.length}</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">{t.pdfProjectsCount}</div>
                <div className="text-lg font-bold text-slate-800">{pdfProjects.length}</div>
              </div>
            </div>

            {/* Import-Modus */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">{t.pdfImportMode}</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className={`flex-1 flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${pdfImportType === 'working-time' ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="pdfImportType" checked={pdfImportType === 'working-time'} onChange={() => setPdfImportType('working-time')} className="mt-0.5 accent-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{t.importModeWorkingTime}</div>
                    <div className="text-[10px] text-slate-500">{t.importModeWorkingTimeHint}</div>
                  </div>
                </label>
                <label className={`flex-1 flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${pdfImportType === 'time-entries' ? 'border-emerald-400 bg-emerald-50/70' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="pdfImportType" checked={pdfImportType === 'time-entries'} onChange={() => setPdfImportType('time-entries')} className="mt-0.5 accent-emerald-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{t.importModeTimeEntries}</div>
                    <div className="text-[10px] text-slate-500">{t.importModeTimeEntriesHint}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Mitarbeiter-Mapping */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" /> {t.userMappingTitle}
              </label>
              <div className="space-y-2">
                {pdfUsers.map(cn => (
                  <div key={cn} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700 w-1/2 truncate" title={cn}>{cn}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <select
                      value={pdfUserMapping[cn] || ''}
                      onChange={e => setPdfUserMapping(prev => ({ ...prev, [cn]: e.target.value }))}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">{t.pdfSkipUser}</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Projekt-Mapping (nur bei Projektzeiterfassung) */}
            {pdfImportType === 'time-entries' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> {t.projectMappingTitle}
                </label>
                <div className="space-y-2">
                  {pdfProjects.map(pt => (
                    <div key={pt} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700 w-1/2 truncate" title={pt}>{pt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <select
                        value={pdfProjectMapping[pt] || '__skip__'}
                        onChange={e => setPdfProjectMapping(prev => ({ ...prev, [pt]: e.target.value }))}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="__skip__">{t.skipEntry}</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplikate überspringen */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={pdfSkipDuplicates} onChange={e => setPdfSkipDuplicates(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
              {t.skipDuplicates}
            </label>

            <button
              type="button"
              disabled={pdfImporting}
              onClick={handleExecutePdfImport}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-colors"
            >
              {pdfImporting ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t.pdfImporting}</> : <><UploadCloud className="w-4 h-4" /> {t.startPdfImport}</>}
            </button>
          </div>
        )}

        {/* SCHRITT 3: Ergebnis */}
        {pdfStep === 3 && pdfResult && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-900">{t.pdfImportDone}</div>
                <div className="text-xs text-emerald-800">
                  {pdfResult.imported} {t.pdfImportedCount} · {pdfResult.skipped} {t.pdfSkippedCount}
                </div>
              </div>
            </div>
            {pdfResult.errors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {pdfResult.errors.length} {t.pdfErrorsCount}
                </div>
                <ul className="text-[10px] text-amber-700 list-disc list-inside max-h-40 overflow-auto space-y-0.5">
                  {pdfResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={resetPdfWorkflow}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t.pdfImportAnother}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Import-Historie mit „Rückgängig machen" (Datenimport Phase 1) */}
      {isAdmin && batches !== null && (
        <div id="import-history" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" /> {t.impHistoryTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{t.impHistorySubtitle}</p>
            </div>
            <button
              type="button"
              onClick={loadBatches}
              disabled={batchesLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${batchesLoading ? 'animate-spin' : ''}`} /> {t.impHistoryRefresh}
            </button>
          </div>
          {historyMessage && (
            <div className={`rounded-xl p-2.5 text-xs border ${historyMessage.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {historyMessage.text}
            </div>
          )}
          {batches.length === 0 ? (
            <div className="text-xs text-slate-400">{t.impHistoryEmpty}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200">
                    <th className="py-2 pr-3 font-semibold">{t.impColDate}</th>
                    <th className="py-2 pr-3 font-semibold">{t.impColSource}</th>
                    <th className="py-2 pr-3 font-semibold">{t.impColBy}</th>
                    <th className="py-2 pr-3 font-semibold">{t.impColEntries}</th>
                    <th className="py-2 pr-3 font-semibold">{t.impColPeriod}</th>
                    <th className="py-2 pr-3 font-semibold">{t.impColStatus}</th>
                    <th className="py-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-slate-800">{b.source}</div>
                        {b.fileName && <div className="text-[10px] text-slate-400">{b.fileName}</div>}
                      </td>
                      <td className="py-2 pr-3">{b.createdByName || b.createdBy}</td>
                      <td className="py-2 pr-3">
                        <span className="font-bold text-emerald-600">{b.importedCount}</span>
                        <span className="text-slate-400"> / {b.skippedCount} {t.impStatusSkippedOrDuplicate} / {b.errorCount} {t.impStatusError}</span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{b.dateFrom ? `${b.dateFrom}${b.dateTo && b.dateTo !== b.dateFrom ? ` – ${b.dateTo}` : ''}` : '—'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {b.revertedAt ? (
                          <span className="text-slate-500">{t.impReverted} ({new Date(b.revertedAt).toLocaleDateString()})</span>
                        ) : b.canUndo ? (
                          <span className="text-slate-500">{t.impUndoUntil.replace('{date}', new Date(b.undoDeadline).toLocaleString())}</span>
                        ) : b.undoBlockedReason === 'PERIOD_LOCKED' ? (
                          <span className="text-amber-600">{t.impUndoLocked}</span>
                        ) : b.undoBlockedReason === 'NOT_SUPPORTED' ? (
                          <span className="text-slate-400">{t.impUndoNotSupported}</span>
                        ) : (
                          <span className="text-slate-400">{t.impUndoExpired}</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {b.canUndo && (
                          <button
                            type="button"
                            onClick={() => handleUndoBatch(b)}
                            disabled={undoingId !== null}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> {undoingId === b.id ? t.impUndoing : t.impUndo}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Auf Werkseinstellungen zurücksetzen</h3>
                  <p className="text-xs text-slate-500">Bereinigt alle fehlerhaften Importdaten</p>
                </div>
              </div>
              <button
                onClick={() => !isResetting && setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 leading-relaxed space-y-2">
                <p className="font-bold">Möchten Sie die Datenbank auf den definierten Werkseinstellungs-Stand zurücksetzen?</p>
                <p className="text-rose-800">
                  Der Hauptmandant (Insight Arcs GmbH) wird vollständig bereinigt und enthält ausschließlich den Superadmin (Dr. Andreas Behrens). Alle Demodaten, Projekte und Mitarbeiter werden sauber im Testmandanten initialisiert.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setShowResetModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  id="btn-modal-confirm-reset"
                  type="button"
                  disabled={isResetting}
                  onClick={handleExecuteResetDatabase}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Wird zurückgesetzt...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Ja, sauber zurücksetzen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
