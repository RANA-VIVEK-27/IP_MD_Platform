'use client';

import React, { useState, useEffect } from 'react';
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
      </div>
    );
  }

  if (error || !report) {
    return (
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
        </div>
      </div>
    );
  }

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
          </div>
        </div>
      </div>

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
    </div>
  );
}
