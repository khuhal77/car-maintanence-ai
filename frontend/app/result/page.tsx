'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { PriceComparison } from '@/components/PriceComparison';
import { VehicleAssistant } from '@/components/VehicleAssistant';
import { useApi } from '@/contexts/ApiContext';

interface DiagnosisData {
  type?: string;
  issue?: string;
  severity?: 'low' | 'medium' | 'high';
  recommendation?: string;
  parts?: string[];
  confidence?: number;
  detected_object?: string;
  emoji?: string;
  method?: string;
}

interface DiagnoseResult {
  diagnosis: DiagnosisData;
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

const normalizeDiagnosisResult = (raw: any): DiagnoseResult => {
  const diagnosis = raw?.diagnosis && typeof raw.diagnosis === 'object' ? raw.diagnosis : raw || {};
  const partType = String(raw?.part_type || diagnosis?.type || 'unknown');
  const normalizedParts = Array.isArray(raw?.parts)
    ? raw.parts
    : Array.isArray(diagnosis?.parts)
      ? diagnosis.parts
      : [];
  const avgPrice = Number(raw?.avg_price ?? diagnosis?.avg_price ?? 0);

  return {
    diagnosis: {
      ...diagnosis,
      type: diagnosis?.type || partType,
      issue: diagnosis?.issue || 'Could not identify part clearly',
      severity: diagnosis?.severity || 'low',
      recommendation: diagnosis?.recommendation || 'Please upload a clear, close-up image of the car part.',
      parts: normalizedParts,
      confidence: Number(diagnosis?.confidence ?? 0),
      detected_object: diagnosis?.detected_object || 'unknown',
    },
    parts: normalizedParts,
    avg_price: Number.isFinite(avgPrice) ? avgPrice : 0,
    part_type: partType,
  };
};

const severityConfig = {
  low: { color: '#22e0ab', bg: '#22e0ab1f', icon: '✓', label: 'Good condition', width: 33 },
  medium: { color: '#ffb020', bg: '#ffb0201f', icon: '•', label: 'Attention needed', width: 66 },
  high: { color: '#ff4d5e', bg: '#ff4d5e1f', icon: '!', label: 'Urgent action', width: 100 },
};

export default function ResultPage() {
  const router = useRouter();
  const { getPrices, loading: apiLoading } = useApi();

  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    mechanic: false,
    delivery: false,
    ratings: false,
  });

  useEffect(() => {
    const diagnoseResult = sessionStorage.getItem('diagnoseResult');
    if (!diagnoseResult) {
      router.push('/');
      return;
    }

    try {
      const parsedResult = normalizeDiagnosisResult(JSON.parse(diagnoseResult));
      setResult(parsedResult);

      const fetchPrices = async () => {
        try {
          const shouldFetchPrices = Boolean(parsedResult.part_type) && parsedResult.part_type !== 'unknown' && parsedResult.avg_price > 0;
          if (!shouldFetchPrices) {
            setPrices([]);
            return;
          }

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
    } catch (err) {
      console.error('Failed to parse diagnosis result', err);
      setError('Invalid diagnostic result. Please scan again.');
      setLoading(false);
    }
  }, [router]);

  const shouldShowPriceComparison = !!result && result.part_type !== 'unknown' && result.avg_price > 0;
  const severityLevel = result?.diagnosis.severity || 'low';
  const severity = severityConfig[severityLevel as keyof typeof severityConfig];

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block">
              <svg className="w-12 h-12 animate-spin" style={{ color: 'var(--accent-cyan)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          <span className="font-mono text-[13px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Analyzing your scan
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen scan-texture" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-hairline)',
          background: 'rgba(10, 12, 16, 0.8)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <button
            onClick={() => {
              sessionStorage.removeItem('diagnoseResult');
              router.push('/');
            }}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-200 hover:-translate-y-0.5"
            style={{
              color: 'var(--accent-signal)',
              borderColor: 'var(--accent-signal-dim)',
              background: 'rgba(255, 166, 61, 0.06)',
            }}
            title="Return to home"
          >
            ← New scan
          </button>

          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold"
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--accent-signal)',
                color: 'var(--accent-signal)',
              }}
            >
              ◈
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight">VEHIQ</span>
          </div>

          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: 'var(--accent-diagnostic-dim)',
              border: '1px solid var(--accent-diagnostic)',
              color: 'var(--accent-diagnostic)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
            Report
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <section
          className="mb-8 rounded-3xl border p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:p-7"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
            borderColor: 'rgba(148, 163, 184, 0.18)',
          }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-signal)' }}>
                Diagnostic report
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: '#f8fafc' }}>
                {result.part_type.replace(/_/g, ' ')}
              </h1>
              <p className="mt-3 text-sm leading-6" style={{ color: '#cbd5e1' }}>
                {result.diagnosis.issue}
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-xl">
              <div className="rounded-2xl border p-4" style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(148, 163, 184, 0.12)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                  Confidence
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--accent-signal)' }}>
                  {Math.round((result.diagnosis.confidence || 0) * 100)}%
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(148, 163, 184, 0.12)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                  Avg. price
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#f8fafc' }}>
                  ₹{result.avg_price.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ background: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(148, 163, 184, 0.12)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                  Severity
                </div>
                <div className="mt-2 text-lg font-bold" style={{ color: severity.color }}>
                  {severity.label}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 rounded-2xl border p-4" style={{ background: 'rgba(15, 23, 42, 0.88)', borderColor: 'rgba(148, 163, 184, 0.12)' }}>
            <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: severity.color }}>
              <span>{severity.label}</span>
              <span>{severity.width}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'rgba(148, 163, 184, 0.12)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${severity.width}%`, background: severity.color }} />
            </div>
          </div>
        </section>

        {error && (
          <div
            className="mb-8 rounded-2xl border p-4 font-mono text-[12px] animate-fadeIn"
            style={{
              background: 'var(--status-high-dim)',
              borderColor: 'var(--status-high)',
              color: 'var(--status-high)',
            }}
          >
            <div className="mb-1 font-bold">⚠ Error</div>
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <DiagnosisCard diagnosis={result.diagnosis} />
            {shouldShowPriceComparison && <PriceComparison prices={prices} loading={apiLoading} />}
          </div>

          <aside className="space-y-6">
            <div
              className="rounded-3xl border p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
                borderColor: 'rgba(148, 163, 184, 0.18)',
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-diagnostic) 14%, transparent)', color: 'var(--accent-diagnostic)' }}
                >
                  ✓
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-tertiary)' }}>
                    Recommended action
                  </div>
                  <div className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
                    {severity.label}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-6" style={{ color: '#dfe7f3' }}>
                {result.diagnosis.recommendation}
              </p>
            </div>

            <VehicleAssistant diagnosis={result.diagnosis} />

            <div
              className="rounded-3xl border p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(10, 15, 24, 0.96))',
                borderColor: 'rgba(148, 163, 184, 0.18)',
              }}
            >
              <div className="mb-5 flex items-center gap-2">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-diagnostic)' }}>
                  Before you buy
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'mechanic', title: 'Confirm with a mechanic', desc: 'Verify the diagnosis before ordering parts.' },
                  { key: 'delivery', title: 'Check delivery speed', desc: 'Balance lower cost with shipping time.' },
                  { key: 'ratings', title: 'Review seller ratings', desc: 'Prefer trusted sellers with good customer feedback.' },
                ].map(({ key, title, desc }) => (
                  <button
                    key={key}
                    onClick={() => setChecklist((p) => ({ ...p, [key]: !p[key as keyof typeof checklist] }))}
                    className="w-full rounded-2xl border p-3 text-left transition-all duration-200 hover:border-[var(--accent-diagnostic)]"
                    style={{
                      background: checklist[key as keyof typeof checklist] ? 'rgba(34, 224, 171, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                      borderColor: checklist[key as keyof typeof checklist] ? 'var(--accent-diagnostic)' : 'rgba(148,163,184,0.12)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border"
                        style={{
                          background: checklist[key as keyof typeof checklist] ? 'var(--accent-diagnostic)' : 'transparent',
                          borderColor: checklist[key as keyof typeof checklist] ? 'var(--accent-diagnostic)' : 'rgba(148,163,184,0.2)',
                          color: '#0f172a',
                        }}
                      >
                        {checklist[key as keyof typeof checklist] && '✓'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#f8fafc' }}>{title}</div>
                        <div className="mt-1 text-xs leading-5" style={{ color: '#cbd5e1' }}>{desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pb-2">
              <button
                onClick={() => {
                  sessionStorage.removeItem('diagnoseResult');
                  router.push('/');
                }}
                className="rounded-xl px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white transition duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-signal), #e58b2c)',
                  boxShadow: '0 12px 28px rgba(255, 166, 61, 0.2)',
                }}
              >
                Run another scan
              </button>

              <button
                onClick={() => window.print()}
                className="rounded-xl border px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: 'var(--accent-cyan)',
                  background: 'var(--accent-cyan-dim)',
                  color: 'var(--accent-cyan)',
                }}
              >
                Export report
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
