import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, FileSpreadsheet, FileText, Loader2, Receipt, UserCheck } from 'lucide-react';

type RangeMode = 'month' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthRange = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
};

const selectCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white';

/**
 * Export-Bereich der Seite „Import & Export" (ehemals eigenes Menü „Exporte"):
 * - Abrechnungsexport (Clockify-Format, XLSX) und Mitarbeiter-Timesheet (XLSX): Admins und interne Projektmanager
 * - Rohdatenexport (CSV/JSON): nur Admins
 */
export const ExportPanel: React.FC<{ showXlsxExports: boolean; showRawExport: boolean }> = ({ showXlsxExports, showRawExport }) => {
  const { t, currentUser, users, projects, clients } = useApp();
  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === 'u-1';

  // Abrechnungsexport
  const [aProject, setAProject] = useState('');
  const [aClient, setAClient] = useState('');
  const [aUser, setAUser] = useState('');
  const [aMode, setAMode] = useState<RangeMode>('month');
  const [aMonth, setAMonth] = useState(currentMonth());
  const [aFrom, setAFrom] = useState(monthRange(currentMonth()).from);
  const [aTo, setATo] = useState(monthRange(currentMonth()).to);
  const [aLoading, setALoading] = useState(false);

  // Mitarbeiter-Timesheet
  const [bUser, setBUser] = useState('');
  const [bProject, setBProject] = useState('');
  const [bMode, setBMode] = useState<RangeMode>('custom');
  const [bMonth, setBMonth] = useState(currentMonth());
  const [bFrom, setBFrom] = useState(monthRange(currentMonth()).from);
  const [bTo, setBTo] = useState(monthRange(currentMonth()).to);
  const [bLabel, setBLabel] = useState('');
  const [bLoading, setBLoading] = useState(false);

  // Rohdatenexport
  const [rawFrom, setRawFrom] = useState('2025-01-01');
  const [rawTo, setRawTo] = useState('2026-12-31');
  const [rawLoading, setRawLoading] = useState<'csv' | 'json' | null>(null);

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const projectOptions = useMemo(
    () => (aClient ? projects.filter(p => p.clientId === aClient) : projects),
    [projects, aClient]
  );
  const sortedUsers = useMemo(() => [...users].sort((a, b) => a.name.localeCompare(b.name)), [users]);

  const resolveRange = (mode: RangeMode, month: string, from: string, to: string) =>
    mode === 'month' ? monthRange(month) : { from, to };
  const validRange = (r: { from: string; to: string }) => !!r.from && !!r.to && r.from <= r.to;

  const download = async (endpoint: string, params: Record<string, string>, fallbackName: string) => {
    const token = localStorage.getItem('insight_arcs_auth_jwt_token');
    const headers: Record<string, string> = { 'x-user-id': currentUser?.id || '' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '')).toString();
    const res = await fetch(`${endpoint}?${qs}`, { headers });
    if (!res.ok) {
      let msg = t.expFailed.replace('{status}', String(res.status));
      try { msg = (await res.json()).error || msg; } catch { /* keine JSON-Antwort */ }
      throw new Error(msg);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = /filename\*=UTF-8''([^;]+)/.exec(disposition) || /filename="?([^";]+)"?/.exec(disposition);
    const filename = match ? decodeURIComponent(match[1]) : fallbackName;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  };

  const handleClockify = async () => {
    setMessage(null);
    const range = resolveRange(aMode, aMonth, aFrom, aTo);
    if (!validRange(range)) return setMessage({ type: 'error', text: t.expInvalidRange });
    setALoading(true);
    try {
      const name = await download('/api/export/clockify-xlsx',
        { ...range, projectId: aProject, clientId: aClient, userId: isAdmin ? aUser : '' },
        'Clockify_Export.xlsx');
      setMessage({ type: 'success', text: t.expDownloaded.replace('{name}', name) });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setALoading(false);
    }
  };

  const handleTimesheet = async () => {
    setMessage(null);
    if (!bUser) return setMessage({ type: 'error', text: t.expSelectEmployee });
    const range = resolveRange(bMode, bMonth, bFrom, bTo);
    if (!validRange(range)) return setMessage({ type: 'error', text: t.expInvalidRange });
    setBLoading(true);
    try {
      const name = await download('/api/export/timesheet-xlsx',
        { ...range, userId: bUser, projectId: bProject, label: bLabel.trim() },
        'Bi_weekly_Time_Report.xlsx');
      setMessage({ type: 'success', text: t.expDownloaded.replace('{name}', name) });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBLoading(false);
    }
  };

  const handleRaw = async (format: 'csv' | 'json') => {
    setMessage(null);
    if (!validRange({ from: rawFrom, to: rawTo })) return setMessage({ type: 'error', text: t.expInvalidRange });
    setRawLoading(format);
    try {
      const name = await download('/api/export/time-entries', { from: rawFrom, to: rawTo, format },
        `time-entries-export.${format}`);
      setMessage({ type: 'success', text: t.expDownloaded.replace('{name}', name) });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setRawLoading(null);
    }
  };

  const renderRangePicker = (
    mode: RangeMode, setMode: (m: RangeMode) => void,
    month: string, setMonth: (v: string) => void,
    from: string, setFrom: (v: string) => void,
    to: string, setTo: (v: string) => void
  ) => (
    <div>
      <label className="font-semibold text-slate-700 block mb-1">{t.expRange}</label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
          {(['month', 'custom'] as RangeMode[]).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mode === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              {m === 'month' ? t.expModeMonth : t.expModeCustom}
            </button>
          ))}
        </div>
        {mode === 'month' ? (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800" />
        ) : (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label={t.fromDate}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800" />
            <span className="text-xs text-slate-400">{t.expUntil}</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label={t.toDate}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800" />
          </>
        )}
      </div>
    </div>
  );

  const downloadButton = (loading: boolean, onClick: () => void, disabled?: boolean) => (
    <button type="button" onClick={onClick} disabled={loading || disabled}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? t.expGenerating : t.expDownloadXlsx}
    </button>
  );

  return (
    <div id="export-panel" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.expTitle}</h3>
          <p className="text-xs text-slate-500">{t.expSubtitle}</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-xs font-medium border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {message.text}
        </div>
      )}

      {showXlsxExports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-sm text-slate-900">{t.expBillingTitle}</h4>
            </div>
            <p className="text-slate-500">{t.expBillingDesc}</p>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.expClient}</label>
              <select value={aClient} onChange={e => { setAClient(e.target.value); setAProject(''); }} className={selectCls}>
                <option value="">{t.expAllClients}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.expProject}</label>
              <select value={aProject} onChange={e => setAProject(e.target.value)} className={selectCls}>
                <option value="">{t.expAllProjects}</option>
                {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` (${p.clientName})` : ''}</option>)}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.expEmployee}</label>
                <select value={aUser} onChange={e => setAUser(e.target.value)} className={selectCls}>
                  <option value="">{t.expAllEmployees}</option>
                  {sortedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            {renderRangePicker(aMode, setAMode, aMonth, setAMonth, aFrom, setAFrom, aTo, setATo)}
            {downloadButton(aLoading, handleClockify)}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="font-bold text-sm text-slate-900">{t.expTimesheetTitle}</h4>
            </div>
            <p className="text-slate-500">{t.expTimesheetDesc}</p>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.expEmployee} *</label>
              <select value={bUser} onChange={e => setBUser(e.target.value)} className={selectCls}>
                <option value="">{t.expSelectPlaceholder}</option>
                {sortedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.expProjectOptional}</label>
              <select value={bProject} onChange={e => setBProject(e.target.value)} className={selectCls}>
                <option value="">{t.expAllProjects}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` (${p.clientName})` : ''}</option>)}
              </select>
            </div>
            {renderRangePicker(bMode, setBMode, bMonth, setBMonth, bFrom, setBFrom, bTo, setBTo)}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.expSprintLabel}</label>
              <input type="text" value={bLabel} onChange={e => setBLabel(e.target.value)} placeholder={t.expSprintPlaceholder}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800" />
            </div>
            {downloadButton(bLoading, handleTimesheet, !bUser)}
          </section>
        </div>
      )}

      {showRawExport && (
        <section id="raw-export" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900">{t.exportTitle}</h4>
          </div>
          <p className="text-slate-500">{t.exportSubtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.fromDate}</label>
              <input id="input-export-from" type="date" value={rawFrom} onChange={e => setRawFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold" />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.toDate}</label>
              <input id="input-export-to" type="date" value={rawTo} onChange={e => setRawTo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold" />
            </div>
            <button id="btn-export-csv" type="button" onClick={() => handleRaw('csv')} disabled={rawLoading !== null}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50">
              {rawLoading === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} {t.exportCsv}
            </button>
            <button id="btn-export-json" type="button" onClick={() => handleRaw('json')} disabled={rawLoading !== null}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
              {rawLoading === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} {t.exportJson}
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">{t.expRawFormatTitle}</div>
            <p>{t.expRawFormatFields}</p>
          </div>
        </section>
      )}
    </div>
  );
};
