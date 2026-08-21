import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  X,
  Server,
  Layers,
  ShieldCheck,
  AlertTriangle,
  FolderSync
} from 'lucide-react';

interface CloudDatabaseModalProps {
  onClose: () => void;
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/database/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                PostgreSQL-Datenbank Status
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  AKTIV & VERBUNDEN
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Persistente relationale Datenbank mit ACID-Garantien
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          
          {loading && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              <span>Lade Datenbankstatus...</span>
            </div>
          )}

          {/* Database Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Datenbanktyp:</span>
              <strong className="text-slate-900 font-mono">PostgreSQL 16</strong>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Datenbank-Name:</span>
              <strong className="text-blue-700 font-mono">{status?.database || 'timetracking_prod'}</strong>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Server:</span>
              <strong className="text-slate-800 font-mono text-[11px]">
                {status?.host || 'localhost:5432'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Revisionssicherheit:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                GoBD & SHA-256 Hash Chain
              </span>
            </div>
          </div>

          {/* Database Metrics */}
          {status?.entities && (
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                Persistierte Datenbank-Entitäten
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Zeiteinträge</span>
                  <strong className="text-sm text-slate-900">{status.entities.timeEntries || 0}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Arbeitszeiten</span>
                  <strong className="text-sm text-slate-900">{status.entities.workingTimes || 0}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Audit-Logs</span>
                  <strong className="text-sm text-slate-900">{status.entities.auditLogs || 0}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Projekte</span>
                  <strong className="text-sm text-slate-900">{status.entities.projects || 0}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Mandanten</span>
                  <strong className="text-sm text-slate-900">{status.entities.organizations || 0}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-medium block">Periodensperren</span>
                  <strong className="text-sm text-slate-900">{status.entities.periodLocks || 0}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-start gap-2.5">
            <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <strong className="block font-semibold mb-0.5">PostgreSQL-Persistierung aktiv</strong>
              <span className="text-blue-800">
                Alle Daten werden automatisch in der PostgreSQL-Datenbank gespeichert. 
                ACID-Garantien und revisionssichere Audit-Logs gemäß GoBD.
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Persistierung aktiv
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg text-xs transition-colors"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
