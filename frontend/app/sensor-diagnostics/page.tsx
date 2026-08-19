'use client';

/**
 * Sensor-Fused Diagnostics Page
 * Combines photo + OBD-II sensor data for production-grade vehicle diagnostics
 */

import { useState } from 'react';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { SensorDashboard } from '@/components/SensorDashboard';
import { PriceComparison } from '@/components/PriceComparison';
import { ChatWidget } from '@/components/ChatWidget';

export default function SensorDiagnosticsPage() {
  const [vehicleId, setVehicleId] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2018);
  const [engineType, setEngineType] = useState('petrol');
  const [mileage, setMileage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleRunDiagnosis = async () => {
    if (!vehicleId || !make || !model || !mileage) {
      setError('Please fill in all vehicle details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/diagnose-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          vehicle_make: make,
          vehicle_model: model,
          vehicle_year: parseInt(year.toString()),
          engine_type: engineType,
          current_mileage: parseInt(mileage),
          image_base64: null,
          collect_sensor_data: true,
        }),
      });

      if (!response.ok) throw new Error('Diagnosis failed');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10 backdrop-blur" style={{ borderColor: 'var(--border-hairline)', background: 'rgba(11,15,20,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold"
              style={{ background: 'var(--accent-signal-dim)', color: 'var(--accent-signal)', border: '1px solid var(--accent-signal)' }}
            >
              ◈
            </div>
            <span className="font-display font-semibold text-[15px] tracking-tight">VEHIQ</span>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              OBD-II Diagnostics
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!result ? (
          /* Vehicle input form */
          <div className="max-w-2xl">
            <div className="mb-8">
              <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Real-time sensor diagnostics
              </div>
              <h1 className="font-display font-semibold text-[42px] leading-tight tracking-tight">
                Connect your vehicle
              </h1>
            </div>

            <div className="rounded p-6 mb-8" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Vehicle ID (VIN or custom)"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                />
                <input
                  type="text"
                  placeholder="Make (e.g. Toyota)"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                />
                <input
                  type="text"
                  placeholder="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                />
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                >
                  {Array.from({ length: 30 }, (_, i) => 2024 - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={engineType}
                  onChange={(e) => setEngineType(e.target.value)}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                >
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="electric">Electric</option>
                </select>
                <input
                  type="number"
                  placeholder="Current mileage (km)"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="px-4 py-2.5 rounded text-[14px] outline-none"
                  style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded font-mono text-[12px]" style={{ background: 'var(--status-high-dim)', border: '1px solid var(--status-high)', color: 'var(--status-high)' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleRunDiagnosis}
                disabled={loading}
                className="w-full py-3 rounded font-mono text-[12px] uppercase tracking-wider transition-all"
                style={{
                  background: loading ? 'var(--bg-panel-raised)' : 'var(--accent-signal)',
                  color: loading ? 'var(--text-tertiary)' : '#0b0f14',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Connecting to vehicle…' : 'Run OBD-II Scan'}
              </button>
            </div>

            <div className="rounded p-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                How it works
              </div>
              <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  ✓ Connect an OBD-II Bluetooth dongle (ELM327 or similar) to your vehicle's diagnostic port.
                </p>
                <p>
                  ✓ Enter your vehicle details above. VEHIQ reads live sensor data: battery voltage, oil pressure,
                  coolant temperature, brake wear, tire pressure, DTCs, and more.
                </p>
                <p>
                  ✓ Real-time anomaly detection flags issues before they become critical.
                </p>
                <p>
                  ✓ Optionally upload a photo of a specific part for fused diagnosis (photo + sensors = highest confidence).
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Results */
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display font-semibold text-[28px] tracking-tight">
                  {result.vehicle_id}
                </h1>
                <p className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Scan: {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setResult(null)}
                className="px-6 py-2.5 rounded font-mono text-[12px] uppercase tracking-wider"
                style={{ background: 'var(--accent-signal)', color: '#0b0f14' }}
              >
                New Scan
              </button>
            </div>

            {/* Sensor dashboard */}
            <SensorDashboard
              sensor_readings={result.sensor_readings || []}
              anomalies={result.anomalies || []}
              vehicle_id={result.vehicle_id}
              timestamp={result.timestamp}
            />

            {/* Diagnosis */}
            <div className="mt-8">
              <DiagnosisCard
                diagnosis={{
                  type: result.part_type,
                  issue: result.issue,
                  severity: result.severity,
                  recommendation: `Based on ${result.contributing_factors.length} data sources (${result.contributing_factors.join(', ')})`,
                  parts: result.recommended_parts,
                  confidence: result.overall_confidence,
                }}
              />
            </div>

            {/* Prices */}
            <div className="mt-8">
              <PriceComparison prices={[]} />
            </div>

            <ChatWidget diagnosisContext={{ part_type: result.part_type, issue: result.issue, severity: result.severity }} />
          </div>
        )}
      </div>
    </main>
  );
}
