'use client';

/**
 * Floating vehicle assistant chat widget.
 * Mounted globally in layout.tsx so it's available on every page.
 * Optionally accepts diagnosisContext (from the result page) to ground
 * answers in the current diagnosis without the user re-explaining it.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/contexts/ChatContext';

interface ChatWidgetProps {
  diagnosisContext?: Record<string, any>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ diagnosisContext }) => {
  const { messages, sendMessage, loading, error } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    sendMessage(text, diagnosisContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ background: 'var(--accent-signal)', color: '#0b0f14' }}
          aria-label="Open vehicle assistant chat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-3rem)] rounded flex flex-col overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-hairline)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-hairline)', background: 'var(--bg-panel-raised)' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
              <span className="font-display font-semibold text-[13px]">Vehicle Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="font-mono text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Ask about a noise, warning light, or symptom — e.g. &quot;my
                brakes squeal when I stop&quot; or &quot;what does this
                diagnosis mean?&quot;
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={
                    m.role === 'user'
                      ? { background: 'var(--accent-signal-dim)', color: 'var(--text-primary)', border: '1px solid var(--accent-signal)' }
                      : { background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider"
                  style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-hairline)', color: 'var(--text-tertiary)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
                  Thinking
                </div>
              </div>
            )}

            {error && (
              <div
                className="px-3 py-2 rounded font-mono text-[11px]"
                style={{ background: 'var(--status-high-dim)', border: '1px solid var(--status-high)', color: 'var(--status-high)' }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the issue…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none py-2 px-1"
              style={{ color: 'var(--text-primary)', maxHeight: '100px' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center transition-all"
              style={{
                background: loading || !input.trim() ? 'var(--bg-panel-raised)' : 'var(--accent-signal)',
                color: loading || !input.trim() ? 'var(--text-tertiary)' : '#0b0f14',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div
            className="px-4 py-1.5 flex-shrink-0 font-mono text-[9px] text-center"
            style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-hairline)' }}
          >
            General guidance only — not a substitute for a certified mechanic
          </div>
        </div>
      )}
    </>
  );
};
