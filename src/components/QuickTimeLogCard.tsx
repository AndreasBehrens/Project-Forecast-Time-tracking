import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  Play,
  Pause,
  Square,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FolderKanban,
  Check,
  AlertCircle,
  Plus,
  RotateCcw
} from 'lucide-react';

interface QuickTimeLogCardProps {
  onEntryCreated?: () => void;
}

export const QuickTimeLogCard: React.FC<QuickTimeLogCardProps> = ({ onEntryCreated }) => {
  const {
    t,
    projects,
    tasks,
    currentUser,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    updateTimerState,
    createTimeEntry
  } = useApp();

  // Natural Language Input / Quick Text State
  const [quickInput, setQuickInput] = useState<string>(() => {
    try {
      return localStorage.getItem('insight_arcs_quick_log_draft') || '';
    } catch {
      return '';
    }
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('insight_arcs_quick_log_project');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available bookable projects for the user
  const effectiveUserId = currentUser?.id || 'u-1';
  const isPrivilegedUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROJECT_MANAGER';

  const allowedProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.status === 'ARCHIVED' || p.status === 'COMPLETED') return false;
      if (p.excludedUserIds && p.excludedUserIds.includes(effectiveUserId)) return false;
      if (!p.restrictToAssignedMembers) return true;
      if (p.assignedUserIds && p.assignedUserIds.includes(effectiveUserId)) return true;
      if (isPrivilegedUser && !p.restrictToAssignedMembers) return true;
      return false;
    });
  }, [projects, effectiveUserId, isPrivilegedUser]);

  // Keep selected project aligned with allowed projects
  useEffect(() => {
    if (allowedProjects.length > 0) {
      if (!selectedProjectId || !allowedProjects.some(p => p.id === selectedProjectId)) {
        const first = allowedProjects[0].id;
        setSelectedProjectId(first);
        try { localStorage.setItem('insight_arcs_quick_log_project', first); } catch {}
      }
    }
  }, [allowedProjects, selectedProjectId]);

  // Tasks for currently selected project
  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === selectedProjectId && t.status === 'ACTIVE');
  }, [tasks, selectedProjectId]);

  // Auto-save draft input to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('insight_arcs_quick_log_draft', quickInput);
    } catch {}
  }, [quickInput]);

  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    setSelectedTaskId('');
    try {
      localStorage.setItem('insight_arcs_quick_log_project', projId);
    } catch {}
  };

  // -------------------------------------------------------------
  // Intelligent Expression Parser
  // Parses: "2.5h on Task X", "45m Standup", "1h 30m Konzept", "8h", "1.75h"
  // -------------------------------------------------------------
  const parsedExpression = useMemo(() => {
    const text = quickInput.trim();
    if (!text) return null;

    let detectedMinutes = 0;
    let cleanDescription = text;

    // Pattern 1: Combined hours and minutes (e.g. "1h 30m", "1h30min", "2 hrs 15 mins")
    const hourMinMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|std|stunden|hours?)\s*(\d+)?\s*(?:m|min|minuten|minutes?)?\s*(?:(?:on|für|auf|-|:)\s*(.*))?$/i);
    
    // Pattern 2: Only hours (e.g. "2.5h", "3h meeting", "1.5 std")
    const hoursMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:h|std|stunden|hours?)\s*(?:(?:on|für|auf|-|:)\s*(.*))?$/i);

    // Pattern 3: Only minutes (e.g. "45m", "30min standup")
    const minMatch = text.match(/^(\d+)\s*(?:m|min|minuten|minutes?)\s*(?:(?:on|für|auf|-|:)\s*(.*))?$/i);

    if (hourMinMatch && hourMinMatch[2]) {
      const h = parseFloat(hourMinMatch[1].replace(',', '.')) || 0;
      const m = parseInt(hourMinMatch[2], 10) || 0;
      detectedMinutes = Math.round(h * 60 + m);
      cleanDescription = hourMinMatch[3] || '';
    } else if (hoursMatch) {
      const h = parseFloat(hoursMatch[1].replace(',', '.')) || 0;
      detectedMinutes = Math.round(h * 60);
      cleanDescription = hoursMatch[2] || '';
    } else if (minMatch) {
      detectedMinutes = parseInt(minMatch[1], 10) || 0;
      cleanDescription = minMatch[2] || '';
    } else {
      // Direct number fallback if text is just "2.5" or "1"
      const numMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
      if (numMatch && !isNaN(parseFloat(numMatch[1].replace(',', '.')))) {
        const val = parseFloat(numMatch[1].replace(',', '.'));
        if (val <= 24) {
          detectedMinutes = Math.round(val * 60);
          cleanDescription = numMatch[2] || '';
        }
      }
    }

    if (detectedMinutes <= 0) return null;

    // Check if cleanDescription matches a task in the selected project
    let matchedTaskId: string | undefined = undefined;
    let matchedTaskName: string | undefined = undefined;
    if (cleanDescription) {
      const lowerDesc = cleanDescription.toLowerCase();
      const foundTask = projectTasks.find(t => lowerDesc.includes(t.name.toLowerCase()));
      if (foundTask) {
        matchedTaskId = foundTask.id;
        matchedTaskName = foundTask.name;
      }
    }

    return {
      minutes: detectedMinutes,
      hoursDecimal: Math.round((detectedMinutes / 60) * 100) / 100,
      description: cleanDescription.trim(),
      matchedTaskId,
      matchedTaskName
    };
  }, [quickInput, projectTasks]);

  // Quick Preset Adders
  const handleApplyPreset = (minutesToAdd: number, label: string) => {
    if (parsedExpression) {
      const newMinutes = parsedExpression.minutes + minutesToAdd;
      const newHours = (newMinutes / 60).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '');
      const desc = parsedExpression.description ? ` ${parsedExpression.description}` : '';
      setQuickInput(`${newHours}h${desc}`);
    } else {
      const hours = (minutesToAdd / 60).toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '');
      setQuickInput(`${hours}h ${label}`);
    }
  };

  // Submit Quick Entry
  const handleDirectQuickLog = async () => {
    if (!parsedExpression || parsedExpression.minutes <= 0 || !selectedProjectId) return;

    setIsSubmitting(true);
    try {
      const project = projects.find(p => p.id === selectedProjectId);
      const taskIdToUse = parsedExpression.matchedTaskId || selectedTaskId || undefined;
      const task = tasks.find(t => t.id === taskIdToUse);

      await createTimeEntry({
        projectId: selectedProjectId,
        taskId: taskIdToUse,
        date: new Date().toISOString().split('T')[0],
        durationMinutes: parsedExpression.minutes,
        description: parsedExpression.description || `${t.quickLogTitle || 'Quick Log'} (${project?.name || ''})`,
        isBillable: isBillable,
        approvalStatus: 'SUBMITTED'
      });

      // Clear draft input
      setQuickInput('');
      try { localStorage.removeItem('insight_arcs_quick_log_draft'); } catch {}

      // Success feedback
      setSuccessMessage(`${parsedExpression.hoursDecimal}h gebucht für ${project?.name || ''}`);
      setTimeout(() => setSuccessMessage(null), 3500);

      if (onEntryCreated) onEntryCreated();
    } catch (err) {
      console.error('Failed to quick log time entry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Live Timer Toggle
  const handleToggleTimer = () => {
    if (activeTimer.isRunning) {
      if (activeTimer.isPaused) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    } else {
      startTimer(
        selectedProjectId || undefined,
        selectedTaskId || undefined,
        parsedExpression?.description || quickInput || undefined,
        isBillable
      );
    }
  };

  const handleStopTimer = () => {
    stopTimer();
    if (onEntryCreated) onEntryCreated();
  };

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div
      id="quick-time-logging-card"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5 transition-all"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>{t.quickLogTitle || 'Schnellerfassung (Quick Log)'}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                1-Click & Text Parser
              </span>
            </h3>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t.quickLogSubtitle || 'Zeiten mit 1 Klick erfassen oder direkt per Freitext buchen'}
            </p>
          </div>
        </div>

        {/* Live Timer Status Pill */}
        {activeTimer.isRunning && (
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xs animate-pulse-subtle">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-xs font-bold">{formatTimer(activeTimer.elapsedSeconds)}</span>
            <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5">
              <button
                onClick={handleToggleTimer}
                className="p-1 hover:bg-slate-800 rounded text-amber-400"
                title={activeTimer.isPaused ? (t.resumeTimer || 'Fortsetzen') : (t.pauseTimer || 'Pause')}
              >
                {activeTimer.isPaused ? <Play className="w-3.5 h-3.5 fill-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleStopTimer}
                className="p-1 hover:bg-slate-800 rounded text-rose-400"
                title={t.stopTimer || 'Stoppen'}
              >
                <Square className="w-3.5 h-3.5 fill-rose-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Input Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Project Selector */}
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            {t.project || 'Projekt'}
          </label>
          <select
            id="select-quicklog-project"
            value={selectedProjectId}
            onChange={e => handleSelectProject(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          >
            {allowedProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.clientName ? `(${p.clientName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Task Selector (if tasks exist) */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            {t.task || 'Aufgabe'}
          </label>
          <select
            id="select-quicklog-task"
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white"
          >
            <option value="">{t.noTask || 'Allgemeine Tätigkeit'}</option>
            {projectTasks.map(tsk => (
              <option key={tsk.id} value={tsk.id}>
                {tsk.name}
              </option>
            ))}
          </select>
        </div>

        {/* Natural Language Input Field */}
        <div className="md:col-span-5">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
            <span>{t.whatAreYouWorkingOn || 'Dauer & Beschreibung'}</span>
            {quickInput && (
              <span className="text-[10px] text-emerald-700 font-medium">
                {t.quickLogDraftSaved || 'Entwurf gesichert'}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="input-quicklog-expression"
              type="text"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && parsedExpression) {
                  e.preventDefault();
                  handleDirectQuickLog();
                }
              }}
              placeholder={t.quickLogPlaceholder || 'z. B. "2.5h on Task X", "45m Standup"'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
            {quickInput && (
              <button
                onClick={() => setQuickInput('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                title="Löschen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Parser Detection Indicator & Preset Chips Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Preset Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Schnellwahl:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset(30, 'Standup / Call')}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {t.quickLogPreset30m || '+30m'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(60, 'Projektarbeit')}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {t.quickLogPreset1h || '+1h'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(120, 'Konzept & Entwicklung')}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {t.quickLogPreset2h || '+2h'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(240, 'Sprint Modul')}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {t.quickLogPreset4h || '+4h'}
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(480, 'Tagespensum')}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors"
          >
            {t.quickLogPreset8h || '8h Tag'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Billable Toggle */}
          <button
            type="button"
            onClick={() => setIsBillable(!isBillable)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold border transition-all ${
              isBillable
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            aria-label={isBillable ? (t.billable || 'Abrechenbar') : (t.nonBillable || 'Nicht abrechenbar')}
            title={isBillable ? (t.billable || 'Abrechenbar') : (t.nonBillable || 'Nicht abrechenbar')}
          >
            <span className={isBillable ? '' : 'line-through'}>€</span>
          </button>

          {/* 1-Click Timer Start/Pause Button */}
          <button
            id="btn-quicklog-start-timer"
            type="button"
            onClick={handleToggleTimer}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              activeTimer.isRunning && !activeTimer.isPaused
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {activeTimer.isRunning && !activeTimer.isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{t.pauseTimer || 'Pause'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t.startTimer || 'Timer starten'}</span>
              </>
            )}
          </button>

          {/* Direct Instant Log Button */}
          <button
            id="btn-quicklog-submit-direct"
            type="button"
            disabled={!parsedExpression || isSubmitting}
            onClick={handleDirectQuickLog}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t.quickLogSubmit || 'Sofort buchen'}</span>
          </button>
        </div>
      </div>

      {/* Parsed Live Feedback Badge / Success Banner */}
      {parsedExpression && (
        <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>{t.quickLogDetected || 'Erkannt'}:</strong> {parsedExpression.hoursDecimal}h ({parsedExpression.minutes} Min)
              {parsedExpression.description && ` • "${parsedExpression.description}"`}
              {parsedExpression.matchedTaskName && ` • Aufgabe: "${parsedExpression.matchedTaskName}"`}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">
            Drücken Sie Enter zum Buchen
          </span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-600 text-white rounded-xl p-2.5 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
