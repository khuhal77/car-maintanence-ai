'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ImageUpload';
import { ChatWidget } from '@/components/ChatWidget';
import { useApi } from '@/contexts/ApiContext';
import { PartMap, PART_INDEX } from '../app/PartMap';

const NAV_ITEMS = [
  { href: '#console', label: 'Scan' },
  { href: '#part-map', label: 'Parts' },
  { href: '#how-it-works', label: 'Process' },
];

const READOUTS = [
  { value: '4', label: 'Retailers compared' },
  { value: '8', label: 'Part types recognized' },
  { value: '<2s', label: 'Average response' },
];

const STEPS = [
  {
    step: 'Capture',
    icon: '📸',
    desc: 'Upload a clear, close-up photo of the car or bike part you need diagnosed.',
  },
  {
    step: 'Diagnose',
    icon: '🔍',
    desc: 'The model classifies the part, assesses severity, and returns a confidence score.',
  },
  {
    step: 'Compare',
    icon: '💰',
    desc: 'Replacement part prices are pulled from multiple retailers and sorted by price.',
  },
];

export default function Home() {
  const router = useRouter();
  const { diagnose, loading, error } = useApi();
  const [localLoading, setLocalLoading] = useState(false);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>(PART_INDEX[0].code);

  const handleImageSelect = async (base64: string) => {
    setLocalLoading(true);
    try {
      const result = await diagnose(base64);
      sessionStorage.setItem('diagnoseResult', JSON.stringify(result));
      router.push('/result');
    } catch (err) {
      alert('Diagnosis failed. Please try again.');
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const isBusy = localLoading || loading;
  const activePart = PART_INDEX.find((p) => p.code === (hoveredPart ?? selectedPart)) ?? PART_INDEX[0];

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-hairline)',
          background: 'rgba(10, 12, 16, 0.82)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold"
              style={{
                background: 'var(--bg-panel-raised)',
                borderColor: 'var(--accent-signal)',
                color: 'var(--accent-signal)',
              }}
            >
              ◈
            </div>
            <div className="min-w-0">
              <span className="block font-display text-[15px] font-bold leading-none tracking-tight text-foreground">
                VEHIQ
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Diagnostics
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-[var(--border-hairline)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Badge
            className="items-center gap-2 border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em]"
            style={{
              background: 'var(--accent-diagnostic-dim)',
              borderColor: 'var(--accent-diagnostic)',
              color: 'var(--accent-diagnostic)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
            MODEL ONLINE
          </Badge>
        </div>
      </header>

      {/* Hero / console */}
      <section id="console" className="scan-texture border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="mb-14 max-w-2xl animate-fadeIn">
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{
                background: 'var(--accent-signal-dim)',
                borderColor: 'var(--accent-signal)',
                color: 'var(--accent-signal)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
              Image-based part diagnostics
            </div>

            <h1 className="mb-6 max-w-xl font-display text-[44px] font-bold leading-[1.08] tracking-tight sm:text-[58px]">
              Point your camera
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--accent-signal), var(--accent-cyan))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                at the problem
              </span>
            </h1>

            <p className="max-w-xl text-[17px] leading-relaxed text-balance" style={{ color: 'var(--text-secondary)' }}>
              Upload a photo of any car or bike part. The model reads the wear pattern, flags the
              issue, and lines up replacement parts against live retailer pricing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="h-10 rounded-full px-5 text-[12px] font-medium uppercase tracking-[0.16em]"
                style={{ background: 'var(--accent-signal)', color: '#0a0c10' }}
              >
                Scan vehicle
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border px-5 text-[12px] font-medium uppercase tracking-[0.16em]"
                style={{ borderColor: 'var(--border-hairline-strong)', color: 'var(--text-primary)' }}
              >
                View process
              </Button>
            </div>
          </div>

          {/* Console: upload on the left, live readouts on the right */}
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Card
              className="viewfinder relative animate-fadeIn border"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-hairline-strong)',
              }}
            >
              <CardHeader className="px-6 pb-0 pt-6">
                <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: isBusy ? 'var(--accent-cyan)' : 'var(--accent-diagnostic)' }}
                    />
                    {isBusy ? 'Scanning input' : 'Scan input'}
                  </span>
                  <span>JPG · PNG · WEBP</span>
                </div>
              </CardHeader>

              <CardContent className="relative p-6 pt-4">
                <div className="vf-tr" />
                <div className="vf-bl" />
                {isBusy && <div className="scan-sweep" style={{ top: 0 }} />}

                <ImageUpload onImageSelect={handleImageSelect} loading={isBusy} />

                {error && (
                  <div
                    className="mt-6 animate-fadeIn rounded-lg border p-4 font-mono text-[12px] leading-relaxed"
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
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              {READOUTS.map((r) => (
                <Card
                  key={r.label}
                  className="border transition-colors hover:border-[var(--accent-signal)]"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)' }}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 px-5 py-4">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                      {r.label}
                    </span>
                    <span className="font-display text-[22px] font-bold" style={{ color: 'var(--accent-signal)' }}>
                      {r.value}
                    </span>
                  </CardHeader>
                </Card>
              ))}

              <Card
                className="border"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)' }}
              >
                <CardContent className="px-5 py-4 font-mono text-[12px] leading-relaxed text-wrap" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-diagnostic)' }}>✓</span> Estimates only — confirm
                  findings with a certified mechanic before repair.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive part map — the signature element */}
      <section id="part-map" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <h2 className="mb-2 font-display text-[26px] font-bold tracking-tight">Recognized parts</h2>
          <p className="font-mono text-[12px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Tap a point on the diagram, or a part below, to see what the model checks for.
          </p>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="scan-texture border p-8" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline-strong)' }}>
            <PartMap activeCode={hoveredPart} onHover={setHoveredPart} onSelect={setSelectedPart} />
          </Card>

          <Card
            className="flex flex-col justify-between border"
            style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}
          >
            <CardContent className="p-6">
              <div key={activePart.code} className="animate-fadeIn">
                <div className="mb-2 font-mono text-[10px] font-bold tracking-[0.18em]" style={{ color: 'var(--accent-cyan)' }}>
                  {activePart.code}
                </div>
                <div className="mb-3 font-display text-[20px] font-bold">{activePart.name}</div>
                <p className="text-[13px] leading-relaxed text-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {activePart.detects}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6 h-px" style={{ background: 'var(--border-hairline)' }} />

        {/* horizontal selector rail */}
        <div className="rail-scroll mt-6 flex gap-3 overflow-x-auto pb-2">
          {PART_INDEX.map((part) => {
            const isActive = part.code === selectedPart;
            return (
              <button
                key={part.code}
                onClick={() => setSelectedPart(part.code)}
                onMouseEnter={() => setHoveredPart(part.code)}
                onMouseLeave={() => setHoveredPart(null)}
                className="shrink-0 px-4 py-3 rounded-xl border text-left transition-all duration-150"
                style={{
                  background: isActive ? 'var(--accent-signal-dim)' : 'var(--bg-panel)',
                  borderColor: isActive ? 'var(--accent-signal)' : 'var(--border-hairline)',
                  minWidth: '150px',
                }}
              >
                <div
                  className="font-mono text-[9px] font-bold mb-1"
                  style={{ color: isActive ? 'var(--accent-signal)' : 'var(--text-tertiary)' }}
                >
                  {part.code}
                </div>
                <div className="font-display font-bold text-[13px]">{part.name}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* How it works — sequential rail, numbering is meaningful here */}
      <section id="how-it-works" className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-14 font-display text-[26px] font-bold tracking-tight">How it works</h2>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div
              className="rail-line hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-px"
              style={{ background: 'var(--border-hairline-strong)' }}
            />
            {STEPS.map((item, i) => (
              <div key={item.step} className="relative animate-riseIn" style={{ animationDelay: `${i * 120}ms` }}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-mono text-[13px] font-bold mb-5 relative z-10"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1.5px solid var(--accent-signal)',
                    color: 'var(--accent-signal)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-display font-bold text-[17px] mb-2">{item.step}</div>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--border-hairline)', background: 'var(--bg-panel)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-3 items-center justify-between font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>VEHIQ DIAGNOSTICS</span>
          <span>Estimates only — confirm with a certified mechanic</span>
        </div>
      </footer>

      {/* Chat widget — floating */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 40 }}>
        <ChatWidget isCompact={true} />
      </div>
    </main>
  );
}
