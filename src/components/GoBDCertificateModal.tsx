import React, { useState } from 'react';
import { GoBDComplianceCertificate } from '../types';
import {
  ShieldCheck,
  Download,
  Printer,
  X,
  FileCheck2,
  Calendar,
  Lock,
  Building2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';

interface GoBDCertificateModalProps {
  certificate: GoBDComplianceCertificate | null;
  onClose: () => void;
}

export const GoBDCertificateModal: React.FC<GoBDCertificateModalProps> = ({ certificate, onClose }) => {
  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certificate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GoBD_Compliance_Zertifikat_${certificate.periodKey}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                GoBD & ArbZG Revisionssicherheits-Zertifikat
              </h3>
              <p className="text-xs text-slate-400">
                Dokumenten-ID: {certificate.id} • Periode: {certificate.periodKey}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="JSON Export"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Drucken / PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 space-y-6 text-slate-800 text-xs">
          
          {/* Certificate Badge */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 flex items-start gap-4">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                Gesetzliche Konformitätsbescheinigung
                <span className="bg-emerald-200 text-emerald-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  STATUS: {certificate.complianceStatus}
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Hiermit wird bescheinigt, dass alle Zeiterfassungsdaten, Arbeitszeiten und Audit-Protokolle der Periode <strong>{certificate.periodKey}</strong> den Grundsätzen zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form (GoBD) sowie dem Arbeitszeitgesetz (ArbZG) entsprechen.
              </p>
            </div>
          </div>

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Organisation / Mandant</span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate">{certificate.organizationName}</p>
              <p className="text-[10px] text-slate-500 font-mono">{certificate.organizationId}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Abrechnungsperiode</span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{certificate.periodKey}</p>
              <p className="text-[10px] text-slate-500">Monatsabschluss</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gesamte Zeiteinträge</span>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{certificate.metrics.totalEntries} Buchungen</p>
              <p className="text-[10px] text-slate-500">{certificate.metrics.totalHoursDecimal.toFixed(2)} Arbeitsstunden</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Abrechnungsvolumen</span>
              <p className="font-semibold text-emerald-700 text-sm mt-0.5">
                {certificate.metrics.totalBillingAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-[10px] text-slate-500">
                Kosten: {certificate.metrics.totalCostAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>

          {/* Audit Chain & Cryptographic Seal */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              Kryptografische Prüfsummen & Verkettung (SHA-256)
            </h4>
            <div className="bg-slate-900 text-slate-300 p-3.5 rounded-xl font-mono text-[11px] space-y-2 select-all">
              <div>
                <span className="text-slate-500 block text-[10px]">DIGITALER PERIODEN-HASH (SNAPSHOT SEAL):</span>
                <span className="text-emerald-400 break-all">{certificate.periodLockSnapshotHash}</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[10px]">VERIFIZIERTE AUDIT-CHAIN PRÜFSUMME (TOP HASH):</span>
                <span className="text-indigo-400 break-all">{certificate.auditLogChainHash}</span>
              </div>
            </div>
          </div>

          {/* ArbZG & Legal Checks */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Arbeitszeitgesetzliche Prüfung (ArbZG §3 & §4)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                {certificate.arbzgCompliance.maxDailyHoursViolations === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-800 block">Tägliche Höchstarbeitszeit (§3 ArbZG)</span>
                  <span className="text-slate-500 text-[11px]">
                    {certificate.arbzgCompliance.maxDailyHoursViolations === 0
                      ? 'Keine Überschreitungen über 10 Stunden festgestellt.'
                      : `${certificate.arbzgCompliance.maxDailyHoursViolations} Überschreitungen (>10h) protokolliert.`}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                {certificate.arbzgCompliance.missingBreakViolations === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-slate-800 block">Ruhepausenvorschrift (§4 ArbZG)</span>
                  <span className="text-slate-500 text-[11px]">
                    {certificate.arbzgCompliance.missingBreakViolations === 0
                      ? 'Alle Schichten > 6h weisen die vorgeschriebene 30-minütige Ruhepause auf.'
                      : `${certificate.arbzgCompliance.missingBreakViolations} Schichten ohne Ruhepause protokolliert.`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Certification Footer */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1">
              <div>
                <strong>Ausgestellt durch:</strong> {certificate.issuedBy}
              </div>
              <div>
                <strong>Ausstellungszeitpunkt:</strong> {new Date(certificate.issuedAt).toLocaleString('de-DE')}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Dieses Zertifikat wurde automatisiert durch das GoBD-Prüfmodul der Zeiterfassungsplattform erstellt. Es dient als revisionssicherer Nachweis für Wirtschaftsprüfer, Betriebsprüfungen durch das Finanzamt (§146 AO, §147 AO) und die Deutsche Rentenversicherung (DRV).
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Aufbewahrungsfrist: 10 Jahre nach § 147 Abs. 3 AO
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs transition-colors"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
