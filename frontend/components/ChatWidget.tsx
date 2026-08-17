'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
        style={{
          background: 'var(--bg-panel-raised)',
          border: '1.5px solid var(--accent-signal)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
        title="Open chat"
      >
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: 'var(--accent-signal-dim)', animationDuration: '2.5s' }}
        />
        <svg className="relative h-6 w-6" fill="none" stroke="var(--accent-signal)" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" transform="translate(3 2)" />
        </svg>
        <span
          className="absolute right-0 top-0 h-3 w-3 rounded-full pulse-dot"
          style={{ background: 'var(--accent-diagnostic)', border: '2px solid var(--bg-base)' }}
        />
      </button>
    );
  }

  return (
    <Card
      className="mb-6 w-[360px] max-w-[90vw] overflow-hidden border shadow-2xl transition-all duration-300"
      style={{
        borderColor: 'var(--border-hairline-strong)',
        background: 'var(--bg-panel)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{
          background: 'var(--bg-panel-raised)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9 border border-[color:var(--accent-signal)] bg-[color:var(--accent-signal-dim)]">
              <AvatarFallback className="bg-transparent text-[color:var(--accent-signal)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
                </svg>
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full pulse-dot"
              style={{ background: loading ? 'var(--accent-cyan)' : 'var(--accent-diagnostic)', border: '2px solid var(--bg-panel-raised)' }}
            />
          </div>
          <div>
            <div className="font-display text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              VEHIQ Assistant
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              AI-powered support
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="border-0 bg-transparent px-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full pulse-dot"
              style={{ background: loading ? 'var(--accent-cyan)' : 'var(--accent-diagnostic)' }}
            />
            {loading ? 'thinking' : 'online'}
          </Badge>

          {isCompact && (
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-[color:var(--text-tertiary)] hover:bg-muted"
              title="Close chat"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[420px] bg-[color:var(--bg-base)] p-5" style={{ background: 'var(--bg-base)' }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex animate-fadeIn gap-2.5"
              style={{ justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {message.sender === 'bot' && (
                <Avatar className="mt-0.5 h-7 w-7 border border-[color:var(--accent-signal)] bg-[color:var(--accent-signal-dim)]">
                  <AvatarFallback className="bg-transparent text-[color:var(--accent-signal)]">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
                    </svg>
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className="max-w-[80%] whitespace-normal break-words px-4 py-2.5 text-[13.5px] leading-relaxed"
                style={{
                  background: message.sender === 'user' ? 'var(--accent-signal)' : 'var(--bg-panel)',
                  border: message.sender === 'user' ? 'none' : '1px solid var(--border-hairline)',
                  color: message.sender === 'user' ? '#0a0c10' : 'var(--text-primary)',
                  fontWeight: message.sender === 'user' ? 600 : 400,
                  borderRadius: message.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                }}
              >
                {message.text}
              </div>

              {message.sender === 'user' && (
                <Avatar className="mt-0.5 h-7 w-7 border border-[color:var(--border-hairline-strong)] bg-[color:var(--bg-panel-raised)]">
                  <AvatarFallback className="bg-transparent text-[color:var(--text-secondary)]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7 border border-[color:var(--accent-signal)] bg-[color:var(--accent-signal-dim)]">
                <AvatarFallback className="bg-transparent text-[color:var(--accent-signal)]">
                  <svg className="h-3.5 w-3.5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 20 20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4l-4 2V5z" />
                  </svg>
                </AvatarFallback>
              </Avatar>

              <div
                className="flex items-center gap-1.5 px-4 py-2.5"
                style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-hairline)', borderRadius: '16px 16px 16px 4px' }}
              >
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-signal)', animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-signal)', animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent-signal)', animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t p-3"
        style={{ borderColor: 'var(--border-hairline)', background: 'var(--bg-panel-raised)' }}
      >
        <div className="flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 transition-colors" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-hairline-strong)' }}>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={loading}
            className="h-9 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ color: 'var(--text-primary)' }}
          />

          <Button
            type="submit"
            disabled={loading || !input.trim()}
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
            style={{ background: 'var(--accent-signal)', color: '#0a0c10' }}
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
        </div>
      </form>
    </Card>
  );
}
