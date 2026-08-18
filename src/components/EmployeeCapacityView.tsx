import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmployeeCapacitySummaryItem } from '../types';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Download,
  Building2,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { CompanyLocationModal } from './CompanyLocationModal';

export const EmployeeCapacityView: React.FC = () => {
  const {
    t,
    getEmployeeCapacitySummary,
    organization,
    currentUser
  } = useApp();

  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER' | 'HALF_YEAR' | 'YEAR'>('MONTH');
  const [periodKey, setPeriodKey] = useState('2026-08');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOverbookedOnly, setFilterOverbookedOnly] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [expandedEmployees, setExpandedEmployees] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [capacityData, setCapacityData] = useState<{
    periodType: string;
    periodKey: string;
    periodLabel: string;
    startDate: string;
    endDate: string;
    stateLocation: string;
    kpis: {
      totalEmployeesCount: number;
      totalOverbookedCount: number;
      totalCapacityHours: number;
      totalPlannedHours: number;
      totalActualHours: number;
      overallUtilizationPercent: number;
    };
    employees: EmployeeCapacitySummaryItem[];
  } | null>(null);

  const loadCapacityData = async () => {
    setIsLoading(true);
    try {
      const data = await getEmployeeCapacitySummary({
        periodType,
        periodKey,
        employmentType: selectedEmploymentType || undefined,
        search: searchQuery || undefined
      });
      setCapacityData(data);
    } catch (err) {
      console.error('Failed to load employee capacity summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCapacityData();
  }, [periodType, periodKey, selectedEmploymentType, searchQuery, organization?.stateLocation]);

  const toggleExpand = (userId: string) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const filteredEmployees = (capacityData?.employees || []).filter(emp => {
    if (filterOverbookedOnly && !emp.isOverbooked) return false;
    return true;
  });

  const formatEUR = (amount: number) => {
    return amount.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    });
  };

  const handleExportCsv = () => {
    if (!capacityData) return;
    const headers = [
      'ID',
      t.teamMembers,
      'Email',
      t.role,
      t.employmentType,
      t.company,
      t.weeklyTargetHours,
      t.targetWorkdays,
      t.targetCapacity,
      t.totalPlannedHours,
      t.actualHours,
      t.capacityUtilization,
      t.overbookingStatus,
      t.overbookingHours,
      t.freeCapacity,
      t.plannedRevenue,
      t.plannedCost,
      t.plannedMargin
    ];

    const rows = filteredEmployees.map(e => [
      e.userId,
      `"${e.userName.replace(/"/g, '""')}"`,
      e.userEmail,
      e.jobRoleName || e.role,
      e.employmentType,
      e.companyName || '',
      e.weeklyTargetHours,
      e.targetWorkdaysInPeriod,
      e.targetCapacityHours,
      e.totalPlannedHours,
      e.totalActualHours,
      e.capacityUtilizationPlannedPercent,
      e.isOverbooked ? 'OVERBOOKED' : 'NORMAL',
      e.overbookingHours,
      e.freeCapacityHours,
      e.totalPlannedRevenue,
      e.totalPlannedCost,
      e.totalPlannedMargin
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `capacity_analysis_${capacityData.periodKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {t.employeeCapacityTitle}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                {t.crossProjectBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t.employeeCapacitySubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Type Buttons */}
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

            {/* Period Selector Input */}
            {periodType === 'MONTH' && (
              <input
                id="input-capacity-month"
                type="month"
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              />
            )}
            {periodType === 'QUARTER' && (
              <select
                id="select-capacity-quarter"
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
            {periodType === 'YEAR' && (
              <select
                id="select-capacity-year"
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
              id="btn-export-capacity-csv"
              onClick={handleExportCsv}
              disabled={!capacityData || filteredEmployees.length === 0}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              {t.exportCsv}
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-capacity-search"
              type="text"
              placeholder={t.searchEmployeesPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <select
              id="select-capacity-employment"
              value={selectedEmploymentType}
              onChange={e => setSelectedEmploymentType(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white"
            >
              <option value="">{t.allEmploymentTypes}</option>
              <option value="INTERNAL">{t.internalEmployee}</option>
              <option value="EXTERNAL">{t.externalContractor}</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 w-full transition-colors">
              <input
                id="checkbox-overbooked-only"
                type="checkbox"
                checked={filterOverbookedOnly}
                onChange={e => setFilterOverbookedOnly(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
              <span className="font-semibold flex items-center gap-1 text-rose-700">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                {t.filterOverbookedOnly}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500">
            <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
              {filteredEmployees.length} {t.teamMembers}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {capacityData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.activeEmployeesCount}
            </div>
            <div className="text-2xl font-bold text-slate-900 flex items-center justify-between">
              <span>{capacityData.kpis.totalEmployeesCount}</span>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-[11px] text-slate-500">{capacityData.periodLabel}</div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all ${
            capacityData.kpis.totalOverbookedCount > 0
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-white border-slate-200/90'
          }`}>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.overbookedCount}
            </div>
            <div className="text-2xl font-bold flex items-center justify-between">
              <span className={capacityData.kpis.totalOverbookedCount > 0 ? 'text-rose-600 font-black' : 'text-slate-900'}>
                {capacityData.kpis.totalOverbookedCount}
              </span>
              {capacityData.kpis.totalOverbookedCount > 0 ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className={`text-[11px] ${capacityData.kpis.totalOverbookedCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
              {capacityData.kpis.totalOverbookedCount > 0 ? t.overbookingStatus : 'OK'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.targetCapacity} vs. {t.plannedHours}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {capacityData.kpis.totalPlannedHours}h <span className="text-xs text-slate-400 font-normal">/ {capacityData.kpis.totalCapacityHours}h</span>
            </div>
            <div className="text-[11px] text-slate-500">{t.stateHolidayCalendar}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.overallUtilization}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {capacityData.kpis.overallUtilizationPercent}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  capacityData.kpis.overallUtilizationPercent > 100
                    ? 'bg-rose-500'
                    : capacityData.kpis.overallUtilizationPercent > 85
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, capacityData.kpis.overallUtilizationPercent)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{t.employeeCapacityTitle} ({capacityData?.periodLabel})</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            {t.parallelProjectsHint}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">{t.teamMembers}</th>
                <th className="px-4 py-3">{t.employmentType}</th>
                <th className="px-4 py-3 text-right">{t.targetCapacity}</th>
                <th className="px-4 py-3 text-right font-bold text-slate-900">{t.plannedHours}</th>
                <th className="px-4 py-3 text-right">{t.actualHours}</th>
                <th className="px-4 py-3">{t.capacityUtilization}</th>
                <th className="px-4 py-3 text-right">{t.plannedRevenue}</th>
                {currentUser?.role === 'ADMIN' && <th className="px-4 py-3 text-right">{t.plannedMargin}</th>}
                <th className="px-4 py-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const isExpanded = !!expandedEmployees[emp.userId];
                  const utilPercent = emp.capacityUtilizationPlannedPercent;

                  return (
                    <React.Fragment key={emp.userId}>
                      <tr
                        id={`row-emp-capacity-${emp.userId}`}
                        onClick={() => toggleExpand(emp.userId)}
                        className={`cursor-pointer transition-colors ${
                          emp.isOverbooked
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : isExpanded
                            ? 'bg-slate-50'
                            : 'hover:bg-slate-50/70'
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
                            {emp.userName}
                            {emp.isOverbooked && (
                              <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded">
                                +{emp.overbookingHours}h {t.overbookedCount}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {emp.jobRoleName || emp.role} • {emp.userEmail}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            emp.employmentType === 'INTERNAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {emp.employmentType === 'INTERNAL' ? t.internalEmployee : t.externalContractor}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-slate-800">{emp.targetCapacityHours}h</div>
                          <div className="text-[10px] text-slate-400">
                            {emp.targetWorkdaysInPeriod}d × {emp.dailyTargetHours}h
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${emp.isOverbooked ? 'text-rose-600 text-sm' : 'text-slate-900'}`}>
                            {emp.totalPlannedHours}h
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {emp.projects.length} {t.project}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right text-slate-700">
                          <div className="font-medium">{emp.totalActualHours}h</div>
                          <div className="text-[10px] text-slate-400">
                            {t.extrapolatedHours}: {emp.totalExtrapolatedHours}h
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="w-32 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className={
                                utilPercent > 100
                                  ? 'text-rose-600'
                                  : utilPercent > 85
                                  ? 'text-blue-600'
                                  : 'text-emerald-600'
                              }>
                                {utilPercent}%
                              </span>
                              <span className="text-slate-400 font-normal text-[10px]">
                                {emp.freeCapacityHours > 0 ? `${emp.freeCapacityHours}h ${t.freeCapacity}` : '100%'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  utilPercent > 100
                                    ? 'bg-rose-500'
                                    : utilPercent > 85
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, utilPercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatEUR(emp.totalPlannedRevenue)}
                        </td>

                        {currentUser?.role === 'ADMIN' && (
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">
                            {formatEUR(emp.totalPlannedMargin)}
                          </td>
                        )}

                        <td className="px-4 py-3 text-center">
                          {emp.isOverbooked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full shadow-2xs">
                              <ShieldAlert className="w-3 h-3 text-rose-600" /> {t.overbookingStatus}
                            </span>
                          ) : utilPercent >= 85 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" /> Optimal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t.freeCapacity}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Project Breakdown Accordion */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50/90 p-4 border-y border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <Briefcase className="w-4 h-4 text-slate-500" />
                                  {t.parallelProjectsTitle} ({emp.projects.length})
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {t.targetCapacity}: {emp.targetCapacityHours}h • {t.totalPlannedHours}: {emp.totalPlannedHours}h ({utilPercent}%)
                                </span>
                              </div>

                              {emp.projects.length === 0 ? (
                                <div className="text-xs text-slate-400 py-3 text-center">
                                  {t.noData}
                                </div>
                              ) : (
                                <table className="w-full text-xs text-left">
                                  <thead className="text-[11px] text-slate-400 font-semibold border-b border-slate-100">
                                    <tr>
                                      <th className="pb-2">{t.project}</th>
                                      <th className="pb-2">{t.client}</th>
                                      <th className="pb-2">{t.billingModel}</th>
                                      <th className="pb-2 text-right">{t.plannedHours}</th>
                                      <th className="pb-2 text-right">{t.actualHours}</th>
                                      <th className="pb-2 text-right">{t.plannedRevenue}</th>
                                      <th className="pb-2 text-right">{t.plannedCost}</th>
                                      <th className="pb-2 text-right">{t.plannedMargin}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {emp.projects.map(p => (
                                      <tr key={p.projectId} className="hover:bg-slate-50/60">
                                        <td className="py-2 font-semibold text-slate-900">
                                          {p.projectNumber} {p.projectName}
                                        </td>
                                        <td className="py-2 text-slate-600">{p.clientName}</td>
                                        <td className="py-2">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                            p.billingModel === 'FIXED_PRICE'
                                              ? 'bg-purple-100 text-purple-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                          }`}>
                                            {p.billingModel === 'FIXED_PRICE' ? t.fixedPrice : 'T&M'}
                                          </span>
                                        </td>
                                        <td className="py-2 text-right font-bold text-slate-900">
                                          {p.plannedHours}h
                                        </td>
                                        <td className="py-2 text-right text-slate-600">{p.actualHours}h</td>
                                        <td className="py-2 text-right font-medium text-slate-800">
                                          {formatEUR(p.plannedRevenue)}
                                        </td>
                                        <td className="py-2 text-right text-slate-500">
                                          {formatEUR(p.plannedCost)}
                                        </td>
                                        <td className="py-2 text-right font-bold text-emerald-700">
                                          {formatEUR(p.plannedMargin)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
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
    </div>
  );
};
