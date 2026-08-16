'use client';

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
  method?: string;
}

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
}

const severityConfig = {
  low: {
    color: 'var(--status-low)',
    bg: 'color-mix(in srgb, var(--status-low) 10%, transparent)',
    label: 'Low severity',
    icon: '✓',
  },
  medium: {
    color: 'var(--status-medium)',
    bg: 'color-mix(in srgb, var(--status-medium) 10%, transparent)',
    label: 'Needs attention',
    icon: '!',
  },
  high: {
    color: 'var(--status-high)',
    bg: 'color-mix(in srgb, var(--status-high) 10%, transparent)',
    label: 'Act soon',
    icon: '!',
  },
};

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis }) => {
  const key = diagnosis.severity in severityConfig ? diagnosis.severity : 'low';
  const config = severityConfig[key];
  const confidencePct =
    diagnosis.confidence !== undefined
      ? Math.max(0, Math.min(100, Math.round(diagnosis.confidence * 100)))
      : null;

  return (
    <article
      className="mb-6 overflow-hidden rounded-3xl border shadow-[0_18px_55px_rgba(15,23,42,0.18)]"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
        boxShadow: '0 18px 55px rgba(2, 6, 23, 0.38)',
      }}
    >
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${config.color}, color-mix(in srgb, ${config.color} 25%, transparent))`,
        }}
      />

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
              style={{ color: config.color, background: config.bg }}
              aria-hidden="true"
            >
              {diagnosis.emoji || config.icon}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                Diagnosis
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: config.color }}>
                {config.label}
              </div>
            </div>
          </div>

          {diagnosis.detected_object && (
            <span
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: 'color-mix(in srgb, var(--text-primary) 9%, transparent)',
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
              }}
            >
              {diagnosis.detected_object}
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold leading-tight sm:text-2xl" style={{ color: '#f8fafc' }}>
          {diagnosis.issue}
        </h2>

        {diagnosis.type && (
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
            {diagnosis.type}
          </p>
        )}

        <div
          className="mt-5 rounded-2xl border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)',
            background: 'color-mix(in srgb, var(--accent-signal) 3.5%, transparent)',
          }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--accent-signal)' }}
            />
            Recommended next step
          </div>
          <p className="text-sm leading-6" style={{ color: '#e2e8f0' }}>
            {diagnosis.recommendation}
          </p>
        </div>

        {diagnosis.parts?.length > 0 && (
          <div className="mt-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
              Parts to check
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {diagnosis.parts.map((part, idx) => (
                <div
                  key={`${part}-${idx}`}
                  className="flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm"
                  style={{
                    borderColor: 'rgba(148, 163, 184, 0.16)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#f8fafc',
                  }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-signal) 10%, transparent)',
                      color: 'var(--accent-signal)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  {part}
                </div>
              ))}
            </div>
          </div>
        )}

        {confidencePct !== null && (
          <div className="mt-6 border-t pt-5" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Detection confidence
              </span>
              <span className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
                {confidencePct}%
              </span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={confidencePct}
              aria-label={`Detection confidence ${confidencePct}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${confidencePct}%`,
                  background: config.color,
                }}
              />
            </div>

            {diagnosis.method && (
              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Method: {diagnosis.method}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
