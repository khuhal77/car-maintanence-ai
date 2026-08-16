'use client';

/**
 * API Context for Car Maintenance AI
 * Handles all backend API calls
 */

import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

interface Diagnosis {
  type: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  parts: string[];
  avg_price: number;
  confidence?: number;
  emoji?: string;
  detected_object?: string;
}

interface PriceItem {
  retailer: string;
  logo: string;
  price: number;
  rating: number;
  delivery: string;
  link: string;
}

interface DiagnoseResponse {
  diagnosis: Diagnosis;
  parts: string[];
  avg_price: number;
  part_type: string;
}

interface ChatPayload {
  message: string;
  diagnosis?: Partial<Diagnosis>;
}

interface ChatResponse {
  reply: string;
  provider: string;
}

interface ApiContextType {
  diagnose: (imageBase64: string) => Promise<DiagnoseResponse>;
  getPrices: (partType: string, basePrice: number) => Promise<PriceItem[]>;
  getRetailers: () => Promise<any>;
  chatWithVehicleAssistant: (message: string, diagnosis: Partial<Diagnosis>) => Promise<ChatResponse>;
  loading: boolean;
  error: string | null;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagnose = async (imageBase64: string): Promise<DiagnoseResponse> => {
    setLoading(true);
    setError(null);
    try {
      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const response = await axios.post(`${API_BASE_URL}/api/diagnose`, {
        image_base64: cleanBase64,
      });

      return response.data as DiagnoseResponse;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Diagnosis failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPrices = async (partType: string, basePrice: number): Promise<PriceItem[]> => {
    setLoading(true);
    setError(null);
    try {
      if (!partType || partType === 'unknown' || !Number.isFinite(basePrice) || basePrice <= 0) {
        return [];
      }

      const response = await axios.post(`${API_BASE_URL}/api/prices`, {
        part_type: partType,
        base_price: basePrice,
      });

      return response.data as PriceItem[];
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Price fetch failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getRetailers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/prices/retailers`);
      return response.data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch retailers';
      setError(errorMsg);
      throw err;
    }
  };

  const chatWithVehicleAssistant = async (message: string, diagnosis: Partial<Diagnosis>): Promise<ChatResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/diagnose/chat`, {
        message,
        diagnosis,
      } as ChatPayload);
      return response.data as ChatResponse;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Assistant chat failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApiContext.Provider value={{ diagnose, getPrices, getRetailers, chatWithVehicleAssistant, loading, error }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};
