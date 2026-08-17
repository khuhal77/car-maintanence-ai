'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  low: { color: 'var(--status-low)', dim: 'var(--status-low-dim)', icon: '✓', label: 'Good condition', width: 33 },
  medium: { color: 'var(--status-medium)', dim: 'var(--status-medium-dim)', icon: '•', label: 'Attention needed', width: 66 },
  high: { color: 'var(--status-high)', dim: 'var(--status-high-dim)', icon: '!', label: 'Urgent action', width: 100 },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const shouldShowPriceComparison = !!result && result.part_type !== 'unknown' && result.avg_price > 0;
  const severityLevel = result?.diagnosis.severity || 'low';
  const severity = severityConfig[severityLevel as keyof typeof severityConfig];

  if (loading || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-sm space-y-4 rounded-3xl border border-[var(--border-hairline-strong)] bg-[var(--bg-panel)] p-6">
          <Skeleton className="h-3 w-24 rounded-full bg-[var(--bg-panel-raised)]" />
          <Skeleton className="h-8 w-3/4 rounded-lg bg-[var(--bg-panel-raised)]" />
          <Skeleton className="h-4 w-full rounded-lg bg-[var(--bg-panel-raised)]" />
          <Skeleton className="h-4 w-5/6 rounded-lg bg-[var(--bg-panel-raised)]" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-2xl bg-[var(--bg-panel-raised)]" />
            <Skeleton className="h-20 rounded-2xl bg-[var(--bg-panel-raised)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen scan-texture" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-xl"
        style={{ borderColor: 'var(--border-hairline)', background: 'rgba(10, 12, 16, 0.85)' }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('diagnoseResult');
              router.push('/');
            }}
            className="shrink-0 rounded-lg border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-signal)', borderColor: 'var(--accent-signal)', background: 'var(--accent-signal-dim)' }}
            title="Return to home"
          >
            ← New scan
          </Button>

          <div className="hidden items-center gap-2.5 sm:flex">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-xs font-bold"
              style={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--accent-signal)', color: 'var(--accent-signal)' }}
            >
              ◈
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight">VEHIQ</span>
          </div>

          <Badge
            className="shrink-0 items-center gap-2 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ background: 'var(--accent-diagnostic-dim)', borderColor: 'var(--accent-diagnostic)', color: 'var(--accent-diagnostic)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
            Report
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        {/* ── Report summary block ─────────────────────────── */}
        <Card className="mb-6 border p-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline-strong)' }}>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-signal)' }}>
              Diagnostic report
            </div>

            <h1
              className="font-display font-bold leading-tight tracking-tight"
              style={{ color: 'var(--text-primary)', fontSize: 'clamp(28px, 4vw, 40px)' }}
            >
              {result.part_type.replace(/_/g, ' ')}
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {result.diagnosis.issue}
            </p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="border" style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}>
                <CardHeader className="p-5 pb-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Detection confidence
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <div className="font-display text-[30px] font-bold leading-none" style={{ color: 'var(--accent-signal)' }}>
                    {Math.round((result.diagnosis.confidence || 0) * 100)}%
                  </div>
                  <Progress value={Math.round((result.diagnosis.confidence || 0) * 100)} className="mt-3 h-2.5" indicatorClassName="bg-[var(--accent-signal)]" />
                </CardContent>
              </Card>

              <Card className="border" style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}>
                <CardHeader className="p-5 pb-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Avg. replacement price
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                  <div className="font-display text-[30px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                    ₹{result.avg_price.toLocaleString('en-IN')}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4 border" style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}>
              <CardContent className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <Badge
                    className="items-center gap-2 border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ background: `${severity.dim}`, borderColor: severity.color, color: severity.color }}
                  >
                    <span aria-hidden>{severity.icon}</span>
                    {severity.label}
                  </Badge>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Severity: {severityLevel}
                  </span>
                </div>
                <Progress value={severity.width} className="h-2.5" indicatorClassName="bg-[color:var(--status-high)]" />
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fadeIn font-mono text-[12px]">
            <div className="mb-1 font-bold">⚠ Error</div>
            {error}
          </Alert>
        )}

        {/* ── Main content grid ────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_minmax(320px,0.9fr)]">
          <div className="min-w-0 space-y-6">
            <DiagnosisCard diagnosis={result.diagnosis} />
            {shouldShowPriceComparison && <PriceComparison prices={prices} loading={apiLoading} />}
          </div>

          <aside className="min-w-0 space-y-6">
            {/* Recommended action */}
            <Card className="border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline-strong)' }}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--accent-diagnostic-dim)', color: 'var(--accent-diagnostic)' }}
                  >
                    ✓
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                      Recommended action
                    </div>
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {severity.label}
                    </div>
                  </div>
                </div>

                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {result.diagnosis.recommendation}
                </p>
              </CardContent>
            </Card>

            <VehicleAssistant diagnosis={result.diagnosis} />

            {/* Before you buy checklist */}
            <Card className="border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline-strong)' }}>
              <CardContent className="p-5">
                <div className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-diagnostic)' }}>
                  Before you buy
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'mechanic', title: 'Confirm with a mechanic', desc: 'Verify the diagnosis before ordering parts.' },
                    { key: 'delivery', title: 'Check delivery speed', desc: 'Balance lower cost with shipping time.' },
                    { key: 'ratings', title: 'Review seller ratings', desc: 'Prefer trusted sellers with good customer feedback.' },
                  ].map(({ key, title, desc }) => {
                    const checked = checklist[key as keyof typeof checklist];
                    return (
                      <label
                        key={key}
                        className="flex w-full items-start gap-3 rounded-2xl border p-3.5 transition-all duration-200 hover:border-[var(--accent-diagnostic)]"
                        style={{
                          background: checked ? 'var(--accent-diagnostic-dim)' : 'var(--bg-panel-raised)',
                          borderColor: checked ? 'var(--accent-diagnostic)' : 'var(--border-hairline)',
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={() => setChecklist((p) => ({ ...p, [key]: !p[key as keyof typeof checklist] }))}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {title}
                          </span>
                          <span className="mt-1 block text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {desc}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-3 pb-2">
              <Button
                onClick={() => {
                  sessionStorage.removeItem('diagnoseResult');
                  router.push('/');
                }}
                className="rounded-xl px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition duration-200 hover:-translate-y-0.5"
                style={{ background: 'var(--accent-signal)', color: '#0a0c10' }}
              >
                Run another scan
              </Button>

              <Button
                variant="outline"
                onClick={() => window.print()}
                className="rounded-xl border px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition duration-200 hover:-translate-y-0.5"
                style={{ borderColor: 'var(--accent-cyan)', background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}
              >
                Export report
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
