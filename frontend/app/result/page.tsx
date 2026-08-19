'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { PriceComparison } from '@/components/PriceComparison';
import { useApi } from '@/contexts/ApiContext';

interface DiagnoseResult {
  diagnosis: any;
  parts: string[];
  avg_price: number;
  part_type: string;
}

interface PriceItem {
  retailer: string;
  logo: string;
  price: number;
  rating: number;
  delivery: string;
  link: string;
}

export default function ResultPage() {
  const router = useRouter();
  const { getPrices, loading: apiLoading } = useApi();

  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const diagnoseResult = sessionStorage.getItem('diagnoseResult');
    if (!diagnoseResult) {
      router.push('/');
      return;
    }

    const parsedResult: DiagnoseResult = JSON.parse(diagnoseResult);
    setResult(parsedResult);

    const fetchPrices = async () => {
      try {
        const fetchedPrices = await getPrices(parsedResult.part_type, parsedResult.avg_price);
        setPrices(fetchedPrices);
      } catch (err) {
        setError('Failed to fetch prices');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex items-center gap-3 font-mono text-[13px] uppercase tracking-wider" style={{ color: 'var(--accent-signal)' }}>
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
          Compiling diagnostic report
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header className="border-b sticky top-0 z-10 backdrop-blur" style={{ borderColor: 'var(--border-hairline)', background: 'rgba(11,15,20,0.85)' }}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← New scan
          </button>
          <span className="font-display font-semibold text-[14px] tracking-tight">VEHIQ</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Report header */}
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Diagnostic report
            </div>
            <h1 className="font-display font-semibold text-[28px] tracking-tight">
              {result.part_type.replace('_', ' ')}
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded font-mono text-[12px]" style={{ background: 'var(--status-high-dim)', border: '1px solid var(--status-high)', color: 'var(--status-high)' }}>
            ERROR — {error}
          </div>
        )}

        <DiagnosisCard diagnosis={result.diagnosis} />
        <PriceComparison prices={prices} loading={apiLoading || prices.length === 0} />

        {/* Guidance panel */}
        <div className="rounded p-6 mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
          <div className="font-mono text-[10px] uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Before you buy
          </div>
          <div className="space-y-3">
            {[
              ['Confirm with a mechanic', 'This is a photo-based estimate, not a certified inspection.'],
              ['Weigh delivery time', 'The cheapest listing isn\u2019t always the fastest one.'],
              ['Check seller ratings', 'Read reviews on the retailer\u2019s page before purchasing.'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 text-[13px]">
                <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent-signal)' }} />
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{title}.</span>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem('diagnoseResult');
              router.push('/');
            }}
            className="flex-1 py-3 rounded font-mono text-[12px] uppercase tracking-wider transition-all"
            style={{ background: 'var(--accent-signal)', color: '#0b0f14' }}
          >
            Run another scan
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 rounded font-mono text-[12px] uppercase tracking-wider transition-all"
            style={{ border: '1px solid var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Print
          </button>
        </div>
      </div>
    </main>
  );
}
