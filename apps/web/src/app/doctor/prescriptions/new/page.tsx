'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../../../lib/api';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import { useToast } from '../../../../components/Toast';
import {
  IconChevronLeft,
  IconPlus,
  IconTrash2,
  IconSend,
  IconClipboardMedical,
} from '../../../../components/Icons';

interface MedicineField {
  id: number;
  name: string;
  value: string;
}

export default function DoctorCreatePrescriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const patientId = searchParams.get('patient_id') || '';
  const reportId = searchParams.get('report_id') || '';

  const [medicines, setMedicines] = useState<MedicineField[]>([
    { id: 1, name: 'medicine_1_name', value: '' },
    { id: 2, name: 'medicine_1_dosage', value: '' },
    { id: 3, name: 'medicine_1_frequency', value: '' },
    { id: 4, name: 'medicine_1_duration', value: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextId, setNextId] = useState(5);

  const addMedicine = () => {
    const base = medicines.length / 4 + 1;
    const num = Math.floor(base);
    setMedicines(prev => [
      ...prev,
      { id: nextId, name: `medicine_${num}_name`, value: '' },
      { id: nextId + 1, name: `medicine_${num}_dosage`, value: '' },
      { id: nextId + 2, name: `medicine_${num}_frequency`, value: '' },
      { id: nextId + 3, name: `medicine_${num}_duration`, value: '' },
    ]);
    setNextId(prev => prev + 4);
  };

  const removeLastMedicine = () => {
    if (medicines.length <= 4) return;
    setMedicines(prev => prev.slice(0, -4));
  };

  const updateField = (id: number, value: string) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, value } : m));
  };

  const handleSubmit = async () => {
    if (!patientId) {
      addToast('error', 'Missing Patient', 'No patient ID provided.');
      return;
    }

    const filledMeds = medicines.filter(m => m.value.trim());
    if (filledMeds.length === 0) {
      addToast('error', 'No Medicines', 'Please add at least one medicine.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiClient.createDoctorPrescription({
        patient_id: patientId,
        medicines: filledMeds.map(m => ({ field_name: m.name, value: m.value })),
        report_id: reportId || undefined,
        notes: notes || undefined,
      });
      addToast('success', 'Prescription Created', `Prescription ${res.prescription_id.slice(0, 8)} created successfully.`);
      router.push(`/doctor/prescriptions/${res.prescription_id}`);
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  if (!patientId) {
    return (
      <div className="app-content">
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconClipboardMedical size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>No patient ID provided. Please start from a report.</p>
          <Link href="/doctor/reports" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }}>Back to Reports</Link>
        </div>
      </div>
    );
  }

  const medicineCount = medicines.length / 4;

  return (
    <div className="app-content" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-2)' }}>
          <IconChevronLeft size={16} /><span>Back</span>
        </button>
        <h1 className="text-h1">Create Prescription</h1>
        {reportId && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
            From Report #{reportId.slice(0, 8)}
          </div>
        )}
      </div>

      {/* Patient Info */}
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClipboardMedical size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Patient</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>ID: {patientId.slice(0, 12)}</div>
          </div>
        </div>
      </div>

      {/* Medicines */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Medicines ({medicineCount})</h3>
          <div className="flex gap-2">
            <button onClick={addMedicine} className="btn btn-secondary btn-sm">
              <IconPlus size={14} /> Add Medicine
            </button>
            {medicineCount > 1 && (
              <button onClick={removeLastMedicine} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
                <IconTrash2 size={14} /> Remove Last
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {Array.from({ length: medicineCount }, (_, medIndex) => {
            const baseIdx = medIndex * 4;
            const nameField = medicines[baseIdx];
            const dosageField = medicines[baseIdx + 1];
            const freqField = medicines[baseIdx + 2];
            const durField = medicines[baseIdx + 3];

            return (
              <div key={medIndex} style={{ padding: 'var(--sp-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--sp-3)', color: 'var(--primary)' }}>
                  Medicine {medIndex + 1}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Paracetamol 500mg"
                      value={nameField?.value || ''}
                      onChange={e => nameField && updateField(nameField.id, e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage</label>
                    <input
                      className="input"
                      placeholder="e.g. 1 tablet"
                      value={dosageField?.value || ''}
                      onChange={e => dosageField && updateField(dosageField.id, e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <input
                      className="input"
                      placeholder="e.g. Twice daily"
                      value={freqField?.value || ''}
                      onChange={e => freqField && updateField(freqField.id, e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <input
                      className="input"
                      placeholder="e.g. 7 days"
                      value={durField?.value || ''}
                      onChange={e => durField && updateField(durField.id, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--sp-3)' }}>Doctor Notes</h3>
        <textarea
          className="input"
          placeholder="Additional instructions for the patient (optional)"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
        <button onClick={() => router.back()} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
          <IconSend size={16} />
          {submitting ? 'Creating...' : 'Create Prescription'}
        </button>
      </div>
    </div>
  );
}
