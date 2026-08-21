'use client';

import React from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconAlertTriangle, IconCheckCircle } from '../../../components/Icons';

export default function DoctorReportsPage() {
  const reports = [
    {
      id: 'rep-101',
      patientName: 'Rahul Sharma',
      testType: 'Comprehensive Metabolic Panel (Blood)',
      date: 'Aug 20, 2026',
      findings: [
        { test: 'Fasting Blood Glucose', value: '142 mg/dL', ref: '70–99 mg/dL', isAbnormal: true, note: 'Elevated (Prediabetic/Diabetic range)' },
        { test: 'HbA1c', value: '6.8%', ref: '< 5.7%', isAbnormal: true, note: 'Consistent with early Type 2 Diabetes' },
        { test: 'Serum Creatinine', value: '0.9 mg/dL', ref: '0.7–1.3 mg/dL', isAbnormal: false, note: 'Normal kidney filtration' },
      ],
    },
  ];

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Patient Diagnostic Reports"
        subtitle="Review lab test values, AI structured summaries, and highlighted abnormal flags."
      />

      <AIDisclosureBanner />

      <div className="flex flex-col gap-5">
        {reports.map((rep) => {
          const abnormalCount = rep.findings.filter((f) => f.isAbnormal).length;
          const normalCount = rep.findings.filter((f) => !f.isAbnormal).length;

          return (
            <div key={rep.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {/* Report Header */}
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{rep.testType}</h3>
                    <p className="text-caption" style={{ marginTop: 'var(--sp-1)' }}>
                      Patient: {rep.patientName} · Collected on {rep.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {abnormalCount > 0 && (
                    <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}>
                      <IconAlertTriangle size={12} />
                      {abnormalCount} Abnormal
                    </span>
                  )}
                  <span className="badge badge-success" style={{ gap: 'var(--sp-1)' }}>
                    <IconCheckCircle size={12} />
                    {normalCount} Normal
                  </span>
                </div>
              </div>

              {/* Findings Table */}
              <div className="table-wrapper">
                <table className="table" role="table" aria-label={`Lab results for ${rep.testType}`}>
                  <thead>
                    <tr>
                      <th scope="col">Diagnostic Test</th>
                      <th scope="col">Observed Value</th>
                      <th scope="col">Biological Reference</th>
                      <th scope="col">AI Evaluation Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rep.findings.map((f, idx) => (
                      <tr
                        key={idx}
                        style={f.isAbnormal ? { backgroundColor: 'rgba(196, 61, 61, 0.03)' } : undefined}
                      >
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{f.test}</span>
                        </td>
                        <td>
                          <span
                            className="tabular-nums"
                            style={{
                              fontWeight: 700,
                              fontSize: 'var(--text-md)',
                              color: f.isAbnormal ? 'var(--danger)' : 'var(--success)',
                            }}
                          >
                            {f.value}
                          </span>
                        </td>
                        <td>
                          <span className="text-caption" style={{ fontFamily: 'monospace' }}>{f.ref}</span>
                        </td>
                        <td>
                          {f.isAbnormal ? (
                            <span className="badge badge-danger" style={{ gap: 'var(--sp-1)' }}>
                              <IconAlertTriangle size={12} />
                              {f.note}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ gap: 'var(--sp-1)' }}>
                              <IconCheckCircle size={12} />
                              {f.note}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
