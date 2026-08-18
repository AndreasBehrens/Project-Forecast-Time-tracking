import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ForecastComparisonItem, ForecastEntry } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle2,
  DollarSign,
  History,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Building2,
  FolderKanban,
  Users,
  MapPin,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { ProjectForecastSummaryView } from './ProjectForecastSummaryView';
import { EmployeeCapacityView } from './EmployeeCapacityView';
import { CompanyLocationModal } from './CompanyLocationModal';
import { ForecastHistoryModal } from './ForecastHistoryModal';

export const ForecastView: React.FC = () => {
  const {
    t,
    projects,
    users,
    forecasts,
    saveForecast,
    getPlanVsActual,
    currentUser,
    organization
  } = useApp();

  const [activeTab, setActiveTab] = useState<'aggregated' | 'capacity' | 'detail'>('aggregated');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [comparisonList, setComparisonList] = useState<ForecastComparisonItem[]>([]);
  const [showNewForecastModal, setShowNewForecastModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // History modal config
  const [historyModalConfig, setHistoryModalConfig] = useState<{
    isOpen: boolean;
    projectId?: string;
    userId?: string;
    projectName?: string;
    userName?: string;
    month?: string;
  }>({
    isOpen: false
  });

  // New Forecast Form
  const [fcProjectId, setFcProjectId] = useState(projects[0]?.id || '');
  const [fcUserId, setFcUserId] = useState(users[0]?.id || '');
  const [fcHours, setFcHours] = useState('40');
  const [fcChangeReason, setFcChangeReason] = useState<string>('INITIAL_PLANNING');
  const [fcChangeNote, setFcChangeNote] = useState('');

  useEffect(() => {
    getPlanVsActual(selectedMonth).then(data => setComparisonList(data));
  }, [selectedMonth, forecasts]);

  const handleSaveForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveForecast({
      projectId: fcProjectId,
      userId: fcUserId,
      month: selectedMonth,
      plannedHours: parseFloat(fcHours) || 0,
      changeReason: fcChangeReason as any,
      changeNote: fcChangeNote.trim() || undefined
    });
    setFcChangeNote('');
    setShowNewForecastModal(false);
  };

  const totalPlannedHours = comparisonList.reduce((sum, item) => sum + item.plannedHours, 0);
  const totalActualHours = comparisonList.reduce((sum, item) => sum + item.actualHoursSoFar, 0);
  const totalExtrapolatedHours = comparisonList.reduce((sum, item) => sum + item.extrapolatedHoursMonthEnd, 0);
  const totalPlannedRevenue = comparisonList.reduce((sum, item) => sum + item.plannedRevenue, 0);

  const exceededCount = comparisonList.filter(item => item.isThresholdExceeded).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top View Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
          {/* Tab 1: Aggregated Project Forecast */}
          <button
            id="tab-forecast-aggregated"
            onClick={() => setActiveTab('aggregated')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'aggregated'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className={`w-4 h-4 ${activeTab === 'aggregated' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{t.viewModeAggregated}</span>
          </button>

          {/* Tab 2: Employee Capacity & Overbooking Monitor */}
          <button
            id="tab-forecast-capacity"
            onClick={() => setActiveTab('capacity')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'capacity'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className={`w-4 h-4 ${activeTab === 'capacity' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>{t.viewModeCapacity}</span>
          </button>

          {/* Tab 3: Detailed Plan vs Actual Resource List */}
          <button
            id="tab-forecast-detail"
            onClick={() => setActiveTab('detail')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'detail'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'detail' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{t.viewModeDetail}</span>
          </button>
        </div>

        {/* Company Location Indicator */}
        <button
          id="btn-trigger-location-modal"
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {t.companyLocation}: <strong className="text-slate-800">{organization?.locationCity || 'Berlin'}</strong> ({organization?.stateLocation || 'DE-BE'})
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-1.5 py-0.2 rounded">
            {t.stateHolidayCalendar}
          </span>
        </button>
      </div>

      {/* Render selected view mode */}
      {activeTab === 'aggregated' ? (
        <ProjectForecastSummaryView />
      ) : activeTab === 'capacity' ? (
        <EmployeeCapacityView />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                {t.forecastTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {t.forecastSubtitle} ({t.thresholdWarningBanner})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="input-forecast-month"
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
              />

              <button
                id="btn-open-forecast-modal"
                onClick={() => setShowNewForecastModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.saveForecast}
              </button>
            </div>
          </div>

          {/* Threshold Exceeded Warning Banner */}
          {exceededCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-sm text-amber-900">
                  {t.thresholdWarning} ({exceededCount})
                </div>
                <p className="text-amber-800 leading-relaxed">
                  {t.thresholdExceededNotification}
                </p>
              </div>
            </div>
          )}

          {/* Forecast Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.plannedHours}</div>
              <div className="text-2xl font-bold text-slate-900">{totalPlannedHours.toFixed(1)}h</div>
              <div className="text-[11px] text-slate-500">{selectedMonth}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.actualHours}</div>
              <div className="text-2xl font-bold text-slate-900">{totalActualHours.toFixed(1)}h</div>
              <div className="text-[11px] text-emerald-600 font-medium">{t.liveExtrapolationBadge}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.extrapolatedHours}</div>
              <div className="text-2xl font-bold text-slate-900">{totalExtrapolatedHours.toFixed(1)}h</div>
              <div className="text-[11px] text-slate-500">{t.hoursFormulaHint}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.plannedRevenue}</div>
              <div className="text-2xl font-bold text-emerald-700">
                {totalPlannedRevenue.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
              </div>
              <div className="text-[11px] text-slate-500">{t.revenue}</div>
            </div>
          </div>

          {/* Plan vs. Actual Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>{t.forecastTitle} ({selectedMonth})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {t.hoursFormulaHint}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3">{t.project}</th>
                    <th className="px-4 py-3">{t.teamMembers}</th>
                    <th className="px-4 py-3">{t.billingModel}</th>
                    <th className="px-4 py-3 text-right">{t.plannedHours}</th>
                    <th className="px-4 py-3 text-right">{t.actualHours}</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-800">{t.extrapolatedHours}</th>
                    <th className="px-4 py-3 text-right">{t.deviation}</th>
                    {currentUser?.role === 'ADMIN' && <th className="px-4 py-3 text-right">{t.plannedRevenue}</th>}
                    {currentUser?.role === 'ADMIN' && <th className="px-4 py-3 text-right">{t.plannedMargin}</th>}
                    <th className="px-4 py-3 text-center">{t.versionHistory}</th>
                    <th className="px-4 py-3 text-center">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    comparisonList.map((row, index) => (
                      <tr key={index} className={`hover:bg-slate-50/70 ${row.isThresholdExceeded ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.projectName}</td>
                        <td className="px-4 py-3 text-slate-700">{row.userName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            row.billingModel === 'FIXED_PRICE' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {row.billingModel === 'FIXED_PRICE' ? t.fixedPrice : 'T&M'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{row.plannedHours}h</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.actualHoursSoFar}h</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {row.extrapolatedHoursMonthEnd.toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${
                            Math.abs(row.hoursDeviationPercent) > 20
                              ? 'text-rose-600'
                              : Math.abs(row.hoursDeviationPercent) > 10
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {row.hoursDeviationPercent > 0 ? `+${row.hoursDeviationPercent}%` : `${row.hoursDeviationPercent}%`}
                          </span>
                        </td>
                        {currentUser?.role === 'ADMIN' && (
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            {row.plannedRevenue.toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                          </td>
                        )}
                        {currentUser?.role === 'ADMIN' && (
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">
                            {(row.plannedRevenue - row.plannedCost).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setHistoryModalConfig({
                                isOpen: true,
                                projectId: row.projectId,
                                userId: row.userId,
                                projectName: row.projectName,
                                userName: row.userName,
                                month: selectedMonth
                              });
                            }}
                            title={t.versionHistory}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.isThresholdExceeded ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> &gt;20%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal for adding/adjusting single forecast with Change Reason & Audit */}
          {showNewForecastModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600" />
                    {t.saveForecast}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.historyAuditTrailDesc}
                </p>

                <form onSubmit={handleSaveForecast} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t.project}</label>
                    <select
                      id="select-fc-project"
                      value={fcProjectId}
                      onChange={e => setFcProjectId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t.teamMembers}</label>
                    <select
                      id="select-fc-user"
                      value={fcUserId}
                      onChange={e => setFcUserId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t.plannedHours} ({selectedMonth})</label>
                    <input
                      id="input-fc-hours"
                      type="number"
                      required
                      step="1"
                      min="0"
                      value={fcHours}
                      onChange={e => setFcHours(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>

                  {/* Change Reason */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t.changeReason}</label>
                    <select
                      id="select-fc-reason"
                      value={fcChangeReason}
                      onChange={e => setFcChangeReason(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                    >
                      <option value="INITIAL_PLANNING">{t.reasonInitialPlanning}</option>
                      <option value="SCOPE_CHANGE">{t.reasonScopeChange}</option>
                      <option value="STAFFING_CHANGE">{t.reasonStaffingChange}</option>
                      <option value="DELAY">{t.reasonDelay}</option>
                      <option value="CLIENT_REQUEST">{t.reasonClientRequest}</option>
                      <option value="BUDGET_ADJUSTMENT">{t.reasonBudgetAdjustment}</option>
                      <option value="OTHER">{t.reasonOther}</option>
                    </select>
                  </div>

                  {/* Change Note */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">{t.changeNote}</label>
                    <textarea
                      id="input-fc-note"
                      rows={2}
                      placeholder={t.changeNotePlaceholder}
                      value={fcChangeNote}
                      onChange={e => setFcChangeNote(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowNewForecastModal(false)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      {t.saveForecast}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Location Modal */}
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
        month={historyModalConfig.month}
      />
    </div>
  );
};
