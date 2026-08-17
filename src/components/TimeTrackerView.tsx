import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TimeEntry } from '../types';
import {
  Play,
  Pause,
  Square,
  Plus,
  Star,
  Split,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  Filter,
  Users,
  AlertCircle
} from 'lucide-react';

export const TimeTrackerView: React.FC = () => {
  const {
    t,
    projects,
    tasks,
    users,
    currentUser,
    timeEntries,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    updateTimerState,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    splitTimeEntry,
    batchUpdateTimeEntries,
    approveTimeEntries
  } = useApp();

  // Mode: 'timer' | 'duration' | 'range'
  const [entryMode, setEntryMode] = useState<'timer' | 'duration' | 'range'>('timer');
  const [formatMode, setFormatMode] = useState<'decimal' | 'hMin'>('decimal');

  // Manual entry fields
  const [manualDescription, setManualDescription] = useState('');
  const [manualProjectId, setManualProjectId] = useState(projects[0]?.id || '');
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualDurationHours, setManualDurationHours] = useState('1.5');
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('17:00');
  const [manualBreakMinutes, setManualBreakMinutes] = useState(45);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualIsBillable, setManualIsBillable] = useState(true);
  const [targetUserId, setTargetUserId] = useState(currentUser?.id || 'u-1');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Multi-select / Batch
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Split Modal State
  const [splitModalEntry, setSplitModalEntry] = useState<TimeEntry | null>(null);
  const [splitParts, setSplitParts] = useState<Array<{ durationMinutes: number; description: string; taskId?: string }>>([]);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editReason, setEditReason] = useState('');

  // Favorites
  const favorites = timeEntries.filter(e => e.isFavorite).slice(0, 4);

  // Effective user for booking & permission checking
  const effectiveUserId = targetUserId || currentUser?.id || 'u-1';
  const isPrivilegedUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROJECT_MANAGER';

  // Allowed projects for booking (filters out archived/completed projects, excluded members, and restricted projects where user is not assigned)
  const allowedProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Inactive / Archived / Completed projects are never bookable
      if (p.status === 'ARCHIVED' || p.status === 'COMPLETED') return false;

      // 2. Explicitly excluded users can never book on this project
      if (p.excludedUserIds && p.excludedUserIds.includes(effectiveUserId)) {
        return false;
      }

      // 3. If unrestricted team access, all active employees can book
      if (!p.restrictToAssignedMembers) return true;

      // 4. If restricted to specific team members, check active assignment
      const isAssigned = (p.assignedUserIds && p.assignedUserIds.includes(effectiveUserId));
      if (isAssigned) return true;

      // 5. Admins/PMs booking for themselves can see unassigned active projects only if not explicitly restricted/excluded
      if (isPrivilegedUser && targetUserId === currentUser?.id && !p.restrictToAssignedMembers) return true;

      return false;
    });
  }, [projects, effectiveUserId, isPrivilegedUser, targetUserId, currentUser?.id]);

  // Keep selected project aligned with allowed projects
  useEffect(() => {
    if (allowedProjects.length > 0) {
      if (!manualProjectId || !allowedProjects.some(p => p.id === manualProjectId)) {
        setManualProjectId(allowedProjects[0].id);
      }
      if (!activeTimer.projectId || !allowedProjects.some(p => p.id === activeTimer.projectId)) {
        updateTimerState({ projectId: allowedProjects[0].id });
      }
    }
  }, [allowedProjects, manualProjectId, activeTimer.projectId]);

  // Available tasks for selected project
  const currentProjectId = entryMode === 'timer' ? activeTimer.projectId : manualProjectId;
  const currentProject = projects.find(p => p.id === currentProjectId);
  const availableTasks = tasks.filter(t => t.projectId === currentProjectId);

  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getRelativeDateString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let durationMinutes = 90;
    if (entryMode === 'duration') {
      durationMinutes = Math.max(1, Math.round(parseFloat(manualDurationHours || '1') * 60));
    } else if (entryMode === 'range') {
      const [sh, sm] = manualStartTime.split(':').map(Number);
      const [eh, em] = manualEndTime.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      durationMinutes = Math.max(1, diff - manualBreakMinutes);
    }

    await createTimeEntry({
      userId: targetUserId,
      projectId: manualProjectId || projects[0]?.id,
      taskId: manualTaskId || undefined,
      description: manualDescription || 'Tätigkeit',
      durationMinutes,
      startTime: entryMode === 'range' ? manualStartTime : undefined,
      endTime: entryMode === 'range' ? manualEndTime : undefined,
      breakMinutes: manualBreakMinutes,
      date: manualDate,
      isBillable: manualIsBillable
    });

    setManualDescription('');
    setSaveSuccessMsg(`Eintrag für ${manualDate} (${(durationMinutes / 60).toFixed(1)}h) erfolgreich gespeichert!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const setDateAndOpenManual = (date: string) => {
    setManualDate(date);
    if (entryMode === 'timer') {
      setEntryMode('duration');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSplitModal = (entry: TimeEntry) => {
    setSplitModalEntry(entry);
    const half = Math.floor(entry.durationMinutes / 2);
    setSplitParts([
      { durationMinutes: half, description: `${entry.description} (Teil 1)`, taskId: entry.taskId },
      { durationMinutes: entry.durationMinutes - half, description: `${entry.description} (Teil 2)`, taskId: entry.taskId }
    ]);
  };

  const handleExecuteSplit = async () => {
    if (!splitModalEntry) return;
    await splitTimeEntry(splitModalEntry.id, splitParts);
    setSplitModalEntry(null);
  };

  const handleToggleSelectAll = (entriesInDay: TimeEntry[]) => {
    const dayIds = entriesInDay.map(e => e.id);
    const allSelected = dayIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !dayIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...dayIds])));
    }
  };

  // Group entries by date
  const groupedEntries = timeEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        {/* Main Mode Toggle: Live Timer vs. Manuelle Zeiterfassung */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
            <button
              id="btn-mode-timer"
              type="button"
              onClick={() => setEntryMode('timer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                entryMode === 'timer'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.liveTimer}</span>
            </button>

            <button
              id="btn-mode-manual"
              type="button"
              onClick={() => {
                if (entryMode === 'timer') setEntryMode('duration');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                entryMode !== 'timer'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.manualEntry}</span>
              <span className="hidden sm:inline-block bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-blue-200/60">
                Vergessene Tage
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Deputy Mode for Managers/Admins */}
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'PROJECT_MANAGER') && (
              <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200/70 text-amber-900 px-2.5 py-1 rounded-lg">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-medium">{t.logForColleague}:</span>
                <select
                  id="select-target-user"
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value)}
                  className="bg-white border border-amber-200 rounded px-1.5 py-0.5 text-xs font-medium focus:ring-1 focus:ring-amber-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === currentUser.id ? '(Ich)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Display format toggle */}
            <div className="flex items-center text-xs bg-slate-100 p-0.5 rounded-lg">
              <button
                id="btn-fmt-dec"
                onClick={() => setFormatMode('decimal')}
                className={`px-2 py-1 rounded-md font-medium ${formatMode === 'decimal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                {t.decimalFormat} (7.5h)
              </button>
              <button
                id="btn-fmt-hmin"
                onClick={() => setFormatMode('hMin')}
                className={`px-2 py-1 rounded-md font-medium ${formatMode === 'hMin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                {t.hMinFormat} (7:30)
              </button>
            </div>
          </div>
        </div>

        {/* Save confirmation toast */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* --- TIMER MODE BAR --- */}
        {entryMode === 'timer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-5">
              <input
                id="input-timer-desc"
                type="text"
                value={activeTimer.description}
                onChange={e => updateTimerState({ description: e.target.value })}
                placeholder={t.whatAreYouWorkingOn}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            <div className="lg:col-span-3">
              <select
                id="select-timer-project"
                value={activeTimer.projectId}
                onChange={e => updateTimerState({ projectId: e.target.value, taskId: '' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900"
              >
                {allowedProjects.length === 0 ? (
                  <option value="">-- Keine freigegebenen Projekte --</option>
                ) : (
                  allowedProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.restrictToAssignedMembers ? '🔒 ' : ''}{p.name} ({p.clientName})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                id="select-timer-task"
                value={activeTimer.taskId}
                onChange={e => updateTimerState({ taskId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-slate-900"
              >
                <option value="">-- {t.task} (optional) --</option>
                {availableTasks.map(tsk => (
                  <option key={tsk.id} value={tsk.id}>
                    {tsk.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-end gap-2">
              {/* Billable toggle */}
              <button
                id="btn-timer-billable"
                type="button"
                onClick={() => updateTimerState({ isBillable: !activeTimer.isBillable })}
                className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeTimer.isBillable
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
                title={activeTimer.isBillable ? t.billable : t.nonBillable}
              >
                €
              </button>

              {/* Timer controls */}
              <div className="font-mono font-bold text-base text-slate-900 px-2 min-w-[70px] text-right">
                {formatSeconds(activeTimer.elapsedSeconds)}
              </div>

              {!activeTimer.isRunning ? (
                <button
                  id="btn-start-timer-main"
                  onClick={() => startTimer()}
                  className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl flex items-center justify-center shadow-sm transition-all"
                  title={t.startTimer}
                >
                  <Play className="w-5 h-5 fill-white" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {activeTimer.isPaused ? (
                    <button
                      id="btn-resume-timer-main"
                      onClick={resumeTimer}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl shadow-sm transition-all"
                      title={t.resumeTimer}
                    >
                      <Play className="w-5 h-5 fill-white" />
                    </button>
                  ) : (
                    <button
                      id="btn-pause-timer-main"
                      onClick={pauseTimer}
                      className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl shadow-sm transition-all"
                      title={t.pauseTimer}
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    id="btn-stop-timer-main"
                    onClick={stopTimer}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-xl shadow-sm transition-all"
                    title={t.stopTimer}
                  >
                    <Square className="w-5 h-5 fill-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* --- MANUELLE ZEITERFASSUNG FORM --- */
          <form onSubmit={handleManualSave} className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {/* Top row of manual form: Sub-mode & Date Picker with quick buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Art der Zeiteingabe:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  <button
                    id="btn-submode-duration"
                    type="button"
                    onClick={() => setEntryMode('duration')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      entryMode === 'duration'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⏳ {t.durationMode}
                  </button>
                  <button
                    id="btn-submode-range"
                    type="button"
                    onClick={() => setEntryMode('range')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      entryMode === 'range'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 {t.timeRangeMode}
                  </button>
                </div>
              </div>

              {/* Date selector with quick buttons */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>📅</span> {t.date}:
                </span>
                <input
                  id="input-manual-date"
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setManualDate(getRelativeDateString(0))}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      manualDate === getRelativeDateString(0)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualDate(getRelativeDateString(1))}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      manualDate === getRelativeDateString(1)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.yesterday}
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualDate(getRelativeDateString(2))}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      manualDate === getRelativeDateString(2)
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Vorgestern
                  </button>
                </div>
              </div>
            </div>

            {/* Middle row: Project, Task, Description, Duration/Range */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.project}</label>
                <select
                  id="select-manual-project"
                  value={manualProjectId}
                  onChange={e => {
                    setManualProjectId(e.target.value);
                    setManualTaskId('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-slate-900"
                >
                  {allowedProjects.length === 0 ? (
                    <option value="">-- Keine freigegebenen Projekte --</option>
                  ) : (
                    allowedProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.restrictToAssignedMembers ? '🔒 ' : ''}{p.name} ({p.clientName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.task}</label>
                <select
                  id="select-manual-task"
                  value={manualTaskId}
                  onChange={e => setManualTaskId(e.target.value)}
                  required={currentProject?.requiredFields.task}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- {t.task} (optional) --</option>
                  {availableTasks.map(tsk => (
                    <option key={tsk.id} value={tsk.id}>
                      {tsk.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t.description}</label>
                <input
                  id="input-manual-desc"
                  type="text"
                  value={manualDescription}
                  onChange={e => setManualDescription(e.target.value)}
                  placeholder={t.whatAreYouWorkingOn}
                  required={currentProject?.requiredFields.description}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {entryMode === 'duration' ? (
                <div className="md:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-600">Dauer (Std)</label>
                    <div className="flex gap-1 text-[10px]">
                      <button type="button" onClick={() => setManualDurationHours('1.0')} className="text-slate-500 hover:text-slate-900">1h</button>
                      <span>•</span>
                      <button type="button" onClick={() => setManualDurationHours('4.0')} className="text-slate-500 hover:text-slate-900">4h</button>
                      <span>•</span>
                      <button type="button" onClick={() => setManualDurationHours('8.0')} className="text-slate-500 hover:text-slate-900 font-bold">8h</button>
                    </div>
                  </div>
                  <input
                    id="input-manual-duration"
                    type="number"
                    step="0.25"
                    min="0.1"
                    value={manualDurationHours}
                    onChange={e => setManualDurationHours(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              ) : (
                <div className="md:col-span-3 grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t.startTime}</label>
                    <input
                      id="input-manual-start"
                      type="time"
                      value={manualStartTime}
                      onChange={e => setManualStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">{t.endTime}</label>
                    <input
                      id="input-manual-end"
                      type="time"
                      value={manualEndTime}
                      onChange={e => setManualEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-1.5 py-2 text-xs font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action row: Billable toggle + Submit button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <button
                  id="btn-manual-billable"
                  type="button"
                  onClick={() => setManualIsBillable(!manualIsBillable)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    manualIsBillable
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <span>€</span>
                  <span>{manualIsBillable ? t.billable : t.nonBillable}</span>
                </button>

                {entryMode === 'range' && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span>{t.breakMinutes}:</span>
                    <input
                      type="number"
                      value={manualBreakMinutes}
                      onChange={e => setManualBreakMinutes(Number(e.target.value))}
                      className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center"
                    />
                  </div>
                )}
              </div>

              <button
                id="btn-manual-submit"
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.saveEntry} ({manualDate})</span>
              </button>
            </div>
          </form>
        )}

        {/* Favorites Quick Bar */}
        {favorites.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {t.favorites}:
            </span>
            {favorites.map(fav => (
              <button
                key={fav.id}
                id={`btn-fav-${fav.id}`}
                onClick={() => {
                  startTimer({
                    description: fav.description,
                    projectId: fav.projectId,
                    taskId: fav.taskId,
                    isBillable: fav.isBillable
                  });
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <span className="font-medium text-slate-900">{fav.projectName}</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[130px]">{fav.description}</span>
                <Play className="w-3 h-3 text-slate-600 fill-slate-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Batch Action Bar (if items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{selectedIds.length} Einträge ausgewählt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-batch-approve"
              onClick={() => {
                approveTimeEntries(selectedIds, 'APPROVED');
                setSelectedIds([]);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {t.approveSelected}
            </button>
            <button
              id="btn-batch-billable"
              onClick={() => {
                batchUpdateTimeEntries(selectedIds, { isBillable: true });
                setSelectedIds([]);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Als abrechenbar markieren
            </button>
            <button
              id="btn-batch-delete"
              onClick={() => {
                selectedIds.forEach(id => deleteTimeEntry(id));
                setSelectedIds([]);
              }}
              className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {t.deleteSelected}
            </button>
          </div>
        </div>
      )}

      {/* Time Entries Grouped by Day */}
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-sm font-medium">{t.noData}</p>
          </div>
        ) : (
          sortedDates.map(dateStr => {
            const dayEntries = groupedEntries[dateStr];
            const totalHours = dayEntries.reduce((sum, e) => sum + e.durationHoursDecimal, 0);
            const totalBillableHours = dayEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.durationHoursDecimal, 0);
            const totalAmount = dayEntries.reduce((sum, e) => sum + e.calculatedAmount, 0);

            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString(t.appName.includes('Zeiterfassung') ? 'de-DE' : 'en-US', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div key={dateStr} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Day Header */}
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dayEntries.every(e => selectedIds.includes(e.id))}
                      onChange={() => handleToggleSelectAll(dayEntries)}
                      className="rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span className="font-semibold text-slate-800">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <button
                      type="button"
                      onClick={() => setDateAndOpenManual(dateStr)}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                      title={`Zeit für den ${formattedDate} nachtragen`}
                    >
                      <Plus className="w-3 h-3 text-slate-900" />
                      <span>{t.addTimeForDay}</span>
                    </button>
                    <span>
                      {t.totalDay}: <strong className="text-slate-900">{formatMode === 'decimal' ? `${totalHours.toFixed(2)}h` : `${Math.floor(totalHours)}:${Math.round((totalHours % 1) * 60).toString().padStart(2, '0')}`}</strong>
                    </span>
                    {totalBillableHours > 0 && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold">
                        {totalAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Entry Rows */}
                <div className="divide-y divide-slate-100">
                  {dayEntries.map(entry => {
                    const isSelected = selectedIds.includes(entry.id);
                    return (
                      <div
                        key={entry.id}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIds(prev =>
                                isSelected ? prev.filter(id => id !== entry.id) : [...prev, entry.id]
                              );
                            }}
                            className="mt-1 sm:mt-0 rounded text-slate-900 focus:ring-slate-900"
                          />

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900">
                                {entry.description || 'Tätigkeit ohne Beschreibung'}
                              </span>
                              {entry.isFavorite && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                              {entry.isCorrectedAfterApproval && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {t.correctedAfterApproval}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {entry.projectName}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span>{entry.clientName}</span>
                              {entry.taskName && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600 font-medium">{entry.taskName}</span>
                                </>
                              )}
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-400">{entry.userName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Duration, Rate, Status & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pl-7 sm:pl-0">
                          {entry.startTime && entry.endTime && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              {entry.startTime} - {entry.endTime}
                            </span>
                          )}

                          <div className="text-right">
                            <div className="font-bold text-sm text-slate-900">
                              {formatMode === 'decimal' ? `${entry.durationHoursDecimal.toFixed(2)}h` : `${Math.floor(entry.durationHoursDecimal)}:${Math.round((entry.durationHoursDecimal % 1) * 60).toString().padStart(2, '0')}`}
                            </div>
                            {entry.isBillable && (
                              <div className="text-[11px] text-emerald-700 font-medium">
                                {entry.calculatedAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </div>
                            )}
                          </div>

                          {/* Approval Status Badge */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              entry.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.approvalStatus === 'SUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry.approvalStatus}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              id={`btn-split-${entry.id}`}
                              onClick={() => openSplitModal(entry)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                              title={t.splitEntry}
                            >
                              <Split className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-edit-${entry.id}`}
                              onClick={() => setEditingEntry(entry)}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                              title={t.edit}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-del-${entry.id}`}
                              onClick={() => deleteTimeEntry(entry.id)}
                              className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- SPLIT MODAL (Section 7) --- */}
      {splitModalEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Split className="w-5 h-5 text-emerald-600" />
              {t.splitModalTitle}
            </h3>
            <p className="text-xs text-slate-500">
              {t.splitModalDesc} (Original: {splitModalEntry.durationMinutes} Min / {splitModalEntry.durationHoursDecimal}h)
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {splitParts.map((part, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-semibold text-slate-700">
                    {t.part} {index + 1}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={part.description}
                        onChange={e => {
                          const val = e.target.value;
                          setSplitParts(prev => prev.map((p, i) => i === index ? { ...p, description: val } : p));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={part.durationMinutes}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setSplitParts(prev => prev.map((p, i) => i === index ? { ...p, durationMinutes: val } : p));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setSplitParts(prev => [...prev, { durationMinutes: 15, description: `${splitModalEntry.description} (Teil ${prev.length + 1})` }]);
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                + {t.addPart}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSplitModalEntry(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSplit}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  {t.executeSplit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL (Section 8: Audit-Log triggers on post-approval edit) --- */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Zeiteintrag bearbeiten
            </h3>

            {editingEntry.approvalStatus === 'APPROVED' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Achtung:</strong> Dieser Eintrag wurde bereits freigegeben. Jede Änderung wird lückenlos im Audit-Protokoll mit Zeitstempel und Begründung protokolliert.
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">{t.description}</label>
                <input
                  type="text"
                  value={editingEntry.description}
                  onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Dauer (Minuten)</label>
                  <input
                    type="number"
                    value={editingEntry.durationMinutes}
                    onChange={e => setEditingEntry({ ...editingEntry, durationMinutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Stundensatz (€)</label>
                  <input
                    type="number"
                    value={editingEntry.hourlyBillingRate}
                    onChange={e => setEditingEntry({ ...editingEntry, hourlyBillingRate: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {editingEntry.approvalStatus === 'APPROVED' && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Korrekturgrund (für Audit-Log)</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="z.B. Tippfehler bei Stundenanzahl"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await updateTimeEntry(editingEntry.id, editingEntry, editReason);
                  setEditingEntry(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Änderung speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
