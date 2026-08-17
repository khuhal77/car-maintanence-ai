'use client';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

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
      <Card className="border" style={{ borderColor: 'var(--border-hairline-strong)', background: 'var(--bg-panel)' }}>
        <CardContent className="flex items-center justify-center gap-3 p-8 text-center">
          <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-wider" style={{ color: 'var(--accent-signal)' }}>
            <div className="flex gap-1.5">
              <Skeleton className="h-2 w-2 rounded-full bg-[color:var(--accent-signal)]" />
              <Skeleton className="h-2 w-2 rounded-full bg-[color:var(--accent-signal)]" />
              <Skeleton className="h-2 w-2 rounded-full bg-[color:var(--accent-signal)]" />
            </div>
            Scanning retailers…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <Card className="border" style={{ borderColor: 'var(--border-hairline-strong)', background: 'var(--bg-panel)' }}>
        <CardContent className="p-8 text-center">
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-tertiary)' }}>No pricing data available yet</p>
        </CardContent>
      </Card>
    );
  }

  const minPrice = Math.min(...prices.map((p) => p.price));
  const maxPrice = Math.max(...prices.map((p) => p.price));
  const savings = maxPrice - minPrice;

  return (
    <Card className="overflow-hidden border transition-all duration-300" style={{ borderColor: 'var(--border-hairline-strong)', background: 'var(--bg-panel)' }}>
      <CardHeader
        className="flex flex-row items-center justify-between gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid var(--border-hairline)', background: 'var(--bg-panel-raised)' }}
      >
        <h3 className="font-display text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
          Retailer comparison
        </h3>

        <Badge className="border-0 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-diagnostic)', background: 'var(--accent-diagnostic-dim)' }}>
          Save ₹{savings.toLocaleString('en-IN')}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableBody>
            {prices.map((price, idx) => (
              <TableRow key={idx} className={idx === 0 ? 'bg-[color:var(--accent-diagnostic-dim)]' : ''}>
                <TableCell className="w-12 align-middle">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[11px] font-bold"
                    style={{
                      color: idx === 0 ? 'var(--accent-diagnostic)' : 'var(--text-tertiary)',
                      background: idx === 0 ? 'var(--accent-diagnostic-dim)' : 'var(--bg-panel-raised)',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </TableCell>

                <TableCell className="min-w-[180px] align-middle">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[15px] font-bold break-words whitespace-normal" style={{ color: 'var(--text-primary)' }}>
                        {price.retailer}
                      </span>
                      {idx === 0 && (
                        <Badge className="border-0 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-diagnostic)', color: '#0a0c10' }}>
                          Best
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      ★ {price.rating} · {price.delivery}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="align-middle text-right">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <span className="font-mono text-[16px] font-bold sm:text-[18px]" style={{ color: idx === 0 ? 'var(--accent-diagnostic)' : 'var(--text-primary)' }}>
                      ₹{price.price.toLocaleString('en-IN')}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-[72px] border-[color:var(--border-hairline)] text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--accent-signal)', background: 'var(--accent-signal-dim)' }}
                      asChild
                    >
                      <a href={price.link} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <div className="grid gap-3 border-t px-6 py-5 sm:grid-cols-3" style={{ borderColor: 'var(--border-hairline)', background: 'var(--bg-panel-raised)' }}>
        <div className="rounded-lg border p-3" style={{ background: 'var(--accent-diagnostic-dim)', borderColor: 'var(--border-hairline)' }}>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Lowest
          </div>
          <div className="font-mono text-[15px] font-bold" style={{ color: 'var(--accent-diagnostic)' }}>
            ₹{minPrice.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ background: 'var(--status-medium-dim)', borderColor: 'var(--border-hairline)' }}>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Highest
          </div>
          <div className="font-mono text-[15px] font-bold" style={{ color: 'var(--status-medium)' }}>
            ₹{maxPrice.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ background: 'var(--accent-signal-dim)', borderColor: 'var(--border-hairline)' }}>
          <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Spread
          </div>
          <div className="font-mono text-[15px] font-bold" style={{ color: 'var(--accent-signal)' }}>
            ₹{savings.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </Card>
  );
};
