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

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 border-b px-5 py-4 last:border-b-0" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl" style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }} />
        <div className="min-w-0 space-y-2">
          <div className="h-3 w-28 animate-pulse rounded" style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }} />
          <div className="h-2.5 w-40 animate-pulse rounded" style={{ background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }} />
        </div>
      </div>
      <div className="h-6 w-20 animate-pulse rounded" style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }} />
    </div>
  );
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({ prices, loading = false }) => {
  if (loading) {
    return (
      <section
        className="mb-6 overflow-hidden rounded-3xl border shadow-[0_18px_55px_rgba(15,23,42,0.18)]"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
          boxShadow: '0 18px 55px rgba(2, 6, 23, 0.38)',
        }}
      >
        <div className="px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--accent-signal) 10%, transparent)' }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--accent-signal)' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Finding the best prices
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Checking available retailers…
              </p>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)' }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </section>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <section
        className="mb-6 rounded-3xl border p-8 text-center"
        style={{
          borderColor: 'rgba(148, 163, 184, 0.18)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
          boxShadow: '0 18px 55px rgba(2, 6, 23, 0.38)',
        }}
      >
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-signal) 8%, transparent)',
            color: 'var(--accent-signal)',
          }}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12M7 4h10l1 4v11H6V8l1-4Zm2 9h6" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold" style={{ color: '#f8fafc' }}>
          No pricing data yet
        </p>
        <p className="mt-1 text-xs" style={{ color: '#cbd5e1' }}>
          Retailer results will appear here when available.
        </p>
      </section>
    );
  }

  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
  const minPrice = sortedPrices[0].price;
  const maxPrice = Math.max(...sortedPrices.map((p) => p.price));
  const savings = Math.max(0, maxPrice - minPrice);

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border shadow-[0_18px_55px_rgba(15,23,42,0.18)]"
      style={{
        borderColor: 'rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
        boxShadow: '0 18px 55px rgba(2, 6, 23, 0.38)',
      }}
    >
      <div className="flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Compare prices
            </h3>
            <span
              className="rounded-full px-2 py-1 text-[10px] font-semibold"
              style={{
                color: 'var(--accent-signal)',
                background: 'color-mix(in srgb, var(--accent-signal) 9%, transparent)',
              }}
            >
              {prices.length} options
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Sorted by lowest total price
          </p>
        </div>

        {savings > 0 && (
          <div className="rounded-2xl px-3.5 py-2.5" style={{ background: 'color-mix(in srgb, var(--status-low) 10%, transparent)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ color: 'var(--text-tertiary)' }}>
              Potential savings
            </div>
            <div className="mt-0.5 text-sm font-bold" style={{ color: 'var(--status-low)' }}>
              ₹{savings.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      <div>
        {sortedPrices.map((price, idx) => (
          <a
            key={`${price.retailer}-${idx}`}
            href={price.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-black/[0.025] sm:px-6"
            style={{ borderBottom: idx < sortedPrices.length - 1 ? '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)' : 'none' }}
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-bold"
                style={{
                  borderColor: idx === 0 ? 'color-mix(in srgb, var(--status-low) 18%, transparent)' : 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
                  background: idx === 0 ? 'color-mix(in srgb, var(--status-low) 8%, transparent)' : 'color-mix(in srgb, var(--text-primary) 2.5%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                {price.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={price.logo} alt="" className="h-full w-full object-contain p-1.5" />
                ) : (
                  price.retailer.slice(0, 1).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold" style={{ color: '#f8fafc' }}>
                    {price.retailer}
                  </span>
                  {idx === 0 && (
                    <span
                      className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--status-low)', background: 'color-mix(in srgb, var(--status-low) 10%, transparent)' }}
                    >
                      Best price
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>★ {price.rating}</span>
                  <span>•</span>
                  <span>{price.delivery}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-bold sm:text-base" style={{ color: idx === 0 ? 'var(--status-low)' : '#f8fafc' }}>
                ₹{price.price.toLocaleString('en-IN')}
              </span>
              <span
                className="hidden rounded-lg px-2.5 py-2 text-[11px] font-semibold sm:inline-flex"
                style={{
                  background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                View
              </span>
              <svg className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </a>
        ))}
      </div>

      <div
        className="grid grid-cols-3 gap-px border-t"
        style={{
          borderColor: 'color-mix(in srgb, var(--text-primary) 7%, transparent)',
          background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        {[
          ['Lowest', minPrice, 'var(--status-low)'],
          ['Highest', maxPrice, 'var(--text-primary)'],
          ['Difference', savings, 'var(--accent-signal)'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="bg-[var(--surface-card,rgba(255,255,255,0.88))] px-4 py-4 sm:px-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-tertiary)' }}>
              {label}
            </div>
            <div className="mt-1 text-sm font-bold sm:text-base" style={{ color: String(color) === 'var(--text-primary)' ? '#f8fafc' : String(color) }}>
              ₹{Number(value).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
