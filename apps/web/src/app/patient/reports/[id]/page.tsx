'use client';

import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { useParams, useRouter } from 'next/navigation';
import { ApiClient, ApiError } from '../../../../lib/api';
import { ReportDetail } from '../../../../lib/types';
import { PageHeader } from '../../../../components/PageHeader';
import { StatusBadge } from '../../../../components/Badges';
import {
  IconFileText,
  IconSparkles,
  IconAlertTriangle,
  IconCheckCircle,
  IconArrowLeft,
  IconMessageSquare,
} from '../../../../components/Icons';

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await ApiClient.getReportDetail(reportId);
        setReport(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load lab report details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: 'var(--sp-10)', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading AI report analysis...</div>
=======
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ApiClient, ApiError } from '../../../../lib/api';
import { StatusBadge } from '../../../../components/Badges';
import { LoadingSpinner } from '../../../../components/LoadingSpinner';
import { useToast } from '../../../../components/Toast';
import {
  IconChevronLeft,
  IconClipboardMedical,
  IconAlertTriangle,
  IconCheckCircle,
  IconClock,
  IconCalendar,
  IconShare,
  IconSend,
} from '../../../../components/Icons';
import type { ReportDetail } from '../../../../lib/types';

interface GrantedDoctor {
  grant_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_email: string;
  granted_at: string;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grantModal, setGrantModal] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [granting, setGranting] = useState(false);
  const [grantedDoctors, setGrantedDoctors] = useState<GrantedDoctor[]>([]);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => { loadReport(); }, [params.id]);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await ApiClient.getReportDetail(params.id as string);
      setReport(data);
      loadGrantedDoctors();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : 'Failed to load report');
    } finally { setLoading(false); }
  }

  async function loadGrantedDoctors() {
    try {
      const res = await ApiClient.getReportGrantedDoctors(params.id as string);
      setGrantedDoctors(res || []);
    } catch { setGrantedDoctors([]); }
  }

  const loadDoctors = async () => {
    try {
      const res = await ApiClient.listReportDoctors();
      setDoctors(res || []);
    } catch { setDoctors([]); }
  };

  const openGrantModal = () => {
    setGrantModal(true);
    setDoctorId('');
    loadDoctors();
  };

  const handleGrantAccess = async () => {
    if (!report || !doctorId) return;
    setGranting(true);
    try {
      await ApiClient.grantReportAccess(report.report_id, doctorId);
      addToast('success', 'Access Granted', 'Doctor can now view this report.');
      setGrantModal(false);
      loadGrantedDoctors();
    } catch (e: any) {
      addToast('error', 'Failed', e.message || 'Could not grant access');
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <div className="skeleton" style={{ height: '60px', borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
>>>>>>> 94f9cec (: implement complete pharmacy management system including dashboard, catalog, inventory, and order fulfillment APIs and UI)
      </div>
    );
  }

  if (error || !report) {
    return (
<<<<<<< HEAD
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => router.back()}
          style={{ marginBottom: 'var(--sp-4)' }}
        >
          <IconArrowLeft size={14} /> Back
        </button>
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
          }}
        >
          <IconAlertTriangle size={16} />
          {error || 'Report not found.'}
=======
      <div className="app-content">
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error || 'Report not found'}</p>
          <Link href="/patient/reports" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }}>Back to Reports</Link>
>>>>>>> 94f9cec (: implement complete pharmacy management system including dashboard, catalog, inventory, and order fulfillment APIs and UI)
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  const hasAbnormalValues = report.values.some((v) => v.flag === 'abnormal');

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/patient')}>
          <IconArrowLeft size={14} /> Dashboard
        </button>
        <StatusBadge status={report.extraction_status} />
      </div>

      <PageHeader
        title="Diagnostic Report Analysis"
        subtitle={`Report ID: ${report.report_id.slice(0, 8)}... · Extracted via Medical NLP`}
        action={
          <button
            className="btn btn-primary"
            onClick={() => router.push('/patient/chat')}
          >
            <IconMessageSquare size={16} /> Ask AI Assistant About Report
          </button>
        }
      />

      {/* AI Explanation Banner */}
      <div className="card" style={{
        background: hasAbnormalValues ? 'var(--warning-bg)' : 'var(--success-bg)',
        border: `1px solid ${hasAbnormalValues ? 'var(--warning-border)' : 'var(--success-border)'}`,
        padding: 'var(--sp-5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: hasAbnormalValues ? 'var(--warning)' : 'var(--success)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconSparkles size={18} />
          </div>
          <div>
            <h4 style={{
              fontSize: 'var(--text-md)',
              fontWeight: 700,
              color: hasAbnormalValues ? 'var(--warning)' : 'var(--success)',
              marginBottom: 'var(--sp-1)',
            }}>
              AI Medical NLP Summary
            </h4>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {report.ai_explanation || 'All analyzed diagnostic parameters fall within standard reference ranges.'}
            </p>
=======
  const abnormalValues = report.values?.filter(v => v.flag !== 'normal') || [];
  const normalValues = report.values?.filter(v => v.flag === 'normal') || [];

  return (
    <div className="app-content" style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-2)' }}>
              <IconChevronLeft size={16} /><span>Back</span>
            </button>
            <h1 className="text-h1">{report.report_type || 'Lab Report'} #{report.report_id.slice(0, 8)}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={report.extraction_status} />
              <span className="text-caption flex items-center gap-1">
                <IconClock size={12} />
                Uploaded {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/patient/reports" className="btn btn-secondary">My Reports</Link>
            <button className="btn btn-primary" onClick={openGrantModal}>
              <IconSend size={16} /><span>Grant Doctor Access</span>
            </button>
>>>>>>> 94f9cec (: implement complete pharmacy management system including dashboard, catalog, inventory, and order fulfillment APIs and UI)
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Test Parameters Table */}
      <div className="card">
        <h3 className="text-h3" style={{ marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <IconFileText size={20} color="var(--primary)" /> Extracted Test Values & Metrics
        </h3>

        {report.values.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No test metrics extracted yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left' }}>
                  <th style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Test Parameter</th>
                  <th style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Extracted Result</th>
                  <th style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reference Range</th>
                  <th style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Clinical Flag</th>
                </tr>
              </thead>
              <tbody>
                {report.values.map((v, idx) => {
                  const isAbnormal = v.flag === 'abnormal';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: 'var(--sp-3)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--navy)' }}>
                        {v.test_name}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', fontWeight: 700, color: isAbnormal ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {v.value} {v.unit || ''}
                      </td>
                      <td style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {v.reference_range || 'N/A'}
                      </td>
                      <td style={{ padding: 'var(--sp-3)' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 10px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: isAbnormal ? 'var(--danger)' : 'var(--success)',
                          background: isAbnormal ? 'var(--danger-bg)' : 'var(--success-bg)',
                          border: `1px solid ${isAbnormal ? 'var(--danger-border)' : 'var(--success-border)'}`,
                        }}>
                          {isAbnormal ? <IconAlertTriangle size={12} /> : <IconCheckCircle size={12} />}
                          {v.flag.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info / Disclaimer */}
      <p className="text-caption" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        ⚠️ Medical Disclaimer: Diagnostic extraction outputs are generated by Medical NLP models for informational purposes and should be confirmed with your prescribing doctor.
      </p>
=======
      {/* Granted Access Status */}
      {grantedDoctors.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-4)', background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconCheckCircle size={16} style={{ color: 'var(--success)' }} />
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--success-dark)', margin: 0 }}>
              Access Granted to {grantedDoctors.length} Doctor{grantedDoctors.length > 1 ? 's' : ''}
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {grantedDoctors.map(d => (
              <span key={d.grant_id} style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--success-dark)', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IconCheckCircle size={10} /> {d.doctor_name || d.doctor_email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview */}
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>Report Document</h3>
          <button onClick={() => setImagePreviewOpen(true)} className="btn btn-secondary btn-sm">Full View</button>
        </div>
        <div
          onClick={() => setImagePreviewOpen(true)}
          style={{ cursor: 'pointer', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)', maxHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}
        >
          <img
            src={`/api/v1/documents/${report.document_id}/preview`}
            alt="Report Document Preview"
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* AI Summary */}
      {report.ai_explanation && (
        <div className="card" style={{ padding: 'var(--sp-5)', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <IconCheckCircle size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>AI Summary</h3>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-dark)', lineHeight: 1.6, margin: 0 }}>{report.ai_explanation}</p>
        </div>
      )}

      {/* Abnormal Values Alert */}
      {abnormalValues.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-4)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <IconAlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
              {abnormalValues.length} Abnormal Value{abnormalValues.length > 1 ? 's' : ''} Detected
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {abnormalValues.map(v => (
              <span key={v.value_id} style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                {v.test_name}: {v.value} {v.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All Test Values */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>
          Test Values ({report.values?.length || 0})
        </h3>
        {report.values && report.values.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-3)' }}>
            {report.values.map(v => {
              const isAbnormal = v.flag !== 'normal';
              return (
                <div
                  key={v.value_id}
                  style={{
                    padding: 'var(--sp-3)',
                    background: isAbnormal ? 'rgba(239,68,68,0.04)' : 'var(--bg-secondary)',
                    border: `1px solid ${isAbnormal ? 'var(--danger-border)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: 500 }}>{v.test_name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: isAbnormal ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {v.value}
                    </span>
                    {v.unit && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.unit}</span>}
                  </div>
                  {v.reference_range && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Ref: {v.reference_range}
                    </div>
                  )}
                  {isAbnormal && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--danger)',
                      background: 'rgba(239,68,68,0.1)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-pill)',
                      marginTop: '4px',
                    }}>
                      {v.flag.toUpperCase()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--sp-6)' }}>
            No test values extracted yet.
          </p>
        )}
      </div>

      {/* Document Info */}
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div className="flex items-center gap-3">
          <IconClipboardMedical size={16} style={{ color: 'var(--text-muted)' }} />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Document ID: {report.document_id.slice(0, 12)}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {report.is_ai_generated ? 'AI-extracted data' : 'Manually entered'}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Image Preview */}
      {imagePreviewOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}
          onClick={() => setImagePreviewOpen(false)}
        >
          <img
            src={`/api/v1/documents/${report.document_id}/preview`}
            alt="Report Document Full View"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
          />
          <button
            onClick={() => setImagePreviewOpen(false)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Grant Access Modal */}
      {grantModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!granting) setGrantModal(false); }}>
          <div className="card" style={{ width: '420px', padding: 'var(--sp-5)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Grant Doctor Access</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)' }}>
              Select a doctor to grant access to this report.
            </p>
            {grantedDoctors.length > 0 && (
              <div style={{ marginBottom: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--success-dark)' }}>
                Already granted: {grantedDoctors.map(d => d.doctor_name || d.doctor_email).join(', ')}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 'var(--sp-4)' }}>
              <label className="form-label">Select Doctor *</label>
              <select className="input" style={{ height: '40px', fontSize: 'var(--text-sm)' }} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">Choose a doctor...</option>
                {doctors.map((d: any) => {
                  const isGranted = grantedDoctors.some(g => g.doctor_id === d.user_id);
                  return (
                    <option key={d.user_id} value={d.user_id} disabled={isGranted}>
                      {d.full_name || d.email} {isGranted ? '(Already Granted)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button onClick={handleGrantAccess} disabled={granting || !doctorId} className="btn btn-primary btn-sm">
                {granting ? 'Granting...' : 'Grant Access'}
              </button>
              <button onClick={() => setGrantModal(false)} disabled={granting} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
>>>>>>> 94f9cec (: implement complete pharmacy management system including dashboard, catalog, inventory, and order fulfillment APIs and UI)
    </div>
  );
}
