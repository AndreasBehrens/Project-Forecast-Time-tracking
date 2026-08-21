import React, { useState } from 'react';
import { PeriodLock } from '../types';
import {
  Lock,
  Unlock,
  AlertTriangle,
  X,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Check
} from 'lucide-react';

interface PeriodLockModalProps {
  periodKey: string;
  existingLock?: PeriodLock;
  onLock: (periodKey: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  onUnlock: (periodKey: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export const PeriodLockModal: React.FC<PeriodLockModalProps> = ({
  periodKey,
  existingLock,
  onLock,
  onUnlock,
  onClose
}) => {
  const isLocked = existingLock?.isLocked ?? false;
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLocked && !reason.trim()) {
      setError('Für die Entsperrung einer GoBD-Periode ist eine Begründung gesetzlich vorgeschrieben (z. B. Korrekturantrag nach Rechnungsstorno).');
      return;
    }

    setLoading(true);
    try {
      if (isLocked) {
        const res = await onUnlock(periodKey, reason.trim());
        if (!res.success) {
          setError(res.error || 'Fehler beim Entsperren');
          setLoading(false);
          return;
        }
      } else {
        const res = await onLock(periodKey, reason.trim() || undefined);
        if (!res.success) {
          setError(res.error || 'Fehler beim Festschreiben');
          setLoading(false);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Aktion fehlgeschlagen');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between text-white ${
          isLocked ? 'bg-amber-600' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 text-emerald-400" />}
            <div>
              <h3 className="font-bold text-sm">
                {isLocked ? 'Periode revisionssicher entsperren' : 'Periode festschreiben (GoBD Lock)'}
              </h3>
              <p className="text-[11px] opacity-90">
                Abrechnungsmonat: <strong>{periodKey}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isLocked ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  Wichtiger Revisionssicherheits-Hinweis
                </div>
                <p className="text-[11px] leading-relaxed">
                  Die Entsperrung einer bereits festgeschriebenen Periode wird unumkehrbar im SHA-256 verifizierten GoBD-Audit-Log protokolliert.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Begründung für die Entsperrung <span className="text-rose-600">* (Pflichtfeld)</span>:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="z. B. Nachbuchung genehmigter Überstunden gemäß Vereinbarung vom..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Festschreibung & Unveränderbarkeit
                </div>
                <p className="text-[11px] leading-relaxed">
                  Nach dem Sperren können in der Periode <strong>{periodKey}</strong> keine Zeiteinträge oder Arbeitszeiten mehr erstellt, bearbeitet oder gelöscht werden. Es wird ein kryptografischer Snapshot erzeugt.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Abschlussnotiz (optional):
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="z. B. Monatsabschluss Finanzbuchhaltung durchgeführt"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                isLocked
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {loading ? 'Wird verarbeitet...' : isLocked ? 'Periode entsperren' : 'Periode jetzt festschreiben'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
