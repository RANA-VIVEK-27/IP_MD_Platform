'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AIDisclosureBanner } from '../../../components/Badges';
import { IconSparkles, IconAlertTriangle, IconSend, IconUser } from '../../../components/Icons';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';

const SUGGESTED_PROMPTS = [
  'How should I take Augmentin 625 Duo?',
  'What are the side effects of Paracetamol?',
  'Explain my prescription dosage schedule',
  'When should I take Pan-D capsule?',
];

export default function ChatAssistantPage() {
  const [hasConsent, setHasConsent] = useState(true);
  const [messages, setMessages] = useState<{ sender: 'user' | 'assistant'; text: string; isGuardrail?: boolean }[]>([
    {
      sender: 'assistant',
      text: 'Hello Rahul! I am your AI Health Assistant. I can help explain medication instructions, dosage timing, and general health information. Please note that I do not provide clinical diagnosis.',
    },
    {
      sender: 'user',
      text: 'What should I keep in mind when taking Augmentin 625 Duo?',
    },
    {
      sender: 'assistant',
      text: 'Augmentin 625 Duo contains Amoxicillin and Clavulanic Acid. Key points to remember:\n\n1. Take it with or immediately after a meal to minimize stomach upset.\n2. Complete the full 5-day course prescribed by Dr. Sen even if symptoms improve early.\n3. Drink plenty of water throughout the day.\n\nIf you experience any severe allergic reactions (such as skin rashes or breathing difficulty), contact emergency care immediately.',
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent, promptText?: string) => {
    e.preventDefault();
    const text = promptText || input.trim();
    if (!text) return;

    const userText = text.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    const isEmergency = /chest pain|heart attack|diagnose me|emergency/i.test(userText);

    setTimeout(() => {
      if (isEmergency) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: 'I detected symptoms that may require urgent medical attention. As an AI health assistant, I cannot diagnose medical conditions. Please contact your nearest emergency healthcare provider or call the national emergency helpline (112) immediately.',
            isGuardrail: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `Regarding your query about "${userText}": Please ensure you follow the exact dosage schedule prescribed by your physician. Let me know if you need information about specific generic alternatives.`,
          },
        ]);
      }
    }, 600);
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title="AI Health Assistant"
        subtitle="Conversational assistant for medicine guidance and report comprehension."
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
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={idx}
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
                  {isUser ? 'You' : 'AI Assistant'}
                </span>

                {m.isGuardrail ? (
                  <div
                    style={{
                      background: 'var(--danger-bg)',
                      border: '1px solid rgba(196, 61, 61, 0.2)',
                      padding: 'var(--sp-4)',
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--danger)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
                      <IconAlertTriangle size={16} />
                      <span>Clinical Guardrail Triggered</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{m.text}</p>
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
                    }}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              className="btn btn-secondary btn-sm"
              onClick={(e) => handleSend(e, prompt)}
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
          placeholder="Ask a question about your medication..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim()}
          style={{ flexShrink: 0, minWidth: '44px' }}
          aria-label="Send message"
        >
          <IconSend size={16} />
        </button>
      </form>
    </div>
  );
}
