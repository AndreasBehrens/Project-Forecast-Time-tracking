import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type {
  ClockifyImportReport, ImportAlias, ImportDryRunResult, ImportMappings, ImportRowStatus,
  ImportTarget, MasterDataAnalysis, MasterDataRef, StoredImportSchema
} from '../types';
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Download, FileSpreadsheet, Link2,
  Play, RefreshCw, Save, SearchCheck, Sparkles, Trash2, UploadCloud, Wand2
} from 'lucide-react';

/** Schema-Datei (vereinfachte Client-Sicht, Validierung erfolgt serverseitig). */
type ColumnRef = string | string[];
interface WizardSchema {
  schemaVersion: 1;
  id?: string;
  name: string;
  source: string;
  description?: string;
  target?: ImportTarget;
  fileType?: 'csv' | 'xlsx';
  sheet?: string;
  columns: Record<string, ColumnRef | undefined>;
  formats?: { date?: string; duration?: string; decimalSeparator?: string };
  [key: string]: unknown;
}

interface ParseResponse {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  checksum: string;
  encoding?: string;
  delimiter?: string;
  sheetNames?: string[];
  sheet?: string;
  headers: string[];
  rowCount: number;
  rows: Array<Record<string, string>>;
  lineNumbers: number[];
  detection: { schemaId?: string; schemaName: string; method: 'fingerprint' | 'columns'; matchedColumns: number } | null;
  derived: { schema: WizardSchema };
  resolved: Record<string, Record<string, string>>;
  fileAlreadyImported: { batchId: string; createdAt: string; fileName?: string } | null;
}

export const IMPORT_FIELDS = [
  'externalId', 'userRef', 'userEmail', 'userGroup', 'clientRef', 'projectRef', 'taskRef',
  'date', 'dateTo', 'startTime', 'endTime', 'duration', 'breakMinutes', 'description', 'isBillable',
  'dayType', 'halfDay', 'hourlyBillingRate', 'hourlyCostRate'
] as const;
const TARGETS: ImportTarget[] = ['TIME_ENTRY', 'WORKING_TIME', 'ABSENCE', 'MASTER_DATA'];
const DATE_FORMATS = ['auto', 'DD.MM.YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
const STEP_COUNT = 7;

/** Spaltenverweis (Name, Alternativen, `*`-Platzhalter) gegen die Kopfzeile auflösen – wie serverseitig. */
export function resolveColumnClient(headers: string[], ref: ColumnRef | undefined): string | undefined {
  if (!ref) return undefined;
  const list = Array.isArray(ref) ? ref : [ref];
  const norm = (s: string) => s.trim().toLowerCase();
  for (const r of list) {
    if (r.includes('*')) {
      const re = new RegExp('^' + norm(r).split('*').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      const hit = headers.find(h => re.test(norm(h)));
      if (hit) return hit;
    } else {
      const hit = headers.find(h => norm(h) === norm(r));
      if (hit) return hit;
    }
  }
  return undefined;
}

/** Datei per fetch (mit Auth-Header) herunterladen und speichern. */
async function downloadViaFetch(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  saveBlob(await res.blob(), match ? match[1] : fallbackName);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = Array.isArray(data?.errors) ? ' – ' + data.errors.map((e: any) => `${e.path}: ${e.message}`).join('; ') : '';
    throw new Error((data?.error || `HTTP ${res.status}`) + details);
  }
  return data as T;
}

const postJson = <T,>(url: string, body: unknown) =>
  apiJson<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50';
const selectCls = 'border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 bg-white';

export const ImportWizard: React.FC<{ onImported?: () => void }> = ({ onImported }) => {
  const { t, currentUser, users, projects, clients, refreshAllData, activeOrgId } = useApp();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.id === 'u-1';
  const tr = (key: string) => ((t as unknown as Record<string, string>)[key] ?? key);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Schritt 1 – Quelle / Schema
  const [schemas, setSchemas] = useState<{ builtin: WizardSchema[]; tenant: StoredImportSchema[] }>({ builtin: [], tenant: [] });
  const [choice, setChoice] = useState<string>('auto');
  const [uploadedSchema, setUploadedSchema] = useState<WizardSchema | null>(null);
  const [aliases, setAliases] = useState<ImportAlias[]>([]);

  // Schritt 2 – Datei
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState('auto');
  const [parsed, setParsed] = useState<ParseResponse | null>(null);

  // Schritt 3 – Spaltenzuordnung
  const [baseSchema, setBaseSchema] = useState<WizardSchema | null>(null);
  const [initialSel, setInitialSel] = useState<Record<string, string>>({});
  const [columnSel, setColumnSel] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<ImportTarget>('TIME_ENTRY');
  const [dateFormat, setDateFormat] = useState('auto');
  const [schemaName, setSchemaName] = useState('');

  // Schritt 4 – Stammdaten
  const [analysis, setAnalysis] = useState<MasterDataAnalysis | null>(null);
  const [mappings, setMappings] = useState<Required<ImportMappings>>({ users: {}, projects: {}, clients: {} });
  const [remember, setRemember] = useState(true);

  // Schritt 5–7
  const [dryRun, setDryRun] = useState<ImportDryRunResult | null>(null);
  const [report, setReport] = useState<ClockifyImportReport | null>(null);

  const loadSchemas = useCallback(async () => {
    try {
      setSchemas(await apiJson('/api/import/schemas'));
      setAliases(await apiJson('/api/import/aliases'));
    } catch { /* ohne Importrecht nicht sichtbar */ }
  }, []);
  useEffect(() => { loadSchemas(); }, [loadSchemas, activeOrgId]);

  const allSchemas = useMemo<WizardSchema[]>(
    () => [...schemas.tenant.map(s => s.schema as WizardSchema), ...schemas.builtin],
    [schemas]
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try { await fn(); } catch (e: any) { setError(e?.message || 'Error'); } finally { setBusy(false); }
  };

  const resetWizard = () => {
    setStep(1); setFile(null); setParsed(null); setBaseSchema(null); setAnalysis(null);
    setDryRun(null); setReport(null); setError(null); setInfo(null);
    setMappings({ users: {}, projects: {}, clients: {} });
  };

  // ---------- Schritt 1 ----------
  const handleSchemaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    run(async () => {
      let json: unknown;
      try { json = JSON.parse(await f.text()); } catch { throw new Error(t.wizSchemaInvalidJson); }
      const v = await postJson<{ valid: boolean; errors: Array<{ path: string; message: string }>; schema?: WizardSchema }>('/api/import/schemas/validate', json);
      if (!v.valid || !v.schema) throw new Error(`${t.wizSchemaInvalid}: ${v.errors.map(er => `${er.path}: ${er.message}`).join('; ')}`);
      setUploadedSchema(v.schema);
      setChoice('__upload__');
    });
  };

  const handleDeleteSchema = (s: StoredImportSchema) => {
    if (!window.confirm(t.wizSchemaDeleteConfirm.replace('{name}', s.name))) return;
    run(async () => {
      await apiJson(`/api/import/schemas/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
      if (choice === s.id) setChoice('auto');
      await loadSchemas();
    });
  };

  const handleDeleteAlias = (a: ImportAlias) => run(async () => {
    await apiJson(`/api/import/aliases?kind=${a.kind}&ref=${encodeURIComponent(a.ref)}`, { method: 'DELETE' });
    await loadSchemas();
  });

  const aliasTargetName = (a: ImportAlias) =>
    (a.kind === 'user' ? users.find(u => u.id === a.targetId)?.name
      : a.kind === 'project' ? projects.find(p => p.id === a.targetId)?.name
        : clients.find(c => c.id === a.targetId)?.name) || a.targetId;

  // ---------- Schritt 2 ----------
  const handleParse = (sheet?: string) => run(async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('delimiter', delimiter);
    if (sheet) fd.append('sheet', sheet);
    const p = await apiJson<ParseResponse>('/api/import/parse', { method: 'POST', body: fd });
    if (!p.rowCount) throw new Error(t.wizNoRows);
    setParsed(p);

    let base: WizardSchema;
    if (choice === '__upload__' && uploadedSchema) base = uploadedSchema;
    else if (choice !== 'auto' && allSchemas.some(s => s.id === choice)) base = allSchemas.find(s => s.id === choice)!;
    else if (p.detection?.schemaId && allSchemas.some(s => s.id === p.detection!.schemaId)) base = allSchemas.find(s => s.id === p.detection!.schemaId)!;
    else base = p.derived.schema;

    const isDerived = base === p.derived.schema;
    const resolved = isDerived ? p.resolved.__derived__ : (base.id && p.resolved[base.id]);
    const sel: Record<string, string> = {};
    for (const f of IMPORT_FIELDS) {
      const h = resolved ? resolved[f] : resolveColumnClient(p.headers, base.columns[f]);
      if (h) sel[f] = h;
    }
    setBaseSchema(base);
    setInitialSel(sel);
    setColumnSel(sel);
    setTarget(base.target || 'TIME_ENTRY');
    setDateFormat(base.formats?.date || 'auto');
    setSchemaName(base.name);
    setStep(3);
  });

  // ---------- Schritt 3 ----------
  const isModified = useMemo(() => {
    if (!baseSchema) return false;
    if ((baseSchema.target || 'TIME_ENTRY') !== target) return true;
    if ((baseSchema.formats?.date || 'auto') !== dateFormat) return true;
    if (schemaName.trim() && schemaName.trim() !== baseSchema.name) return true;
    return IMPORT_FIELDS.some(f => (initialSel[f] || '') !== (columnSel[f] || ''));
  }, [baseSchema, target, dateFormat, schemaName, initialSel, columnSel]);

  /** Das tatsächlich verwendete Schema: unverändert → Original (inkl. Alternativen), sonst angepasste Kopie. */
  const effectiveSchema = useMemo<WizardSchema | null>(() => {
    if (!baseSchema) return null;
    if (!isModified) return baseSchema;
    const columns: Record<string, string> = {};
    for (const f of IMPORT_FIELDS) if (columnSel[f]) columns[f] = columnSel[f];
    const next: WizardSchema = {
      ...baseSchema,
      name: schemaName.trim() || baseSchema.name,
      target,
      fileType: parsed?.fileType,
      formats: { ...(baseSchema.formats || {}), date: dateFormat },
      columns,
    };
    delete next.headerFingerprint;
    if (!next.id || next.id.startsWith('builtin-')) delete next.id;
    if (next.source === baseSchema.source && baseSchema.id?.startsWith('builtin-')) next.source = `${baseSchema.source}-custom`;
    return next;
  }, [baseSchema, isModified, columnSel, schemaName, target, dateFormat, parsed]);

  /** Schema-Referenz für die API: gespeicherte/eingebaute Schemas per ID, sonst das Objekt. */
  const schemaRef = () => {
    if (!effectiveSchema) return {};
    const known = effectiveSchema.id && allSchemas.some(s => s.id === effectiveSchema.id) && !isModified;
    return known ? { schemaId: effectiveSchema.id } : { schema: effectiveSchema };
  };

  const basePayload = () => ({
    rows: parsed?.rows || [],
    lineNumbers: parsed?.lineNumbers,
    fileChecksum: parsed?.checksum,
    ...schemaRef(),
  });

  const handleSaveSchema = () => run(async () => {
    if (!effectiveSchema || !parsed) return;
    const saved = await postJson<StoredImportSchema>('/api/import/schemas', { schema: effectiveSchema, headers: parsed.headers });
    await loadSchemas();
    const savedSchema = saved.schema as WizardSchema;
    setBaseSchema(savedSchema);
    setInitialSel(columnSel);
    setSchemaName(savedSchema.name);
    setChoice(saved.id);
    setInfo(t.wizSchemaSaved.replace('{name}', saved.name).replace('{version}', String(saved.version)));
  });

  const handleDownloadSchema = () => {
    if (!effectiveSchema) return;
    const { id: _id, ...rest } = effectiveSchema;
    const name = (effectiveSchema.name || 'schema').replace(/[^a-zA-Z0-9_-]+/g, '-');
    saveBlob(new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' }), `import-schema-${name}.json`);
  };

  const cleanMappings = (): ImportMappings => {
    const clean = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([, v]) => !!v));
    return { users: clean(mappings.users), projects: clean(mappings.projects), clients: clean(mappings.clients) };
  };

  const runDryRun = async () => {
    const r = await postJson<ImportDryRunResult>('/api/import/dry-run', { ...basePayload(), mappings: cleanMappings() });
    setDryRun(r);
    setStep(5);
  };

  const handleMappingNext = () => run(async () => {
    if (!effectiveSchema) return;
    if (isModified) {
      const v = await postJson<{ valid: boolean; errors: Array<{ path: string; message: string }> }>('/api/import/schemas/validate', effectiveSchema);
      if (!v.valid) throw new Error(`${t.wizSchemaInvalid}: ${v.errors.map(er => `${er.path}: ${er.message}`).join('; ')}`);
    }
    if (target === 'MASTER_DATA') {
      setAnalysis(null);
      await runDryRun();
      return;
    }
    const a = await postJson<MasterDataAnalysis>('/api/import/master-data', basePayload());
    const init = (refs: MasterDataRef[], fallback: string) =>
      Object.fromEntries(refs.map(r => [r.ref, r.matchedId || fallback]));
    setAnalysis(a);
    setMappings({
      users: init(a.users, a.canCreateUsers ? '__create__' : ''),
      projects: init(a.projects, '__create__'),
      clients: init(a.clients, '__create__'),
    });
    setStep(4);
  });

  const handleExecute = () => run(async () => {
    if (!window.confirm(t.wizExecuteConfirm)) return;
    const r = await postJson<ClockifyImportReport>('/api/import/execute', {
      ...basePayload(),
      mappings: cleanMappings(),
      rememberMappings: remember && !!analysis,
      fileName: parsed?.fileName,
    });
    setReport(r);
    setStep(7);
    await refreshAllData();
    await loadSchemas();
    onImported?.();
  });

  // ---------- Darstellung ----------
  const stepLabels = [t.wizStepSource, t.wizStepUpload, t.wizStepMapping, t.wizStepMasterData, t.wizStepDryRun, t.wizStepExecute, t.wizStepReport];
  const statusLabel = (s: ImportRowStatus) => ({
    NEW: t.impStatusNew, DUPLICATE: t.impStatusDuplicate, ERROR: t.impStatusError, WARNING: t.impStatusWarning, SKIPPED: t.impStatusSkipped,
  }[s]);
  const statusCls = (s: ImportRowStatus) => ({
    NEW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DUPLICATE: 'bg-slate-100 text-slate-600 border-slate-200',
    ERROR: 'bg-rose-50 text-rose-700 border-rose-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    SKIPPED: 'bg-slate-50 text-slate-500 border-slate-200',
  }[s]);
  const importable = dryRun ? dryRun.counts.NEW + dryRun.counts.WARNING : 0;

  const builtinVisible = schemas.builtin.filter(s => s.target !== 'MASTER_DATA' || isSuperAdmin);

  const SchemaCard: React.FC<{ id: string; title: string; subtitle?: string; badge?: string; actions?: React.ReactNode }> = ({ id, title, subtitle, badge, actions }) => (
    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${choice === id ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
      <input type="radio" name="wizard-schema" className="mt-0.5" checked={choice === id} onChange={() => setChoice(id)} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap">
          {title}
          {badge && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{badge}</span>}
        </div>
        {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>{actions}</div>}
    </label>
  );

  const targetLabel = (tg: ImportTarget) => tr(`wizTarget_${tg}`);

  const MappingTable: React.FC<{ kind: 'users' | 'projects' | 'clients'; refs: MasterDataRef[] }> = ({ kind, refs }) => {
    if (refs.length === 0) return null;
    const options = kind === 'users'
      ? [...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => ({ id: u.id, name: u.email ? `${u.name} (${u.email})` : u.name }))
      : kind === 'projects'
        ? [...projects].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ id: p.id, name: p.clientName ? `${p.name} (${p.clientName})` : p.name }))
        : [...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, name: c.name }));
    const title = kind === 'users' ? t.wizMdUsers : kind === 'projects' ? t.wizMdProjects : t.wizMdClients;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-800">{title} ({refs.length})</h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-200 bg-slate-50">
                <th className="py-2 px-3 font-semibold">{t.wizMdSourceValue}</th>
                <th className="py-2 px-3 font-semibold">{t.wizMdRows}</th>
                <th className="py-2 px-3 font-semibold">{t.wizMdMatch}</th>
                <th className="py-2 px-3 font-semibold">{t.wizMdTarget}</th>
              </tr>
            </thead>
            <tbody>
              {refs.map(r => (
                <tr key={r.ref} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 px-3 font-medium text-slate-800">{r.label}</td>
                  <td className="py-1.5 px-3 text-slate-500">{r.rowCount}</td>
                  <td className="py-1.5 px-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${r.matchType === 'none' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {r.matchType === 'exact' ? t.wizMdMatchExact : r.matchType === 'alias' ? t.wizMdMatchAlias : t.wizMdMatchNone}
                    </span>
                  </td>
                  <td className="py-1.5 px-3">
                    <select
                      className={`${selectCls} w-full max-w-xs`}
                      value={mappings[kind][r.ref] ?? ''}
                      onChange={e => setMappings(m => ({ ...m, [kind]: { ...m[kind], [r.ref]: e.target.value } }))}
                    >
                      {kind === 'users' && !analysis?.canCreateUsers && <option value="">{t.wizMdUnresolved}</option>}
                      {(kind !== 'users' || analysis?.canCreateUsers) && <option value="__create__">{kind === 'users' ? t.wizMdCreateUser : t.wizMdCreate}</option>}
                      {kind !== 'clients' && <option value="__skip__">{t.wizMdSkip}</option>}
                      {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div id="import-wizard" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-600" /> {t.wizTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{t.wizSubtitle}</p>
        </div>
        {step > 1 && (
          <button type="button" onClick={resetWizard} className={btnSecondary}>
            <RefreshCw className="w-3.5 h-3.5" /> {t.wizRestart}
          </button>
        )}
      </div>

      {/* Fortschritt */}
      <ol className="flex flex-wrap gap-1.5">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'active' : 'todo';
          return (
            <li key={n} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${state === 'active' ? 'bg-emerald-600 text-white border-emerald-600' : state === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-400 border-slate-200'}`}>
              <span>{n}</span><span>{label}</span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="rounded-xl p-3 text-xs border bg-rose-50 border-rose-200 text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="break-words">{error}</span>
        </div>
      )}
      {info && (
        <div className="rounded-xl p-3 text-xs border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {info}
        </div>
      )}

      {/* 1 – Quelle */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">{t.wizSourceHint}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <SchemaCard id="auto" title={t.wizAutoDetect} subtitle={t.wizAutoDetectHint} badge="Auto" />
            {builtinVisible.map(s => (
              <SchemaCard key={s.id} id={s.id!} title={s.name} subtitle={s.description} badge={`${t.wizBuiltin} · ${targetLabel(s.target || 'TIME_ENTRY')}`}
                actions={<button type="button" title={t.wizDownloadSchema} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  onClick={() => run(() => downloadViaFetch(`/api/import/schemas/${encodeURIComponent(s.id!)}/download`, `${s.id}.json`))}><Download className="w-3.5 h-3.5" /></button>} />
            ))}
            {schemas.tenant.map(s => (
              <SchemaCard key={s.id} id={s.id} title={s.name}
                subtitle={`${t.wizTenantSchema} · v${s.version} · ${new Date(s.updatedAt).toLocaleDateString()}`}
                badge={targetLabel((s.schema as WizardSchema).target || 'TIME_ENTRY')}
                actions={<>
                  <button type="button" title={t.wizDownloadSchema} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    onClick={() => run(() => downloadViaFetch(`/api/import/schemas/${encodeURIComponent(s.id)}/download`, `${s.id}.json`))}><Download className="w-3.5 h-3.5" /></button>
                  <button type="button" title={t.wizDeleteSchema} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                    onClick={() => handleDeleteSchema(s)}><Trash2 className="w-3.5 h-3.5" /></button>
                </>} />
            ))}
            {uploadedSchema && <SchemaCard id="__upload__" title={uploadedSchema.name} subtitle={t.wizUploadedSchema} badge="JSON" />}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className={`${btnSecondary} cursor-pointer`}>
              <UploadCloud className="w-3.5 h-3.5" /> {t.wizUploadSchema}
              <input type="file" accept=".json,application/json" className="hidden" onChange={handleSchemaUpload} />
            </label>
            <button type="button" className={btnSecondary}
              onClick={() => run(() => downloadViaFetch('/api/import/schemas/template?format=jsonschema', 'import-schema.schema.json'))}>
              <Download className="w-3.5 h-3.5" /> {t.wizDownloadJsonSchema}
            </button>
          </div>

          {aliases.length > 0 && (
            <details className="border border-slate-200 rounded-xl p-3">
              <summary className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-600" /> {t.wizAliasesTitle.replace('{count}', String(aliases.length))}
              </summary>
              <p className="text-[11px] text-slate-500 mt-2">{t.wizAliasesHint}</p>
              <table className="w-full text-xs mt-2">
                <tbody>
                  {aliases.map(a => (
                    <tr key={`${a.kind}:${a.ref}`} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5 pr-2 text-slate-500">{a.kind === 'user' ? t.wizMdUsers : a.kind === 'project' ? t.wizMdProjects : t.wizMdClients}</td>
                      <td className="py-1.5 pr-2 font-medium text-slate-800">{a.ref}</td>
                      <td className="py-1.5 pr-2">→ {aliasTargetName(a)}</td>
                      <td className="py-1.5 text-right">
                        <button type="button" className="p-1 rounded hover:bg-rose-50 text-rose-500" title={t.wizAliasDelete} onClick={() => handleDeleteAlias(a)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <div className="flex justify-end">
            <button type="button" className={btnPrimary} onClick={() => setStep(2)}>
              {t.wizNext} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2 – Datei */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">{t.wizUploadHint}</p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-6 cursor-pointer text-xs text-slate-600">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            <span className="font-semibold">{file ? file.name : t.wizChooseFile}</span>
            {file && <span className="text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>}
            <input type="file" accept=".csv,.txt,.tsv,.xlsx" className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); setParsed(null); }} />
          </label>
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-slate-700">{t.wizDelimiter}</label>
            <select className={selectCls} value={delimiter} onChange={e => setDelimiter(e.target.value)}>
              <option value="auto">{t.wizDelimiterAuto}</option>
              <option value=";">;</option>
              <option value=",">,</option>
              <option value={'\t'}>Tab</option>
            </select>
            <span className="text-slate-400">{t.wizDelimiterHint}</span>
          </div>
          <div className="flex justify-between">
            <button type="button" className={btnSecondary} onClick={() => setStep(1)}><ArrowLeft className="w-3.5 h-3.5" /> {t.wizBack}</button>
            <button type="button" className={btnPrimary} disabled={!file || busy} onClick={() => handleParse()}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />} {t.wizParse}
            </button>
          </div>
        </div>
      )}

      {/* 3 – Spaltenzuordnung */}
      {step === 3 && parsed && baseSchema && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div className="text-slate-400">{t.wizFile}</div><div className="font-semibold text-slate-800 truncate" title={parsed.fileName}>{parsed.fileName}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div className="text-slate-400">{t.wizRows}</div><div className="font-semibold text-slate-800">{parsed.rowCount}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div className="text-slate-400">{t.wizFileType}</div><div className="font-semibold text-slate-800 uppercase">{parsed.fileType}{parsed.encoding ? ` · ${parsed.encoding}` : ''}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div className="text-slate-400">{t.wizChecksum}</div><div className="font-mono text-slate-800 truncate" title={parsed.checksum}>{parsed.checksum.slice(0, 16)}…</div></div>
          </div>

          <div className="rounded-xl p-3 text-xs border bg-emerald-50/60 border-emerald-200 text-emerald-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              {choice !== 'auto'
                ? t.wizSchemaChosen.replace('{name}', baseSchema.name)
                : parsed.detection
                  ? (parsed.detection.method === 'fingerprint' ? t.wizDetectedFingerprint : t.wizDetectedColumns).replace('{name}', parsed.detection.schemaName)
                  : t.wizDetectedNone}
            </span>
          </div>

          {parsed.fileAlreadyImported && (
            <div className="rounded-xl p-3 text-xs border bg-amber-50 border-amber-200 text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {t.wizFileAlreadyImported.replace('{date}', new Date(parsed.fileAlreadyImported.createdAt).toLocaleString())}
            </div>
          )}

          {parsed.sheetNames && parsed.sheetNames.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <label className="font-semibold text-slate-700">{t.wizSheet}</label>
              <select className={selectCls} value={parsed.sheet || ''} onChange={e => handleParse(e.target.value)}>
                {parsed.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.wizSchemaName}</label>
              <input className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5" value={schemaName} onChange={e => setSchemaName(e.target.value)} />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.wizTarget}</label>
              <select className={`${selectCls} w-full`} value={target} onChange={e => setTarget(e.target.value as ImportTarget)}>
                {TARGETS.filter(tg => tg !== 'MASTER_DATA' || isSuperAdmin).map(tg => <option key={tg} value={tg}>{targetLabel(tg)}</option>)}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.wizDateFormat}</label>
              <select className={`${selectCls} w-full`} value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                {DATE_FORMATS.map(f => <option key={f} value={f}>{f === 'auto' ? t.wizDelimiterAuto : f}</option>)}
              </select>
            </div>
          </div>
          {target === 'MASTER_DATA' && <p className="text-[11px] text-amber-700">{t.wizMasterDataHint}</p>}
          {target === 'ABSENCE' && <p className="text-[11px] text-slate-500">{t.wizAbsenceHint}</p>}

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-200 bg-slate-50">
                  <th className="py-2 px-3 font-semibold">{t.wizField}</th>
                  <th className="py-2 px-3 font-semibold">{t.wizColumn}</th>
                  <th className="py-2 px-3 font-semibold">{t.wizSample}</th>
                </tr>
              </thead>
              <tbody>
                {IMPORT_FIELDS.map(f => (
                  <tr key={f} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 px-3 font-medium text-slate-700">{tr(`wizField_${f}`)}</td>
                    <td className="py-1.5 px-3">
                      <select className={`${selectCls} w-full max-w-xs`} value={columnSel[f] || ''}
                        onChange={e => setColumnSel(sel => ({ ...sel, [f]: e.target.value }))}>
                        <option value="">{t.wizNotMapped}</option>
                        {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-3 text-slate-500 truncate max-w-[220px]">{columnSel[f] ? parsed.rows[0]?.[columnSel[f]] ?? '' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className={btnSecondary} onClick={() => setStep(2)}><ArrowLeft className="w-3.5 h-3.5" /> {t.wizBack}</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={handleDownloadSchema}><Download className="w-3.5 h-3.5" /> {t.wizDownloadSchema}</button>
              <button type="button" className={btnSecondary} disabled={busy} onClick={handleSaveSchema}><Save className="w-3.5 h-3.5" /> {t.wizSaveSchema}</button>
              <button type="button" className={btnPrimary} disabled={busy} onClick={handleMappingNext}>
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} {t.wizNext} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 – Stammdaten */}
      {step === 4 && analysis && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">{t.wizMdHint}</p>
          {!analysis.canCreateUsers && <p className="text-[11px] text-amber-700">{t.wizMdNoCreateUsers}</p>}
          <MappingTable kind="users" refs={analysis.users} />
          <MappingTable kind="projects" refs={analysis.projects} />
          <MappingTable kind="clients" refs={analysis.clients} />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            {t.wizRememberMappings}
          </label>
          <div className="flex justify-between">
            <button type="button" className={btnSecondary} onClick={() => setStep(3)}><ArrowLeft className="w-3.5 h-3.5" /> {t.wizBack}</button>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => run(runDryRun)}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />} {t.impDryRunButton}
            </button>
          </div>
        </div>
      )}

      {/* 5 – Probelauf */}
      {step === 5 && dryRun && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {(['NEW', 'WARNING', 'DUPLICATE', 'SKIPPED', 'ERROR'] as ImportRowStatus[]).map(s => (
              <span key={s} className={`px-2.5 py-1 rounded-lg border font-semibold ${statusCls(s)}`}>{statusLabel(s)}: {dryRun.counts[s] || 0}</span>
            ))}
            <span className="px-2.5 py-1 rounded-lg border font-semibold bg-white text-slate-600 border-slate-200">{t.wizTotalHours}: {(dryRun.totalMinutes / 60).toFixed(2)} h</span>
          </div>
          {dryRun.fileAlreadyImported && (
            <div className="rounded-xl p-3 text-xs border bg-amber-50 border-amber-200 text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {t.wizFileAlreadyImported.replace('{date}', new Date(dryRun.fileAlreadyImported.createdAt).toLocaleString())}
            </div>
          )}
          {(['users', 'clients', 'projects', 'tasks'] as const).some(k => dryRun.wouldCreate[k].length > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-700">{t.wizWouldCreate}</div>
              {dryRun.wouldCreate.users.length > 0 && <div>{t.wizMdUsers}: {dryRun.wouldCreate.users.join(', ')}</div>}
              {dryRun.wouldCreate.clients.length > 0 && <div>{t.wizMdClients}: {dryRun.wouldCreate.clients.join(', ')}</div>}
              {dryRun.wouldCreate.projects.length > 0 && <div>{t.wizMdProjects}: {dryRun.wouldCreate.projects.join(', ')}</div>}
              {dryRun.wouldCreate.tasks.length > 0 && <div>{t.wizTasks}: {dryRun.wouldCreate.tasks.join(', ')}</div>}
            </div>
          )}
          <div className="overflow-auto max-h-80 border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-400 border-b border-slate-200">
                  <th className="py-2 px-3 font-semibold">{t.impRow}</th>
                  <th className="py-2 px-3 font-semibold">{t.impColStatus}</th>
                  <th className="py-2 px-3 font-semibold">{t.wizColRecord}</th>
                  <th className="py-2 px-3 font-semibold">{t.wizColMessages}</th>
                </tr>
              </thead>
              <tbody>
                {dryRun.rows.slice(0, 500).map((r, i) => (
                  <tr key={`${r.rowNumber}-${i}`} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="py-1.5 px-3 text-slate-500">{r.rowNumber}</td>
                    <td className="py-1.5 px-3"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusCls(r.status)}`}>{statusLabel(r.status)}</span></td>
                    <td className="py-1.5 px-3 text-slate-700">
                      {r.record ? [r.record.date, r.record.dateTo ? `– ${r.record.dateTo}` : '', r.record.userRef, r.record.projectRef || r.record.dayType || '', r.record.durationMinutes ? `${(r.record.durationMinutes / 60).toFixed(2)} h` : ''].filter(Boolean).join(' · ') : ''}
                    </td>
                    <td className="py-1.5 px-3 text-slate-500">{r.messages.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dryRun.rows.length > 500 && <p className="text-[11px] text-slate-400">{t.wizRowsTruncated.replace('{count}', String(dryRun.rows.length))}</p>}
          <div className="flex justify-between">
            <button type="button" className={btnSecondary} onClick={() => setStep(analysis ? 4 : 3)}><ArrowLeft className="w-3.5 h-3.5" /> {t.wizBack}</button>
            <button type="button" className={btnPrimary} disabled={importable === 0} onClick={() => setStep(6)}>
              {t.wizNext} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6 – Ausführen */}
      {step === 6 && dryRun && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
            <div><span className="text-slate-400">{t.wizFile}:</span> <strong>{parsed?.fileName}</strong></div>
            <div><span className="text-slate-400">{t.wizTarget}:</span> <strong>{targetLabel(target)}</strong></div>
            <div><span className="text-slate-400">{t.wizSchemaName}:</span> <strong>{effectiveSchema?.name}</strong>{isModified ? ` (${t.wizSchemaModified})` : ''}</div>
            <div><span className="text-slate-400">{t.wizToImport}:</span> <strong>{importable}</strong> · {statusLabel('DUPLICATE')}: {dryRun.counts.DUPLICATE} · {statusLabel('SKIPPED')}: {dryRun.counts.SKIPPED} · {statusLabel('ERROR')}: {dryRun.counts.ERROR}</div>
            {analysis && <div><span className="text-slate-400">{t.wizRememberMappings}:</span> <strong>{remember ? t.wizYes : t.wizNo}</strong></div>}
          </div>
          <p className="text-[11px] text-slate-500">{target === 'MASTER_DATA' ? t.wizExecuteHintMasterData : t.wizExecuteHint}</p>
          <div className="flex justify-between">
            <button type="button" className={btnSecondary} onClick={() => setStep(5)}><ArrowLeft className="w-3.5 h-3.5" /> {t.wizBack}</button>
            <button type="button" className={btnPrimary} disabled={busy || importable === 0} onClick={handleExecute}>
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {t.wizExecute}
            </button>
          </div>
        </div>
      )}

      {/* 7 – Bericht */}
      {step === 7 && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div className="text-xl font-bold text-emerald-700">{report.importedEntries}</div><div className="text-emerald-800">{t.importedRecords}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><div className="text-xl font-bold text-slate-700">{report.skippedDuplicates}</div><div className="text-slate-600">{t.skippedDuplicates}</div></div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><div className="text-xl font-bold text-rose-700">{report.errors.length}</div><div className="text-rose-800">{t.impStatusError}</div></div>
          </div>
          {(report.createdUsers.length + report.createdClients.length + report.createdProjects.length + report.createdTasks.length) > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-0.5">
              <div className="font-semibold text-slate-700">{t.wizCreated}</div>
              {report.createdUsers.length > 0 && <div>{t.wizMdUsers}: {report.createdUsers.join(', ')}</div>}
              {report.createdClients.length > 0 && <div>{t.wizMdClients}: {report.createdClients.join(', ')}</div>}
              {report.createdProjects.length > 0 && <div>{t.wizMdProjects}: {report.createdProjects.join(', ')}</div>}
              {report.createdTasks.length > 0 && <div>{t.wizTasks}: {report.createdTasks.join(', ')}</div>}
            </div>
          )}
          {report.errors.length > 0 && (
            <ul className="text-[11px] text-rose-700 list-disc list-inside max-h-40 overflow-auto bg-rose-50 border border-rose-200 rounded-xl p-3">
              {report.errors.slice(0, 200).map((er, i) => <li key={i}>{t.impRow} {er.row}: {er.error}</li>)}
            </ul>
          )}
          <p className="text-[11px] text-slate-500">{report.batchId ? (target === 'MASTER_DATA' ? t.wizReportNoUndo : t.wizReportUndoHint) : t.wizReportNothing}</p>
          <button type="button" className={btnPrimary} onClick={resetWizard}><RefreshCw className="w-4 h-4" /> {t.wizNewImport}</button>
        </div>
      )}
    </div>
  );
};
