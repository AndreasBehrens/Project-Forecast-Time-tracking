import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Clockify-ähnlicher Zeitraum-Picker: Presets links, Zwei-Monats-Kalender rechts.
 * Alle Datumsberechnungen erfolgen in lokaler Zeit (niemals toISOString → kein UTC-Versatz).
 */

export interface DateRangeValue {
  /** Preset-Schlüssel; undefined = benutzerdefinierter Zeitraum. */
  preset?: string;
  from: string | null;
  to: string | null;
}

export type DateRange = { from: string; to: string } | null;

export interface DateRangePreset {
  key: string;
  label: string;
  /** Liefert den Zeitraum relativ zu `today`; null = kein Filter (z. B. "Alle Einträge"). */
  getRange: (today: Date) => DateRange;
}

// ---------------------------------------------------------------------------
// Lokale Datums-Helfer
// ---------------------------------------------------------------------------
const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" aus den lokalen Datumsbestandteilen. */
export const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" → lokales Date (Mitternacht). */
export const parseLocalISODate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "YYYY-MM-DD" → "DD.MM.YYYY". */
export const formatDateDE = (s: string): string => {
  const [y, m, d] = s.split('-');
  return `${d}.${m}.${y}`;
};

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)); // Montag
const range = (from: Date, to: Date): DateRange => ({ from: toLocalISODate(from), to: toLocalISODate(to) });
const monthRange = (y: number, m: number): DateRange => range(new Date(y, m, 1), new Date(y, m + 1, 0));

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------
export const PRESET_DEFINITIONS: Record<string, DateRangePreset> = {
  today: { key: 'today', label: 'Heute', getRange: t => range(t, t) },
  yesterday: { key: 'yesterday', label: 'Gestern', getRange: t => range(addDays(t, -1), addDays(t, -1)) },
  thisWeek: { key: 'thisWeek', label: 'Diese Woche', getRange: t => range(startOfWeek(t), addDays(startOfWeek(t), 6)) },
  lastWeek: {
    key: 'lastWeek', label: 'Letzte Woche',
    getRange: t => range(addDays(startOfWeek(t), -7), addDays(startOfWeek(t), -1))
  },
  lastTwoWeeks: {
    key: 'lastTwoWeeks', label: 'Letzte zwei Wochen',
    getRange: t => range(addDays(startOfWeek(t), -7), addDays(startOfWeek(t), 6))
  },
  thisMonth: { key: 'thisMonth', label: 'Dieser Monat', getRange: t => monthRange(t.getFullYear(), t.getMonth()) },
  lastMonth: { key: 'lastMonth', label: 'Letzter Monat', getRange: t => monthRange(t.getFullYear(), t.getMonth() - 1) },
  thisQuarter: {
    key: 'thisQuarter', label: 'Dieses Quartal',
    getRange: t => {
      const q = Math.floor(t.getMonth() / 3) * 3;
      return range(new Date(t.getFullYear(), q, 1), new Date(t.getFullYear(), q + 3, 0));
    }
  },
  lastQuarter: {
    key: 'lastQuarter', label: 'Letztes Quartal',
    getRange: t => {
      const q = Math.floor(t.getMonth() / 3) * 3 - 3;
      return range(new Date(t.getFullYear(), q, 1), new Date(t.getFullYear(), q + 3, 0));
    }
  },
  thisYear: { key: 'thisYear', label: 'Dieses Jahr', getRange: t => range(new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31)) },
  lastYear: { key: 'lastYear', label: 'Letztes Jahr', getRange: t => range(new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31)) },
  all: { key: 'all', label: 'Alle Einträge', getRange: () => null }
};

export const DEFAULT_PRESETS: DateRangePreset[] = [
  'today', 'yesterday', 'thisWeek', 'lastWeek', 'lastTwoWeeks', 'thisMonth',
  'lastMonth', 'thisQuarter', 'thisYear', 'lastYear', 'all'
].map(k => PRESET_DEFINITIONS[k]);

/**
 * Löst einen Preset-Schlüssel in einen Zeitraum auf.
 * Sucht zuerst in `presets` (benutzerdefinierte Presets einer View), dann in den Standard-Definitionen.
 * Unbekannter Schlüssel oder "all" → null.
 */
export function resolvePresetRange(key: string, today: Date = new Date(), presets?: DateRangePreset[]): DateRange {
  const def = presets?.find(p => p.key === key) || PRESET_DEFINITIONS[key];
  return def ? def.getRange(today) : null;
}

/** Baut einen vollständigen Value für ein Preset (inkl. aufgelöstem Zeitraum). */
export function presetValue(key: string, presets?: DateRangePreset[], today: Date = new Date()): DateRangeValue {
  const r = resolvePresetRange(key, today, presets);
  return { preset: key, from: r?.from ?? null, to: r?.to ?? null };
}

/** Effektiver Filter-Zeitraum eines Values (null = kein Filter). Presets werden tagesaktuell neu aufgelöst. */
export function getValueRange(value: DateRangeValue, presets?: DateRangePreset[], today: Date = new Date()): DateRange {
  if (value.preset) return resolvePresetRange(value.preset, today, presets);
  return value.from && value.to ? { from: value.from, to: value.to } : null;
}

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Englische Bezeichnungen der Standard-Presets (deutsche Labels stehen in PRESET_DEFINITIONS). */
export const PRESET_LABELS_EN: Record<string, string> = {
  today: 'Today', yesterday: 'Yesterday', thisWeek: 'This week', lastWeek: 'Last week',
  lastTwoWeeks: 'Last two weeks', thisMonth: 'This month', lastMonth: 'Last month',
  thisQuarter: 'This quarter', lastQuarter: 'Last quarter', thisYear: 'This year',
  lastYear: 'Last year', all: 'All entries'
};

const UI_TEXT = {
  de: {
    choose: 'Zeitraum wählen', dialog: 'Zeitraum auswählen', prev: 'Vorheriger Monat', next: 'Nächster Monat',
    pickEnd: (d: string) => `Start: ${d} – Enddatum wählen`, pickStart: 'Startdatum wählen, um einen eigenen Zeitraum festzulegen'
  },
  en: {
    choose: 'Select period', dialog: 'Select period', prev: 'Previous month', next: 'Next month',
    pickEnd: (d: string) => `Start: ${d} – select end date`, pickStart: 'Select a start date to define a custom period'
  }
};

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  presets?: DateRangePreset[];
  className?: string;
  /** Tailwind-Klassen für den Trigger-Button (zur Anpassung an die jeweilige Filterleiste). */
  buttonClassName?: string;
  /** Oberflächensprache (Standard: Deutsch). */
  language?: 'de' | 'en';
  /** "Heute" (lokales Date, 00:00) – z. B. in der Zeitzone des Mitarbeiters. Standard: Gerätedatum. */
  today?: Date;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value, onChange, presets = DEFAULT_PRESETS, className = '', buttonClassName, language = 'de', today
}) => {
  const now = () => today ?? new Date();
  const ui = UI_TEXT[language] || UI_TEXT.de;
  const months = language === 'en' ? MONTHS_EN : MONTHS_DE;
  const weekdays = language === 'en' ? WEEKDAYS_EN : WEEKDAYS_DE;
  const presetLabel = (p: DateRangePreset) => (language === 'en' && PRESET_LABELS_EN[p.key]) || p.label;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => now().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => now().getMonth());
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const todayIso = toLocalISODate(now());
  const activeRange = getValueRange(value, presets, now());

  const showMonthOf = (iso: string | null | undefined) => {
    const d = iso ? parseLocalISODate(iso) : now();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const openPopover = () => {
    setPendingStart(null);
    setHoverDate(null);
    showMonthOf(activeRange?.from);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setPendingStart(null);
    setHoverDate(null);
  };

  // Schließen bei Klick außerhalb und bei Esc
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const applyPreset = (p: DateRangePreset) => {
    const r = p.getRange(now());
    setPendingStart(null);
    setHoverDate(null);
    onChange({ preset: p.key, from: r?.from ?? null, to: r?.to ?? null });
    if (r) showMonthOf(r.from);
  };

  const handleDayClick = (iso: string) => {
    if (!pendingStart) {
      setPendingStart(iso);
      return;
    }
    const [from, to] = iso < pendingStart ? [iso, pendingStart] : [pendingStart, iso];
    onChange({ preset: undefined, from, to });
    close();
  };

  // Hervorzuhebender Zeitraum: während der Auswahl die Hover-Vorschau, sonst der aktive Zeitraum
  let hlFrom: string | null = null;
  let hlTo: string | null = null;
  if (pendingStart) {
    const other = hoverDate || pendingStart;
    [hlFrom, hlTo] = other < pendingStart ? [other, pendingStart] : [pendingStart, other];
  } else if (activeRange) {
    hlFrom = activeRange.from;
    hlTo = activeRange.to;
  }

  const triggerLabel = (() => {
    if (value.preset) {
      const p = presets.find(x => x.key === value.preset) || PRESET_DEFINITIONS[value.preset];
      if (p) return presetLabel(p);
    }
    if (value.from && value.to) return `${formatDateDE(value.from)} – ${formatDateDE(value.to)}`;
    return ui.choose;
  })();

  const renderMonth = (year: number, month: number, nav: 'left' | 'right' | null, extraClass = '') => {
    const first = new Date(year, month, 1);
    const gridStart = addDays(first, -((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    return (
      <div className={`w-[252px] ${extraClass}`}>
        <div className="flex items-center justify-between h-8 mb-1">
          {nav === 'left' ? (
            <button type="button" onClick={() => shiftMonth(-1)} aria-label={ui.prev}
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : <span className="w-6" />}
          <span className="text-sm font-bold text-slate-800">{months[month]} {year}</span>
          {nav === 'right' ? (
            <button type="button" onClick={() => shiftMonth(1)} aria-label={ui.next}
              className="p-1 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : <span className="w-6" />}
        </div>
        <div className="grid grid-cols-7">
          {weekdays.map(w => (
            <div key={w} className="h-8 flex items-center justify-center text-[11px] font-bold text-slate-500">{w}</div>
          ))}
          {days.map(d => {
            const iso = toLocalISODate(d);
            const inMonth = d.getMonth() === month;
            const isStart = inMonth && iso === hlFrom;
            const isEnd = inMonth && iso === hlTo;
            const inRange = inMonth && hlFrom !== null && hlTo !== null && iso > hlFrom && iso < hlTo;
            const isToday = iso === todayIso;

            let cls = 'text-slate-700 hover:bg-slate-100 rounded-md';
            if (!inMonth) cls = 'text-slate-300 hover:bg-slate-50 rounded-md';
            if (inRange) cls = 'bg-sky-100 text-slate-800 hover:bg-sky-200';
            if (isStart || isEnd) cls = 'bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700';

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => pendingStart && setHoverDate(iso)}
                title={formatDateDE(iso)}
                className={`relative h-8 text-xs transition-colors ${cls}`}
              >
                {d.getDate()}
                {isToday && !(isStart || isEnd) && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const next = new Date(viewYear, viewMonth + 1, 1);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close() : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={buttonClassName ||
          'flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none'}
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ui.dialog}
          className="absolute left-0 top-full mt-1.5 z-50 flex flex-col sm:flex-row bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-w-[calc(100vw-2rem)]"
        >
          <ul className="sm:w-44 py-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 max-h-48 sm:max-h-none overflow-y-auto">
            {presets.map(p => {
              const selected = value.preset === p.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${selected ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {presetLabel(p)}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="p-3">
            <div className="flex gap-6" onMouseLeave={() => setHoverDate(null)}>
              {renderMonth(viewYear, viewMonth, 'left')}
              {renderMonth(next.getFullYear(), next.getMonth(), 'right', 'hidden md:block')}
            </div>
            {/* Auf kleinen Bildschirmen ist nur ein Monat sichtbar → dort auch "weiter" anbieten */}
            <div className="md:hidden flex justify-end -mt-1">
              <button type="button" onClick={() => shiftMonth(1)} aria-label={ui.next}
                className="p-1 rounded-md text-slate-600 hover:bg-slate-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 h-4">
              {pendingStart
                ? ui.pickEnd(formatDateDE(pendingStart))
                : ui.pickStart}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
