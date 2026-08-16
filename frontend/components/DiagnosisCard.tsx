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
  low: { color: 'var(--status-low)', dim: 'var(--status-low-dim)', label: 'LOW SEVERITY' },
  medium: { color: 'var(--status-medium)', dim: 'var(--status-medium-dim)', label: 'MEDIUM SEVERITY' },
  high: { color: 'var(--status-high)', dim: 'var(--status-high-dim)', label: 'HIGH SEVERITY — ACT SOON' },
};

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis }) => {
  const key = (diagnosis.severity in severityConfig ? diagnosis.severity : 'low') as keyof typeof severityConfig;
  const config = severityConfig[key];
  const confidencePct = diagnosis.confidence !== undefined ? Math.round(diagnosis.confidence * 100) : null;

  return (
    <div className="rounded overflow-hidden mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
      {/* Status strip */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: config.dim, borderBottom: `1px solid ${config.color}` }}>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: config.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: config.color }} />
          {config.label}
        </div>
        {diagnosis.detected_object && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            source: {diagnosis.detected_object}
          </span>
        )}
      </div>

      <div className="p-6">
        <h2 className="font-display font-semibold text-[22px] leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
          {diagnosis.issue}
        </h2>

        <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {diagnosis.recommendation}
        </p>

        {diagnosis.parts && diagnosis.parts.length > 0 && (
          <div className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Parts to replace
            </div>
            <div className="space-y-1.5">
              {diagnosis.parts.map((part, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--text-primary)' }}>
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--accent-signal)' }} />
                  {part}
                </div>
              ))}
            </div>
          </div>
        )}

        {confidencePct !== null && (
          <div className="pt-5" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Detection confidence
              </span>
              <span className="font-mono text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {confidencePct}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-panel-raised)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${confidencePct}%`,
                  background: confidencePct > 70 ? 'var(--accent-diagnostic)' : confidencePct > 45 ? 'var(--status-medium)' : 'var(--status-high)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
