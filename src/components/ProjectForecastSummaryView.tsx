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
  Info,
  History,
  Target,
  FileCheck2,
  PieChart,
  Maximize2,
  BarChart2
} from 'lucide-react';
import { CompanyLocationModal } from './CompanyLocationModal';
import { ForecastHistoryModal } from './ForecastHistoryModal';
import { ChartExpandedModal } from './ChartExpandedModal';

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

  // Modal States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showExpandedChartModal, setShowExpandedChartModal] = useState(false);
  const [historyModalConfig, setHistoryModalConfig] = useState<{
    isOpen: boolean;
    projectId?: string;
    userId?: string;
    projectName?: string;
    userName?: string;
  }>({
    isOpen: false
  });

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
      t.projectNumber,
      t.projectName,
      t.client,
      t.billingModel,
      t.fixedPriceBudgetTotal,
      t.pocCompletion,
      t.remainingFixedPriceBudget,
      t.plannedHours,
      t.actualHours,
      t.extrapolatedHours,
      t.deviation,
      t.plannedRevenue,
      t.actualRevenue,
      t.extrapolatedRevenue,
      t.revenueDeviation,
      t.plannedCost,
      t.actualCost,
      t.extrapolatedCost,
      t.costDeviation,
      t.plannedMargin,
      t.actualMargin,
      t.extrapolatedMargin,
      t.plannedMarginPercent,
      t.extrapolatedMarginPercent,
      t.status
    ];

    const rows = summaryData.projects.map(p => [
      p.projectNumber,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.billingModel === 'FIXED_PRICE' ? t.fixedPrice : 'T&M',
      p.totalFixedPrice || '',
      p.completionPercentagePoC || '',
      p.remainingFixedPriceBudget !== undefined ? p.remainingFixedPriceBudget : '',
      p.plannedHours,
      p.actualHoursSoFar,
      p.extrapolatedHoursEnd,
      p.hoursDeviationPercent,
      p.plannedRevenue,
      p.actualRevenueSoFar,
      p.extrapolatedRevenueEnd,
      p.revenueDeviationPercent,
      p.plannedCost,
      p.actualCostSoFar,
      p.extrapolatedCostEnd,
      p.costDeviationPercent,
      p.plannedMargin,
      p.actualMarginSoFar,
      p.extrapolatedMarginEnd,
      p.plannedMarginPercent,
      p.extrapolatedMarginPercentEnd,
      p.isThresholdExceeded ? 'ALARM (>20%)' : 'NORMAL'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `project_forecast_financials_${summaryData.periodKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = summaryData?.kpis;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Filter & Settings Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        {/* Header Title & Period Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                {t.aggregatedProjectForecast}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                {t.liveExtrapolationBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t.aggregatedProjectForecastSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Type Selection */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                id="btn-period-month"
                onClick={() => {
                  setPeriodType('MONTH');
                  setPeriodKey('2026-08');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodType === 'MONTH' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.periodMonth}
              </button>
              <button
                id="btn-period-quarter"
                onClick={() => {
                  setPeriodType('QUARTER');
                  setPeriodKey('2026-Q3');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodType === 'QUARTER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.periodQuarter}
              </button>
              <button
                id="btn-period-half-year"
                onClick={() => {
                  setPeriodType('HALF_YEAR');
                  setPeriodKey('2026-H2');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodType === 'HALF_YEAR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.periodHalfYear}
              </button>
              <button
                id="btn-period-year"
                onClick={() => {
                  setPeriodType('YEAR');
                  setPeriodKey('2026');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodType === 'YEAR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.periodYear}
              </button>
            </div>

            {/* Period Key Selection */}
            {periodType === 'MONTH' && (
              <input
                id="input-period-month-select"
                type="month"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              />
            )}
            {periodType === 'QUARTER' && (
              <select
                id="select-period-quarter-select"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026-Q1">Q1 2026</option>
                <option value="2026-Q2">Q2 2026</option>
                <option value="2026-Q3">Q3 2026</option>
                <option value="2026-Q4">Q4 2026</option>
              </select>
            )}
            {periodType === 'HALF_YEAR' && (
              <select
                id="select-period-halfyear-select"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026-H1">H1 2026</option>
                <option value="2026-H2">H2 2026</option>
              </select>
            )}
            {periodType === 'YEAR' && (
              <select
                id="select-period-year-select"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            )}

            {/* CSV Export Button */}
            <button
              id="btn-export-financial-csv"
              onClick={handleExportCsv}
              disabled={!summaryData || summaryData.projects.length === 0}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              {t.exportCsv}
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Client Filter */}
          <div>
            <select
              id="select-filter-client"
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white"
            >
              <option value="">{t.allClients} ({clients.length})</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Billing Model Filter */}
          <div>
            <select
              id="select-filter-model"
              value={selectedBillingModel}
              onChange={e => setSelectedBillingModel(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white"
            >
              <option value="">{t.allBillingModels}</option>
              <option value="TIME_MATERIAL">{t.timeAndMaterial}</option>
              <option value="FIXED_PRICE">{t.fixedPrice}</option>
            </select>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-filter-search"
              type="text"
              placeholder={t.searchProjectsPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white"
            />
          </div>

          {/* Threshold Switch */}
          <div className="flex items-center">
            <button
              id="btn-toggle-threshold-filter"
              onClick={() => setFilterThresholdOnly(!filterThresholdOnly)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                filterThresholdOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-50/70 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${filterThresholdOnly ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>{t.filterThresholdOnly}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Holiday & Workday Calibration Card */}
      {summaryData && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-emerald-900 text-sm">
                {t.workdaysInPeriod} ({summaryData.periodLabel})
              </div>
              <p className="text-emerald-800 leading-relaxed">
                {summaryData.totalWorkdaysInPeriod} {t.targetWorkdays} ({summaryData.passedWorkdaysInPeriod} {t.passedWorkdays}, {t.extrapolationFactor}: {summaryData.extrapolationFactor.toFixed(2)}x) • {t.stateHolidayCalendar}: {summaryData.locationCity} ({summaryData.stateLocation})
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
              {t.noHolidaysInPeriod}
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.forecastRevenue}</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatEUR(kpis.totalExtrapolatedRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>{t.plan}: {formatEUR(kpis.totalPlannedRevenue)}</span>
                <span className="font-semibold text-emerald-700">{t.actual}: {formatEUR(kpis.totalActualRevenue)}</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{t.extrapolatedRevenue}</span>
              <span className={`font-bold ${kpis.totalExtrapolatedRevenue >= kpis.totalPlannedRevenue ? 'text-emerald-600' : 'text-amber-600'}`}>
                {kpis.totalPlannedRevenue > 0
                  ? `${((kpis.totalExtrapolatedRevenue / kpis.totalPlannedRevenue) * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Card 2: Costs (€) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.forecastCost}</span>
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatEUR(kpis.totalExtrapolatedCost)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>{t.plan}: {formatEUR(kpis.totalPlannedCost)}</span>
                <span className="font-semibold text-slate-700">{t.actual}: {formatEUR(kpis.totalActualCost)}</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{t.extrapolatedCost}</span>
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
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.forecastMargin}</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">
                {formatEUR(kpis.totalExtrapolatedMargin)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>{t.plannedMargin}: {kpis.plannedMarginPercent.toFixed(1)}%</span>
                <span className="font-bold text-emerald-700">{t.extrapolatedMargin}: {kpis.extrapolatedMarginPercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{t.plannedMargin}</span>
              <span className="font-bold text-emerald-800">{formatEUR(kpis.totalPlannedMargin)}</span>
            </div>
          </div>

          {/* Card 4: Hours & Capacity (h) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.forecastHours}</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {kpis.totalExtrapolatedHours.toFixed(1)}h
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>{t.plan}: {kpis.totalPlannedHours.toFixed(0)}h</span>
                <span className="font-semibold text-blue-700">{t.actual}: {kpis.totalActualHours.toFixed(0)}h</span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{t.criticalProjectsCount} (&gt;20%)</span>
              <span className={`font-bold ${kpis.criticalProjectsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {kpis.criticalProjectsCount} / {kpis.totalProjectsCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Visual Forecast Charts (Stacked on Mobile, Side-by-Side on Desktop) */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visual Chart Card 1: Revenue vs Cost Comparison */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900">Umsatz & Kosten (Plan vs. Hochrechnung)</span>
              </div>
              <button
                id="btn-expand-chart-revenue"
                onClick={() => setShowExpandedChartModal(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title={t.expandChart || 'Diagramm vergrößern'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.expandChart || 'Vergrößern'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Planned Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Geplanter Umsatz</span>
                  <span className="text-slate-900">{formatEUR(kpis.totalPlannedRevenue)}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full w-full" />
                </div>
              </div>

              {/* Extrapolated Revenue Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-700">Hochgerechneter Umsatz</span>
                  <span className="text-emerald-800 font-bold">{formatEUR(kpis.totalExtrapolatedRevenue)}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, kpis.totalPlannedRevenue > 0 ? (kpis.totalExtrapolatedRevenue / kpis.totalPlannedRevenue) * 100 : 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Extrapolated Costs Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Hochgerechnete Gesamtkosten</span>
                  <span className="text-slate-900">{formatEUR(kpis.totalExtrapolatedCost)}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, kpis.totalExtrapolatedRevenue > 0 ? (kpis.totalExtrapolatedCost / kpis.totalExtrapolatedRevenue) * 100 : 50)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Chart Card 2: Margen-Effizienz & Deckungsbeitrag */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900">Margen-Entwicklung & Rendite</span>
              </div>
              <button
                id="btn-expand-chart-margin"
                onClick={() => setShowExpandedChartModal(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title={t.expandChart || 'Diagramm vergrößern'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.expandChart || 'Vergrößern'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Plan-Marge (%)</div>
                <div className="text-xl font-bold text-slate-800">{kpis.plannedMarginPercent.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500">{formatEUR(kpis.totalPlannedMargin)}</div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200/80 text-center space-y-1">
                <div className="text-[11px] font-bold text-emerald-700">Hochrechnung Marge (%)</div>
                <div className="text-xl font-extrabold text-emerald-800">{kpis.extrapolatedMarginPercent.toFixed(1)}%</div>
                <div className="text-[10px] font-semibold text-emerald-700">{formatEUR(kpis.totalExtrapolatedMargin)}</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
              <span>Deckungsbeitrag Gesamt</span>
              <span className="font-bold text-emerald-700">{formatEUR(kpis.totalExtrapolatedMargin)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Aggregated Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>{t.aggregatedProjectForecast} ({summaryData?.projects.length || 0})</span>
            <span className="text-[11px] font-normal text-slate-500">
              {t.fixedPriceControllingDesc}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> OK
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
                <th className="px-4 py-3">{t.project} & {t.client}</th>
                <th className="px-4 py-3">{t.billingModel} / {t.pocCompletion}</th>
                <th className="px-4 py-3 text-right">{t.plannedHours}</th>
                <th className="px-4 py-3 text-right">{t.actualHours}</th>
                <th className="px-4 py-3 text-right font-bold text-slate-800">{t.extrapolatedHours}</th>
                <th className="px-4 py-3 text-right">{t.deviation}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-800">{t.plannedRevenue}</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-800">{t.extrapolatedRevenue}</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-800">{t.extrapolatedCost}</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-700">{t.plannedMargin}</th>
                <th className="px-4 py-3 text-right font-bold text-emerald-700">{t.plannedMarginPercent}</th>
                <th className="px-4 py-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    {t.loading}
                  </td>
                </tr>
              ) : !summaryData || summaryData.projects.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    {t.noData}
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

                        {/* Billing Model & Fixed Price Progress Badge */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                proj.billingModel === 'FIXED_PRICE'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {proj.billingModel === 'FIXED_PRICE' ? t.fixedPrice : 'T&M'}
                            </span>

                            {proj.billingModel === 'FIXED_PRICE' && proj.completionPercentagePoC !== undefined && (
                              <div className="text-[10px] text-slate-600 font-medium">
                                PoC: <strong className="text-purple-900">{proj.completionPercentagePoC}%</strong>
                                {proj.remainingFixedPriceBudget !== undefined && (
                                  <span className="text-slate-400 block text-[9px]">
                                    {t.remainingFixedPriceBudget}: {formatEUR(proj.remainingFixedPriceBudget)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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

                        {/* Hours Deviation */}
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
                          <div className="flex items-center justify-center gap-1.5">
                            {/* History Audit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModalConfig({
                                  isOpen: true,
                                  projectId: proj.projectId,
                                  projectName: proj.projectName
                                });
                              }}
                              title={t.versionHistory}
                              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {proj.isThresholdExceeded ? (
                              <span
                                title={`>20%: ${t.plannedHours} (${proj.hoursDeviationPercent}%), ${t.revenue} (${proj.revenueDeviationPercent}%), ${t.cost} (${proj.costDeviationPercent}%)`}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> &gt;20%
                              </span>
                            ) : Math.abs(proj.hoursDeviationPercent) > 10 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> ~15%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Drill-Down Details (Fixed Price Milestones, Team & Monthly Progress) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-slate-200">
                          <td colSpan={13} className="p-4 space-y-4">
                            {/* Fixed Price Specific Progress & Remaining Budget Banner */}
                            {proj.billingModel === 'FIXED_PRICE' && (
                              <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-2xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
                                    <Target className="w-4 h-4 text-purple-600" />
                                    <span>{t.fixedPriceControlling} ({t.percentageOfCompletion})</span>
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {t.fixedPriceBudgetTotal}: <strong className="text-purple-950">{formatEUR(proj.totalFixedPrice || 0)}</strong>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 space-y-1">
                                    <div className="text-[10px] font-bold uppercase text-purple-700">{t.pocCompletion}</div>
                                    <div className="text-xl font-bold text-purple-900">{proj.completionPercentagePoC || 0}%</div>
                                    <div className="w-full bg-purple-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                      <div
                                        className="bg-purple-600 h-1.5 rounded-full"
                                        style={{ width: `${Math.min(100, proj.completionPercentagePoC || 0)}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                                    <div className="text-[10px] font-bold uppercase text-slate-500">{t.actualCost}</div>
                                    <div className="text-xl font-bold text-slate-900">{formatEUR(proj.actualCostSoFar)}</div>
                                    <div className="text-[10px] text-slate-500">{t.resourcesSpent}</div>
                                  </div>

                                  <div className={`p-3 rounded-lg border space-y-1 ${
                                    (proj.remainingFixedPriceBudget || 0) < 0
                                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                                      : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                  }`}>
                                    <div className="text-[10px] font-bold uppercase text-slate-500">{t.remainingFixedPriceBudget}</div>
                                    <div className={`text-xl font-bold ${
                                      (proj.remainingFixedPriceBudget || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
                                    }`}>
                                      {formatEUR(proj.remainingFixedPriceBudget || 0)}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {(proj.remainingFixedPriceBudget || 0) < 0 ? t.budgetExceeded : t.availableBudget}
                                    </div>
                                  </div>
                                </div>

                                {/* Milestone List if available */}
                                {proj.milestonesProgress && proj.milestonesProgress.length > 0 && (
                                  <div className="pt-2 border-t border-slate-100">
                                    <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                      <FileCheck2 className="w-3.5 h-3.5 text-purple-600" />
                                      {t.milestoneSummary} ({proj.milestonesProgress.length})
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {proj.milestonesProgress.map(m => (
                                        <div key={m.milestoneId} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
                                          <div>
                                            <div className="font-semibold text-slate-800">{m.name}</div>
                                            <div className="text-[10px] text-slate-400">{t.dueDate}: {m.dueDate || '—'}</div>
                                          </div>
                                          <div className="text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                              m.status === 'COMPLETED'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : m.status === 'IN_PROGRESS'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-slate-200 text-slate-700'
                                            }`}>
                                              {m.status === 'COMPLETED' ? t.completed : m.status === 'IN_PROGRESS' ? `${m.completionPercent}% ${t.inProgress}` : t.planned}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Sub-Table 1: Team Member Breakdown */}
                              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                    <span>{t.teamForecastBreakdown} ({proj.teamBreakdown.length})</span>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                                      <tr>
                                        <th className="py-1.5 px-2">{t.employee}</th>
                                        <th className="py-1.5 px-2">{t.rate}</th>
                                        <th className="py-1.5 px-2 text-right">{t.plannedHours}</th>
                                        <th className="py-1.5 px-2 text-right">{t.actualHours}</th>
                                        <th className="py-1.5 px-2 text-right font-bold">{t.extrapolatedHours}</th>
                                        <th className="py-1.5 px-2 text-right">{t.revenue}</th>
                                        <th className="py-1.5 px-2 text-right">{t.margin}</th>
                                        <th className="py-1.5 px-2 text-center">{t.history}</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {proj.teamBreakdown.map((member, mIdx) => (
                                        <tr key={mIdx} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-semibold text-slate-900">
                                            {member.userName}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500 font-mono">
                                            {Number(member.hourlyBillingRate).toFixed(2)} € / {Number(member.hourlyCostRate).toFixed(2)} €
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
                                          <td className="py-1.5 px-2 text-center">
                                            <button
                                              onClick={() => {
                                                setHistoryModalConfig({
                                                  isOpen: true,
                                                  projectId: proj.projectId,
                                                  userId: member.userId,
                                                  projectName: proj.projectName,
                                                  userName: member.userName
                                                });
                                              }}
                                              title={t.versionHistory}
                                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                                            >
                                              <History className="w-3.5 h-3.5" />
                                            </button>
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
                                  <span>{t.monthlyForecastBreakdown} ({proj.monthlyBreakdown.length})</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                                      <tr>
                                        <th className="py-1.5 px-2">{t.month}</th>
                                        <th className="py-1.5 px-2 text-right">{t.plannedHours}</th>
                                        <th className="py-1.5 px-2 text-right">{t.actualHours}</th>
                                        <th className="py-1.5 px-2 text-right font-bold">{t.extrapolatedHours}</th>
                                        <th className="py-1.5 px-2 text-right">{t.plannedRevenue}</th>
                                        <th className="py-1.5 px-2 text-right">{t.plannedCost}</th>
                                        <th className="py-1.5 px-2 text-right font-bold text-emerald-700">{t.plannedMargin}</th>
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

      {/* Forecast History Modal */}
      <ForecastHistoryModal
        isOpen={historyModalConfig.isOpen}
        onClose={() => setHistoryModalConfig(prev => ({ ...prev, isOpen: false }))}
        projectId={historyModalConfig.projectId}
        userId={historyModalConfig.userId}
        projectName={historyModalConfig.projectName}
        userName={historyModalConfig.userName}
      />

      {/* Full-Screen / Expanded Chart Modal for Mobile & Tablets */}
      {showExpandedChartModal && kpis && (
        <ChartExpandedModal
          title={`Forecast & Performance Analyse (${summaryData?.periodLabel || periodKey})`}
          subtitle={`Mandant: ${organization?.name || 'Insight Arcs'} • Standort: ${summaryData?.locationCity || 'Berlin'}`}
          kpiList={[
            {
              label: 'Hochgerechneter Umsatz',
              value: formatEUR(kpis.totalExtrapolatedRevenue),
              subtext: `Plan: ${formatEUR(kpis.totalPlannedRevenue)}`,
              color: 'text-emerald-700',
              icon: DollarSign
            },
            {
              label: 'Hochgerechnete Kosten',
              value: formatEUR(kpis.totalExtrapolatedCost),
              subtext: `Plan: ${formatEUR(kpis.totalPlannedCost)}`,
              color: 'text-slate-800',
              icon: Layers
            },
            {
              label: 'Deckungsbeitrag / Marge',
              value: `${kpis.extrapolatedMarginPercent.toFixed(1)}%`,
              subtext: `Total: ${formatEUR(kpis.totalExtrapolatedMargin)}`,
              color: 'text-emerald-700',
              icon: TrendingUp
            },
            {
              label: 'Stunden & Kapazität',
              value: `${kpis.totalExtrapolatedHours.toFixed(1)}h`,
              subtext: `Ist: ${kpis.totalActualHours.toFixed(0)}h / Plan: ${kpis.totalPlannedHours.toFixed(0)}h`,
              color: 'text-blue-700',
              icon: Clock
            }
          ]}
          chartNode={
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Umsatz (Plan vs. Hochrechnung)</span>
                  <span className="text-emerald-700 font-extrabold">{formatEUR(kpis.totalExtrapolatedRevenue)}</span>
                </div>
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{
                      width: `${Math.min(100, kpis.totalPlannedRevenue > 0 ? (kpis.totalExtrapolatedRevenue / kpis.totalPlannedRevenue) * 100 : 100)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Geplant: {formatEUR(kpis.totalPlannedRevenue)}</span>
                  <span>Ist gebucht: {formatEUR(kpis.totalActualRevenue)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Kosten vs. Umsatzquote</span>
                  <span className="text-rose-600 font-extrabold">{formatEUR(kpis.totalExtrapolatedCost)}</span>
                </div>
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${Math.min(100, kpis.totalExtrapolatedRevenue > 0 ? (kpis.totalExtrapolatedCost / kpis.totalExtrapolatedRevenue) * 100 : 50)}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Kostenquote: {kpis.totalExtrapolatedRevenue > 0 ? ((kpis.totalExtrapolatedCost / kpis.totalExtrapolatedRevenue) * 100).toFixed(1) : 0}%</span>
                  <span>Reingewinn: {formatEUR(kpis.totalExtrapolatedMargin)}</span>
                </div>
              </div>
            </div>
          }
          tableNode={
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-3">Projekt</th>
                    <th className="p-3 text-right">Plan-Std</th>
                    <th className="p-3 text-right">Hochrechnung-Std</th>
                    <th className="p-3 text-right">Plan-Umsatz</th>
                    <th className="p-3 text-right">Hochrechnung-Umsatz</th>
                    <th className="p-3 text-right">Marge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(summaryData?.projects || []).map(p => (
                    <tr key={p.projectId} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">{p.projectName}</td>
                      <td className="p-3 text-right text-slate-600">{p.plannedHours.toFixed(1)}h</td>
                      <td className="p-3 text-right font-bold text-slate-900">{p.extrapolatedHours.toFixed(1)}h</td>
                      <td className="p-3 text-right text-slate-600">{formatEUR(p.plannedRevenue)}</td>
                      <td className="p-3 text-right font-bold text-emerald-800">{formatEUR(p.extrapolatedRevenue)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{p.extrapolatedMarginPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          onClose={() => setShowExpandedChartModal(false)}
        />
      )}
    </div>
  );
};
