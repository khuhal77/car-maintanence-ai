'use client';

import { FormEvent, useState, useRef, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';

interface ChatMessage {
  id: number;
  sender: 'bot' | 'user';
  text: string;
}

interface ChatWidgetProps {
  isCompact?: boolean;
}

export function ChatWidget({ isCompact = false }: ChatWidgetProps) {
  const { chatWithVehicleAssistant, loading } = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I\'m VEHIQ Assistant. I can help answer questions about car maintenance, parts, diagnosis, and pricing. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(!isCompact);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      const response = await chatWithVehicleAssistant(trimmed, {});
      const botReply: ChatMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: response.reply,
      };
      setMessages((current) => [...current, botReply]);
    } catch {
      const errorReply: ChatMessage = {
        id: Date.now() + 2,
        sender: 'bot',
        text: 'Sorry, I couldn\'t process that request. Please try again or contact support.',
      };
      setMessages((current) => [...current, errorReply]);
    }
  };

  if (isCompact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-40 transition-transform hover:scale-110 shadow-lg"
        style={{ background: 'var(--accent-signal)', color: '#fff' }}
        title="Open chat"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="rounded overflow-hidden mb-6"
      style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--accent-signal-dim)', borderBottom: '1px solid var(--accent-signal)' }}
      >
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent-signal)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-signal)' }} />
          Chat Assistant
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {loading ? 'thinking...' : 'online'}
          </span>
          {isCompact && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex"
            style={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="max-w-[85%] rounded px-3 py-2 text-[13px] leading-relaxed"
              style={{
                background: message.sender === 'user' ? 'var(--accent-signal)' : 'var(--bg-panel-raised)',
                color: message.sender === 'user' ? '#0b0f14' : 'var(--text-primary)',
              }}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t p-3 flex gap-2"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded text-[13px] border"
          style={{
            background: 'var(--bg-base)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded text-[13px] font-mono font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent-signal)', color: '#0b0f14' }}
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
