'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  const confColor = confidencePct === null ? config.color : confidencePct > 70 ? 'var(--accent-diagnostic)' : confidencePct > 45 ? 'var(--status-medium)' : 'var(--status-high)';

  return (
    <Card className="overflow-hidden border transition-all duration-300" style={{ borderColor: 'var(--border-hairline-strong)', background: 'var(--bg-panel)' }}>
      <CardHeader
        className="flex flex-row items-center justify-between gap-3 px-6 py-4"
        style={{ background: config.dim, borderBottom: `2px solid ${config.color}` }}
      >
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
          <span className="h-2 w-2 rounded-full pulse-dot" style={{ background: config.color }} />
          {config.label}
        </div>

        {diagnosis.detected_object && (
          <Badge className="border-0 px-3 py-1 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-panel-raised)' }}>
            {diagnosis.detected_object}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="space-y-4">
          <h2 className="font-display text-[22px] font-bold leading-tight break-words text-balance" style={{ color: 'var(--text-primary)' }}>
            {diagnosis.issue}
          </h2>

          <p className="text-[14px] leading-relaxed break-words whitespace-normal" style={{ color: 'var(--text-secondary)' }}>
            {diagnosis.recommendation}
          </p>
        </div>

        {diagnosis.parts && diagnosis.parts.length > 0 && (
          <div className="space-y-4">
            <Separator className="h-px w-full" style={{ background: 'var(--border-hairline)' }} />
            <div className="space-y-3 rounded-lg border p-4" style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Parts to replace
              </div>

              <ul className="space-y-2.5">
                {diagnosis.parts.map((part, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] font-medium leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent-signal)' }} />
                    <span className="min-w-0 break-words whitespace-normal">{part}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {confidencePct !== null && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Detection confidence
              </span>
              <Badge
                className="border-0 px-3 py-1 font-mono text-[13px] font-bold"
                style={{ color: confColor, background: confidencePct > 70 ? 'var(--accent-diagnostic-dim)' : confidencePct > 45 ? 'var(--status-medium-dim)' : 'var(--status-high-dim)' }}
              >
                {confidencePct}%
              </Badge>
            </div>

            <Progress
              value={confidencePct}
              className="h-2.5 overflow-hidden border"
              style={{ background: 'var(--bg-base)', borderColor: 'var(--border-hairline)' }}
              indicatorStyle={{ background: confColor }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
