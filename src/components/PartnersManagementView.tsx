import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Partner } from '../types';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Archive,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Users,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building,
  Briefcase
} from 'lucide-react';

interface PartnersManagementViewProps {
  onSelectPartnerForEmployee?: (partnerId: string) => void;
}

export const PartnersManagementView: React.FC<PartnersManagementViewProps> = () => {
  const {
    t,
    partners,
    users,
    createPartner,
    updatePartner,
    archivePartner,
    deletePartner,
    formatRate
  } = useApp();

  // Search & Filter state
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(partners[0]?.id || null);

  // Add / Edit Modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const [formName, setFormName] = useState('');
  const [formPartnerNumber, setFormPartnerNumber] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formBillingEmail, setFormBillingEmail] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('Deutschland');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formDefaultHourlyRate, setFormDefaultHourlyRate] = useState('110.00');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Delete Modal state
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered partners
  const filteredPartners = partners.filter(p => {
    const q = partnerSearch.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.partnerNumber && p.partnerNumber.toLowerCase().includes(q)) ||
      (p.contactPerson && p.contactPerson.toLowerCase().includes(q)) ||
      (p.contactEmail && p.contactEmail.toLowerCase().includes(q)) ||
      (p.billingEmail && p.billingEmail.toLowerCase().includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.taxId && p.taxId.toLowerCase().includes(q));

    const matchesStatus =
      partnerStatusFilter === 'ALL' ||
      (p.status || 'ACTIVE') === partnerStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedPartner = partners.find(p => p.id === selectedPartnerId) || filteredPartners[0] || null;

  // Open modal for new partner
  const handleOpenCreatePartner = () => {
    setEditingPartner(null);
    setFormName('');
    setFormPartnerNumber(`PART-${String(partners.length + 1).padStart(3, '0')}`);
    setFormContactPerson('');
    setFormContactPhone('');
    setFormContactEmail('');
    setFormBillingEmail('');
    setFormStreet('');
    setFormZip('');
    setFormCity('');
    setFormCountry('Deutschland');
    setFormPhone('');
    setFormWebsite('');
    setFormTaxId('');
    setFormDefaultHourlyRate('110.00');
    setFormNotes('');
    setFormStatus('ACTIVE');
    setShowPartnerModal(true);
  };

  // Open modal for editing partner
  const handleOpenEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setFormName(p.name);
    setFormPartnerNumber(p.partnerNumber || '');
    setFormContactPerson(p.contactPerson || '');
    setFormContactPhone(p.contactPhone || '');
    setFormContactEmail(p.contactEmail || '');
    setFormBillingEmail(p.billingEmail || '');
    setFormStreet(p.street || '');
    setFormZip(p.zip || '');
    setFormCity(p.city || '');
    setFormCountry(p.country || 'Deutschland');
    setFormPhone(p.phone || '');
    setFormWebsite(p.website || '');
    setFormTaxId(p.taxId || '');
    setFormDefaultHourlyRate(p.defaultHourlyRate !== undefined ? String(p.defaultHourlyRate) : '');
    setFormNotes(p.notes || '');
    setFormStatus(p.status || 'ACTIVE');
    setShowPartnerModal(true);
  };

  // Save Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const rateNum = formDefaultHourlyRate ? parseFloat(formDefaultHourlyRate) : undefined;

    if (editingPartner) {
      await updatePartner(editingPartner.id, {
        name: formName.trim(),
        partnerNumber: formPartnerNumber.trim() || undefined,
        contactPerson: formContactPerson.trim() || undefined,
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        billingEmail: formBillingEmail.trim() || undefined,
        street: formStreet.trim() || undefined,
        zip: formZip.trim() || undefined,
        city: formCity.trim() || undefined,
        country: formCountry.trim() || 'Deutschland',
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        taxId: formTaxId.trim() || undefined,
        defaultHourlyRate: rateNum,
        notes: formNotes.trim() || undefined,
        status: formStatus
      });
    } else {
      const created = await createPartner({
        name: formName.trim(),
        partnerNumber: formPartnerNumber.trim() || `PART-${String(partners.length + 1).padStart(3, '0')}`,
        contactPerson: formContactPerson.trim() || undefined,
        contactPhone: formContactPhone.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        billingEmail: formBillingEmail.trim() || undefined,
        street: formStreet.trim() || undefined,
        zip: formZip.trim() || undefined,
        city: formCity.trim() || undefined,
        country: formCountry.trim() || 'Deutschland',
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        taxId: formTaxId.trim() || undefined,
        defaultHourlyRate: rateNum,
        notes: formNotes.trim() || undefined,
        status: formStatus
      });
      setSelectedPartnerId(created.id);
    }

    setShowPartnerModal(false);
  };

  // Toggle Archive
  const handleToggleArchive = async (partnerId: string) => {
    await archivePartner(partnerId);
  };

  // Delete Partner
  const handleConfirmDeletePartner = async () => {
    if (!partnerToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deletePartner(partnerToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setPartnerToDelete(null);
      if (selectedPartnerId === partnerToDelete.id) {
        setSelectedPartnerId(null);
      }
    } else {
      setDeleteError(res.error || 'Partner konnte nicht gelöscht werden.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Partner & Externe Dienstleister</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Partner-Stammdaten inkl. Ansprechpartner, Adresse, Kontaktdaten und Rechnungs-E-Mail erfassen, bearbeiten und archivieren.
          </p>
        </div>

        <button
          id="btn-add-new-partner"
          type="button"
          onClick={handleOpenCreatePartner}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Neuen Partner anlegen</span>
        </button>
      </div>

      {/* Main Grid: Partner List on Left, Detail Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Partner List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Controls: Search and Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="partner-search-input"
                type="text"
                value={partnerSearch}
                onChange={e => setPartnerSearch(e.target.value)}
                placeholder="Partner, Ansprechpartner, Ort, E-Mail..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center gap-1 text-[11px] shrink-0 bg-white border border-slate-200 rounded-xl p-0.5">
              {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPartnerStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                    partnerStatusFilter === st
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'Alle' : st === 'ACTIVE' ? 'Aktiv' : 'Archiviert'}
                </button>
              ))}
            </div>
          </div>

          {/* List Cards */}
          <div className="space-y-2.5">
            {filteredPartners.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="font-semibold text-slate-600">Keine Partner gefunden</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {partnerSearch ? 'Passen Sie Ihren Suchbegriff an.' : 'Legen Sie Ihren ersten Partner an.'}
                </p>
              </div>
            ) : (
              filteredPartners.map(p => {
                const isSelected = selectedPartner?.id === p.id;
                const assignedUsers = users.filter(u => u.partnerId === p.id);
                const isArchived = p.status === 'ARCHIVED';

                return (
                  <div
                    key={p.id}
                    id={`partner-card-${p.id}`}
                    onClick={() => setSelectedPartnerId(p.id)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-slate-900 shadow-md ring-1 ring-slate-900'
                        : isArchived
                        ? 'border-slate-200/60 opacity-75 hover:border-slate-300'
                        : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{p.name}</span>
                          {p.partnerNumber && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {p.partnerNumber}
                            </span>
                          )}
                          {isArchived ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              Archiviert
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                              Aktiv
                            </span>
                          )}
                        </div>

                        {p.contactPerson && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <span className="text-slate-400">AP:</span>
                            <span className="font-medium">{p.contactPerson}</span>
                            {p.contactEmail && <span className="text-slate-400">({p.contactEmail})</span>}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                          {p.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {p.zip ? `${p.zip} ` : ''}{p.city}
                            </span>
                          )}
                          {p.billingEmail && (
                            <span className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {p.billingEmail}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        {p.defaultHourlyRate !== undefined && (
                          <div className="text-xs font-bold text-slate-900 font-mono">
                            {formatRate(p.defaultHourlyRate)}
                          </div>
                        )}
                        <div className="text-[10px] font-medium text-slate-500 flex items-center justify-end gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{assignedUsers.length} MA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Partner Detail View */}
        <div className="lg:col-span-7">
          {selectedPartner ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
              {/* Partner Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">{selectedPartner.name}</h3>
                    {selectedPartner.partnerNumber && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {selectedPartner.partnerNumber}
                      </span>
                    )}
                    {selectedPartner.status === 'ARCHIVED' ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        Archiviert
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Partner angelegt am {new Date(selectedPartner.createdAt).toLocaleDateString('de-DE')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="btn-edit-partner"
                    type="button"
                    onClick={() => handleOpenEditPartner(selectedPartner)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bearbeiten</span>
                  </button>
                  <button
                    id="btn-archive-partner"
                    type="button"
                    onClick={() => handleToggleArchive(selectedPartner.id)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      selectedPartner.status === 'ARCHIVED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{selectedPartner.status === 'ARCHIVED' ? 'Reaktivieren' : 'Archivieren'}</span>
                  </button>
                  <button
                    id="btn-delete-partner"
                    type="button"
                    onClick={() => {
                      setPartnerToDelete(selectedPartner);
                      setDeleteError(null);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Löschen</span>
                  </button>
                </div>
              </div>

              {/* Data Blocks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Contact Person Block */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Ansprechpartner</span>
                  </div>
                  <div className="space-y-1.5 pl-0.5 text-slate-600">
                    <div className="font-medium text-slate-900 text-xs">
                      {selectedPartner.contactPerson || <span className="text-slate-400 italic">Nicht angegeben</span>}
                    </div>
                    {selectedPartner.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <a href={`mailto:${selectedPartner.contactEmail}`} className="text-emerald-700 hover:underline">
                          {selectedPartner.contactEmail}
                        </a>
                      </div>
                    )}
                    {selectedPartner.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedPartner.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing / Invoice Data Block */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Rechnungs- & Steuerdaten</span>
                  </div>
                  <div className="space-y-1.5 pl-0.5 text-slate-600">
                    <div>
                      <span className="text-slate-400">Rechnungs-E-Mail:</span>{' '}
                      {selectedPartner.billingEmail ? (
                        <a href={`mailto:${selectedPartner.billingEmail}`} className="font-mono text-emerald-700 font-medium hover:underline">
                          {selectedPartner.billingEmail}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Keine gesonderte E-Mail</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400">Steuernummer / USt-ID:</span>{' '}
                      <span className="font-mono text-slate-800 font-medium">
                        {selectedPartner.taxId || <span className="text-slate-400 italic">Nicht angegeben</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Standard-Stundensatz:</span>{' '}
                      <span className="font-mono text-slate-900 font-bold">
                        {selectedPartner.defaultHourlyRate !== undefined ? formatRate(selectedPartner.defaultHourlyRate) : <span className="text-slate-400 italic">Kein Standard</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Block */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Anschrift / Unternehmenssitz</span>
                  </div>
                  <div className="space-y-1 pl-0.5 text-slate-600">
                    <div className="font-medium text-slate-900">
                      {selectedPartner.street || <span className="text-slate-400 italic">Straße nicht angegeben</span>}
                    </div>
                    <div>
                      {(selectedPartner.zip || selectedPartner.city) ? (
                        `${selectedPartner.zip || ''} ${selectedPartner.city || ''}`
                      ) : (
                        <span className="text-slate-400 italic">Ort nicht angegeben</span>
                      )}
                    </div>
                    <div className="text-slate-500 font-medium">{selectedPartner.country || 'Deutschland'}</div>
                  </div>
                </div>

                {/* General Contact & Online Block */}
                <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Zentrale Kontaktdaten</span>
                  </div>
                  <div className="space-y-1.5 pl-0.5 text-slate-600">
                    {selectedPartner.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Zentrale: {selectedPartner.phone}</span>
                      </div>
                    )}
                    {selectedPartner.website && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={selectedPartner.website.startsWith('http') ? selectedPartner.website : `https://${selectedPartner.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline truncate"
                        >
                          {selectedPartner.website}
                        </a>
                      </div>
                    )}
                    {selectedPartner.notes && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                        <span className="font-semibold text-slate-600">Notizen: </span>
                        {selectedPartner.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned External Employees List */}
              <div className="pt-2 border-t border-slate-100">
                {(() => {
                  const assignedUsers = users.filter(u => u.partnerId === selectedPartner.id);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>Zugeordnete externe Mitarbeiter ({assignedUsers.length})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Mitarbeiter dieses Partners können in der Mitarbeiter-Verwaltung zugewiesen werden.
                        </span>
                      </div>

                      {assignedUsers.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                          Diesem Partner sind aktuell noch keine externen Mitarbeiter zugewiesen.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {assignedUsers.map(u => (
                            <div
                              key={u.id}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="font-semibold text-xs text-slate-900 truncate">{u.name}</div>
                                <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                                <div className="text-[10px] text-slate-400">
                                  {u.role === 'PROJECT_MANAGER' ? 'Projektleitung' : 'Mitarbeiter'}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono font-bold text-slate-900">
                                  {u.individualCostRate !== undefined ? formatRate(u.individualCostRate) : <span className="text-slate-400 text-[10px]">-</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">Kostensatz</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1" />
              <p className="font-semibold text-slate-700 text-sm">Kein Partner ausgewählt</p>
              <p className="text-xs text-slate-400 mt-1">
                Wählen Sie einen Partner aus der Liste aus oder legen Sie einen neuen an.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PARTNER */}
      {/* ========================================================================= */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>{editingPartner ? 'Partner bearbeiten' : 'Neuen Partner anlegen'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPartnerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 py-0.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              {/* Basic Company Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Partnername / Firmenname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z. B. ACME IT Solutions GmbH"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Partnernummer</label>
                  <input
                    type="text"
                    placeholder="z. B. PART-001"
                    value={formPartnerNumber}
                    onChange={e => setFormPartnerNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Ansprechpartner Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ansprechpartner</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Name des Ansprechpartners</label>
                    <input
                      type="text"
                      placeholder="z. B. Max Mustermann"
                      value={formContactPerson}
                      onChange={e => setFormContactPerson(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Telefon (Direkt)</label>
                    <input
                      type="tel"
                      placeholder="+49 170 1234567"
                      value={formContactPhone}
                      onChange={e => setFormContactPhone(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">E-Mail (Direkt)</label>
                    <input
                      type="email"
                      placeholder="m.mustermann@partner.de"
                      value={formContactEmail}
                      onChange={e => setFormContactEmail(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Invoicing & Billing Email Section */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Rechnungsstellung & Abrechnung</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Rechnungsemailadresse *
                    </label>
                    <input
                      type="email"
                      placeholder="rechnung@partner.de"
                      value={formBillingEmail}
                      onChange={e => setFormBillingEmail(e.target.value)}
                      className="w-full border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Steuernummer / USt-IdNr.
                    </label>
                    <input
                      type="text"
                      placeholder="DE 123456789"
                      value={formTaxId}
                      onChange={e => setFormTaxId(e.target.value)}
                      className="w-full border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-700 block mb-1">
                      Standard-Stundensatz (€/Std.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="110.00"
                      value={formDefaultHourlyRate}
                      onChange={e => setFormDefaultHourlyRate(e.target.value)}
                      className="w-full border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Adresse / Unternehmenssitz</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Straße & Hausnummer</label>
                    <input
                      type="text"
                      placeholder="Musterstraße 42"
                      value={formStreet}
                      onChange={e => setFormStreet(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">PLZ</label>
                    <input
                      type="text"
                      placeholder="10115"
                      value={formZip}
                      onChange={e => setFormZip(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Stadt / Ort</label>
                    <input
                      type="text"
                      placeholder="Berlin"
                      value={formCity}
                      onChange={e => setFormCity(e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Land</label>
                  <input
                    type="text"
                    placeholder="Deutschland"
                    value={formCountry}
                    onChange={e => setFormCountry(e.target.value)}
                    className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* General Contact & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Zentrale Telefonnummer</label>
                  <input
                    type="tel"
                    placeholder="+49 30 123456"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Webseite</label>
                  <input
                    type="text"
                    placeholder="www.partner.de"
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value="ACTIVE">Aktiv</option>
                    <option value="ARCHIVED">Archiviert</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notizen / Rahmenvereinbarung</label>
                <textarea
                  rows={2}
                  placeholder="Konditionen, Ansprechpartner-Vertretung, Zahlungsziele..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-partner"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  {editingPartner ? 'Partner speichern' : 'Partner anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PARTNER CONFIRMATION */}
      {/* ========================================================================= */}
      {partnerToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const assignedUsers = users.filter(u => u.partnerId === partnerToDelete.id);
              const hasUsers = assignedUsers.length > 0;

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${hasUsers ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                      {hasUsers ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {hasUsers ? 'Partner kann nicht gelöscht werden' : 'Partner wirklich löschen?'}
                      </h3>
                      <div className="text-xs text-slate-500">{partnerToDelete.name}</div>
                    </div>
                  </div>

                  {hasUsers ? (
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                        Diesem Partner sind aktuell noch <strong>{assignedUsers.length} externe Mitarbeiter</strong> zugeordnet ({assignedUsers.map(u => u.name).join(', ')}).
                      </div>
                      <p>
                        Um die Datenkonsistenz zu gewährleisten, weisen Sie diese Mitarbeiter bitte zuerst einem anderen Partner zu oder <strong>archivieren</strong> Sie den Partner stattdessen.
                      </p>

                      {deleteError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPartnerToDelete(null)}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Schließen
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await archivePartner(partnerToDelete.id);
                            setPartnerToDelete(null);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Partner archivieren</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600">
                      <p>
                        Möchten Sie den Partner <strong>"{partnerToDelete.name}"</strong> wirklich unwiderruflich löschen?
                      </p>
                      <p className="text-slate-500">
                        Dem Partner sind keine Mitarbeiter zugeordnet. Der Datensatz wird vollständig entfernt.
                      </p>

                      {deleteError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                          {deleteError}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPartnerToDelete(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleConfirmDeletePartner}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isDeleting ? 'Wird gelöscht...' : 'Partner löschen'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
