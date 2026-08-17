'use client';

import { FormEvent, useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    () => `I reviewed the vehicle condition. The issue appears to be: ${issue} The recommended solution is: ${recommendation}`,
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
    <Card className="overflow-hidden border transition-all duration-300" style={{ borderColor: 'var(--border-hairline-strong)', background: 'var(--bg-panel)' }}>
      <CardHeader
        className="flex flex-row items-center justify-between gap-3 px-6 py-4"
        style={{ background: 'var(--accent-diagnostic-dim)', borderBottom: '2px solid var(--accent-diagnostic)' }}
      >
        <div className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-diagnostic)' }}>
          <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
          Vehicle Assistant
        </div>

        <Badge className="border-0 px-3 py-1 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-panel-raised)' }}>
          {loading ? 'thinking…' : 'solution mode'}
        </Badge>
      </CardHeader>

      <ScrollArea className="h-[400px] bg-[color:var(--bg-base)] p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex animate-fadeIn gap-3"
              style={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {message.sender === 'bot' && (
                <Avatar className="mt-0.5 h-8 w-8 border border-[color:var(--accent-diagnostic)] bg-[color:var(--accent-diagnostic-dim)]">
                  <AvatarFallback className="bg-transparent text-[color:var(--accent-diagnostic)]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
                    </svg>
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className="max-w-[80%] whitespace-normal break-words px-4 py-3 text-[14px] leading-relaxed"
                style={{
                  background: message.sender === 'user' ? 'var(--accent-signal)' : 'var(--bg-panel-raised)',
                  border: message.sender === 'user' ? 'none' : '1px solid var(--border-hairline)',
                  borderLeft: message.sender === 'user' ? 'none' : '3px solid var(--accent-diagnostic)',
                  color: message.sender === 'user' ? '#0a0c10' : 'var(--text-primary)',
                  fontWeight: message.sender === 'user' ? 600 : 400,
                  borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 4px',
                }}
              >
                {message.text}
              </div>

              {message.sender === 'user' && (
                <Avatar className="mt-0.5 h-8 w-8 border border-[color:var(--border-hairline-strong)] bg-[color:var(--bg-panel-raised)]">
                  <AvatarFallback className="bg-transparent text-[color:var(--text-secondary)]">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-[color:var(--accent-diagnostic)] bg-[color:var(--accent-diagnostic-dim)]">
                <AvatarFallback className="bg-transparent text-[color:var(--accent-diagnostic)]">
                  <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
                  </svg>
                </AvatarFallback>
              </Avatar>

              <div
                className="flex items-center gap-1.5 px-4 py-3"
                style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-hairline)', borderLeft: '3px solid var(--accent-diagnostic)', borderRadius: '4px 18px 18px 4px' }}
              >
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-diagnostic)', animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-diagnostic)', animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-diagnostic)', animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="border-t p-3.5" style={{ borderColor: 'var(--border-hairline)', background: 'var(--bg-panel-raised)' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 transition-colors" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-hairline-strong)' }}>
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about the issue or solution…"
            disabled={loading}
            className="h-10 flex-1 border-0 bg-transparent px-0 text-[14px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ color: 'var(--text-primary)' }}
          />

          <Button
            type="submit"
            disabled={loading}
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
            style={{ background: 'var(--accent-diagnostic)', color: '#0a0c10' }}
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" />
              </svg>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
