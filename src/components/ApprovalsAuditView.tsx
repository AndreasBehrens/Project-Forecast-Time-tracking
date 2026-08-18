import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  XCircle,
  History,
  ShieldCheck,
  Filter,
  AlertCircle,
  FileText,
  UserCheck,
  Check,
  X
} from 'lucide-react';

export const ApprovalsAuditView: React.FC = () => {
  const {
    t,
    timeEntries,
    auditLogs,
    projects,
    approveTimeEntries,
    currentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'approvals' | 'audit'>('approvals');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';
  const isPM = currentUser?.role === 'PROJECT_MANAGER';

  // Projects available to user for approvals
  const availableProjects = projects.filter(p => {
    if (isAdmin) return true;
    if (isPM && currentUser) {
      return p.projectManagerId === currentUser.id || p.managerUserIds?.includes(currentUser.id);
    }
    return false;
  });

  const availableProjectIds = availableProjects.map(p => p.id);

  // Filter pending approvals
  const filteredEntries = timeEntries.filter(entry => {
    if (!isAdmin && isPM && !availableProjectIds.includes(entry.projectId)) return false;
    if (filterProjectId !== 'all' && entry.projectId !== filterProjectId) return false;
    if (filterStatus !== 'all' && entry.approvalStatus !== filterStatus) return false;
    return true;
  });

  const handleApprove = async (id: string) => {
    await approveTimeEntries([id], 'APPROVED');
  };

  const handleReject = async (id: string) => {
    await approveTimeEntries([id], 'REJECTED');
  };

  const handleApproveAllFiltered = async () => {
    const ids = filteredEntries.map(e => e.id);
    if (ids.length > 0) {
      await approveTimeEntries(ids, 'APPROVED');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              {t.approvalsTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.approvalsSubtitle}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              id="tab-approvals"
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.pendingApprovals} ({timeEntries.filter(e => e.approvalStatus === 'SUBMITTED').length})
            </button>
            <button
              id="tab-audit"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 inline mr-1" />
              {t.auditLog} ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* Filters for approvals */}
        {activeTab === 'approvals' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">{t.project}:</span>
              <select
                id="filter-approval-project"
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              >
                <option value="all">{isPM && !isAdmin ? t.allMyProjects : t.allProjects} ({availableProjects.length})</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <span className="font-semibold text-slate-600 ml-2">{t.status}:</span>
              <select
                id="filter-approval-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
              >
                <option value="all">{t.allStatuses}</option>
                <option value="SUBMITTED">{t.statusSubmitted}</option>
                <option value="DRAFT">{t.statusDraft}</option>
                <option value="APPROVED">{t.statusApproved}</option>
                <option value="REJECTED">{t.statusRejected}</option>
              </select>
            </div>

            {filteredEntries.length > 0 && (
              <button
                id="btn-approve-all"
                onClick={handleApproveAllFiltered}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {t.approveAllEntries.replace('{count}', String(filteredEntries.length))}
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- APPROVALS QUEUE TAB --- */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 stroke-1" />
              <p className="text-sm font-medium">{t.noPendingApprovalsInView}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{entry.description}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        entry.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        entry.approvalStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {entry.approvalStatus}
                      </span>
                      {entry.isCorrectedAfterApproval && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {t.correctedAfterApproval}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800">{entry.userName}</span>
                      <span>•</span>
                      <span>{entry.projectName} ({entry.clientName})</span>
                      <span>•</span>
                      <span>📅 {entry.date}</span>
                      {entry.taskName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">{entry.taskName}</span>
                        </>
                      )}
                    </div>
                    {entry.correctionNote && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200/70 inline-block mt-1">
                        ℹ️ {entry.correctionNote}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">{entry.durationHoursDecimal.toFixed(2)}h</div>
                      <div className="text-xs text-emerald-700 font-medium">
                        {entry.calculatedAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-approve-${entry.id}`}
                        onClick={() => handleApprove(entry.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        title={t.approve}
                      >
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.approve}</span>
                      </button>
                      <button
                        id={`btn-reject-${entry.id}`}
                        onClick={() => handleReject(entry.id)}
                        className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        title={t.reject}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- AUDIT LOG TAB (Section 8 & 15: Revisionssichere Historisierung bis 10 Jahre) --- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="font-semibold text-slate-800">
              {t.auditLoggedChanges} ({auditLogs.length} {t.events})
            </div>
            <div className="text-[11px] text-slate-500">
              {t.retentionPeriodNotice}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-3">{t.timestamp}</th>
                  <th className="px-4 py-3">{t.objectEntity}</th>
                  <th className="px-4 py-3">{t.action}</th>
                  <th className="px-4 py-3">{t.changedBy}</th>
                  <th className="px-4 py-3">{t.changeDetails}</th>
                  <th className="px-4 py-3">{t.correctionReason}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        log.action === 'CORRECT_AFTER_APPROVAL' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        log.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{log.userName}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {log.changes.map((c, i) => (
                          <div key={i} className="text-[11px] font-mono">
                            <strong className="text-slate-600">{c.field}:</strong>{' '}
                            <span className="line-through text-rose-500">{JSON.stringify(c.oldValue)}</span>{' '}
                            &rarr; <span className="text-emerald-600 font-semibold">{JSON.stringify(c.newValue)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
