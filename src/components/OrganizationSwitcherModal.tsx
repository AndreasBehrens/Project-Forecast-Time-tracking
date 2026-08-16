import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Check, Plus, Shield, Globe, MapPin, X, ArrowRight } from 'lucide-react';
import { GERMAN_STATES } from '../../server/holidays';

interface OrganizationSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationSwitcherModal: React.FC<OrganizationSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    organizations,
    activeOrgId,
    switchOrganization,
    createOrganization
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgState, setNewOrgState] = useState('DE-BE');
  const [newOrgBillingRate, setNewOrgBillingRate] = useState(140);
  const [newOrgCostRate, setNewOrgCostRate] = useState(70);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter organizations to which current user has access, or if ADMIN show all
  const userMemberships = currentUser?.memberships || [];
  const accessibleOrgs = organizations.filter(org => {
    if (currentUser?.role === 'ADMIN') return true;
    return org.id === currentUser?.orgId || userMemberships.some(m => m.orgId === org.id);
  });

  const handleSelectOrg = async (orgId: string) => {
    await switchOrganization(orgId);
    onClose();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedStateObj = GERMAN_STATES.find(s => s.code === newOrgState);
      const created = await createOrganization({
        name: newOrgName.trim(),
        code: newOrgCode.trim().toUpperCase() || undefined,
        stateLocation: newOrgState,
        locationCity: selectedStateObj?.name.split(' ')[0] || 'Berlin',
        defaultHourlyBillingRate: Number(newOrgBillingRate) || 130,
        defaultHourlyCostRate: Number(newOrgCostRate) || 65,
        defaultCurrency: 'EUR'
      });

      await switchOrganization(created.id);
      setIsCreating(false);
      setNewOrgName('');
      setNewOrgCode('');
      onClose();
    } catch (err) {
      console.error('Error creating organization:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Mandanten-Verwaltung & Wechsel</h3>
              <p className="text-xs text-slate-500">
                Wählen Sie Ihren aktiven Mandanten oder legen Sie einen neuen an. Daten sind strikt isoliert.
              </p>
            </div>
          </div>
          <button
            id="btn-close-org-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isCreating ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Verfügbare Mandanten ({accessibleOrgs.length})
                </span>
                {currentUser?.role === 'ADMIN' && (
                  <button
                    id="btn-open-create-org"
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Neuen Mandanten anlegen</span>
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {accessibleOrgs.map(org => {
                  const isActive = org.id === activeOrgId;
                  const membership = userMemberships.find(m => m.orgId === org.id);
                  const userRoleInOrg = membership?.role || (org.id === currentUser?.orgId ? currentUser?.role : 'EMPLOYEE');

                  return (
                    <div
                      key={org.id}
                      id={`org-card-${org.id}`}
                      onClick={() => handleSelectOrg(org.id)}
                      className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-white group-hover:shadow-xs'
                          }`}
                        >
                          {org.code ? org.code.substring(0, 3) : org.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-950">
                              {org.name}
                            </span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />
                                Aktiv
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {org.locationCity} ({org.stateLocation})
                            </span>
                            <span>•</span>
                            <span>Std-Satz: {org.defaultHourlyBillingRate} €/h</span>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              Ihre Rolle: {userRoleInOrg === 'ADMIN' ? 'Admin' : userRoleInOrg === 'PROJECT_MANAGER' ? 'Projektleitung' : 'Mitarbeiter'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {isActive ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 text-slate-400 group-hover:text-slate-600 transition-opacity">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Tenant Security Note */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600 mt-4">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Mandantenisolierung (Data-Silos):</span> Beim Wechsel
                  des Mandanten werden ausschließlich dessen Auftraggeber, Projekte, Mitarbeiterkontingente und
                  Zeiterfassungen geladen. Kein Datenübertrag zwischen Mandanten.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Neuen Mandanten anlegen</h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Zurück zur Auswahl
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name des Mandanten / Firmenname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. NovaTech Digital AG"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandanten-Kürzel (Code)
                  </label>
                  <input
                    type="text"
                    placeholder="z. B. NOV-MUC"
                    value={newOrgCode}
                    onChange={e => setNewOrgCode(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bundesland (Feiertage) *
                  </label>
                  <select
                    value={newOrgState}
                    onChange={e => setNewOrgState(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {GERMAN_STATES.map(s => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Verrechnungssatz (€/h)
                  </label>
                  <input
                    type="number"
                    value={newOrgBillingRate}
                    onChange={e => setNewOrgBillingRate(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Standard-Kostensatz (€/h)
                  </label>
                  <input
                    type="number"
                    value={newOrgCostRate}
                    onChange={e => setNewOrgCostRate(Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newOrgName.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Wird erstellt...' : 'Mandant erstellen & aktivieren'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
