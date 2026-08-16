'use client';

import React from 'react';

interface PriceItem {
  retailer: string;
  logo: string;
  price: number;
  rating: number;
  delivery: string;
  link: string;
}

interface PriceComparisonProps {
  prices: PriceItem[];
  loading?: boolean;
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({ prices, loading = false }) => {
  if (loading) {
    return (
      <div className="rounded p-8 text-center mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
        <div className="flex items-center justify-center gap-2 font-mono text-[12px] uppercase tracking-wider" style={{ color: 'var(--accent-signal)' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
          Scanning retailers
        </div>
      </div>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <div className="rounded p-8 text-center mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No pricing data available</p>
      </div>
    );
  }

  const minPrice = Math.min(...prices.map((p) => p.price));
  const maxPrice = Math.max(...prices.map((p) => p.price));
  const savings = maxPrice - minPrice;

  return (
    <div className="rounded overflow-hidden mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
        <h3 className="font-display font-semibold text-[17px]">Retailer comparison</h3>
        <span className="font-mono text-[11px]" style={{ color: 'var(--accent-diagnostic)' }}>
          save up to ₹{savings.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Rows */}
      <div>
        {prices.map((price, idx) => (
          <a
            key={idx}
            href={price.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-6 py-4 transition-colors group"
            style={{
              borderBottom: idx < prices.length - 1 ? '1px solid var(--border-hairline)' : 'none',
              background: idx === 0 ? 'var(--accent-diagnostic-dim)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-mono text-[11px] w-5 flex-shrink-0" style={{ color: idx === 0 ? 'var(--accent-diagnostic)' : 'var(--text-tertiary)' }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-medium text-[15px] truncate">{price.retailer}</span>
                  {idx === 0 && (
                    <span
                      className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm flex-shrink-0"
                      style={{ background: 'var(--accent-diagnostic)', color: '#0b0f14' }}
                    >
                      Best
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  ★ {price.rating} · {price.delivery}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="font-mono text-[18px] font-medium" style={{ color: 'var(--text-primary)' }}>
                ₹{price.price.toLocaleString('en-IN')}
              </span>
              <span
                className="font-mono text-[11px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--accent-signal)' }}
              >
                View →
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Summary footer */}
      <div className="grid grid-cols-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-hairline)', background: 'var(--bg-panel-raised)' }}>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Lowest</div>
          <div className="font-mono text-[15px]" style={{ color: 'var(--accent-diagnostic)' }}>₹{minPrice.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Highest</div>
          <div className="font-mono text-[15px]" style={{ color: 'var(--text-secondary)' }}>₹{maxPrice.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Spread</div>
          <div className="font-mono text-[15px]" style={{ color: 'var(--accent-signal)' }}>₹{savings.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
};
