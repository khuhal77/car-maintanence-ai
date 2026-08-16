'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ImageUpload';
import { ChatWidget } from '@/components/ChatWidget';
import { useApi } from '@/contexts/ApiContext';
import { PartMap, PART_INDEX } from '../app/PartMap';

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
        className="border-b sticky top-0 z-20 backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-hairline)',
          background: 'rgba(10, 12, 16, 0.85)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-bold"
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--accent-signal)',
                color: 'var(--accent-signal)',
              }}
            >
              ◈
            </div>
            <div>
              <span className="font-display font-bold text-[15px] tracking-tight block leading-none">
                VEHIQ
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Diagnostics
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            <a href="#console" className="hover:text-[var(--text-primary)] transition-colors">Scan</a>
            <a href="#part-map" className="hover:text-[var(--text-primary)] transition-colors">Parts</a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">Process</a>
          </nav>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--accent-diagnostic-dim)', border: '1px solid var(--accent-diagnostic)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
            <span className="font-mono text-[10px] font-medium tracking-wide" style={{ color: 'var(--accent-diagnostic)' }}>
              MODEL ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Hero / console */}
      <section id="console" className="scan-texture border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-2xl mb-14 animate-fadeIn">
            <div
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full mb-7"
              style={{
                background: 'var(--accent-signal-dim)',
                border: '1px solid var(--accent-signal)',
                color: 'var(--accent-signal)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-signal)' }} />
              Image-based part diagnostics
            </div>

            <h1 className="font-display font-bold text-[44px] sm:text-[58px] leading-[1.08] tracking-tight mb-6">
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

            <p className="text-[17px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Upload a photo of any car or bike part. The model reads the wear pattern, flags the
              issue, and lines up replacement parts against live retailer pricing.
            </p>
          </div>

          {/* Console: upload on the left, live readouts on the right */}
          <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
            <div
              className="viewfinder relative p-8 rounded-2xl border animate-fadeIn"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-hairline-strong)',
              }}
            >
              <div className="vf-tr" />
              <div className="vf-bl" />

              {isBusy && <div className="scan-sweep" style={{ top: 0 }} />}

              <div
                className="flex items-center justify-between mb-6 font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isBusy ? 'var(--accent-cyan)' : 'var(--accent-diagnostic)' }}
                  />
                  {isBusy ? 'Scanning input' : 'Scan input'}
                </span>
                <span>JPG · PNG · WEBP</span>
              </div>

              <ImageUpload onImageSelect={handleImageSelect} loading={isBusy} />

              {error && (
                <div
                  className="mt-6 p-4 rounded-lg font-mono text-[12px] border animate-fadeIn"
                  style={{
                    background: 'var(--status-high-dim)',
                    borderColor: 'var(--status-high)',
                    color: 'var(--status-high)',
                  }}
                >
                  <div className="font-bold mb-1">⚠ Error</div>
                  {error}
                </div>
              )}
            </div>

            {/* Live readout stack, replaces the old flat stat grid */}
            <div className="flex flex-col gap-3">
              {READOUTS.map((r) => (
                <div
                  key={r.label}
                  className="flex-1 flex items-center justify-between px-5 py-4 rounded-xl border transition-colors hover:border-[var(--accent-signal)]"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)' }}
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {r.label}
                  </span>
                  <span className="font-display font-bold text-[22px]" style={{ color: 'var(--accent-signal)' }}>
                    {r.value}
                  </span>
                </div>
              ))}
              <div
                className="flex-1 px-5 py-4 rounded-xl border font-mono text-[12px] leading-relaxed"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
              >
                <span style={{ color: 'var(--accent-diagnostic)' }}>✓</span> Estimates only — confirm
                findings with a certified mechanic before repair.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive part map — the signature element */}
      <section id="part-map" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-10">
          <h2 className="font-display font-bold text-[26px] tracking-tight mb-2">Recognized parts</h2>
          <p className="font-mono text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Tap a point on the diagram, or a part below, to see what the model checks for.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-stretch">
          <div
            className="p-8 rounded-2xl border scan-texture"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-hairline-strong)' }}
          >
            <PartMap activeCode={hoveredPart} onHover={setHoveredPart} onSelect={setSelectedPart} />
          </div>

          <div
            className="p-6 rounded-2xl border flex flex-col justify-between"
            style={{ background: 'var(--bg-panel-raised)', borderColor: 'var(--border-hairline)' }}
          >
            <div key={activePart.code} className="animate-fadeIn">
              <div className="font-mono text-[10px] mb-2 font-bold tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
                {activePart.code}
              </div>
              <div className="font-display font-bold text-[20px] mb-3">{activePart.name}</div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {activePart.detects}
              </p>
            </div>
          </div>
        </div>

        {/* horizontal selector rail */}
        <div className="rail-scroll flex gap-3 mt-6 overflow-x-auto pb-2">
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
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-display font-bold text-[26px] tracking-tight mb-14">How it works</h2>

          <div className="relative grid md:grid-cols-3 gap-8">
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
