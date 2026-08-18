import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ForecastAuditHistoryItem } from '../types';
import {
  History,
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck
} from 'lucide-react';

interface ForecastHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  userId?: string;
  month?: string;
  projectName?: string;
  userName?: string;
}

export const ForecastHistoryModal: React.FC<ForecastHistoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  userId,
  month,
  projectName,
  userName
}) => {
  const { getForecastHistory, t } = useApp();
  const [historyItems, setHistoryItems] = useState<ForecastAuditHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getForecastHistory(projectId, userId, month)
        .then(items => setHistoryItems(items))
        .catch(err => console.error('Failed to load forecast history:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, projectId, userId, month]);

  if (!isOpen) return null;

  const getReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'SCOPE_CHANGE':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.scopeChange}</span>;
      case 'STAFFING_CHANGE':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.staffingChange}</span>;
      case 'DELAY':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.delay}</span>;
      case 'CLIENT_REQUEST':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.clientRequest}</span>;
      case 'BUDGET_ADJUSTMENT':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.budgetAdjustment}</span>;
      case 'INITIAL_PLANNING':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.initialPlanning}</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{reason || t.initialPlanning}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {t.versionHistory}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {projectName ? `${t.project}: ${projectName}` : ''} 
              {userName ? ` • ${t.employee}: ${userName}` : ''}
              {month ? ` • ${t.month}: ${month}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {t.loading}
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                {t.noData}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item, idx) => {
                const dateStr = new Date(item.timestamp).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                          v{item.version}
                        </span>
                        {getReasonBadge(item.changeReason)}
                        <span className="text-slate-500 font-medium flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{item.userName || item.actorId}</span>
                      </div>
                    </div>

                    {/* Change Note */}
                    {item.changeNote && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 italic flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>"{item.changeNote}"</span>
                      </div>
                    )}

                    {/* Numeric details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">{t.plannedHours}</div>
                        <div className="font-bold text-slate-900">{item.plannedHours}h</div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">{t.project} / {t.month}</div>
                        <div className="font-medium text-slate-700 truncate">{item.month}</div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">{t.plannedRevenue}</div>
                        <div className="font-bold text-emerald-700">
                          {item.plannedRevenue?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '—'}
                        </div>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-slate-100">
                        <div className="text-slate-400 text-[10px] uppercase font-semibold">{t.plannedCost}</div>
                        <div className="font-medium text-slate-600">
                          {item.plannedCost?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
