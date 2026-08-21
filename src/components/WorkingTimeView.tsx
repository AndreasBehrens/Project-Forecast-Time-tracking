import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Coffee,
  Info
} from 'lucide-react';

export const WorkingTimeView: React.FC = () => {
  const {
    t,
    currentUser,
    workingTimeEntries,
    saveWorkingTime,
    users
  } = useApp();

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser?.id, isAdmin]);

  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || 'u-1');

  // New entry form
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(45);
  const [note, setNote] = useState('Büro München');

  // Summary data from API
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/working-time/summary?userId=${selectedUserId}&month=${selectedMonth}`)
      .then(r => r.json())
      .then(data => setSummary(data))
      .catch(() => {});
  }, [selectedUserId, selectedMonth, workingTimeEntries]);

  const handleSaveWorkingDay = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveWorkingTime({
      userId: selectedUserId,
      date: entryDate,
      startTime,
      endTime,
      breakMinutes,
      note
    });
  };

  const filteredEntries = workingTimeEntries.filter(
    w => w.userId === selectedUserId && w.date.startsWith(selectedMonth)
  );

  const selectedUserObj = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header & Month/User Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{t.workingTimeTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t.workingTimeSubtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {isAdmin ? (
            <select
              id="select-worktime-user"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 w-full sm:w-auto focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-colors"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.weeklyTargetHours} {t.hoursPerWeek})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 flex items-center gap-2 w-full sm:w-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">{currentUser?.name} ({currentUser?.weeklyTargetHours || 40} {t.hoursPerWeek})</span>
            </div>
          )}

          <div className="relative flex items-center w-full sm:w-auto">
            <input
              id="input-worktime-month"
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 w-full sm:w-auto min-w-[140px] focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Sanity Check Warning Banner (Section 20) */}
      {summary?.sanityDiscrepancies && summary.sanityDiscrepancies.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm text-amber-900">{t.sanityWarningTitle}</div>
            <p className="text-amber-800 leading-relaxed">
              {t.sanityWarningText}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {summary.sanityDiscrepancies.map((d: any) => (
                <span key={d.date} className="bg-white/80 border border-amber-200 px-2 py-1 rounded-md font-medium text-[11px]">
                  📅 {d.date}: {t.recordedProjectTime} <strong>{d.projectHours}h</strong> &gt; {t.grossTime} <strong>{d.workHours}h</strong> (+{d.diff}h)
                </span>
              ))}
            </div>
            <p className="text-[11px] text-amber-700/80 pt-1">
              {t.sanityWarningSoftNotice}
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards (Target vs. Actual & Overtime Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.targetHoursMonth}</div>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.targetHoursTotal || 160}h
          </div>
          <div className="text-[11px] text-slate-500">
            {summary?.targetWorkDays || 20} {t.workdaysInPeriod} ({selectedUserObj?.dailyTargetHours || 8}h/{t.day})
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.actualHoursMonth} ({t.recordedAttendance})</div>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.actualWorkingHours || 0}h
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            {t.recordedNetWorkingTime}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.recordedProjectTime}</div>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.actualProjectHours || 0}h
          </div>
          <div className="text-[11px] text-slate-500">
            {t.bookedToClientsProjects}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
          (summary?.balanceHours || 0) >= 0
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/50 border-rose-200 text-rose-950'
        }`}>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.overtimeBalance}</div>
          <div className="text-2xl font-bold flex items-center gap-1.5">
            {(summary?.balanceHours || 0) >= 0 ? (
              <>
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                <span>+{(summary?.balanceHours || 0).toFixed(2)}h</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
                <span>{(summary?.balanceHours || 0).toFixed(2)}h</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            {t.flexitimeAccountBalance}
          </div>
        </div>
      </div>

      {/* Clock In / Out Entry Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          {t.recordOrEditDailyWorktime}
        </h3>

        <form onSubmit={handleSaveWorkingDay} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.date}</label>
            <input
              id="input-work-date"
              type="date"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.clockIn} ({t.startTime})</label>
            <input
              id="input-work-start"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.clockOut} ({t.endTime})</label>
            <input
              id="input-work-end"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Coffee className="w-3 h-3 text-amber-600" /> {t.breakMinutes}
            </label>
            <input
              id="input-work-break"
              type="number"
              min="0"
              step="5"
              value={breakMinutes}
              onChange={e => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-500" /> {t.note}
            </label>
            <input
              id="input-work-note"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="z.B. Home Office / München"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="lg:col-span-1">
            <button
              id="btn-save-working-day"
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Working Time Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/80 font-bold text-xs text-slate-700 bg-slate-50/50">
          {t.loggedDailyWorkingHours} ({filteredEntries.length} {filteredEntries.length === 1 ? t.day : t.days})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">{t.date}</th>
                <th className="px-4 py-3">{t.clockInClockOut}</th>
                <th className="px-4 py-3">{t.breakTime}</th>
                <th className="px-4 py-3">{t.grossTime}</th>
                <th className="px-4 py-3">{t.netTime}</th>
                <th className="px-4 py-3">{t.locationPlaceholder.split(',')[0]} / {t.note}</th>
                <th className="px-4 py-3 text-right">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{entry.date}</td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-700">
                    {entry.startTime} - {entry.endTime}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{entry.breakMinutes} {t.minutes}</td>
                  <td className="px-4 py-3 text-slate-500">{(entry.totalGrossMinutes / 60).toFixed(2)}h</td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                    {entry.totalNetHoursDecimal.toFixed(2)}h
                  </td>
                  <td className="px-4 py-3 text-slate-600">{entry.note || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <CheckCircle className="w-3 h-3" /> {t.compliant}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
