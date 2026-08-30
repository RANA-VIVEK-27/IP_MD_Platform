'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiClient, ApiError } from '../../../lib/api';
import { DocumentItem } from '../../../lib/types';
import { PageHeader } from '../../../components/PageHeader';
import {
  IconFileText, IconAlertTriangle, IconCheckCircle, IconClock, IconTrash2, IconEye,
} from '../../../components/Icons';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ready: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Ready' },
  clean: { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Clean' },
  processing: { color: 'var(--primary)', bg: 'var(--primary-lighter)', label: 'Processing' },
  quarantined: { color: 'var(--warning, #d97706)', bg: 'var(--warning-bg, #fef3c7)', label: 'Scanning' },
  scanning: { color: 'var(--primary)', bg: 'var(--primary-lighter)', label: 'Scanning' },
  scan_failed: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Scan Failed' },
  infected: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Infected' },
  upload_failed: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Upload Failed' },
  processing_failed: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: 'Failed' },
  deleted: { color: 'var(--text-muted)', bg: 'var(--bg-muted)', label: 'Deleted' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ready;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: 'var(--radius-pill)',
      fontSize: 'var(--text-xs)', fontWeight: 600,
      color: config.color, background: config.bg,
    }}>
      {status === 'ready' || status === 'clean' ? <IconCheckCircle size={12} /> :
       status === 'processing' || status === 'scanning' || status === 'quarantined' ? <IconClock size={12} /> :
       <IconAlertTriangle size={12} />}
      {config.label}
    </span>
  );
}

function PreviewModal({ document, onClose }: { document: DocumentItem; onClose: () => void }) {
  const previewUrl = `/api/v1/documents/${document.document_id}/preview`;
  const isImage = document.mime_type?.startsWith('image/');
  const isPdf = document.mime_type === 'application/pdf';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
          maxWidth: '90vw', maxHeight: '90vh', display: 'flex',
          flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: 'var(--sp-3) var(--sp-4)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {document.original_filename}
          </span>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
            Close
          </button>
        </div>
        <div style={{ padding: 'var(--sp-2)', overflow: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isImage ? (
            <img
              src={previewUrl}
              alt={document.original_filename}
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-sm)' }}
            />
          ) : isPdf ? (
            <iframe
              src={previewUrl}
              style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: 'var(--radius-sm)' }}
            />
          ) : (
            <div style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
              <IconFileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Preview not available for this file type ({document.mime_type})
              </p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)' }}>
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { limit: 50 };
      if (filter) params.doc_status = filter;
      const res = await ApiClient.listDocuments(params);
      setDocuments(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setDownloading(doc.document_id);
      const res = await ApiClient.getDocumentDownloadUrl(doc.document_id);
      window.open(res.download_url, '_blank');
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Delete "${doc.original_filename}"? This cannot be undone.`)) return;
    try {
      await ApiClient.deleteDocument(doc.document_id);
      setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <PageHeader
        title="My Documents"
        subtitle="View and manage your uploaded medical documents."
        action={<a href="/patient/upload" className="btn btn-primary">Upload New</a>}
      />

      {error && (
        <div style={{
          padding: 'var(--sp-3) var(--sp-4)', background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)',
          color: 'var(--danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-4)',
          display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        }}>
          <IconAlertTriangle size={16} /> {error}
        </div>
      )}

      <div style={{ marginBottom: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {[
          { value: '', label: 'All' },
          { value: 'ready', label: 'Ready' },
          { value: 'infected', label: 'Infected' },
          { value: 'scan_failed', label: 'Scan Failed' },
        ].map(opt => (
          <button
            key={opt.value}
            className={`btn ${filter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(opt.value)}
            style={{ fontSize: 'var(--text-xs)', padding: '4px 12px' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <IconFileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }} />
          <h3 className="text-h3" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-2)' }}>No documents yet</h3>
          <p className="text-caption" style={{ marginBottom: 'var(--sp-4)' }}>Upload your first medical document to get started.</p>
          <a href="/patient/upload" className="btn btn-primary">Upload Document</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {documents.map(doc => (
            <div key={doc.document_id} className="card" style={{
              padding: 'var(--sp-4)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1, minWidth: '200px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-lighter)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconFileText size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.original_filename}
                  </p>
                  <p className="text-caption" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                    <span>{doc.mime_type}</span>
                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <StatusBadge status={doc.doc_status} />

                {doc.doc_status === 'ready' && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setPreviewDoc(doc)}
                      style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <IconEye size={14} /> View
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc.document_id}
                      style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      {downloading === doc.document_id ? '...' : 'Download'}
                    </button>
                  </>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(doc)}
                  style={{ fontSize: 'var(--text-xs)', padding: '4px 10px', color: 'var(--danger)' }}
                >
                  <IconTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewDoc && <PreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  );
}
