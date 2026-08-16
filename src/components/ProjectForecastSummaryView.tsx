import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProjectForecastSummary } from '../types';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Users,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { CompanyLocationModal } from './CompanyLocationModal';

export const ProjectForecastSummaryView: React.FC = () => {
  const {
    t,
    clients,
    organization,
    getProjectForecastSummary,
    currentUser
  } = useApp();

  // Filter States
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR'>('QUARTER');
  const [periodKey, setPeriodKey] = useState('2026-Q3');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBillingModel, setSelectedBillingModel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterThresholdOnly, setFilterThresholdOnly] = useState(false);

  // Data State
  const [summaryData, setSummaryData] = useState<{
    periodType: string;
    periodKey: string;
    periodLabel: string;
    startDate: string;
    endDate: string;
    stateLocation: string;
    locationCity: string;
    holidaysInPeriod: any[];
    totalWorkdaysInPeriod: number;
    passedWorkdaysInPeriod: number;
    extrapolationFactor: number;
    kpis: {
      totalPlannedHours: number;
      totalActualHours: number;
      totalExtrapolatedHours: number;
      totalPlannedRevenue: number;
      totalActualRevenue: number;
      totalExtrapolatedRevenue: number;
      totalPlannedCost: number;
      totalActualCost: number;
      totalExtrapolatedCost: number;
      totalPlannedMargin: number;
      totalActualMargin: number;
      totalExtrapolatedMargin: number;
      plannedMarginPercent: number;
      actualMarginPercent: number;
      extrapolatedMarginPercent: number;
      criticalProjectsCount: number;
      totalProjectsCount: number;
    };
    projects: ProjectForecastSummary[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Load forecast summary data
  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const data = await getProjectForecastSummary({
        periodType,
        periodKey,
        clientId: selectedClientId || undefined,
        billingModel: selectedBillingModel || undefined,
        search: searchQuery || undefined,
        thresholdPercent: filterThresholdOnly ? 20 : undefined
      });
      setSummaryData(data);
    } catch (err) {
      console.error('Failed to load project forecast summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [
    periodType,
    periodKey,
    selectedClientId,
    selectedBillingModel,
    searchQuery,
    filterThresholdOnly,
    organization?.stateLocation
  ]);

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Helper to format currency
  const formatEUR = (amount: number) => {
    return amount.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!summaryData) return;
    const headers = [
      'Projekt-Nr',
      'Projektname',
      'Kunde',
      'Abrechnungsmodell',
      'Plan-Stunden (h)',
      'Ist-Stunden (h)',
      'Hochrechnung Stunden (h)',
      'Stunden-Abweichung (%)',
      'Plan-Umsatz (€)',
      'Ist-Umsatz (€)',
      'Hochrechnung Umsatz (€)',
      'Plan-Kosten (€)',
      'Ist-Kosten (€)',
      'Hochrechnung Kosten (€)',
      'Plan-Marge (€)',
      'Ist-Marge (€)',
      'Hochrechnung Marge (€)',
      'Plan-Marge (%)',
      'Hochrechnung Marge (%)',
      'Status'
    ];

    const rows = summaryData.projects.map(p => [
      p.projectNumber,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.billingModel,
      p.plannedHours.toFixed(1),
      p.actualHoursSoFar.toFixed(1),
      p.extrapolatedHoursEnd.toFixed(1),
      `${p.hoursDeviationPercent}%`,
      p.plannedRevenue.toFixed(2),
      p.actualRevenueSoFar.toFixed(2),
      p.extrapolatedRevenueEnd.toFixed(2),
      p.plannedCost.toFixed(2),
      p.actualCostSoFar.toFixed(2),
      p.extrapolatedCostEnd.toFixed(2),
      p.plannedMargin.toFixed(2),
      p.actualMarginSoFar.toFixed(2),
      p.extrapolatedMarginEnd.toFixed(2),
      `${p.plannedMarginPercent}%`,
      `${p.extrapolatedMarginPercentEnd}%`,
      p.isThresholdExceeded ? 'SCHWELLENWERT_UEBERSCHRITTEN' : 'IM_PLAN'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Forecast_Summary_${summaryData.periodKey}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = summaryData?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Banner: Read-Only Controlling & Evaluation View Badge */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {t.readOnlyControlView}
            </span>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              {t.contractedProjectsOnly}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 pt-1">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            {t.forecastAggregatedTitle}
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {t.forecastAggregatedSubtitle}
          </p>
        </div>

        {/* Location & Holiday Badge button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-open-location-settings"
            onClick={() => setShowLocationModal(true)}
            className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-xs"
            title="Unternehmensstandort für Feiertagskalender konfigurieren"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-medium leading-none">Standort & Feiertage</div>
              <div className="font-semibold text-slate-100 text-xs mt-0.5">
                {organization?.locationCity || 'Berlin'} ({organization?.stateLocation || 'DE-BE'})
              </div>
            </div>
          </button>

          <button
            id="btn-export-forecast-csv"
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Period Type Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              id="btn-period-month"
              onClick={() => {
                setPeriodType('MONTH');
                setPeriodKey('2026-08');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                periodType === 'MONTH'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.periodMonthly}
            </button>
            <button
              id="btn-period-quarter"
              onClick={() => {
                setPeriodType('QUARTER');
                setPeriodKey('2026-Q3');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                periodType === 'QUARTER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.periodQuarterly}
            </button>
            <button
              id="btn-period-halfyear"
              onClick={() => {
                setPeriodType('HALF_YEAR');
                setPeriodKey('2026-H2');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                periodType === 'HALF_YEAR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.periodHalfYearly}
            </button>
            <button
              id="btn-period-year"
              onClick={() => {
                setPeriodType('YEAR');
                setPeriodKey('2026');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                periodType === 'YEAR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.periodYearly}
            </button>
          </div>

          {/* Quick Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Zeitraum:</span>
            {periodType === 'MONTH' && (
              <input
                id="input-forecast-summary-month"
                type="month"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              />
            )}
            {periodType === 'QUARTER' && (
              <select
                id="select-forecast-summary-quarter"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026-Q1">Q1 2026 (Jan - Mär)</option>
                <option value="2026-Q2">Q2 2026 (Apr - Jun)</option>
                <option value="2026-Q3">Q3 2026 (Jul - Sep)</option>
                <option value="2026-Q4">Q4 2026 (Okt - Dez)</option>
              </select>
            )}
            {periodType === 'HALF_YEAR' && (
              <select
                id="select-forecast-summary-halfyear"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026-H1">H1 2026 (1. Halbjahr)</option>
                <option value="2026-H2">H2 2026 (2. Halbjahr)</option>
              </select>
            )}
            {periodType === 'YEAR' && (
              <select
                id="select-forecast-summary-year"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026">Gesamtjahr 2026</option>
                <option value="2025">Gesamtjahr 2025</option>
              </select>
            )}
          </div>
        </div>

        {/* Filters: Client, Billing Model, Search, Threshold toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kunde (Beauftragt)</label>
            <select
              id="filter-client"
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="">Alle Kunden</option>
              {clients.filter(c => c.id !== 'c-5').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Billing Model */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Abrechnungsmodell</label>
            <select
              id="filter-billing-model"
              value={selectedBillingModel}
              onChange={e => setSelectedBillingModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="">Alle Modelle</option>
              <option value="TIME_AND_MATERIAL">Time & Material (Stunden)</option>
              <option value="FIXED_PRICE">Festpreisprojekt</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Projektsuche</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-project-search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Projektname oder -Nr..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Threshold Switch */}
          <div className="flex items-end">
            <button
              id="btn-toggle-threshold-filter"
              onClick={() => setFilterThresholdOnly(!filterThresholdOnly)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                filterThresholdOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${filterThresholdOnly ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>Nur Abweichungen &gt; 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Berlin Holiday & Workday Calibration Card */}
      {summaryData && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-900 text-sm">
                Arbeitstage-Kalkulation & Feiertage ({summaryData.periodLabel})
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Basis für Hochrechnungen: <span className="font-bold">{summaryData.totalWorkdaysInPeriod} Netto-Arbeitstage</span> im gewählten Zeitraum
                ({summaryData.passedWorkdaysInPeriod} Arbeitstage bereits verstrichen, Faktor: <span className="font-bold">{summaryData.extrapolationFactor.toFixed(2)}x</span>).
                Berücksichtigt den <span className="font-semibold">Feiertagskalender {summaryData.locationCity} ({summaryData.stateLocation})</span>.
              </p>
            </div>
          </div>

          {summaryData.holidaysInPeriod.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {summaryData.holidaysInPeriod.map((h, i) => (
                <span key={i} className="bg-emerald-100/90 text-emerald-900 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-300/60 flex items-center gap-1">
                  <span className="font-mono text-[10px]">{h.date}</span>
                  <span>{h.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-emerald-700 italic shrink-0">
              Keine gesetzlichen Feiertage in diesem Zeitraum
            </span>
          )}
        </div>
      )}

      {/* Aggregated Financial KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Revenue (€) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Forecast-Umsatz (€)</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatEUR(kpis.totalExtrapolatedRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Plan: {formatEUR(kpis.totalPlannedRevenue)}</span>
                <span className="font-semibold text-emerald-700">Ist: {formatEUR(kpis.totalActualRevenue)}</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Hochrechnung Periode</span>
              <span className={`font-bold ${kpis.totalExtrapolatedRevenue >= kpis.totalPlannedRevenue ? 'text-emerald-600' : 'text-amber-600'}`}>
                {kpis.totalPlannedRevenue > 0
                  ? `${((kpis.totalExtrapolatedRevenue / kpis.totalPlannedRevenue) * 100).toFixed(1)}% des Plans`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Card 2: Costs (€) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Forecast-Kosten (€)</span>
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatEUR(kpis.totalExtrapolatedCost)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Plan: {formatEUR(kpis.totalPlannedCost)}</span>
                <span className="font-semibold text-slate-700">Ist: {formatEUR(kpis.totalActualCost)}</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Kostendeckung</span>
              <span className="font-bold text-slate-700">
                {kpis.totalPlannedCost > 0
                  ? `${((kpis.totalExtrapolatedCost / kpis.totalPlannedCost) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Card 3: Margin (€ & %) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Forecast-Marge (€ / %)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">
                {formatEUR(kpis.totalExtrapolatedMargin)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Plan-Marge: {kpis.plannedMarginPercent.toFixed(1)}%</span>
                <span className="font-bold text-emerald-700">Hochr.: {kpis.extrapolatedMarginPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Marge Plan (€)</span>
              <span className="font-bold text-emerald-800">{formatEUR(kpis.totalPlannedMargin)}</span>
            </div>
          </div>

          {/* Card 4: Hours & Capacity (h) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stunden-Kapazität</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {kpis.totalExtrapolatedHours.toFixed(1)}h
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Plan: {kpis.totalPlannedHours.toFixed(0)}h</span>
                <span className="font-semibold text-blue-700">Ist: {kpis.totalActualHours.toFixed(0)}h</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Gefährdete Projekte (&gt;20%)</span>
              <span className={`font-bold ${kpis.criticalProjectsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {kpis.criticalProjectsCount} von {kpis.totalProjectsCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Aggregated Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>Aggregierte Projekte ({summaryData?.projects.length || 0} beauftragte Projekte)</span>
            <span className="text-[11px] font-normal text-slate-500">
              Klicken Sie auf ein Projekt für die Mitarbeiter- und Monatsaufschlüsselung
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Im Plan
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 10–20%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &gt;20% Alarm
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Projekt & Kunde</th>
                <th className="px-4 py-3">Modell</th>
                <th className="px-4 py-3 text-right">Plan (h)</th>
                <th className="px-4 py-3 text-right">Ist (h)</th>
                <th className="px-4 py-3 text-right font-bold text-slate-800">Hochr. (h)</th>
                <th className="px-4 py-3 text-right">Abw. (%)</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-800">Plan-Umsatz</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-800">Hochr. Umsatz</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-800">Hochr. Kosten</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-700">Marge (€)</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-700">Marge (%)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    Lade aggregierten Forecast...
                  </td>
                </tr>
              ) : !summaryData || summaryData.projects.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    Keine beauftragten Projekte für die gewählten Filter im Zeitraum {summaryData?.periodLabel} gefunden.
                  </td>
                </tr>
              ) : (
                summaryData.projects.map((proj) => {
                  const isExpanded = !!expandedProjects[proj.projectId];
                  return (
                    <React.Fragment key={proj.projectId}>
                      {/* Main Project Row */}
                      <tr
                        onClick={() => toggleExpand(proj.projectId)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          proj.isThresholdExceeded ? 'bg-rose-50/30' : isExpanded ? 'bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{proj.projectName}</span>
                            <span className="text-[10px] font-mono text-slate-400">({proj.projectNumber})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{proj.clientName}</div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              proj.billingModel === 'FIXED_PRICE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {proj.billingModel === 'FIXED_PRICE' ? 'Festpreis' : 'T&M'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {proj.plannedHours.toFixed(1)}h
                        </td>

                        <td className="px-4 py-3 text-right text-slate-600">
                          {proj.actualHoursSoFar.toFixed(1)}h
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {proj.extrapolatedHoursEnd.toFixed(1)}h
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold ${
                              Math.abs(proj.hoursDeviationPercent) > 20
                                ? 'text-rose-600'
                                : Math.abs(proj.hoursDeviationPercent) > 10
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {proj.hoursDeviationPercent > 0 ? `+${proj.hoursDeviationPercent}%` : `${proj.hoursDeviationPercent}%`}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatEUR(proj.plannedRevenue)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-emerald-800">
                          {formatEUR(proj.extrapolatedRevenueEnd)}
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatEUR(proj.extrapolatedCostEnd)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {formatEUR(proj.extrapolatedMarginEnd)}
                        </td>

                        <td className="px-4 py-3 text-right font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              proj.extrapolatedMarginPercentEnd >= 40
                                ? 'bg-emerald-100 text-emerald-800'
                                : proj.extrapolatedMarginPercentEnd >= 20
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {proj.extrapolatedMarginPercentEnd.toFixed(1)}%
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {proj.isThresholdExceeded ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> &gt;20% Alarm
                            </span>
                          ) : Math.abs(proj.hoursDeviationPercent) > 10 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Warnung
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Im Plan
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Details (Team Members & Monthly Progress) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-slate-200">
                          <td colSpan={13} className="p-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Sub-Table 1: Team Member Breakdown */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                  <Users className="w-4 h-4 text-emerald-600" />
                                  <span>{t.teamForecastBreakdown} ({proj.teamBreakdown.length} Personen)</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                                      <tr>
                                        <th className="py-1.5 px-2">Mitarbeiter</th>
                                        <th className="py-1.5 px-2">Rolle / Satz</th>
                                        <th className="py-1.5 px-2 text-right">Plan (h)</th>
                                        <th className="py-1.5 px-2 text-right">Ist (h)</th>
                                        <th className="py-1.5 px-2 text-right font-bold">Hochr. (h)</th>
                                        <th className="py-1.5 px-2 text-right">Umsatz (€)</th>
                                        <th className="py-1.5 px-2 text-right">Marge (€)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {proj.teamBreakdown.map((member, mIdx) => (
                                        <tr key={mIdx} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-semibold text-slate-900">
                                            {member.userName}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500">
                                            {member.hourlyBillingRate}€ / {member.hourlyCostRate}€
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-700">
                                            {member.plannedHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {member.actualHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                                            {member.extrapolatedHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-emerald-800 font-medium">
                                            {formatEUR(member.plannedRevenue)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">
                                            {formatEUR(member.plannedMargin)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Sub-Table 2: Monthly Progression */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span>{t.monthlyForecastBreakdown} ({proj.monthlyBreakdown.length} Monate)</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                                      <tr>
                                        <th className="py-1.5 px-2">Monat</th>
                                        <th className="py-1.5 px-2 text-right">Plan (h)</th>
                                        <th className="py-1.5 px-2 text-right">Ist (h)</th>
                                        <th className="py-1.5 px-2 text-right font-bold">Hochr. (h)</th>
                                        <th className="py-1.5 px-2 text-right">Plan-Umsatz</th>
                                        <th className="py-1.5 px-2 text-right">Plan-Kosten</th>
                                        <th className="py-1.5 px-2 text-right font-bold text-emerald-700">Plan-Marge</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {proj.monthlyBreakdown.map((m, mIdx) => (
                                        <tr key={mIdx} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-semibold text-slate-800">
                                            {m.monthLabel || m.month}
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-700">
                                            {m.plannedHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {m.actualHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                                            {m.extrapolatedHours.toFixed(1)}h
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-emerald-800 font-medium">
                                            {formatEUR(m.plannedRevenue)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">
                                            {formatEUR(m.plannedCost)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-bold text-emerald-700">
                                            {formatEUR(m.plannedMargin)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal */}
      <CompanyLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  );
};
