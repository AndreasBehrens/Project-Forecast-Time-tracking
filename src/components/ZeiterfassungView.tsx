import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalStatus, DayType, TimeEntry, User, WorkingTimeEntry } from '../types';
import { DateRangePicker, DateRangeValue, getValueRange, presetValue, toLocalISODate } from './DateRangePicker';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Pause,
  Pencil,
  Play,
  Search,
  Square,
  Star,
  Trash2,
  Users,
  AlertCircle,
  X
} from 'lucide-react';

/**
 * Einheitliche Zeiterfassung (ersetzt die getrennten Ansichten "Projektzeiterfassung" und "Allg. Arbeitszeit").
 *
 * Speicher-Routing:
 *  - Projekt gewählt                         → Projektzeit (TimeEntry, /api/time-entries)
 *  - Intern, kein Projekt, Regulärer Arbeitstag → Arbeitszeit (WorkingTimeEntry, dayType=REGULAR)
 *  - Intern, Abwesenheit                     → Arbeitszeit (WorkingTimeEntry, passender dayType)
 *  - Extern                                  → immer Projektzeit (Projekt ist Pflicht)
 */

type EntryKind = 'time' | 'work';
type EntryMode = 'timer' | 'range';

interface UnifiedRow {
  kind: EntryKind;
  id: string;
  date: string;
  userId: string;
  userName: string;
  dayType: DayType;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  text: string;
  startTime: string;
  endTime: string;
  minutes: number;
  isFullDay: boolean;
  isBillable?: boolean;
  approvalStatus?: ApprovalStatus;
  timeEntry?: TimeEntry;
  workEntry?: WorkingTimeEntry;
}

interface EditingRef {
  kind: EntryKind;
  id: string;
  projectId?: string;
}

const TIMER_FORM_KEY = 'insight_arcs_zf_timer_form';
const ABSENCE_TYPES: DayType[] = ['VACATION', 'SICK', 'SPECIAL_LEAVE', 'PARENTAL_LEAVE'];

const isInternalByEmployment = (u?: User | null) =>
  !!u && (u.employmentType === 'INTERNAL' || (!u.employmentType && !u.companyName));
const isPrivilegedRole = (u?: User | null) =>
  !!u && (u.role === 'SUPERADMIN' || u.role === 'ADMIN' || u.role === 'PROJECT_MANAGER' || u.id === 'u-1');

const toMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMinutes = (total: number) => {
  const v = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
/** Bruttodauer zwischen Start und Ende (über Mitternacht hinweg möglich). */
const spanMinutes = (start: string, end: string) => {
  let diff = toMinutes(end) - toMinutes(start);
  if (diff < 0) diff += 1440;
  return diff;
};
const formatHM = (minutes: number) => {
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
};
const formatSeconds = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const TYPE_BADGE: Record<DayType, string> = {
  REGULAR: 'bg-slate-100 text-slate-700 border-slate-200',
  VACATION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SICK: 'bg-red-100 text-red-800 border-red-200',
  SPECIAL_LEAVE: 'bg-blue-100 text-blue-800 border-blue-200',
  PARENTAL_LEAVE: 'bg-purple-100 text-purple-800 border-purple-200'
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden';
const labelCls = 'block text-[11px] font-semibold text-slate-500 mb-1';

export const ZeiterfassungView: React.FC = () => {
  const {
    t,
    language,
    currentUser,
    users,
    projects,
    clients,
    timeEntries,
    workingTimeEntries,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    updateTimerState,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    approveTimeEntries,
    saveWorkingTime,
    deleteWorkingTime
  } = useApp();

  // --- Rollen & Beschäftigungsart ---
  const currentUserId = currentUser?.id || '';
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN' || currentUserId === 'u-1';
  const isAdmin = isSuperAdmin || currentUser?.role === 'ADMIN';
  const isPrivileged = isAdmin || currentUser?.role === 'PROJECT_MANAGER';
  // Admins/PMs/Superadmins zählen immer als intern
  const selfInternal = isPrivileged || isInternalByEmployment(currentUser);

  const typeLabels: Record<DayType, string> = {
    REGULAR: t.zfTypeRegular,
    VACATION: t.zfTypeVacation,
    SICK: t.zfTypeSick,
    SPECIAL_LEAVE: t.zfTypeSpecialLeave,
    PARENTAL_LEAVE: t.zfTypeParentalLeave
  };
  const statusLabels: Record<ApprovalStatus, string> = {
    DRAFT: t.statusDraft,
    SUBMITTED: t.statusSubmitted,
    APPROVED: t.statusApproved,
    REJECTED: t.statusRejected
  };

  // --- "Für Mitarbeiter erfassen" ---
  const [targetUserId, setTargetUserId] = useState(currentUserId);
  useEffect(() => {
    // Bei Benutzerwechsel bzw. ohne Berechtigung immer auf sich selbst zurücksetzen
    if (!isPrivileged || !targetUserId) setTargetUserId(currentUserId);
  }, [currentUserId, isPrivileged]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTargetUserId(currentUserId); }, [currentUserId]);

  const effectiveUserId = isPrivileged ? (targetUserId || currentUserId) : currentUserId;
  const targetUser = users.find(u => u.id === effectiveUserId) || currentUser;
  const isSelfTarget = effectiveUserId === currentUserId;
  // Das Formular passt sich an die Beschäftigungsart des Ziel-Mitarbeiters an
  const formInternal = isSelfTarget
    ? selfInternal
    : (isInternalByEmployment(targetUser) || isPrivilegedRole(targetUser));
  const targetDailyHours = targetUser?.dailyTargetHours || 8;

  // --- Formular ---
  const [editing, setEditing] = useState<EditingRef | null>(null);
  const [dayType, setDayType] = useState<DayType>('REGULAR');
  const [entryMode, setEntryMode] = useState<EntryMode>('range');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [entryDate, setEntryDate] = useState(() => toLocalISODate(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [fullDay, setFullDay] = useState(true);
  const [absenceStart, setAbsenceStart] = useState('09:00');
  const [absenceEnd, setAbsenceEnd] = useState('13:00');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const formRef = useRef<HTMLDivElement>(null);

  // Externe Ziel-Mitarbeiter: keine Abwesenheiten
  useEffect(() => {
    if (!formInternal && dayType !== 'REGULAR') setDayType('REGULAR');
  }, [formInternal, dayType]);

  const isAbsence = formInternal && dayType !== 'REGULAR';

  // Buchbare Projekte für den Ziel-Mitarbeiter
  const allowedProjects = useMemo(() => projects.filter(p => {
    if (p.status === 'ARCHIVED' || p.status === 'COMPLETED') return false;
    if (p.excludedUserIds?.includes(effectiveUserId)) return false;
    if (!p.restrictToAssignedMembers) return true;
    return !!p.assignedUserIds?.includes(effectiveUserId);
  }), [projects, effectiveUserId]);

  // Beim Bearbeiten das ursprüngliche Projekt immer anbieten (auch wenn inzwischen nicht mehr buchbar)
  const projectOptions = useMemo(() => {
    if (editing?.projectId && !allowedProjects.some(p => p.id === editing.projectId)) {
      const orig = projects.find(p => p.id === editing.projectId);
      if (orig) return [orig, ...allowedProjects];
    }
    return allowedProjects;
  }, [allowedProjects, editing, projects]);

  useEffect(() => {
    if (projectId && !projectOptions.some(p => p.id === projectId)) setProjectId('');
  }, [projectOptions, projectId]);

  const projectBillableDefault = (pId: string) => {
    const p = projects.find(pr => pr.id === pId);
    if (!p) return false;
    return p.isBillableDefault ?? (p.projectType !== 'INTERNAL_PROJECT');
  };
  const handleProjectChange = (pId: string) => {
    setProjectId(pId);
    setIsBillable(projectBillableDefault(pId));
  };

  // Live-Berechnung Zeitraum: (Ende − Start) − Pause
  const rangeNetMinutes = spanMinutes(startTime, endTime) - (breakMinutes || 0);
  const absenceMinutes = spanMinutes(absenceStart, absenceEnd);

  // Datumsgrenze: Urlaub/Elternzeit unbegrenzt, sonst bis Ende des nächsten Monats
  const allowFuture = isAbsence && (dayType === 'VACATION' || dayType === 'PARENTAL_LEAVE');
  const maxAllowedDate = useMemo(() => {
    if (allowFuture) return undefined;
    const d = new Date();
    return toLocalISODate(new Date(d.getFullYear(), d.getMonth() + 2, 0));
  }, [allowFuture]);

  // --- Autovervollständigung "Aufgabe" (eigene frühere Einträge im gewählten Projekt) ---
  const taskSuggestions = useMemo(() => {
    if (!projectId || isAbsence) return [] as string[];
    const seen = new Set<string>();
    const all: string[] = [];
    [...timeEntries]
      .filter(e => e.userId === currentUserId && e.projectId === projectId && e.description?.trim())
      .sort((a, b) => (b.date + (b.startTime || '')).localeCompare(a.date + (a.startTime || '')))
      .forEach(e => {
        const text = e.description.trim();
        const key = text.toLowerCase();
        if (!seen.has(key)) { seen.add(key); all.push(text); }
      });
    const q = description.trim().toLowerCase();
    return all.filter(s => (!q || s.toLowerCase().includes(q)) && s.toLowerCase() !== q).slice(0, 8);
  }, [timeEntries, currentUserId, projectId, isAbsence, description]);

  // Favoriten (eigene als Favorit markierte Projektzeiten) zum schnellen Vorbefüllen
  const favorites = useMemo(() => {
    const seen = new Set<string>();
    return timeEntries
      .filter(e => e.isFavorite && e.userId === currentUserId && allowedProjects.some(p => p.id === e.projectId))
      .filter(e => {
        const key = `${e.projectId}|${(e.description || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [timeEntries, currentUserId, allowedProjects]);

  // --- Stoppuhr: Formular nach Reload wiederherstellen ---
  useEffect(() => {
    if (!activeTimer.isRunning) return;
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_FORM_KEY) || 'null');
      if (saved) {
        setProjectId(saved.projectId || '');
        setDescription(saved.description || '');
        setIsBillable(saved.isBillable ?? true);
        if (saved.targetUserId) setTargetUserId(saved.targetUserId);
      }
    } catch { /* ignorieren */ }
    setDayType('REGULAR');
    setEntryMode('timer');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetFormAfterSave = () => {
    setDescription('');
    setEditing(null);
    setErrorMsg(null);
    setSuccessMsg(t.entrySavedSuccess);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const ensureCreated = (created: any) => {
    if (!created || !created.id) {
      throw new Error(created?.message || created?.error || 'HTTP error');
    }
  };

  /** Zentrale Speicherlogik inkl. Routing zwischen Projektzeit und Arbeitszeit. */
  const persistEntry = async (times: { startTime: string; endTime: string; breakMinutes: number; durationMinutes: number; date: string }) => {
    const userId = effectiveUserId; // Bugfix: immer der Ziel-Mitarbeiter, nie automatisch der angemeldete Benutzer
    const note = description.trim();

    let targetKind: EntryKind;
    if (isAbsence) targetKind = 'work';
    else if (projectId) targetKind = 'time';
    else if (formInternal) targetKind = 'work';
    else throw new Error(t.zfProjectRequired);

    const sameStore = editing && editing.kind === targetKind;

    if (targetKind === 'time') {
      const payload: Partial<TimeEntry> = {
        projectId,
        description: note,
        durationMinutes: times.durationMinutes,
        startTime: times.startTime,
        endTime: times.endTime,
        breakMinutes: times.breakMinutes,
        date: times.date,
        isBillable
      };
      if (sameStore && editing) {
        await updateTimeEntry(editing.id, payload);
      } else {
        const created = await createTimeEntry({ ...payload, userId });
        ensureCreated(created);
      }
    } else {
      const payload: Partial<WorkingTimeEntry> = isAbsence
        ? {
            userId,
            date: times.date,
            dayType,
            halfDay: !fullDay,
            partialAbsence: !fullDay ? true : undefined,
            startTime: fullDay ? undefined : absenceStart,
            endTime: fullDay ? undefined : absenceEnd,
            breakMinutes: 0,
            note: note || undefined
          }
        : {
            userId,
            date: times.date,
            dayType: 'REGULAR',
            halfDay: false,
            startTime: times.startTime,
            endTime: times.endTime,
            breakMinutes: times.breakMinutes,
            note: note || undefined
          };
      await saveWorkingTime(sameStore && editing ? { ...payload, id: editing.id } : payload);
    }

    // Typwechsel beim Bearbeiten (z. B. Projektzeit → Urlaub): alten Eintrag aus dem anderen Speicher entfernen
    if (editing && !sameStore) {
      if (editing.kind === 'time') await deleteTimeEntry(editing.id);
      else await deleteWorkingTime(editing.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!formInternal && !projectId) { setErrorMsg(t.zfProjectRequired); return; }
    if (maxAllowedDate && entryDate > maxAllowedDate) { setErrorMsg(t.zfDateTooLate); return; }

    let times = { startTime: startTime, endTime: endTime, breakMinutes: breakMinutes || 0, durationMinutes: rangeNetMinutes, date: entryDate };
    if (isAbsence) {
      if (!fullDay && absenceMinutes <= 0) { setErrorMsg(t.zfInvalidRange); return; }
      times = { startTime: absenceStart, endTime: absenceEnd, breakMinutes: 0, durationMinutes: fullDay ? Math.round(targetDailyHours * 60) : absenceMinutes, date: entryDate };
    } else if (rangeNetMinutes <= 0) {
      setErrorMsg(t.zfInvalidRange);
      return;
    }

    setIsSaving(true);
    try {
      await persistEntry(times);
      resetFormAfterSave();
    } catch (err: any) {
      setErrorMsg(`${t.zfSaveError} ${err?.message || ''}`.trim());
    } finally {
      setIsSaving(false);
    }
  };

  // --- Stoppuhr ---
  const handleStartTimer = () => {
    setErrorMsg(null);
    if (!formInternal && !projectId) { setErrorMsg(t.zfProjectRequired); return; }
    localStorage.setItem(TIMER_FORM_KEY, JSON.stringify({ projectId, description, isBillable, targetUserId: effectiveUserId }));
    startTimer({ description, projectId, taskId: '', isBillable, elapsedSeconds: 0, breakMinutes: 0 });
  };

  const handleStopTimer = async () => {
    if (!activeTimer.isRunning) return;
    const durationMinutes = Math.max(1, Math.round(activeTimer.elapsedSeconds / 60));
    const now = new Date();
    const endStr = fromMinutes(now.getHours() * 60 + now.getMinutes());
    const startStr = fromMinutes(now.getHours() * 60 + now.getMinutes() - durationMinutes);
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await persistEntry({ startTime: startStr, endTime: endStr, breakMinutes: 0, durationMinutes, date: toLocalISODate(now) });
      updateTimerState({ isRunning: false, isPaused: false, startTime: null, elapsedSeconds: 0, description: '', taskId: '', breakMinutes: 0 });
      localStorage.removeItem('insight_arcs_active_timer');
      localStorage.removeItem(TIMER_FORM_KEY);
      resetFormAfterSave();
    } catch (err: any) {
      setErrorMsg(`${t.zfSaveError} ${err?.message || ''}`.trim());
    } finally {
      setIsSaving(false);
    }
  };

  // Laufende Stoppuhr: Formularänderungen mitschreiben (Wiederherstellung nach Reload)
  useEffect(() => {
    if (activeTimer.isRunning) {
      localStorage.setItem(TIMER_FORM_KEY, JSON.stringify({ projectId, description, isBillable, targetUserId: effectiveUserId }));
    }
  }, [activeTimer.isRunning, projectId, description, isBillable, effectiveUserId]);

  // --- Filter ---
  const [filterPeriod, setFilterPeriod] = useState<DateRangeValue>(() => presetValue('thisMonth'));
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | DayType>('all');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterProjectId, setFilterProjectId] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const filterRange = getValueRange(filterPeriod);

  // --- Kombinierte Einträge ---
  const allRows = useMemo<UnifiedRow[]>(() => {
    const userName = (id: string, fallback?: string) => users.find(u => u.id === id)?.name || fallback || id;
    const rows: UnifiedRow[] = [];
    timeEntries.forEach(e => {
      const project = projects.find(p => p.id === e.projectId);
      const clientId = e.clientId || project?.clientId || '';
      rows.push({
        kind: 'time',
        id: e.id,
        date: e.date,
        userId: e.userId,
        userName: userName(e.userId, e.userName),
        dayType: 'REGULAR',
        projectId: e.projectId,
        projectName: project?.name || e.projectName || '',
        clientId,
        clientName: e.clientName || clients.find(c => c.id === clientId)?.name || '',
        text: e.description || e.taskName || '',
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        minutes: e.durationMinutes || 0,
        isFullDay: false,
        isBillable: e.isBillable,
        approvalStatus: e.approvalStatus,
        timeEntry: e
      });
    });
    workingTimeEntries.forEach(w => {
      const dt: DayType = w.dayType || 'REGULAR';
      const isFullDay = dt !== 'REGULAR' && !w.halfDay;
      const daily = users.find(u => u.id === w.userId)?.dailyTargetHours || 8;
      rows.push({
        kind: 'work',
        id: w.id,
        date: w.date,
        userId: w.userId,
        userName: userName(w.userId, w.userName),
        dayType: dt,
        projectId: '',
        projectName: '',
        clientId: '',
        clientName: '',
        text: w.note || '',
        startTime: isFullDay ? '' : (w.startTime || ''),
        endTime: isFullDay ? '' : (w.endTime || ''),
        minutes: isFullDay ? Math.round(daily * 60) : (w.totalNetMinutes || 0),
        isFullDay,
        workEntry: w
      });
    });
    return rows;
  }, [timeEntries, workingTimeEntries, users, projects, clients]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return allRows.filter(r => {
      if (filterRange && (r.date < filterRange.from || r.date > filterRange.to)) return false;
      if (!isPrivileged && r.userId !== currentUserId) return false;
      if (isPrivileged && filterUserId !== 'all' && r.userId !== filterUserId) return false;
      if (filterType !== 'all' && r.dayType !== filterType) return false;
      if (filterClientId !== 'all' && r.clientId !== filterClientId) return false;
      if (filterProjectId !== 'all' && r.projectId !== filterProjectId) return false;
      if (q) {
        const hay = `${r.text} ${r.projectName} ${r.clientName} ${r.userName} ${typeLabels[r.dayType]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, filterRange?.from, filterRange?.to, isPrivileged, currentUserId, filterUserId, filterType, filterClientId, filterProjectId, filterSearch, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gruppierung nach Datum (neueste zuerst), innerhalb des Tages nach START-Zeit (ganztägige Einträge zuerst)
  const groups = useMemo(() => {
    const map = new Map<string, UnifiedRow[]>();
    filteredRows.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, []);
      map.get(r.date)!.push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => ({
        date,
        rows: [...rows].sort((a, b) => {
          if (!a.startTime && b.startTime) return -1;
          if (a.startTime && !b.startTime) return 1;
          const byStart = a.startTime.localeCompare(b.startTime);
          return byStart !== 0 ? byStart : a.endTime.localeCompare(b.endTime);
        }),
        totalMinutes: rows.reduce((s, r) => s + r.minutes, 0)
      }));
  }, [filteredRows]);

  // Kunden/Projekte für die Filterleiste (nur solche, die in den sichtbaren Einträgen vorkommen, plus Stammdaten)
  const filterProjects = useMemo(
    () => projects.filter(p => filterClientId === 'all' || p.clientId === filterClientId),
    [projects, filterClientId]
  );

  // --- Kennzahlen (Soll/Ist/Differenz) für den gewählten Zeitraum ---
  const summaryUserId = isPrivileged && filterUserId !== 'all' ? filterUserId : currentUserId;
  const summaryRange = useMemo(() => {
    if (filterRange) return filterRange;
    // "Alle Einträge": vom ersten Eintrag des Mitarbeiters bis heute (bzw. bis zum letzten Eintrag)
    const today = toLocalISODate(new Date());
    const dates = allRows.filter(r => r.userId === summaryUserId).map(r => r.date).sort();
    if (dates.length === 0) return { from: today, to: today };
    return { from: dates[0] < today ? dates[0] : today, to: dates[dates.length - 1] > today ? dates[dates.length - 1] : today };
  }, [filterRange?.from, filterRange?.to, allRows, summaryUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    if (!selfInternal || !summaryUserId) return;
    let cancelled = false;
    const params = new URLSearchParams({ userId: summaryUserId, from: summaryRange.from, to: summaryRange.to, month: summaryRange.from.substring(0, 7) });
    fetch(`/api/working-time/summary?${params.toString()}`, { headers: { 'x-user-id': currentUserId } })
      .then(r => r.json())
      .then(data => { if (!cancelled) setSummary(data); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [selfInternal, summaryUserId, summaryRange.from, summaryRange.to, timeEntries, workingTimeEntries, currentUserId]);

  // --- Aktionen in der Liste ---
  const canModify = (r: UnifiedRow) => isPrivileged || r.userId === currentUserId;

  const startEdit = (r: UnifiedRow) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (isPrivileged) setTargetUserId(r.userId);
    setEntryDate(r.date);
    setEntryMode('range');
    if (r.kind === 'time' && r.timeEntry) {
      const e = r.timeEntry;
      setEditing({ kind: 'time', id: e.id, projectId: e.projectId });
      setDayType('REGULAR');
      setProjectId(e.projectId);
      setDescription(e.description || '');
      setIsBillable(e.isBillable);
      const brk = e.breakMinutes || 0;
      if (e.startTime && e.endTime) {
        setStartTime(e.startTime);
        setEndTime(e.endTime);
      } else {
        setStartTime('09:00');
        setEndTime(fromMinutes(9 * 60 + (e.durationMinutes || 0) + brk));
      }
      setBreakMinutes(brk);
    } else if (r.workEntry) {
      const w = r.workEntry;
      setEditing({ kind: 'work', id: w.id });
      setDayType(w.dayType || 'REGULAR');
      setProjectId('');
      setDescription(w.note || '');
      if ((w.dayType || 'REGULAR') === 'REGULAR') {
        setStartTime(w.startTime || '09:00');
        setEndTime(w.endTime || '17:00');
        setBreakMinutes(w.breakMinutes || 0);
      } else {
        setFullDay(!w.halfDay);
        if (w.startTime) setAbsenceStart(w.startTime);
        if (w.endTime) setAbsenceEnd(w.endTime);
      }
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDescription('');
    setErrorMsg(null);
    setDayType('REGULAR');
    if (isPrivileged) setTargetUserId(currentUserId);
  };

  const handleDelete = async (r: UnifiedRow) => {
    if (!window.confirm(t.zfConfirmDelete)) return;
    try {
      if (r.kind === 'time') await deleteTimeEntry(r.id);
      else await deleteWorkingTime(r.id);
      if (editing?.id === r.id) cancelEdit();
    } catch (err: any) {
      setErrorMsg(`${t.zfSaveError} ${err?.message || ''}`.trim());
    }
  };

  const exportCsv = () => {
    const headers = [t.date, t.employee, t.zfTypeLabel, t.client, t.zfProject, t.zfTask, t.zfFrom, t.zfTo, t.zfDurationHours, t.zfBillable, t.status];
    const rows = [...filteredRows]
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map(r => [
        r.date,
        r.userName,
        typeLabels[r.dayType],
        r.clientName,
        r.projectName,
        r.text,
        r.isFullDay ? t.zfFullDayShort : r.startTime,
        r.isFullDay ? '' : r.endTime,
        (r.minutes / 60).toFixed(2).replace('.', ','),
        r.kind === 'time' ? (r.isBillable ? t.zfYes : t.zfNo) : '',
        r.approvalStatus ? statusLabels[r.approvalStatus] : ''
      ]);
    const csv = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filterRange ? `zeiterfassung_${filterRange.from}_${filterRange.to}.csv` : 'zeiterfassung.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const locale = language === 'en' ? 'en-GB' : 'de-DE';
  const formatGroupDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatShortDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const timerRunning = activeTimer.isRunning;
  const timerLocked = timerRunning && entryMode === 'timer';

  const selectSuggestion = (s: string) => {
    setDescription(s);
    setShowSuggestions(false);
    setHighlightIdx(-1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Kennzahlen – nur interne Nutzer / Admins / PMs */}
      {selfInternal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t.zfTargetHours}</div>
            <div id="zf-card-target" className="text-2xl font-bold text-slate-900 mt-1">
              {summary ? `${formatHM((summary.targetHoursTotal || 0) * 60)} ${t.hours}` : '–'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {t.zfSummaryPeriod}: {formatShortDate(summaryRange.from)} – {formatShortDate(summaryRange.to)}
              {summary?.userName && summaryUserId !== currentUserId ? ` · ${summary.userName}` : ''}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t.zfActualHours}</div>
            <div id="zf-card-actual" className="text-2xl font-bold text-slate-900 mt-1">
              {summary ? `${formatHM((summary.totalActualHours ?? 0) * 60)} ${t.hours}` : '–'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{t.zfSummaryActualHint}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{t.zfDifference}</div>
            <div
              id="zf-card-diff"
              className={`text-2xl font-bold mt-1 ${!summary ? 'text-slate-900' : (summary.totalBalanceHours ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {summary ? `${(summary.totalBalanceHours ?? 0) > 0 ? '+' : ''}${formatHM((summary.totalBalanceHours ?? 0) * 60)} ${t.hours}` : '–'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{t.zfActualHours} − {t.zfTargetHours}</div>
          </div>
        </div>
      )}

      {/* 2. Eingabeformular */}
      <div ref={formRef} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {editing ? <Pencil className="w-4 h-4 text-amber-600" /> : <Clock className="w-4 h-4 text-emerald-600" />}
            <span>{editing ? t.zfEditEntry : t.zfNewEntry}</span>
          </h2>

          {isPrivileged && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200/70 text-amber-900 px-2.5 py-1 rounded-lg">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-medium">{t.logForColleague}:</span>
              <select
                id="select-target-user"
                value={effectiveUserId}
                disabled={!!editing || timerRunning}
                onChange={e => setTargetUserId(e.target.value)}
                className="bg-white border border-amber-200 rounded px-1.5 py-0.5 text-xs font-medium focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === currentUserId ? t.selfUser : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isPrivileged && !isSelfTarget && !formInternal && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-1.5">
            {t.zfExternalColleagueHint}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div id="zf-error" className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Favoriten */}
        {!isAbsence && favorites.length > 0 && !timerLocked && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" /> {t.zfFavorites}:
            </span>
            {favorites.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setProjectId(f.projectId); setDescription(f.description || ''); setIsBillable(f.isBillable); }}
                className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                {f.projectName}{f.description ? ` · ${f.description}` : ''}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Datum */}
          <div className="lg:col-span-2">
            <label className={labelCls} htmlFor="zf-date">{t.date}</label>
            <input
              id="zf-date"
              type="date"
              value={entryDate}
              max={maxAllowedDate}
              disabled={timerLocked}
              onChange={e => setEntryDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Typ – nur intern */}
          {formInternal && (
            <div className="lg:col-span-3">
              <label className={labelCls} htmlFor="zf-type">{t.zfTypeLabel}</label>
              <select
                id="zf-type"
                value={dayType}
                disabled={timerLocked}
                onChange={e => setDayType(e.target.value as DayType)}
                className={inputCls}
              >
                <option value="REGULAR">{t.zfTypeRegular}</option>
                {ABSENCE_TYPES.map(dt => <option key={dt} value={dt}>{typeLabels[dt]}</option>)}
              </select>
            </div>
          )}

          {!isAbsence && (
            <>
              {/* Projekt */}
              <div className="lg:col-span-4">
                <label className={labelCls} htmlFor="zf-project">
                  {t.zfProject}{!formInternal ? ' *' : ''}
                </label>
                <select
                  id="zf-project"
                  value={projectId}
                  disabled={timerLocked}
                  onChange={e => handleProjectChange(e.target.value)}
                  className={inputCls}
                  required={!formInternal}
                >
                  <option value="">{formInternal ? t.zfNoProjectOption : t.zfSelectProject}</option>
                  {projectOptions.length === 0 && !formInternal && <option value="" disabled>{t.noAllowedProjects}</option>}
                  {projectOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.restrictToAssignedMembers ? '🔒 ' : ''}{p.name}{p.clientName ? ` (${p.clientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erfassungsmodus */}
              <div className="lg:col-span-3">
                <span className={labelCls}>{t.zfModeLabel}</span>
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                  {(['timer', 'range'] as EntryMode[]).map(m => (
                    <button
                      key={m}
                      id={m === 'timer' ? 'zf-mode-timer' : 'zf-mode-range'}
                      type="button"
                      disabled={timerRunning || (!!editing && m === 'timer')}
                      onClick={() => setEntryMode(m)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all disabled:cursor-not-allowed ${
                        entryMode === m ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m === 'timer' ? <Clock className="w-3.5 h-3.5 text-emerald-600" /> : <CalendarDays className="w-3.5 h-3.5 text-blue-600" />}
                      {m === 'timer' ? t.zfModeStopwatch : t.zfModeRange}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Aufgabe (mit Autovervollständigung) */}
          <div className={`relative ${isAbsence ? 'lg:col-span-7' : 'lg:col-span-9'}`}>
            <label className={labelCls} htmlFor="zf-task">{t.zfTask}</label>
            <input
              id="zf-task"
              type="text"
              autoComplete="off"
              value={description}
              onChange={e => { setDescription(e.target.value); setShowSuggestions(true); setHighlightIdx(-1); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              onKeyDown={e => {
                if (!showSuggestions || taskSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, taskSuggestions.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter' && highlightIdx >= 0) { e.preventDefault(); selectSuggestion(taskSuggestions[highlightIdx]); }
                else if (e.key === 'Escape') setShowSuggestions(false);
              }}
              placeholder={isAbsence ? t.zfNotePlaceholder : t.zfTaskPlaceholder}
              className={inputCls}
            />
            {showSuggestions && taskSuggestions.length > 0 && (
              <ul id="zf-task-suggestions" className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-auto py-1">
                {taskSuggestions.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                      className={`w-full text-left px-3 py-1.5 text-xs ${i === highlightIdx ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Abrechenbar – nur bei Projektzeit */}
          {!isAbsence && (
            <div className="lg:col-span-3 flex items-center h-[38px]">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  id="zf-billable"
                  type="checkbox"
                  checked={isBillable}
                  disabled={!projectId || timerLocked}
                  onChange={e => setIsBillable(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t.zfBillable}
              </label>
            </div>
          )}

          {/* Abwesenheit: Ganztägig bzw. Von/Bis */}
          {isAbsence && (
            <div className="lg:col-span-5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  id="zf-fullday"
                  type="checkbox"
                  checked={fullDay}
                  onChange={e => setFullDay(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t.zfFullDay}
              </label>
              {fullDay ? (
                <p className="text-[11px] text-slate-500">
                  {t.zfFullDayHint.replace('{hours}', targetDailyHours.toLocaleString(locale))}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className={labelCls} htmlFor="zf-abs-start">{t.zfFrom}</label>
                    <input id="zf-abs-start" type="time" value={absenceStart} onChange={e => setAbsenceStart(e.target.value)} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="zf-abs-end">{t.zfTo}</label>
                    <input id="zf-abs-end" type="time" value={absenceEnd} onChange={e => setAbsenceEnd(e.target.value)} className={inputCls} required />
                  </div>
                  <div className="text-xs font-bold text-slate-800 pb-2">
                    {t.zfTotal}: {formatHM(absenceMinutes)} {t.hours}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zeitraum: Von / Bis / Pause + Live-Summe */}
          {!isAbsence && entryMode === 'range' && (
            <>
              <div className="lg:col-span-2">
                <label className={labelCls} htmlFor="zf-start">{t.zfFrom}</label>
                <input id="zf-start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} required />
              </div>
              <div className="lg:col-span-2">
                <label className={labelCls} htmlFor="zf-end">{t.zfTo}</label>
                <input id="zf-end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} required />
              </div>
              <div className="lg:col-span-2">
                <label className={labelCls} htmlFor="zf-break">{t.zfBreak}</label>
                <input
                  id="zf-break"
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(Math.max(0, parseInt(e.target.value || '0', 10) || 0))}
                  className={inputCls}
                />
              </div>
              <div className="lg:col-span-3">
                <span className={labelCls}>{t.zfTotal}</span>
                <div
                  id="zf-range-total"
                  className={`rounded-xl px-3 py-2 text-xs font-bold border ${rangeNetMinutes > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}
                  title={t.zfTotalFormula}
                >
                  {formatHM(rangeNetMinutes)} {t.hours}
                  <span className="font-normal text-[10px] text-slate-500 ml-1.5">{t.zfTotalFormula}</span>
                </div>
              </div>
            </>
          )}

          {/* Aktionen */}
          <div className={`flex flex-wrap items-center gap-2 justify-end ${!isAbsence && entryMode === 'range' ? 'lg:col-span-3' : 'lg:col-span-12'}`}>
            {!isAbsence && entryMode === 'timer' ? (
              timerRunning ? (
                <>
                  <span id="zf-timer-display" className="font-mono text-lg font-bold text-slate-900 mr-2" title={t.zfTimerRunning}>
                    {formatSeconds(activeTimer.elapsedSeconds)}
                  </span>
                  {activeTimer.isPaused ? (
                    <button type="button" onClick={resumeTimer} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800">
                      <Play className="w-3.5 h-3.5" /> {t.zfResumeTimer}
                    </button>
                  ) : (
                    <button type="button" onClick={pauseTimer} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800">
                      <Pause className="w-3.5 h-3.5" /> {t.zfPauseTimer}
                    </button>
                  )}
                  <button
                    id="zf-timer-stop"
                    type="button"
                    disabled={isSaving}
                    onClick={handleStopTimer}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                  >
                    <Square className="w-3.5 h-3.5" /> {t.zfStopTimer}
                  </button>
                </>
              ) : (
                <button
                  id="zf-timer-start"
                  type="button"
                  onClick={handleStartTimer}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Play className="w-3.5 h-3.5" /> {t.zfStartTimer}
                </button>
              )
            ) : (
              <>
                {editing && (
                  <button type="button" onClick={cancelEdit} className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100">
                    <X className="w-3.5 h-3.5" /> {t.zfCancelEdit}
                  </button>
                )}
                <button
                  id="zf-save"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {editing ? t.zfSaveChanges : t.zfSaveEntry}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* 3. Filterleiste (ohne Zurücksetzen-Button) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-wrap items-center gap-2.5">
        <DateRangePicker value={filterPeriod} onChange={setFilterPeriod} />
        {isPrivileged && (
          <select id="zf-filter-user" value={filterUserId} onChange={e => setFilterUserId(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="all">{t.zfAllEmployees}</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        {selfInternal && (
          <select id="zf-filter-type" value={filterType} onChange={e => setFilterType(e.target.value as 'all' | DayType)} className={`${inputCls} w-auto`}>
            <option value="all">{t.zfAllTypes}</option>
            <option value="REGULAR">{t.zfTypeRegular}</option>
            {ABSENCE_TYPES.map(dt => <option key={dt} value={dt}>{typeLabels[dt]}</option>)}
          </select>
        )}
        <select
          id="zf-filter-client"
          value={filterClientId}
          onChange={e => { setFilterClientId(e.target.value); setFilterProjectId('all'); }}
          className={`${inputCls} w-auto`}
        >
          <option value="all">{t.zfAllClients}</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select id="zf-filter-project" value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="all">{t.zfAllProjects}</option>
          {filterProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="zf-filter-search"
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder={t.zfSearchPlaceholder}
            className={`${inputCls} pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredRows.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> {t.zfExportCsv}
        </button>
      </div>

      {/* 4. Kombinierte Eintragsliste */}
      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-center text-xs text-slate-500">
            {t.zfNoEntries}
          </div>
        )}
        {groups.map(g => (
          <div key={g.date} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">{formatGroupDate(g.date)}</span>
              <span className="text-xs font-semibold text-slate-600">{t.zfDayTotal}: {formatHM(g.totalMinutes)} {t.hours}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.rows.map(r => {
                const isNoProjectRegular = r.kind === 'work' && r.dayType === 'REGULAR';
                const showTypeBadge = r.kind === 'work';
                return (
                  <li key={`${r.kind}-${r.id}`} className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 ${editing?.id === r.id ? 'bg-amber-50/60' : ''}`}>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {showTypeBadge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_BADGE[r.dayType]}`}>
                            {typeLabels[r.dayType]}
                          </span>
                        )}
                        {r.kind === 'time' ? (
                          <span className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-emerald-600" />
                            {r.projectName || t.zfNoProject}
                            {r.clientName && <span className="font-normal text-slate-500">· {r.clientName}</span>}
                          </span>
                        ) : isNoProjectRegular ? (
                          <span className="text-xs text-slate-500">{t.zfNoProject}</span>
                        ) : null}
                        {isPrivileged && (
                          <span className="text-[11px] text-slate-500">· {r.userName}</span>
                        )}
                      </div>
                      {r.text && <div className="text-xs text-slate-700 truncate">{r.text}</div>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {r.isFullDay ? t.zfFullDayShort : (r.startTime && r.endTime ? `${r.startTime}–${r.endTime}` : '')}
                      </span>
                      <span className="text-xs font-bold text-slate-900 w-14 text-right">{formatHM(r.minutes)}</span>
                      {r.kind === 'time' && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${r.isBillable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {r.isBillable ? t.zfBillable : t.zfNotBillable}
                        </span>
                      )}
                      {r.approvalStatus && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-200">
                          {statusLabels[r.approvalStatus]}
                        </span>
                      )}
                      {isAdmin && r.kind === 'time' && r.approvalStatus !== 'APPROVED' && (
                        <button
                          type="button"
                          title={t.approve}
                          onClick={() => approveTimeEntries([r.id], 'APPROVED')}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canModify(r) && (
                        <>
                          <button type="button" title={t.edit} onClick={() => startEdit(r)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" title={t.delete} onClick={() => handleDelete(r)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZeiterfassungView;
