'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';

interface VehicleAssistantProps {
  diagnosis: {
    type?: string;
    issue?: string;
    severity?: 'low' | 'medium' | 'high';
    recommendation?: string;
    parts?: string[];
    avg_price?: number;
    confidence?: number;
    detected_object?: string;
  };
}

interface ChatMessage {
  id: number;
  sender: 'bot' | 'user';
  text: string;
}

function TypingMessage({ text, speed = 12 }: { text: string; speed?: number }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    let index = 0;
    setVisibleText('');

    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) window.clearInterval(timer);
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {visibleText}
      {visibleText.length < text.length && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-px animate-pulse align-[-2px]"
          style={{ background: 'var(--accent-diagnostic)' }}
        />
      )}
    </span>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{
        background: 'color-mix(in srgb, var(--accent-diagnostic) 11%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent-diagnostic) 18%, transparent)',
        color: 'var(--accent-diagnostic)',
      }}
      aria-hidden="true"
    >
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6M8 8h8M7 12h10M8 16h8M10 20h4M5 4h1M18 4h1M5 20h1M18 20h1" />
      </svg>
    </div>
  );
}

export function VehicleAssistant({ diagnosis }: VehicleAssistantProps) {
  const { chatWithVehicleAssistant, loading } = useApi();
  const issue = diagnosis.issue || 'Could not identify the vehicle issue clearly.';
  const recommendation =
    diagnosis.recommendation ||
    'Please inspect the vehicle with a mechanic to confirm the next steps.';

  const defaultBotMessage = useMemo(
    () =>
      `I reviewed the vehicle condition. The issue appears to be: ${issue} The recommended solution is: ${recommendation}`,
    [issue, recommendation],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'bot', text: defaultBotMessage },
  ]);
  const [input, setInput] = useState('');
  const [typingId, setTypingId] = useState<number | null>(1);

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0].sender === 'bot') {
        return [{ id: 1, sender: 'bot', text: defaultBotMessage }];
      }
      return current;
    });
    setTypingId(1);
  }, [defaultBotMessage]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setTypingId(null);

    try {
      const response = await chatWithVehicleAssistant(trimmed, diagnosis);
      const botReply: ChatMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: response.reply,
      };

      setMessages((current) => [...current, botReply]);
      setTypingId(botReply.id);
    } catch {
      const errorReply: ChatMessage = {
        id: Date.now() + 2,
        sender: 'bot',
        text: `I couldn’t reach the assistant right now. Based on the diagnosis, the main issue is: ${issue}. Solution: ${recommendation}`,
      };

      setMessages((current) => [...current, errorReply]);
      setTypingId(errorReply.id);
    }
  };

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border shadow-[0_18px_55px_rgba(15,23,42,0.10)]"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-diagnostic) 14%, var(--text-primary) 7%)',
        background: 'var(--surface-card, rgba(255,255,255,0.88))',
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)' }}>
        <div className="flex min-w-0 items-center gap-3">
          <AssistantAvatar />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Vehicle Assistant
              </h2>
              <span
                className="rounded-full px-2 py-1 text-[10px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--accent-diagnostic) 10%, transparent)',
                  color: 'var(--accent-diagnostic)',
                }}
              >
                {loading ? 'Thinking' : 'Solution mode'}
              </span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Ask follow-up questions about this diagnosis
            </p>
          </div>
        </div>
      </header>

      <div className="max-h-[430px] min-h-[260px] space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((message) => {
          const isBot = message.sender === 'bot';
          const isTyping = isBot && typingId === message.id;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              aria-live={isTyping ? 'polite' : undefined}
            >
              {isBot && <AssistantAvatar />}

              <div className={`max-w-[82%] sm:max-w-[72%] ${isBot ? '' : 'order-first'}`}>
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-6"
                  style={
                    isBot
                      ? {
                          color: '#f8fafc',
                          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.92))',
                          border: '1px solid rgba(52, 211, 153, 0.22)',
                          borderTopLeftRadius: '7px',
                        }
                      : {
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, var(--accent-signal), #e58b2c)',
                          borderTopRightRadius: '7px',
                          boxShadow: '0 8px 22px rgba(0,0,0,0.14)',
                        }
                  }
                >
                  {isTyping ? <TypingMessage text={message.text} /> : message.text}
                </div>
              </div>

              {!isBot && (
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    color: 'var(--accent-signal)',
                    background: 'color-mix(in srgb, var(--accent-signal) 9%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent-signal) 15%, transparent)',
                  }}
                  aria-hidden="true"
                >
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <AssistantAvatar />
            <div
              className="rounded-2xl rounded-tl-md border px-4 py-3"
              style={{
                background: 'color-mix(in srgb, var(--accent-diagnostic) 4%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent-diagnostic) 10%, transparent)',
              }}
            >
              <div className="flex items-center gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: 'var(--accent-diagnostic)', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t p-3 sm:p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)',
          background: 'color-mix(in srgb, var(--text-primary) 1.5%, transparent)',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border p-1.5 transition focus-within:ring-4"
          style={{
            borderColor: 'rgba(34, 224, 171, 0.24)',
            background: 'rgba(15, 23, 42, 0.96)',
            boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.08)',
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the issue, repair, or next step…"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: '#f8fafc', caretColor: 'var(--accent-diagnostic)' }}
            aria-label="Message Vehicle Assistant"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: 'var(--accent-diagnostic)' }}
            aria-label="Send message"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4 12 15-8-3 16-4-6-8-2Zm8 0 4 4" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  );
}
