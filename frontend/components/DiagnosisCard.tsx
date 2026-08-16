'use client';

/**
 * Diagnosis Card Component
 * Displays diagnosis results
 */

import React from 'react';

interface Diagnosis {
  type: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  parts: string[];
  emoji?: string;
  confidence?: number;
  detected_object?: string;
}

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
}

const severityConfig = {
  low: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    label: '⚠️ Low Priority',
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    label: '⚠️ Medium Priority',
  },
  high: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    label: '🚨 High Priority - Immediate Action Needed',
  },
};

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis }) => {
  const severity = (diagnosis.severity in severityConfig ? diagnosis.severity : 'low') as keyof typeof severityConfig;
  const config = severityConfig[severity];

  return (
    <div className={`rounded-lg border-2 ${config.border} ${config.bg} p-6 mb-6`}>
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold">
            {diagnosis.emoji || '🔍'} {diagnosis.issue}
          </h2>
        </div>

        <div className={`inline-block px-4 py-1 rounded-full ${config.text} font-semibold text-sm`}>
          {config.label}
        </div>
      </div>

      <div className="bg-white bg-opacity-60 rounded p-4 mb-4">
        <p className="text-gray-800 leading-relaxed">{diagnosis.recommendation}</p>
      </div>

      {diagnosis.parts && diagnosis.parts.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-2">📦 Parts to Replace:</h3>
          <ul className="list-disc list-inside space-y-1">
            {diagnosis.parts.map((part, idx) => (
              <li key={idx} className="text-gray-700">
                {part}
              </li>
            ))}
          </ul>
        </div>
      )}

      {diagnosis.confidence !== undefined && (
        <div className="mt-4 pt-4 border-t border-opacity-20 border-current">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Detection Confidence:</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    diagnosis.confidence > 0.7
                      ? 'bg-green-500'
                      : diagnosis.confidence > 0.5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${diagnosis.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold">
                {(diagnosis.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
