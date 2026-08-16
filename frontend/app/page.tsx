'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ImageUpload';
import { ChatWidget } from '@/components/ChatWidget';
import { useApi } from '@/contexts/ApiContext';

const PART_INDEX = [
  { code: 'BAT-01', name: 'Battery' },
  { code: 'BRK-02', name: 'Brake Pads' },
  { code: 'SPK-03', name: 'Spark Plugs' },
  { code: 'AIR-04', name: 'Air Filter' },
  { code: 'OIL-05', name: 'Oil Filter' },
  { code: 'TIR-06', name: 'Tires' },
  { code: 'WIP-07', name: 'Wiper Blades' },
  { code: 'CLT-08', name: 'Coolant' },
];

export default function Home() {
  const router = useRouter();
  const { diagnose, loading, error } = useApi();
  const [localLoading, setLocalLoading] = useState(false);

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

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header
        className="border-b sticky top-0 z-10 backdrop-blur"
        style={{ borderColor: 'var(--border-hairline)', background: 'rgba(11,15,20,0.85)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold"
              style={{ background: 'var(--accent-signal-dim)', color: 'var(--accent-signal)', border: '1px solid var(--accent-signal)' }}
            >
              ◈
            </div>
            <span className="font-display font-semibold text-[15px] tracking-tight">
              VEHIQ
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Diagnostics
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--accent-diagnostic)' }} />
            MODEL ONLINE
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="scan-texture border-b" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full mb-6"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-signal)' }} />
              Image-based part diagnostics
            </div>

            <h1 className="font-display font-semibold text-[42px] sm:text-[54px] leading-[1.05] tracking-tight mb-6">
              Point your camera
              <br />
              at the problem.
            </h1>

            <p className="text-[17px] leading-relaxed max-w-md mb-8" style={{ color: 'var(--text-secondary)' }}>
              Upload a photo of any car or bike part. The model reads the
              wear pattern, flags the issue, and lines up the replacement
              parts against live retailer pricing.
            </p>

            <div className="flex items-center gap-8 font-mono text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              <div>
                <div className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>4</div>
                RETAILERS SCANNED
              </div>
              <div className="w-px h-8" style={{ background: 'var(--border-hairline)' }} />
              <div>
                <div className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>8</div>
                PART CLASSES
              </div>
              <div className="w-px h-8" style={{ background: 'var(--border-hairline)' }} />
              <div>
                <div className="text-[20px] font-semibold" style={{ color: 'var(--accent-diagnostic)' }}>&lt;2s</div>
                AVG. RESPONSE
              </div>
            </div>
          </div>

          {/* Upload viewfinder */}
          <div className="viewfinder p-6" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-hairline)' }}>
            <div className="vf-tr" />
            <div className="vf-bl" />
            <div className="flex items-center justify-between mb-4 font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              <span>Scan input</span>
              <span>JPG · PNG · WEBP</span>
            </div>

            <ImageUpload onImageSelect={handleImageSelect} loading={isBusy} />

            {error && (
              <div
                className="mt-4 p-3 rounded font-mono text-[12px]"
                style={{ background: 'var(--status-high-dim)', border: '1px solid var(--status-high)', color: 'var(--status-high)' }}
              >
                ERROR — {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Part index */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display font-semibold text-[22px] tracking-tight">Recognized part index</h2>
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            08 CLASSES
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--border-hairline)' }}>
          {PART_INDEX.map((part) => (
            <div
              key={part.code}
              className="p-5 transition-colors hover:cursor-default"
              style={{ background: 'var(--bg-panel)' }}
            >
              <div className="font-mono text-[10px] mb-2" style={{ color: 'var(--accent-signal)' }}>
                {part.code}
              </div>
              <div className="font-display font-medium text-[15px]">{part.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-px" style={{ background: 'var(--border-hairline)' }}>
          {[
            {
              step: 'Capture',
              desc: 'Upload a clear, close-up photo of the part in question.',
            },
            {
              step: 'Diagnose',
              desc: 'The model classifies the part and severity, with a visible confidence score.',
            },
            {
              step: 'Compare',
              desc: 'Matching replacement parts are priced across retailers, ranked lowest first.',
            },
          ].map((item, i) => (
            <div key={item.step} className="p-8" style={{ background: 'var(--bg-base)' }}>
              <div className="font-mono text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-display font-semibold text-[17px] mb-2">{item.step}</div>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--border-hairline)' }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>VEHIQ DIAGNOSTICS</span>
          <span>Estimates only — confirm with a certified mechanic</span>
        </div>
      </footer>

      {/* Chat Widget - Floating */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 40 }}>
        <ChatWidget isCompact={true} />
      </div>
    </main>
  );
}
