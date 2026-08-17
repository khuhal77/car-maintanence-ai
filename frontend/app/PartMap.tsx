'use client';

import { useState } from 'react';

import { Tooltip } from '@/components/ui/tooltip';

export type PartEntry = {
  code: string;
  name: string;
  detects: string;
  x: number;
  y: number;
};

export const PART_INDEX: PartEntry[] = [
  { code: 'BAT-01', name: 'Battery', detects: 'Corrosion, terminal wear, swelling, charge indicators.', x: 176, y: 122 },
  { code: 'CLT-08', name: 'Coolant', detects: 'Reservoir level, colour, and leak staining at the radiator.', x: 138, y: 148 },
  { code: 'SPK-03', name: 'Spark Plugs', detects: 'Electrode wear, carbon fouling, oil deposits.', x: 214, y: 110 },
  { code: 'AIR-04', name: 'Air Filter', detects: 'Dust loading, debris, and torn filter media.', x: 236, y: 138 },
  { code: 'OIL-05', name: 'Oil Filter', detects: 'Housing corrosion, seal seepage, over-tightening damage.', x: 206, y: 176 },
  { code: 'BRK-02', name: 'Brake Pads', detects: 'Pad thickness, rotor scoring, glazing.', x: 232, y: 196 },
  { code: 'TIR-06', name: 'Tires', detects: 'Tread depth, sidewall cracking, uneven wear.', x: 572, y: 196 },
  { code: 'WIP-07', name: 'Wiper Blades', detects: 'Rubber splitting, streak lines, frame corrosion.', x: 396, y: 88 },
];

export function PartMap({
  activeCode,
  onHover,
  onSelect,
}: {
  activeCode: string | null;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
}) {
  const [focusCode, setFocusCode] = useState<string | null>(null);
  const shown = activeCode ?? focusCode;

  return (
    <svg
      viewBox="0 0 800 260"
      className="w-full h-auto"
      role="img"
      aria-label="Diagram of a vehicle with tappable diagnostic points"
    >
      <line x1="50" y1="232" x2="750" y2="232" stroke="var(--border-hairline)" strokeWidth="1" />

      {/* car body */}
      <rect x="140" y="120" width="520" height="72" rx="16" fill="none" stroke="var(--border-hairline-strong)" strokeWidth="1.5" />
      <path
        d="M 300 120 L 350 60 L 470 60 L 520 120"
        fill="none"
        stroke="var(--border-hairline-strong)"
        strokeWidth="1.5"
      />
      <line x1="382" y1="63" x2="382" y2="120" stroke="var(--border-hairline)" strokeWidth="1" />
      <circle cx="230" cy="195" r="34" fill="var(--bg-panel)" stroke="var(--border-hairline-strong)" strokeWidth="1.5" />
      <circle cx="230" cy="195" r="14" fill="none" stroke="var(--border-hairline)" strokeWidth="1" />
      <circle cx="570" cy="195" r="34" fill="var(--bg-panel)" stroke="var(--border-hairline-strong)" strokeWidth="1.5" />
      <circle cx="570" cy="195" r="14" fill="none" stroke="var(--border-hairline)" strokeWidth="1" />

      {/* hotspots */}
      {PART_INDEX.map((part) => {
        const isShown = shown === part.code;
        return (
          <g
            key={part.code}
            onMouseEnter={() => {
              setFocusCode(part.code);
              onHover(part.code);
            }}
            onMouseLeave={() => {
              setFocusCode(null);
              onHover(null);
            }}
            onClick={() => onSelect(part.code)}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
            role="button"
            aria-label={`${part.name}: ${part.detects}`}
            onFocus={() => {
              setFocusCode(part.code);
              onHover(part.code);
            }}
            onBlur={() => {
              setFocusCode(null);
              onHover(null);
            }}
          >
            <foreignObject x={part.x - 18} y={part.y - 18} width={36} height={36}>
              <Tooltip
                content={
                  <div className="space-y-1 text-left">
                    <div className="font-display text-[11px] font-bold leading-none text-foreground">{part.name}</div>
                    <div className="text-[9px] leading-relaxed text-muted-foreground">{part.detects}</div>
                  </div>
                }
                className="pointer-events-none h-full w-full"
              >
                <button
                  type="button"
                  aria-label={`${part.name}: ${part.detects}`}
                  className="block h-full w-full rounded-full bg-transparent opacity-0 outline-none focus-visible:opacity-100"
                  onClick={() => onSelect(part.code)}
                  onFocus={() => {
                    setFocusCode(part.code);
                    onHover(part.code);
                  }}
                  onBlur={() => {
                    setFocusCode(null);
                    onHover(null);
                  }}
                />
              </Tooltip>
            </foreignObject>

            <circle cx={part.x} cy={part.y} r="16" fill="transparent" />
            <circle
              cx={part.x}
              cy={part.y}
              r={isShown ? 8 : 6}
              fill={isShown ? 'var(--accent-cyan)' : 'var(--accent-signal)'}
              className={isShown ? '' : 'pulse-dot'}
              style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
            />
            <circle
              cx={part.x}
              cy={part.y}
              r={isShown ? 14 : 0}
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="1"
              opacity="0.6"
              style={{ transition: 'r 0.15s ease' }}
            />
          </g>
        );
      })}
    </svg>
  );
}
