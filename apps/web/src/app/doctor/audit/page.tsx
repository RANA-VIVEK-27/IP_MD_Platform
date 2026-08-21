'use client';

import React from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { StatusBadge } from '../../../components/Badges';
import { IconCheckCircle, IconXCircle } from '../../../components/Icons';

export default function DoctorAuditPage() {
  const auditEntries = [
    {
      id: 'aud-9901',
      prescriptionId: 'rx-9021',
      patient: 'Rahul Sharma',
      action: 'APPROVE_PRESCRIPTION',
      timestamp: 'Today, 2:15:30 PM UTC',
      status: 'doctor_verified',
      details: 'All 3 items verified against clinical guidelines. Schedule H dispensing authorized.',
    },
    {
      id: 'aud-9884',
      prescriptionId: 'rx-8711',
      patient: 'Suresh Kumar',
      action: 'REJECT_PRESCRIPTION',
      timestamp: 'Yesterday, 4:40:12 PM UTC',
      status: 'rejected',
      details: 'Missing doctor registration seal on uploaded document.',
    },
  ];

  return (
    <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Doctor Verification Audit Log"
        subtitle="Immutable record of all clinical prescription reviews, endorsements, and rejections."
      />

      <div className="table-wrapper">
        <table className="table" role="table" aria-label="Doctor verification audit log">
          <thead>
            <tr>
              <th scope="col">Audit Log ID</th>
              <th scope="col">Prescription</th>
              <th scope="col">Patient</th>
              <th scope="col">Action & Status</th>
              <th scope="col">Timestamp (UTC)</th>
              <th scope="col">Clinical Justification</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((e) => (
              <tr key={e.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {e.id}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
                    {e.prescriptionId}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={e.patient} size="sm" />
                    <span style={{ fontWeight: 500 }}>{e.patient}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {e.action === 'APPROVE_PRESCRIPTION' ? (
                        <IconCheckCircle size={14} style={{ color: 'var(--success)' }} />
                      ) : (
                        <IconXCircle size={14} style={{ color: 'var(--danger)' }} />
                      )}
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                        {e.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                </td>
                <td>
                  <span className="text-caption">{e.timestamp}</span>
                </td>
                <td>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {e.details}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
