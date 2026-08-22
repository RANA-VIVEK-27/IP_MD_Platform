'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconAlertTriangle, IconCheckCircle, IconFileText } from '../../../components/Icons';
import { ReportSummary } from '../../../lib/types';

export default function DoctorReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const res = await ApiClient.listReports({ limit: 50 });
      setReports(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load reports';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Patient Diagnostic Reports"
        subtitle="Review lab test values, AI structured summaries, and highlighted abnormal flags."
      />

      <AIDisclosureBanner />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />)}
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
        <div className="flex flex-col gap-5">
          {reports.map((report) => (
            <div key={report.report_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{report.report_type || 'Diagnostic Report'}</h3>
                    <p className="text-caption" style={{ marginTop: 'var(--sp-1)' }}>
                      Report #{report.report_id.slice(0, 8)} · {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${report.extraction_status === 'extracted' ? 'badge-success' : 'badge-neutral'}`}>
                    {report.extraction_status === 'extracted' ? <><IconCheckCircle size={12} /> Extracted</> : report.extraction_status}
                  </span>
                </div>
              </div>
              <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
                <p className="text-caption">Full report details available upon patient consent.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
