'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';

interface ChatMessage {
  id: number;
  sender: 'bot' | 'user';
  text: string;
}

interface ChatWidgetProps {
  isCompact?: boolean;
}

function TypingMessage({ text, speed = 12 }: { text: string; speed?: number }) {
  const [visibleText, setVisibleText] = useState('');

  useEffect(() => {
    let index = 0;
    setVisibleText('');

    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
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
          style={{ background: 'var(--accent-signal)' }}
        />
      )}
    </span>
  );
}

function BotAvatar() {
  return (
    <div
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent-signal) 18%, white), color-mix(in srgb, var(--accent-signal) 8%, transparent))',
        border: '1px solid color-mix(in srgb, var(--accent-signal) 22%, transparent)',
        color: 'var(--accent-signal)',
      }}
      aria-hidden="true"
    >
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m7-2a8 8 0 0 1-8 8 8.9 8.9 0 0 1-3.6-.76L4 20l.76-3.4A8 8 0 1 1 20 12Z" />
      </svg>
    </div>
  );
}

export function ChatWidget({ isCompact = false }: ChatWidgetProps) {
  const { chatWithVehicleAssistant, loading } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I’m VEHIQ Assistant. I can help with maintenance, parts, diagnosis, and pricing. What can I help you with?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(!isCompact);
  const [typingId, setTypingId] = useState<number | null>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typingId, loading]);

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
      const response = await chatWithVehicleAssistant(trimmed, {});
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
        text: 'Sorry, I couldn’t process that request. Please try again or contact support.',
      };

      setMessages((current) => [...current, errorReply]);
      setTypingId(errorReply.id);
    }
  };

  if (isCompact && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)] focus:outline-none focus:ring-4"
        style={{
          background: 'linear-gradient(135deg, var(--accent-signal), color-mix(in srgb, var(--accent-signal) 72%, #0f172a))',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.15) inset, 0 12px 32px rgba(0,0,0,0.22)',
        }}
        title="Open VEHIQ Assistant"
        aria-label="Open VEHIQ Assistant"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 18.5 4 20l.8-3.4A8 8 0 1 1 20 12a8 8 0 0 1-8 8H7Z" />
        </svg>
      </button>
    );
  }

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-signal) 14%, var(--text-primary) 8%)',
        background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
      }}
      aria-label="VEHIQ Assistant"
    >
      <header
        className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <BotAvatar />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                VEHIQ Assistant
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold"
                style={{
                  background: 'color-mix(in srgb, var(--accent-signal) 10%, transparent)',
                  color: 'var(--accent-signal)',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
                {loading ? 'Thinking' : 'Online'}
              </span>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Vehicle knowledge at your fingertips
            </p>
          </div>
        </div>

        {isCompact && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl p-2 transition hover:bg-black/5"
            style={{ color: 'var(--text-tertiary)' }}
            title="Close chat"
            aria-label="Close chat"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        )}
      </header>

      <div
        className="max-h-[520px] min-h-[320px] space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 1.5%, transparent)' }}
      >
        {messages.map((message) => {
          const isBot = message.sender === 'bot';
          const isTyping = isBot && typingId === message.id;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              aria-live={isTyping ? 'polite' : undefined}
            >
              {isBot && <BotAvatar />}

              <div className={`max-w-[82%] sm:max-w-[72%] ${isBot ? '' : 'order-first'}`}>
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
                  style={
                    isBot
                      ? {
                          background: 'linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.92))',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          color: '#f8fafc',
                          borderTopLeftRadius: '7px',
                        }
                      : {
                          background: 'linear-gradient(135deg, var(--accent-signal), #e58b2c)',
                          color: '#ffffff',
                          boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
                          borderTopRightRadius: '7px',
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
                    background: 'color-mix(in srgb, var(--accent-signal) 9%, transparent)',
                    color: 'var(--accent-signal)',
                    border: '1px solid color-mix(in srgb, var(--accent-signal) 16%, transparent)',
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
            <BotAvatar />
            <div
              className="rounded-2xl rounded-tl-md border px-4 py-3"
              style={{
                background: 'var(--surface-card, rgba(255,255,255,0.86))',
                borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
              }}
            >
              <div className="flex items-center gap-1.5" aria-label="Assistant is thinking">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full"
                    style={{ background: 'var(--accent-signal)', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t p-3 sm:p-4"
        style={{
          borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
          background: 'var(--surface-card, rgba(255,255,255,0.78))',
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border p-1.5 transition focus-within:ring-4"
          style={{
            borderColor: 'rgba(255, 166, 61, 0.28)',
            background: 'rgba(15, 23, 42, 0.96)',
            boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.08)',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about maintenance, parts, diagnosis..."
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: '#f8fafc', caretColor: 'var(--accent-signal)' }}
            aria-label="Message VEHIQ Assistant"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: 'var(--accent-signal)' }}
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
