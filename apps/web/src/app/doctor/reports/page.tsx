'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconAlertTriangle, IconCheckCircle, IconFileText, IconClock, IconSend } from '../../../components/Icons';
import { ReportSummary, ReportDetail, ReportValue } from '../../../lib/types';

export default function DoctorReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listReports({ limit: 50 });
      setReports(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load reports';
      setError(msg);
    } finally { setLoading(false); }
  }

  const toggleExpand = async (reportId: string) => {
    if (expandedId === reportId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(reportId);
    setDetailLoading(true);
    try {
      const res = await ApiClient.getReportDetail(reportId);
      setDetail(res);
    } catch {
      setDetail(null);
    } finally { setDetailLoading(false); }
  };

  const flagColor = (flag: string) => flag === 'abnormal' ? 'var(--danger)' : 'var(--success)';
  const flagBg = (flag: string) => flag === 'abnormal' ? 'rgba(214, 69, 69, 0.08)' : 'rgba(34, 197, 94, 0.08)';

  const reportTypeLabel = (t?: string | null) => {
    const labels: Record<string, string> = {
      blood_panel: 'Blood Panel', lipid_profile: 'Lipid Profile', thyroid_panel: 'Thyroid Panel',
      liver_function: 'Liver Function', kidney_function: 'Kidney Function', cbc: 'Complete Blood Count',
      sonography: 'Sonography', ct_scan: 'CT Scan', mri: 'MRI', xray: 'X-Ray',
    };
    return labels[t || ''] || t || 'Diagnostic Report';
  };

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader title="Patient Diagnostic Reports" subtitle="Review lab test values, AI structured summaries, and highlighted abnormal flags." />
      <AIDisclosureBanner />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={loadReports}>Retry</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-12)' }}>
          <div className="empty-state-icon"><IconFileText size={28} /></div>
          <h3>No reports available</h3>
          <p>Diagnostic reports will appear here once patients grant you access.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {reports.map((report) => {
            const isExpanded = expandedId === report.report_id;
            const abnormalCount = detail?.values?.filter(v => v.flag === 'abnormal').length || 0;

            return (
              <div key={report.report_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div
                  onClick={() => toggleExpand(report.report_id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) var(--sp-5)', cursor: 'pointer', background: isExpanded ? 'var(--bg-secondary)' : 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <IconFileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{reportTypeLabel(report.report_type)}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        #{report.report_id.slice(0, 8)} · {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    {abnormalCount > 0 && (
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)', background: 'rgba(214,69,69,0.08)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                        {abnormalCount} abnormal
                      </span>
                    )}
                    <span className={`badge ${report.extraction_status === 'extracted' ? 'badge-success' : 'badge-neutral'}`}>
                      {report.extraction_status === 'extracted' ? <><IconCheckCircle size={12} /> Extracted</> : <><IconClock size={12} /> {report.extraction_status}</>}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-light)', padding: 'var(--sp-4) var(--sp-5)' }}>
                    {detailLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '32px', borderRadius: 'var(--radius-sm)' }} />)}
                      </div>
                    ) : detail ? (
                      <>
                        {/* Document Preview */}
                        <div style={{ marginBottom: 'var(--sp-4)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Report Document</h4>
                            <button
                              onClick={() => { setPreviewDocId(detail.document_id); setImagePreviewOpen(true); }}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                            >
                              Full View
                            </button>
                          </div>
                          <div
                            onClick={() => { setPreviewDocId(detail.document_id); setImagePreviewOpen(true); }}
                            style={{ cursor: 'pointer', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)', maxHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}
                          >
                            <img
                              src={`/api/v1/documents/${detail.document_id}/preview`}
                              alt="Report Preview"
                              style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        </div>

                        {/* AI Explanation */}
                        {detail.ai_explanation && (
                          <div style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'rgba(108, 99, 255, 0.06)', border: '1px solid rgba(108, 99, 255, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-4)' }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#6C63FF', marginBottom: 'var(--sp-1)' }}>AI Summary</div>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.6 }}>{detail.ai_explanation}</p>
                          </div>
                        )}

                        {/* Test Values Table */}
                        {detail.values.length > 0 && (
                          <div>
                            <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--sp-2)' }}>Test Values</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 'var(--sp-2) var(--sp-4)', alignItems: 'center' }}>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 'var(--sp-1)', borderBottom: '1px solid var(--border-light)' }}>Test</div>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 'var(--sp-1)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Value</div>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 'var(--sp-1)', borderBottom: '1px solid var(--border-light)' }}>Unit</div>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 'var(--sp-1)', borderBottom: '1px solid var(--border-light)' }}>Reference</div>
                              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 'var(--sp-1)', borderBottom: '1px solid var(--border-light)' }}>Flag</div>
                              {detail.values.map((v: ReportValue) => (
                                <React.Fragment key={v.value_id}>
                                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, padding: 'var(--sp-2) 0', borderTop: '1px solid var(--border-light)' }}>{v.test_name}</div>
                                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, fontFamily: 'monospace', textAlign: 'right', color: flagColor(v.flag), padding: 'var(--sp-2) 0', borderTop: '1px solid var(--border-light)' }}>{v.value}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--sp-2) 0', borderTop: '1px solid var(--border-light)' }}>{v.unit || '—'}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: 'var(--sp-2) 0', borderTop: '1px solid var(--border-light)' }}>{v.reference_range || '—'}</div>
                                  <div style={{ padding: 'var(--sp-2) 0', borderTop: '1px solid var(--border-light)' }}>
                                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: flagColor(v.flag), background: flagBg(v.flag), padding: '2px 8px', borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>{v.flag}</span>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Create Prescription Action */}
                        <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => router.push(`/doctor/prescriptions/new?patient_id=${report.patient_id}&report_id=${report.report_id}`)}
                            className="btn btn-primary btn-sm"
                          >
                            <IconSend size={14} /> Create Prescription
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--sp-4)' }}>Could not load report details.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full-screen Image Preview */}
      {imagePreviewOpen && previewDocId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}
          onClick={() => setImagePreviewOpen(false)}
        >
          <img
            src={`/api/v1/documents/${previewDocId}/preview`}
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
    </div>
  );
}
