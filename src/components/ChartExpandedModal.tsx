import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Maximize2,
  TrendingUp,
  DollarSign,
  Layers,
  Clock,
  Calendar,
  Users,
  Target,
  FileCheck2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ChartExpandedModalProps {
  title: string;
  subtitle?: string;
  kpiList?: {
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
    icon?: React.ElementType;
  }[];
  chartNode: React.ReactNode;
  tableNode?: React.ReactNode;
  onClose: () => void;
}

export const ChartExpandedModal: React.FC<ChartExpandedModalProps> = ({
  title,
  subtitle,
  kpiList,
  chartNode,
  tableNode,
  onClose
}) => {
  const { t } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                  {t.fullScreenChart || 'Vollbild-Analyse'}
                </span>
              </h3>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title={t.close || 'Schließen'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top KPI Summaries (Mobile-First Stacked Grid) */}
          {kpiList && kpiList.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t.mobileKpiSummary || 'Wichtigste Kennzahlen (KPIs)'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {kpiList.map((kpi, idx) => {
                  const Icon = kpi.icon || TrendingUp;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase">{kpi.label}</span>
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className={`text-xl font-extrabold ${kpi.color || 'text-slate-900'}`}>
                        {kpi.value}
                      </div>
                      {kpi.subtext && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {kpi.subtext}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary High-Resolution Chart Viewport */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200/80 pb-2">
              <span>{t.chartDetails || 'Grafische Visualisierung'}</span>
              <span className="text-[11px] font-normal text-slate-500">Touch & Zoom optimiert</span>
            </div>
            <div className="min-h-[260px] flex items-center justify-center overflow-x-auto">
              <div className="w-full min-w-[320px]">
                {chartNode}
              </div>
            </div>
          </div>

          {/* Optional Detailed Data Table */}
          {tableNode && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Granulare Aufschlüsselung
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {tableNode}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {t.close || 'Schließen'}
          </button>
        </div>
      </div>
    </div>
  );
};
