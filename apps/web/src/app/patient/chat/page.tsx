'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconSparkles, IconAlertTriangle, IconSend, IconLoader } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { apiClient } from '../../../lib/api';
import { ChatMessageItem } from '../../../lib/types';

const SUGGESTED_PROMPTS = [
  'How should I take Augmentin 625 Duo?',
  'What are the side effects of Paracetamol?',
  'Explain my prescription dosage schedule',
  'When should I take Pan-D capsule?',
];

export default function ChatAssistantPage() {
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

  useEffect(() => {
    const initChat = async () => {
      try {
        setInitializing(true);
        // Record consent per DPDP Act / BRD FR-10
        await apiClient.recordAIConsent(true, 'chat_logging').catch(() => {});
        // Create chat session (BRD FR-11)
        const sess = await apiClient.createChatSession(true);
        setSessionId(sess.session_id);

        // Fetch initial history if available
        const hist = await apiClient.getChatHistory(sess.session_id).catch(() => null);
        if (hist && hist.messages.length > 0) {
          setMessages(hist.messages);
        } else {
          // Welcome message if session is fresh
          setMessages([
            {
              message_id: 'welcome',
              session_id: sess.session_id,
              sender: 'assistant',
              text: 'Hello! I am your AI Health Assistant powered by RAG medical knowledge grounding. I can help explain medication instructions, dosage timing, and report values.\n\n⚠️ Disclaimer: I am an AI assistant and do not provide medical diagnoses or replace a licensed physician.',
              is_ai_generated: true,
              guardrail_triggered: false,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (err: any) {
        console.error('Failed to initialize AI Chat Session:', err);
        // Fallback for unauthenticated/offline UI preview
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
  }, []);

  const handleSend = async (e: React.FormEvent, promptText?: string) => {
    e.preventDefault();
    const text = promptText || input.trim();
    if (!text || loading) return;

    const userText = text.trim();
    setInput('');
    setLoading(true);

    // Optimistically append user message
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
        const newSess = await apiClient.createChatSession(true);
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
      // Fallback local guardrail simulation if API is unreachable
      const isEmergency = /chest pain|heart attack|difficulty breathing|emergency/i.test(userText);
      setMessages((prev) => [
        ...prev,
        {
          message_id: `assistant_${Date.now()}`,
          session_id: sessionId || 'preview',
          sender: 'assistant',
          text: isEmergency
            ? '🚨 EMERGENCY ALERT: I detected symptoms that may require urgent medical attention. As an AI health assistant, I cannot diagnose medical conditions. Please contact your nearest emergency healthcare provider or call emergency helpline (112) immediately.'
            : `Regarding your query about "${userText}": Please ensure you follow the exact dosage schedule prescribed by your physician. Let me know if you need information about specific generic alternatives.`,
          is_ai_generated: true,
          guardrail_triggered: isEmergency,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title="AI Health Assistant"
        subtitle="Conversational assistant for medicine guidance and report comprehension (RAG-Grounded)."
      />

      <AIDisclosureBanner />

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
            <span>Initializing RAG Medical Knowledge Base Session...</span>
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
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconSparkles size={14} />
                  </div>
                )}

                <div style={{
                  maxWidth: '80%',
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
                    {isUser ? 'You' : 'AI Health Assistant'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', paddingLeft: '40px' }}>
            <IconLoader className="spin" size={14} />
            <span>AI Assistant is analyzing medical knowledge base...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 2 && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="btn btn-secondary btn-sm"
              onClick={(e) => handleSend(e, prompt)}
              disabled={loading}
              style={{ fontSize: 'var(--text-xs)' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={(e) => handleSend(e)} style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <input
          type="text"
          className="input"
          placeholder="Ask a question about your medication or medical report..."
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
