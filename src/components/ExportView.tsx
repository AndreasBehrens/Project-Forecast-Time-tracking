import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileSpreadsheet, Download, Loader2, Receipt, UserCheck } from 'lucide-react';

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

/** Gemeinsamer Zeitraum-Picker: Monat oder freier Zeitraum (Von/Bis). */
const DateRangePicker: React.FC<{
  mode: RangeMode; setMode: (m: RangeMode) => void;
  month: string; setMonth: (v: string) => void;
  from: string; setFrom: (v: string) => void;
  to: string; setTo: (v: string) => void;
}> = ({ mode, setMode, month, setMonth, from, setFrom, to, setTo }) => (
  <div>
    <label className="font-semibold text-slate-700 block mb-1">Zeitraum</label>
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
        {(['month', 'custom'] as RangeMode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mode === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {m === 'month' ? 'Monat' : 'Zeitraum'}
          </button>
        ))}
      </div>
      {mode === 'month' ? (
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800" />
      ) : (
        <>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Von"
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800" />
          <span className="text-xs text-slate-400">bis</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Bis"
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800" />
        </>
      )}
    </div>
  </div>
);

const selectCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white';

export const ExportView: React.FC = () => {
  const { currentUser, users, projects, clients } = useApp();
  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === 'u-1';

  // Abschnitt A – Abrechnungsexport
  const [aProject, setAProject] = useState('');
  const [aClient, setAClient] = useState('');
  const [aUser, setAUser] = useState('');
  const [aMode, setAMode] = useState<RangeMode>('month');
  const [aMonth, setAMonth] = useState(currentMonth());
  const [aFrom, setAFrom] = useState(monthRange(currentMonth()).from);
  const [aTo, setATo] = useState(monthRange(currentMonth()).to);
  const [aLoading, setALoading] = useState(false);

  // Abschnitt B – Mitarbeiter-Timesheet
  const [bUser, setBUser] = useState('');
  const [bProject, setBProject] = useState('');
  const [bMode, setBMode] = useState<RangeMode>('custom');
  const [bMonth, setBMonth] = useState(currentMonth());
  const [bFrom, setBFrom] = useState(monthRange(currentMonth()).from);
  const [bTo, setBTo] = useState(monthRange(currentMonth()).to);
  const [bLabel, setBLabel] = useState('');
  const [bLoading, setBLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Projektliste ggf. auf gewählten Kunden einschränken
  const projectOptions = useMemo(
    () => (aClient ? projects.filter(p => p.clientId === aClient) : projects),
    [projects, aClient]
  );
  const activeUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const resolveRange = (mode: RangeMode, month: string, from: string, to: string) =>
    mode === 'month' ? monthRange(month) : { from, to };

  const download = async (endpoint: string, params: Record<string, string>, fallbackName: string) => {
    const token = localStorage.getItem('insight_arcs_auth_jwt_token');
    const headers: Record<string, string> = { 'x-user-id': currentUser?.id || '' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '')).toString();
    const res = await fetch(`${endpoint}?${qs}`, { headers });
    if (!res.ok) {
      let msg = `Export fehlgeschlagen (HTTP ${res.status}).`;
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

  const validRange = (r: { from: string; to: string }) => !!r.from && !!r.to && r.from <= r.to;

  const handleClockify = async () => {
    setMessage(null);
    const range = resolveRange(aMode, aMonth, aFrom, aTo);
    if (!validRange(range)) return setMessage({ type: 'error', text: 'Bitte einen gültigen Zeitraum wählen.' });
    setALoading(true);
    try {
      const name = await download('/api/export/clockify-xlsx',
        { ...range, projectId: aProject, clientId: aClient, userId: isAdmin ? aUser : '' },
        'Clockify_Export.xlsx');
      setMessage({ type: 'success', text: `${name} wurde heruntergeladen.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setALoading(false);
    }
  };

  const handleTimesheet = async () => {
    setMessage(null);
    if (!bUser) return setMessage({ type: 'error', text: 'Bitte einen Mitarbeiter auswählen.' });
    const range = resolveRange(bMode, bMonth, bFrom, bTo);
    if (!validRange(range)) return setMessage({ type: 'error', text: 'Bitte einen gültigen Zeitraum wählen.' });
    setBLoading(true);
    try {
      const name = await download('/api/export/timesheet-xlsx',
        { ...range, userId: bUser, projectId: bProject, label: bLabel.trim() },
        'Bi_weekly_Time_Report.xlsx');
      setMessage({ type: 'success', text: `${name} wurde heruntergeladen.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setBLoading(false);
    }
  };

  const DownloadButton: React.FC<{ loading: boolean; onClick: () => void; disabled?: boolean }> = ({ loading, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? 'Wird erstellt …' : 'XLSX herunterladen'}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="w-5 h-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Exporte</h1>
          <p className="text-xs text-slate-500">Rechnungsfähige Excel-Exporte für Kunden und Projektmanager.</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-xs font-medium border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abschnitt A */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Abrechnungsexport (Clockify-Format)</h2>
          </div>
          <p className="text-slate-500">Eine Zeile pro Zeiteintrag mit Beschreibung, Projekt, Kunde, Mitarbeiter, Start/Ende und Dauer – als Anhang zur Rechnung.</p>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Kunde</label>
            <select value={aClient} onChange={e => { setAClient(e.target.value); setAProject(''); }} className={selectCls}>
              <option value="">Alle Kunden</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Projekt</label>
            <select value={aProject} onChange={e => setAProject(e.target.value)} className={selectCls}>
              <option value="">Alle Projekte</option>
              {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` (${p.clientName})` : ''}</option>)}
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mitarbeiter</label>
              <select value={aUser} onChange={e => setAUser(e.target.value)} className={selectCls}>
                <option value="">Alle Mitarbeiter</option>
                {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <DateRangePicker mode={aMode} setMode={setAMode} month={aMonth} setMonth={setAMonth}
            from={aFrom} setFrom={setAFrom} to={aTo} setTo={setATo} />
          <DownloadButton loading={aLoading} onClick={handleClockify} />
        </section>

        {/* Abschnitt B */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Mitarbeiter-Timesheet (Bi-Weekly Format)</h2>
          </div>
          <p className="text-slate-500">Stunden eines Mitarbeiters je Aufgabe (Task ID) mit Gesamtstunden und Tagen – für den Projektmanager des Kunden.</p>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mitarbeiter *</label>
            <select value={bUser} onChange={e => setBUser(e.target.value)} className={selectCls}>
              <option value="">— Bitte auswählen —</option>
              {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Projekt (optional)</label>
            <select value={bProject} onChange={e => setBProject(e.target.value)} className={selectCls}>
              <option value="">Alle Projekte</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.clientName ? ` (${p.clientName})` : ''}</option>)}
            </select>
          </div>
          <DateRangePicker mode={bMode} setMode={setBMode} month={bMonth} setMonth={setBMonth}
            from={bFrom} setFrom={setBFrom} to={bTo} setTo={setBTo} />
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Sprint / Zeitraum-Bezeichnung</label>
            <input type="text" value={bLabel} onChange={e => setBLabel(e.target.value)}
              placeholder="z. B. 24 oder Oktober 2026 (leer = Monat)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800" />
          </div>
          <DownloadButton loading={bLoading} onClick={handleTimesheet} disabled={!bUser} />
        </section>
      </div>
    </div>
  );
};
