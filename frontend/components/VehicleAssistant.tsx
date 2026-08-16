'use client';

import { FormEvent, useMemo, useState } from 'react';
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

export function VehicleAssistant({ diagnosis }: VehicleAssistantProps) {
  const { chatWithVehicleAssistant, loading } = useApi();
  const issue = diagnosis.issue || 'Could not identify the vehicle issue clearly.';
  const recommendation = diagnosis.recommendation || 'Please inspect the vehicle with a mechanic to confirm the next steps.';

  const defaultBotMessage = useMemo(
    () =>
      `I reviewed the vehicle condition. The issue appears to be: ${issue} The recommended solution is: ${recommendation}`,
    [issue, recommendation],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'bot',
      text: defaultBotMessage,
    },
  ]);
  const [input, setInput] = useState('');

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
      const response = await chatWithVehicleAssistant(trimmed, diagnosis);
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
        text: `I couldn’t reach the assistant right now. Based on the diagnosis, the main issue is: ${issue}. Solution: ${recommendation}`,
      };
      setMessages((current) => [...current, errorReply]);
    }
  };

  return (
    <div className="rounded overflow-hidden mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--accent-diagnostic-dim)', borderBottom: '1px solid var(--accent-diagnostic)' }}>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent-diagnostic)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-diagnostic)' }} />
          Vehicle assistant
        </div>
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {loading ? 'thinking...' : 'solution mode'}
        </span>
      </div>

      <div className="p-5 space-y-3 max-h-[320px] overflow-y-auto">
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
                border: message.sender === 'user' ? 'none' : '1px solid var(--border-hairline)',
              }}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-3" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the issue or solution..."
            className="flex-1 rounded px-3 py-2 text-[13px] border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded font-mono text-[11px] uppercase tracking-wider transition-all disabled:opacity-60"
            style={{ background: 'var(--accent-signal)', color: '#0b0f14' }}
          >
            {loading ? 'Wait' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
