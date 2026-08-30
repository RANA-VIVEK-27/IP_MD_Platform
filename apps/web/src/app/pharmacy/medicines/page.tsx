'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { PageHeader } from '../../../components/PageHeader';
import { IconAlertTriangle, IconPill, IconSearch } from '../../../components/Icons';
import type { PharmacyMedicine } from '../../../lib/types';

const inputStyle: React.CSSProperties = { height: '40px', fontSize: 'var(--text-sm)' };
const textareaStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', minHeight: '60px', resize: 'vertical' };

const EMPTY_FORM = {
  standard_identifier: '', name: '', generic_name: '', schedule: 'otc',
  manufacturer: '', dosage_form: '', strength: '', pack_size: '',
  description: '', side_effects: '', contraindications: '', storage_conditions: '', drug_interactions: '',
};

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Gel', 'Powder', 'Solution'];

export default function PharmacyMedicinesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPartner = user?.role === 'partner_pharmacy';
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (search) params.search = search;
      if (filterSchedule) params.schedule = filterSchedule;
      const res = await ApiClient.listPharmacyMedicines(params);
      setMedicines(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load medicines');
    } finally { setLoading(false); }
  }, [page, search, filterSchedule]);

  useEffect(() => { loadMedicines(); }, [loadMedicines]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if ((payload as any)[k] === '') (payload as any)[k] = null; });
      if (editingId) {
        await ApiClient.updatePharmacyMedicine(editingId, payload);
      } else {
        await ApiClient.createPharmacyMedicine(payload as any);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      loadMedicines();
    } catch (e: any) { alert(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await ApiClient.deletePharmacyMedicine(id); loadMedicines(); }
    catch (e: any) { alert(e.message || 'Failed to delete'); }
  };

  const startEdit = (med: PharmacyMedicine) => {
    setEditingId(med.medicine_id);
    setForm({
      standard_identifier: med.standard_identifier, name: med.name,
      generic_name: med.generic_name || '', schedule: med.schedule,
      manufacturer: med.manufacturer || '', dosage_form: med.dosage_form || '',
      strength: med.strength || '', pack_size: med.pack_size || '',
      description: med.description || '', side_effects: med.side_effects || '',
      contraindications: med.contraindications || '', storage_conditions: med.storage_conditions || '',
      drug_interactions: med.drug_interactions || '',
    });
    setShowForm(true);
    setExpandedId(null);
  };

  const setField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const fieldRow = (label: string, field: string, placeholder: string, type: 'input' | 'select' | 'textarea' = 'input', options?: string[]) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>{label}</label>
      {type === 'select' ? (
        <select className="input" style={inputStyle} value={(form as any)[field]} onChange={e => setField(field, e.target.value)}>
          <option value="">Select...</option>
          {options?.map(o => <option key={o} value={o.toLowerCase().replace(/\s/g, '_')}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="input" style={textareaStyle} placeholder={placeholder} value={(form as any)[field]} onChange={e => setField(field, e.target.value)} />
      ) : (
        <input className="input" style={inputStyle} placeholder={placeholder} value={(form as any)[field]} onChange={e => setField(field, e.target.value)} disabled={field === 'standard_identifier' && !!editingId} />
      )}
    </div>
  );

  const detailRow = (label: string, value?: string | null) => value ? (
    <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-1)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PageHeader title={isPartner ? 'My Stock' : 'Medicine Catalog'} subtitle={`${total} medicines`} />
        {!isPartner && (
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); }} className="btn btn-primary">
            + Add Medicine
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>{editingId ? 'Edit Medicine' : 'New Medicine'}</h3>

          {/* Basic Info */}
          <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Basic Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            {fieldRow('Standard ID *', 'standard_identifier', 'e.g. PARACETAMOL-500')}
            {fieldRow('Name *', 'name', 'e.g. Paracetamol 500mg Tablet')}
            {fieldRow('Generic Name', 'generic_name', 'e.g. Acetaminophen')}
            {fieldRow('Schedule', 'schedule', '', 'select', ['OTC', 'Schedule H', 'Schedule H1', 'Schedule X'])}
          </div>

          {/* Product Details */}
          <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Product Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            {fieldRow('Manufacturer', 'manufacturer', 'e.g. Cipla Ltd')}
            {fieldRow('Dosage Form', 'dosage_form', '', 'select', DOSAGE_FORMS)}
            {fieldRow('Strength', 'strength', 'e.g. 500mg, 10ml')}
            {fieldRow('Pack Size', 'pack_size', 'e.g. 10 tablets, 1 bottle')}
          </div>

          {/* Medical Info */}
          <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Medical Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            {fieldRow('Description / Indications', 'description', 'What this medicine is used for...', 'textarea')}
            {fieldRow('Side Effects', 'side_effects', 'Common side effects...', 'textarea')}
            {fieldRow('Contraindications', 'contraindications', 'When not to use...', 'textarea')}
            {fieldRow('Drug Interactions', 'drug_interactions', 'Known interactions...', 'textarea')}
          </div>

          {/* Storage */}
          <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Storage</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            {fieldRow('Storage Conditions', 'storage_conditions', 'e.g. Store below 25°C in a dry place, protect from light')}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button onClick={handleSave} disabled={saving || !form.standard_identifier || !form.name} className="btn btn-primary">
              {saving ? 'Saving...' : editingId ? 'Update Medicine' : 'Create Medicine'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: 1 }}>
          <IconSearch size={16} className="search-icon" />
          <input className="input" style={{ height: '36px', fontSize: 'var(--text-sm)' }} placeholder="Search medicines..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input" style={{ height: '36px', width: '160px', fontSize: 'var(--text-sm)' }} value={filterSchedule} onChange={e => { setFilterSchedule(e.target.value); setPage(1); }}>
          <option value="">All Schedules</option>
          <option value="otc">OTC</option>
          <option value="h">Schedule H</option>
          <option value="h1">Schedule H1</option>
          <option value="x">Schedule X</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadMedicines}>Retry</button>
        </div>
      ) : medicines.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconPill size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No medicines found.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {medicines.map(med => {
              const isExpanded = expandedId === med.medicine_id;
              return (
                <div key={med.medicine_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : med.medicine_id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3) var(--sp-4)', cursor: 'pointer', background: isExpanded ? 'var(--bg-secondary)' : 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: med.schedule === 'otc' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconPill size={16} style={{ color: med.schedule === 'otc' ? 'var(--success)' : 'var(--warning)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{med.name}</span>
                          <span className={`badge ${med.schedule === 'otc' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{med.schedule.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {med.generic_name || '—'} · {med.dosage_form || ''} {med.strength || ''} · {med.manufacturer || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Stock: <strong style={{ color: med.in_stock ? 'var(--success)' : 'var(--danger)' }}>{med.total_stock}</strong></span>
                      {!isPartner && (
                        <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
                          <button onClick={e => { e.stopPropagation(); startEdit(med); }} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}>Edit</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(med.medicine_id, med.name); }} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-light)', padding: 'var(--sp-3) var(--sp-4) var(--sp-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                      <div>
                        <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--sp-2)' }}>Product</h4>
                        {detailRow('Standard ID', med.standard_identifier)}
                        {detailRow('Generic', med.generic_name)}
                        {detailRow('Manufacturer', med.manufacturer)}
                        {detailRow('Form', med.dosage_form)}
                        {detailRow('Strength', med.strength)}
                        {detailRow('Pack Size', med.pack_size)}
                        {detailRow('Storage', med.storage_conditions)}
                      </div>
                      <div>
                        <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--sp-2)' }}>Medical</h4>
                        {detailRow('Description', med.description)}
                        {detailRow('Side Effects', med.side_effects)}
                        {detailRow('Contraindications', med.contraindications)}
                        {detailRow('Drug Interactions', med.drug_interactions)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={medicines.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
