'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient, ApiError } from '../../../lib/api';
import { IconUpload, IconFileText, IconSparkles, IconCheckCircle, IconAlertTriangle } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';

const STEPS = [
  { id: 'select', label: 'Select File' },
  { id: 'process', label: 'Processing' },
  { id: 'review', label: 'Complete' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 20 * 1024 * 1024;

type UploadMode = 'prescription' | 'report' | 'document';

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<UploadMode>('prescription');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError('');
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Invalid file type. Please upload JPG, PNG, or PDF.');
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }
    setFile(selected);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);
    setError('');
    setCurrentStep(1);
    setProgress(10);
    setStatusMsg('Uploading document to secure storage...');

    try {
      let uploadRes: { prescription_id?: string; report_id?: string; document_id?: string; status?: string };

      if (mode === 'prescription') {
        uploadRes = await ApiClient.uploadPrescription(file);
      } else if (mode === 'report') {
        uploadRes = await ApiClient.uploadReport(file);
      } else {
        uploadRes = await ApiClient.uploadDocument(file);
      }

      setProgress(40);
      setStatusMsg('Document uploaded. Processing...');

      const entityId = uploadRes.prescription_id || uploadRes.report_id || uploadRes.document_id;

      if (mode === 'document') {
        // For general documents, poll document status
        if (entityId) {
          let attempts = 0;
          const maxAttempts = 30;
          const pollInterval = 2000;

          const poll = async () => {
            attempts++;
            try {
              const status = await ApiClient.getDocumentStatus(entityId);
              const pct = Math.min(40 + (attempts / maxAttempts) * 55, 95);
              setProgress(pct);

              if (status.doc_status === 'ready') {
                setProgress(100);
                setCurrentStep(2);
                setStatusMsg('Document ready! Redirecting...');
                setTimeout(() => router.push('/patient/documents'), 1000);
                return;
              } else if (status.doc_status === 'infected' || status.doc_status === 'scan_failed') {
                setProgress(100);
                setCurrentStep(2);
                setStatusMsg('Document could not be processed. Please try again.');
                return;
              }

              setStatusMsg(`Status: ${status.doc_status}...`);
            } catch {
              // Keep polling — transient network errors are expected
            }

            if (attempts < maxAttempts) {
              setTimeout(poll, pollInterval);
            } else {
              setProgress(100);
              setCurrentStep(2);
              setStatusMsg('Processing taking longer than expected. Check your documents page.');
              setTimeout(() => router.push('/patient/documents'), 2000);
            }
          };

          setTimeout(poll, 2000);
        } else {
          setProgress(100);
          setCurrentStep(2);
          setStatusMsg('Upload complete! Redirecting...');
          setTimeout(() => router.push('/patient/documents'), 1000);
        }
      } else {
        // Prescription/report flow - poll extraction status
        if (!entityId) {
          setProgress(100);
          setStatusMsg('Upload complete. Redirecting...');
          setTimeout(() => router.push('/patient'), 1000);
          return;
        }

        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 2000;

        const poll = async () => {
          attempts++;
          try {
            if (mode === 'prescription') {
              const status = await ApiClient.getPrescriptionStatus(entityId);
              const pct = Math.min(40 + (attempts / maxAttempts) * 55, 95);
              setProgress(pct);
              setStatusMsg(status.status === 'extracted'
                ? 'Extraction complete! Redirecting...'
                : `Processing... ${status.progress_pct}%`);

              if (status.status === 'extracted' || status.status === 'needs_review' || status.status === 'failed') {
                setProgress(100);
                setCurrentStep(2);
                if (status.status === 'failed') {
                  setStatusMsg('Extraction failed. The document may be unclear. Please try again.');
                } else {
                  setStatusMsg('Extraction complete! Redirecting to results...');
                }
                setTimeout(() => router.push(`/patient/prescriptions/${entityId}`), 1000);
                return;
              }
            } else {
              const pct = Math.min(40 + (attempts / maxAttempts) * 55, 95);
              setProgress(pct);
              setStatusMsg(`Processing report... ${Math.round(pct)}%`);
              if (attempts >= 5) {
                setProgress(100);
                setCurrentStep(2);
                setStatusMsg('Upload complete! Redirecting...');
                setTimeout(() => router.push('/patient'), 1000);
                return;
              }
            }
          } catch {
            // Keep polling — transient network errors are expected
          }

          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            setProgress(100);
            setCurrentStep(2);
            setStatusMsg('Processing taking longer than expected. Redirecting...');
            setTimeout(() => router.push(mode === 'prescription' ? `/patient/prescriptions/${entityId}` : '/patient'), 1500);
          }
        };

        setTimeout(poll, 2000);
      }
    } catch (err) {
      setIsProcessing(false);
      setCurrentStep(0);
      setProgress(0);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Upload failed. Please try again.');
      }
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <PageHeader
        title="Upload Medical Document"
        subtitle="Upload prescriptions, reports, or general medical documents (Max 20MB · JPG, PNG, PDF)."
      />

      <div className="card" style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-4) var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                  background: idx <= currentStep ? 'var(--primary)' : 'var(--bg-muted)',
                  color: idx <= currentStep ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                }}>
                  {idx < currentStep ? <IconCheckCircle size={14} /> : idx + 1}
                </div>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: idx === currentStep ? 600 : 400, color: idx <= currentStep ? 'var(--text-primary)' : 'var(--text-muted)' }} className="hide-mobile">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: idx < currentStep ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius-pill)', minWidth: '20px' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }} role="alert">
          <IconAlertTriangle size={16} />
          {error}
        </div>
      )}

      {!isProcessing ? (
        <form onSubmit={handleUpload} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Document Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
              <button type="button" className={`btn ${mode === 'prescription' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('prescription')} style={{ justifyContent: 'flex-start' }}>
                <IconFileText size={18} /><span>Prescription</span>
              </button>
              <button type="button" className={`btn ${mode === 'report' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('report')} style={{ justifyContent: 'flex-start' }}>
                <IconSparkles size={18} /><span>Lab Report</span>
              </button>
              <button type="button" className={`btn ${mode === 'document' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('document')} style={{ justifyContent: 'flex-start' }}>
                <IconUpload size={18} /><span>General</span>
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Document File</label>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            <div
              style={{
                border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: 'var(--sp-10) var(--sp-5)', textAlign: 'center',
                backgroundColor: file ? 'var(--primary-lighter)' : 'var(--bg-page)',
                cursor: 'pointer', transition: 'all var(--duration-normal) var(--ease-out)',
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              role="button"
              tabIndex={0}
              aria-label="Upload file"
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: file ? 'var(--primary)' : 'var(--primary-light)',
                color: file ? '#ffffff' : 'var(--primary)',
                margin: '0 auto var(--sp-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--duration-normal) var(--ease-out)',
              }}>
                {file ? <IconCheckCircle size={26} /> : <IconUpload size={26} />}
              </div>
              {file ? (
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-md)', marginBottom: 'var(--sp-1)' }}>{file.name}</p>
                  <p className="text-caption">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 'var(--text-md)', marginBottom: 'var(--sp-1)' }}>Drag and drop file here, or click to browse</p>
                  <p className="text-caption">Supports JPG, PNG, PDF up to 20MB</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={!file} style={{ width: '100%' }}>
            <IconSparkles size={16} />
            {mode === 'document' ? 'Upload & Secure' : 'Start AI Extraction Pipeline'}
          </button>
        </form>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-10) var(--sp-6)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', margin: '0 auto var(--sp-5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSparkles size={32} />
          </div>
          <h2 className="text-h2" style={{ marginBottom: 'var(--sp-2)' }}>Processing Document</h2>
          <p className="text-caption" style={{ marginBottom: 'var(--sp-6)', maxWidth: '400px', margin: '0 auto var(--sp-6)' }}>{statusMsg}</p>
          <div className="progress-bar" style={{ height: '8px', marginBottom: 'var(--sp-3)' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--success))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: progress === 100 ? 'var(--success)' : 'var(--primary)' }}>{progress === 100 ? 'Complete' : 'In Progress'}</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
