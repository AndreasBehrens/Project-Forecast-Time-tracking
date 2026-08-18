import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GERMAN_STATES, getGermanHolidays, HolidayInfo } from '../utils/holidays';
import {
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Info
} from 'lucide-react';

interface CompanyLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanyLocationModal: React.FC<CompanyLocationModalProps> = ({ isOpen, onClose }) => {
  const { organization, updateOrganization, currentUser, t } = useApp();

  const [selectedState, setSelectedState] = useState<string>(organization?.stateLocation || 'DE-BE');
  const [cityInput, setCityInput] = useState<string>(organization?.locationCity || 'Berlin');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (organization) {
      setSelectedState(organization.stateLocation || 'DE-BE');
      setCityInput(organization.locationCity || 'Berlin');
    }
  }, [organization]);

  if (!isOpen) return null;

  const currentYear = 2026;
  const holidays = getGermanHolidays(currentYear, selectedState);
  const selectedStateObj = GERMAN_STATES.find(s => s.code === selectedState);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateOrganization({
        stateLocation: selectedState,
        locationCity: cityInput.trim() || selectedStateObj?.name || 'Berlin'
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to update company location:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.companyLocation}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.companyLocationDesc}
              </p>
            </div>
          </div>
          <button
            id="btn-close-location-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Info Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-700">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {t.companyLocationDesc}: <span className="font-bold text-slate-900">{organization?.locationCity || 'Berlin'}</span> ({organization?.stateLocation || 'DE-BE'}).
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.stateLocation}
              </label>
              <select
                id="select-company-state"
                value={selectedState}
                onChange={e => {
                  setSelectedState(e.target.value);
                  const st = GERMAN_STATES.find(s => s.code === e.target.value);
                  if (st) setCityInput(st.name);
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {GERMAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code}) {s.code === 'DE-BE' ? '★ HQ' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.city}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-company-city"
                  type="text"
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  placeholder="e.g. Berlin, München..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Holiday Preview for Selected State */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {t.stateHolidayCalendar} {currentYear} ({selectedStateObj?.name}):
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {holidays.length} {t.holidays}
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              {holidays.map((h, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[11px]">{h.date}</span>
                    <span className="font-medium text-slate-800">{h.name}</span>
                  </div>
                  {!h.isNationwide && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                      {selectedState}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              {currentUser?.role === 'ADMIN' ? 'Admin' : ''}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-cancel-location"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                id="btn-save-location"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {t.saved}
                  </>
                ) : isSaving ? (
                  t.saving
                ) : (
                  t.save
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
