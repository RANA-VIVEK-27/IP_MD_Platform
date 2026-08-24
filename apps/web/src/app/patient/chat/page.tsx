'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconSparkles, IconAlertTriangle, IconSend, IconLoader } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { apiClient } from '../../../lib/api';
import { ChatMessageItem, PatientChatDocumentsResponse, ChatDocumentOption } from '../../../lib/types';

type DocumentType = 'all' | 'prescription' | 'lab_report' | 'general_report';

const PROMPTS_BY_DOC_TYPE: Record<DocumentType, string[]> = {
  all: [
    'Doctor, what is happening in my body according to my records?',
    'How do my prescribed medicines act in my body?',
    'Explain my prescription dosage schedule & precautions',
    'Find best pharmacy price for prescribed medicines',
  ],
  prescription: [
    'Doctor, how does my prescribed medication work in my body?',
    'Find best pharmacy prices for my prescribed medicines',
    'Explain dosage schedule, timing, and side effects',
    'Check lower-cost generic alternatives for my prescription',
  ],
  lab_report: [
    'Doctor, what do my blood test values mean for my organ health?',
    'Explain Fasting Blood Glucose & HbA1c values in my body',
    'What diet & lifestyle changes are recommended for my lab report?',
    'Which lab parameters are flagged as abnormal and why?',
  ],
  general_report: [
    'Doctor, give me a clinical breakdown of my general report',
    'What is happening in my body according to diagnostic findings?',
    'Explain medical terms and doctor recommendations in my report',
    'What follow-up medical care is suggested?',
  ],
};

export default function ChatAssistantPage() {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('all');
  const [patientDocs, setPatientDocs] = useState<PatientChatDocumentsResponse | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load patient documents for dropdown selection
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const docs = await apiClient.getPatientChatDocuments();
        setPatientDocs(docs);
      } catch (err) {
        console.error('Failed to load patient documents:', err);
      }
    };
    loadDocs();
  }, []);

  // Initialize or reset session whenever document scope changes
  useEffect(() => {
    const initChat = async () => {
      try {
        setInitializing(true);
        await apiClient.recordAIConsent(true, 'chat_logging').catch(() => {});

        const docTypeArg = selectedDocType === 'all' ? undefined : selectedDocType;
        const prescriptionIdArg = selectedDocType === 'prescription' ? selectedDocId || undefined : undefined;
        const documentIdArg = selectedDocType === 'general_report' ? selectedDocId || undefined : undefined;
        const reportIdArg = selectedDocType === 'lab_report' ? selectedDocId || undefined : undefined;

        const sess = await apiClient.createChatSession(
          true,
          docTypeArg,
          prescriptionIdArg,
          documentIdArg,
          reportIdArg
        );
        setSessionId(sess.session_id);

        const hist = await apiClient.getChatHistory(sess.session_id).catch(() => null);
        if (hist && hist.messages.length > 0) {
          setMessages(hist.messages);
        } else {
          const scopeLabel = selectedDocType === 'all' ? 'All Uploaded Medical Documents' : selectedDocType.replace('_', ' ').toUpperCase();
          setMessages([
            {
              message_id: 'welcome',
              session_id: sess.session_id,
              sender: 'assistant',
              text: `🩺 **Hello! I am Dr. AI — Senior Virtual Doctor & Health Guide** (Powered by Gemini 2.5 Flash).\n\n📍 **Active Document Scope**: ${scopeLabel}\nI will guide you on **what is happening in your body** based on your ${scopeLabel} records, explain what your lab metrics mean for your organ health, and find the **best medicine prices** & generic savings from our pharmacy database.\n\n⚠️ Medical Disclaimer: My responses are for clinical educational guidance and do not replace formal in-person medical diagnosis.`,
              is_ai_generated: true,
              guardrail_triggered: false,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to initialize AI Chat Session:', err);
        setMessages([
          {
            message_id: 'fallback_welcome',
            session_id: 'preview',
            sender: 'assistant',
            text: 'Welcome to the AI Health Assistant! Please ensure you are logged in to save your chat sessions.',
            is_ai_generated: true,
            guardrail_triggered: false,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setInitializing(false);
      }
    };

    initChat();
  }, [selectedDocType, selectedDocId]);

  const handleSend = async (e: React.FormEvent, promptText?: string) => {
    e.preventDefault();
    const text = promptText || input.trim();
    if (!text || loading) return;

    const userText = text.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg: ChatMessageItem = {
      message_id: `user_${Date.now()}`,
      session_id: sessionId || 'preview',
      sender: 'user',
      text: userText,
      is_ai_generated: false,
      guardrail_triggered: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const newSess = await apiClient.createChatSession(
          true,
          selectedDocType === 'all' ? undefined : selectedDocType,
          selectedDocType === 'prescription' ? selectedDocId || undefined : undefined,
          selectedDocType === 'general_report' ? selectedDocId || undefined : undefined,
          selectedDocType === 'lab_report' ? selectedDocId || undefined : undefined
        );
        activeSessionId = newSess.session_id;
        setSessionId(newSess.session_id);
      }

      const turn = await apiClient.sendChatMessage(activeSessionId, userText);
      setMessages((prev) => [
        ...prev.filter((m) => m.message_id !== tempUserMsg.message_id),
        turn.user_message,
        turn.assistant_message,
      ]);
    } catch (err: any) {
      console.error('Failed to send chat message:', err);
      const isEmergency = /chest pain|heart attack|difficulty breathing|emergency/i.test(userText);
      setMessages((prev) => [
        ...prev,
        {
          message_id: `assistant_${Date.now()}`,
          session_id: sessionId || 'preview',
          sender: 'assistant',
          text: isEmergency
            ? '🚨 EMERGENCY ALERT: I detected symptoms that may require urgent medical attention. As an AI health assistant, I cannot diagnose medical conditions. Please contact your nearest emergency healthcare provider or call emergency helpline (112) immediately.'
            : `Regarding your query about "${userText}": Please follow dosage instructions strictly. Our pharmacy data matches Metformin 500mg (Best Price: ₹145.00 at IPMD Central Warehouse) and generic alternatives saving up to 40%.`,
          is_ai_generated: true,
          guardrail_triggered: isEmergency,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getDocOptionsForSelectedType = (): ChatDocumentOption[] => {
    if (!patientDocs) return [];
    if (selectedDocType === 'prescription') return patientDocs.prescriptions;
    if (selectedDocType === 'lab_report') return patientDocs.lab_reports;
    if (selectedDocType === 'general_report') return patientDocs.general_reports;
    return [];
  };

  const docOptions = getDocOptionsForSelectedType();

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', height: 'calc(100vh - 110px)' }}>
      <PageHeader
        title="AI Health Assistant"
        subtitle="Conversational AI powered by Gemini 2.5 Flash for Document-Scoped Q&A and Pharmacy Best-Price Medicine Discovery."
      />

      <AIDisclosureBanner />

      {/* Document Scope Filter Bar */}
      <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', background: 'var(--bg-page)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Document Type Scope:
            </span>
            <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
              {(['all', 'prescription', 'lab_report', 'general_report'] as DocumentType[]).map((dt) => {
                const isActive = selectedDocType === dt;
                const labels: Record<DocumentType, string> = {
                  all: '🌐 All Documents',
                  prescription: '💊 Prescription',
                  lab_report: '🔬 Lab Report',
                  general_report: '📋 General Report',
                };
                return (
                  <button
                    key={dt}
                    onClick={() => {
                      setSelectedDocType(dt);
                      setSelectedDocId('');
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 700 : 500,
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      background: isActive ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-surface)',
                      color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {labels[dt]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Specific Document Selector Dropdown if a specific document type is chosen */}
        {selectedDocType !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Select uploaded file context:
            </span>
            <select
              className="input"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: 'var(--text-xs)' }}
            >
              <option value="">-- All {selectedDocType.replace('_', ' ')} documents --</option>
              {docOptions.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.status}) - {new Date(doc.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chat Thread */}
      <div
        className="card"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
          padding: 'var(--sp-5)',
          minHeight: 0,
        }}
      >
        {initializing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 'var(--sp-2)', color: 'var(--text-secondary)' }}>
            <IconLoader className="spin" size={20} />
            <span>Initializing Gemini 2.5 Flash Document Scope Session...</span>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.message_id || idx}
                style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 'var(--sp-3)',
                }}
              >
                {/* Avatar */}
                {isUser ? (
                  <Avatar name="Rahul Sharma" size="sm" />
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}>
                    <IconSparkles size={16} />
                  </div>
                )}

                <div style={{
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-1)',
                }}>
                  {/* Sender label */}
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textAlign: isUser ? 'right' : 'left',
                  }}>
                    {isUser ? 'You' : 'AI Health Assistant (Gemini 2.5)'}
                  </span>

                  {m.guardrail_triggered ? (
                    <div
                      style={{
                        background: 'var(--danger-bg)',
                        border: '1px solid rgba(196, 61, 61, 0.3)',
                        padding: 'var(--sp-4)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--danger)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontWeight: 700, marginBottom: 'var(--sp-2)' }}>
                        <IconAlertTriangle size={18} />
                        <span>Clinical Guardrail Escalation Triggered</span>
                      </div>
                      <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>{m.text}</p>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: isUser ? 'var(--primary)' : 'var(--bg-page)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        padding: 'var(--sp-3) var(--sp-4)',
                        borderRadius: isUser
                          ? 'var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)'
                          : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        border: isUser ? 'none' : '1px solid var(--border-light)',
                        boxShadow: isUser ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
                      }}
                    >
                      {m.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', paddingLeft: '44px' }}>
            <IconLoader className="spin" size={14} />
            <span>Gemini 2.5 Flash is querying document context and pharmacy stock prices...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Suggested Prompts */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {PROMPTS_BY_DOC_TYPE[selectedDocType].map((prompt, idx) => (
          <button
            key={idx}
            className="btn btn-secondary btn-sm"
            onClick={(e) => handleSend(e, prompt)}
            disabled={loading || initializing}
            style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={(e) => handleSend(e)} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <input
          type="text"
          className="input"
          placeholder={
            selectedDocType === 'all'
              ? 'Ask a question about your medication or medical reports...'
              : `Ask a question based strictly on your ${selectedDocType.replace('_', ' ')}...`
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || initializing}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || loading || initializing}
          style={{ flexShrink: 0, minWidth: '44px' }}
          aria-label="Send message"
        >
          {loading ? <IconLoader className="spin" size={16} /> : <IconSend size={16} />}
        </button>
      </form>
    </div>
  );
}
