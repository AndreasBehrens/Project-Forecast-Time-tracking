import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClockifyImportReport } from '../types';
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
  FileText
} from 'lucide-react';

export const ClockifyMigrationView: React.FC = () => {
  const {
    t,
    importClockify,
    timeEntries
  } = useApp();

  const [csvContent, setCsvContent] = useState<string>('');
  const [importReport, setImportReport] = useState<ClockifyImportReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Export filters
  const [exportFrom, setExportFrom] = useState('2025-01-01');
  const [exportTo, setExportTo] = useState('2026-12-31');

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
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Simple delimiter detection (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

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
    } catch (err: any) {
      alert('Importfehler: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExport = (format: 'csv' | 'json') => {
    const url = `/api/export/time-entries?from=${exportFrom}&to=${exportTo}&format=${format}`;
    window.location.href = url;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          {t.clockifyImportTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {t.clockifyImportSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clockify CSV Importer */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              Clockify CSV-Datei importieren
            </h3>
            <button
              id="btn-sample-csv"
              type="button"
              onClick={loadSampleClockifyCsv}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline"
            >
              Clockify-Musterdaten laden
            </button>
          </div>

          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-slate-50/50">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">
              {t.dragDropCsv}
            </span>
            <span className="text-[10px] text-slate-400">
              Unterstützt offizielle Clockify-Exportfelder (Project, Client, User, Duration, etc.)
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
              CSV-Vorschau / Direkteingabe:
            </label>
            <textarea
              id="textarea-csv-content"
              rows={5}
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder="Fügen Sie hier CSV-Inhalte ein..."
              className="w-full font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800"
            />
          </div>

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
            {isProcessing ? 'Verarbeite Datensätze...' : t.runImport}
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
                  <div className="text-slate-400 text-[10px]">Importiert</div>
                  <div className="text-base font-bold text-emerald-600">{importReport.importedEntries}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Duplikate (übersprungen)</div>
                  <div className="text-base font-bold text-amber-600">{importReport.skippedDuplicates}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-400 text-[10px]">Fehler</div>
                  <div className="text-base font-bold text-rose-600">{importReport.errors.length}</div>
                </div>
              </div>

              {(importReport.createdClients.length > 0 || importReport.createdProjects.length > 0) && (
                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                  {importReport.createdClients.length > 0 && (
                    <div>Kunden automatisch angelegt: <strong>{importReport.createdClients.join(', ')}</strong></div>
                  )}
                  {importReport.createdProjects.length > 0 && (
                    <div>Projekte automatisch angelegt: <strong>{importReport.createdProjects.join(', ')}</strong></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Manual Raw Data Export (Section 11) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            {t.exportTitle}
          </h3>
          <p className="text-xs text-slate-500">
            {t.exportSubtitle} (Gesamte Historie inklusive 2025 und 2026).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.fromDate}</label>
              <input
                id="input-export-from"
                type="date"
                value={exportFrom}
                onChange={e => setExportFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.toDate}</label>
              <input
                id="input-export-to"
                type="date"
                value={exportTo}
                onChange={e => setExportTo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                id="btn-export-csv"
                type="button"
                onClick={() => handleDownloadExport('csv')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {t.exportCsv}
              </button>

              <button
                id="btn-export-json"
                type="button"
                onClick={() => handleDownloadExport('json')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t.exportJson}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700">Enthaltene Felder:</div>
              <p>ID, Datum, Mitarbeiter, Kunde, Projekt, Aufgabe, Beschreibung, Dauer, Pausen, Abrechenbarkeit, Stundensatz, Betrag, Freigabestatus, Korrektur-Kennzeichen, Zeitstempel.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
