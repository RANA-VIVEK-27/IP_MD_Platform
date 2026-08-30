'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { PageHeader } from '../../../components/PageHeader';
import { IconAlertTriangle, IconPackage, IconPlus, IconPill } from '../../../components/Icons';
import type { PharmacyStockItem, PharmacyMedicine } from '../../../lib/types';

const inputStyle: React.CSSProperties = { height: '40px', fontSize: 'var(--text-sm)' };
const textareaStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', minHeight: '56px', resize: 'vertical' };
const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Gel', 'Powder', 'Solution'];

const EMPTY_MED = {
  standard_identifier: '', name: '', generic_name: '', schedule: 'otc',
  manufacturer: '', dosage_form: '', strength: '', pack_size: '',
  description: '', side_effects: '', contraindications: '', storage_conditions: '', drug_interactions: '',
};

export default function PharmacyInventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPartner = user?.role === 'partner_pharmacy';
  const [stock, setStock] = useState<PharmacyStockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [filterLow, setFilterLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [form, setForm] = useState({ medicine_id: '', batch_number: '', expiry_date: '', quantity: 0, price: 0 });
  const [saving, setSaving] = useState(false);
  const [createNew, setCreateNew] = useState(false);
  const [medForm, setMedForm] = useState(EMPTY_MED);
  const [creatingMed, setCreatingMed] = useState(false);

  const loadStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (filterExpiring) params.expiring_soon = 'true';
      if (filterLow) params.low_stock = 'true';
      const res = await ApiClient.listPharmacyInventory(params);
      setStock(res.data);
      setTotal(res.total);
    } catch (e: any) {
      if (e.status === 401) { router.push('/login'); return; }
      setError(e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, filterExpiring, filterLow]);

  const loadMedicines = async () => {
    try {
      const res = await ApiClient.listPharmacyMedicines({ page_size: 100 });
      setMedicines(res.data);
    } catch {}
  };

  useEffect(() => { loadStock(); }, [loadStock]);
  useEffect(() => { loadMedicines(); }, []);

  const handleCreateMedicine = async () => {
    try {
      setCreatingMed(true);
      const payload: Record<string, any> = {};
      Object.entries(medForm).forEach(([k, v]) => { if (v) payload[k] = v; });
      const res = await ApiClient.createPharmacyMedicine(payload as any);
      await loadMedicines();
      setForm(prev => ({ ...prev, medicine_id: res.medicine_id }));
      setCreateNew(false);
      setMedForm(EMPTY_MED);
    } catch (e: any) {
      alert(e.message || 'Failed to create medicine');
    } finally {
      setCreatingMed(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingId) {
        await ApiClient.updatePharmacyStock(editingId, {
          batch_number: isPartner ? undefined : (form.batch_number || undefined),
          expiry_date: isPartner ? undefined : (form.expiry_date || undefined),
          quantity: form.quantity,
          price: form.price,
        });
      } else {
        await ApiClient.createPharmacyStock({
          medicine_id: form.medicine_id,
          quantity: form.quantity,
          price: form.price,
          ...(isPartner ? {} : { batch_number: form.batch_number, expiry_date: form.expiry_date }),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setCreateNew(false);
      setForm({ medicine_id: '', batch_number: '', expiry_date: '', quantity: 0, price: 0 });
      setMedForm(EMPTY_MED);
      loadStock();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stock entry?')) return;
    try {
      await ApiClient.deletePharmacyStock(id);
      loadStock();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  const startEdit = (item: PharmacyStockItem) => {
    setEditingId(item.stock_id);
    setCreateNew(false);
    setForm({
      medicine_id: item.medicine_id,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      quantity: item.quantity,
      price: item.price,
    });
    setShowForm(true);
  };

  const openNewForm = () => {
    setShowForm(true);
    setEditingId(null);
    setCreateNew(false);
    setForm({ medicine_id: '', batch_number: '', expiry_date: '', quantity: 0, price: 0 });
    setMedForm(EMPTY_MED);
  };

  const stockStatusLabel = (s: PharmacyStockItem) => {
    if (s.is_expired) return { text: 'EXPIRED', color: 'var(--danger)' };
    if (s.is_expiring_soon) return { text: 'EXPIRING', color: 'var(--warning)' };
    if (s.is_low_stock) return { text: 'LOW', color: 'var(--warning)' };
    return { text: 'OK', color: 'var(--success)' };
  };

  const setMedField = (field: string, value: string) => setMedForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PageHeader title={isPartner ? 'My Stock' : 'Inventory'} subtitle={`${total} ${isPartner ? 'stock entries in your catalog' : 'stock entries'}`} />
        {!isPartner && (
          <button onClick={openNewForm} className="btn btn-primary">+ Add Stock</button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>{editingId ? 'Edit Stock' : 'New Stock Entry'}</h3>

          {/* Medicine Selection */}
          <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <label className="form-label">Medicine *</label>
            {!createNew ? (
              <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                <select className="input" style={{ ...inputStyle, flex: 1 }} value={form.medicine_id} onChange={e => setForm({ ...form, medicine_id: e.target.value })} disabled={!!editingId}>
                  <option value="">Select Medicine</option>
                  {medicines.map(m => (
                    <option key={m.medicine_id} value={m.medicine_id}>
                      {m.name} {m.dosage_form ? `(${m.dosage_form}${m.strength ? ' ' + m.strength : ''})` : ''} — {m.manufacturer || 'Unknown'}
                    </option>
                  ))}
                </select>
                {!editingId && (
                  <button onClick={() => setCreateNew(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <IconPlus size={14} /> New
                  </button>
                )}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <IconPill size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Create New Medicine</span>
                  </div>
                  <button onClick={() => { setCreateNew(false); setMedForm(EMPTY_MED); }} className="btn btn-ghost btn-sm">Cancel</button>
                </div>

                {/* Basic Info */}
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Standard ID *</label>
                    <input className="input" style={inputStyle} placeholder="e.g. PARACETAMOL-500" value={medForm.standard_identifier} onChange={e => setMedField('standard_identifier', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Name *</label>
                    <input className="input" style={inputStyle} placeholder="e.g. Paracetamol 500mg Tablet" value={medForm.name} onChange={e => setMedField('name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Generic Name</label>
                    <input className="input" style={inputStyle} placeholder="e.g. Acetaminophen" value={medForm.generic_name} onChange={e => setMedField('generic_name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Schedule</label>
                    <select className="input" style={inputStyle} value={medForm.schedule} onChange={e => setMedField('schedule', e.target.value)}>
                      <option value="otc">OTC</option>
                      <option value="h">Schedule H</option>
                      <option value="h1">Schedule H1</option>
                      <option value="x">Schedule X</option>
                    </select>
                  </div>
                </div>

                {/* Product Details */}
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Product Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Manufacturer</label>
                    <input className="input" style={inputStyle} placeholder="e.g. Cipla Ltd" value={medForm.manufacturer} onChange={e => setMedField('manufacturer', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Dosage Form</label>
                    <select className="input" style={inputStyle} value={medForm.dosage_form} onChange={e => setMedField('dosage_form', e.target.value)}>
                      <option value="">Select...</option>
                      {DOSAGE_FORMS.map(f => <option key={f} value={f.toLowerCase().replace(/\s/g, '_')}>{f}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Strength</label>
                    <input className="input" style={inputStyle} placeholder="e.g. 500mg, 10ml" value={medForm.strength} onChange={e => setMedField('strength', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Pack Size</label>
                    <input className="input" style={inputStyle} placeholder="e.g. 10 tablets, 1 bottle" value={medForm.pack_size} onChange={e => setMedField('pack_size', e.target.value)} />
                  </div>
                </div>

                {/* Medical Info */}
                <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Medical Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Description / Indications</label>
                    <textarea className="input" style={textareaStyle} placeholder="What this medicine is used for..." value={medForm.description} onChange={e => setMedField('description', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Side Effects</label>
                    <textarea className="input" style={textareaStyle} placeholder="Common side effects..." value={medForm.side_effects} onChange={e => setMedField('side_effects', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Contraindications</label>
                    <textarea className="input" style={textareaStyle} placeholder="When not to use..." value={medForm.contraindications} onChange={e => setMedField('contraindications', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Drug Interactions</label>
                    <textarea className="input" style={textareaStyle} placeholder="Known interactions..." value={medForm.drug_interactions} onChange={e => setMedField('drug_interactions', e.target.value)} />
                  </div>
                </div>

                {/* Storage */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Storage Conditions</label>
                    <input className="input" style={inputStyle} placeholder="e.g. Store below 25°C in a dry place" value={medForm.storage_conditions} onChange={e => setMedField('storage_conditions', e.target.value)} />
                  </div>
                </div>

                <button onClick={handleCreateMedicine} disabled={creatingMed || !medForm.standard_identifier || !medForm.name} className="btn btn-primary btn-sm">
                  {creatingMed ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            )}
          </div>

          {/* Stock fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-3)' }}>
            {!isPartner && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Batch Number *</label>
                  <input className="input" style={inputStyle} placeholder="e.g. BATCH-001" value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expiry Date *</label>
                  <input className="input" style={inputStyle} type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantity *</label>
              <input className="input" style={inputStyle} type="number" placeholder="0" min="0" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Price (₹) *</label>
              <input className="input" style={inputStyle} type="number" placeholder="0.00" min="0" step="0.01" value={form.price || ''} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
            <button onClick={handleSave} disabled={saving || !form.medicine_id || (!isPartner && (!form.batch_number || !form.expiry_date))} className="btn btn-primary">
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setCreateNew(false); }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={filterExpiring} onChange={e => { setFilterExpiring(e.target.checked); setPage(1); }} style={{ accentColor: 'var(--primary)' }} />
          Expiring Soon
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
          <input type="checkbox" checked={filterLow} onChange={e => { setFilterLow(e.target.checked); setPage(1); }} style={{ accentColor: 'var(--primary)' }} />
          Low Stock
        </label>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadStock}>Retry</button>
        </div>
      ) : stock.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconPackage size={32} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-3)', opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No stock entries found.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table" role="table" aria-label="Inventory stock">
              <thead>
                <tr>
                  <th scope="col">Medicine</th>
                  <th scope="col">Batch</th>
                  <th scope="col">Expiry</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Qty</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Price</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Status</th>
                  <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(s => {
                  const label = stockStatusLabel(s);
                  return (
                    <tr key={s.stock_id}>
                      <td style={{ fontWeight: 600 }}>{s.medicine_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>{s.batch_number}</td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{s.expiry_date}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{s.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{s.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: label.color }}>{label.text}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => startEdit(s)} className="btn btn-ghost btn-sm" style={{ marginRight: 'var(--sp-1)' }}>Edit</button>
                        <button onClick={() => handleDelete(s.stock_id)} className="btn btn-danger btn-sm">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={stock.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
