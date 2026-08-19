'use client';

/**
 * Chat Context — manages the vehicle assistant conversation.
 */

import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (text: string, diagnosisContext?: Record<string, any>) => Promise<void>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string, diagnosisContext?: Record<string, any>) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        messages: nextMessages,
        diagnosis_context: diagnosisContext || null,
      });

      const reply: ChatMessage = { role: 'assistant', content: response.data.reply };
      setMessages([...nextMessages, reply]);
    } catch (err) {
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : 'Failed to reach the assistant. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, loading, error, reset }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
