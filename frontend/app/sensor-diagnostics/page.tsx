'use client';

/**
 * Sensor Diagnostics Page
 *
 * Talks ONLY to the independent sensor pipeline:
 *   GET  /api/sensor-diagnose/scenarios
 *   POST /api/sensor-diagnose
 *
 * This route group has no dependency on the photo pipeline (see
 * backend/models/sensor_diagnosis.py and docs/SENSOR_FUSION_BACKEND_PLAN.md).
 * There is no hardware step here — no vehicle-details form, no "connect a
 * dongle" flow. The input is simply: pick a mock scenario, run it.
 */

import { useEffect, useState } from 'react';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { SensorDashboard } from '@/components/SensorDashboard';
import { ChatWidget } from '@/components/ChatWidget';

const API_BASE_URL = 'http://localhost:5000';

interface ScenarioItem {
  scenario: string;
  description: string;
}

interface SensorDiagnoseResult {
  vehicle_id: string;
  timestamp: string;
  readings: Array<{ sensor: string; value: number; unit: string; timestamp: string; vehicle_id: string }>;
  anomalies: Array<{ sensor: string; value: number | null; unit: string; expected_range: number[] | null; severity: string; method: string }>;
  diagnosis: {
    part_type: string;
    issue: string;
    severity: string;
    confidence: number;
    recommended_parts: string[];
    method: string;
  };
}

const formatScenarioLabel = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const methodLabel = (method: string) =>
  method === 'ml_isolation_forest' ? 'ML — Isolation Forest' : 'Threshold fallback';

export default function SensorDiagnosticsPage() {
  const [vehicleId, setVehicleId] = useState('demo-vehicle-01');
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [result, setResult] = useState<SensorDiagnoseResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sensor-diagnose/scenarios`);
        if (!res.ok) throw new Error('Failed to load scenarios');
        const data: ScenarioItem[] = await res.json();
        setScenarios(data);
        if (data.length > 0) setSelectedScenario(data[0].scenario);
      } catch (err) {
        setError('Could not reach the sensor pipeline. Is the backend running?');
      } finally {
        setScenariosLoading(false);
      }
    };
    fetchScenarios();
  }, []);

  const handleRunDiagnosis = async () => {
    if (!vehicleId || !selectedScenario) {
      setError('Enter a vehicle ID and pick a scenario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/sensor-diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, scenario: selectedScenario }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || 'Diagnosis failed');
      }

      const data: SensorDiagnoseResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Map the route's anomaly shape onto what SensorDashboard expects.
  const dashboardAnomalies = (result?.anomalies || []).map((a) => ({
    sensor: a.sensor,
    value: a.value ?? 0,
    unit: a.unit,
    issue:
      a.sensor === 'combined'
        ? 'Combined sensor pattern flagged as anomalous by the model'
        : `Outside expected range${a.expected_range ? ` [${a.expected_range[0]}–${a.expected_range[1]}]` : ''}`,
    severity: (a.severity === 'none' ? 'low' : a.severity) as 'low' | 'medium' | 'high' | 'critical',
  }));

  const dashboardReadings = (result?.readings || []).map((r) => ({
    sensor_type: r.sensor,
    value: r.value,
    unit: r.unit,
    timestamp: r.timestamp,
  }));

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
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
            <span className="font-display font-semibold text-[15px] tracking-tight">VEHIQ</span>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Sensor Diagnostics
            </span>
          </div>
          <a
            href="/"
            className="font-mono text-[11px] uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Photo diagnosis
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!result ? (
          /* Scenario selection form */
          <div className="max-w-2xl">
            <div className="mb-8">
              <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Mock sensor pipeline · ML-based anomaly detection
              </div>
              <h1 className="font-display font-semibold text-[42px] leading-tight tracking-tight">
                Run a sensor scan
              </h1>
              <p className="text-[14px] mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                No hardware required for this prototype — pick a scenario and
                the backend generates realistic mock readings, scores them
                with a trained anomaly-detection model, and returns a
                diagnosis. This pipeline is fully independent of the photo
                diagnosis flow.
              </p>
            </div>

            <div className="rounded p-6 mb-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
              <label className="block font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Vehicle ID
              </label>
              <input
                type="text"
                placeholder="e.g. demo-vehicle-01"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-4 py-2.5 rounded text-[14px] outline-none mb-5"
                style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)' }}
              />

              <label className="block font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Scenario
              </label>

              {scenariosLoading ? (
                <div className="font-mono text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  Loading scenarios…
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {scenarios.map((s) => (
                    <button
                      key={s.scenario}
                      onClick={() => setSelectedScenario(s.scenario)}
                      className="text-left px-4 py-3 rounded transition-all"
                      style={{
                        background: selectedScenario === s.scenario ? 'var(--accent-signal-dim)' : 'var(--bg-panel-raised)',
                        border: `1px solid ${selectedScenario === s.scenario ? 'var(--accent-signal)' : 'var(--border-hairline)'}`,
                      }}
                    >
                      <div className="font-display font-medium text-[13px] mb-0.5">
                        {formatScenarioLabel(s.scenario)}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {s.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div
                  className="mb-4 p-3 rounded font-mono text-[12px]"
                  style={{ background: 'var(--status-high-dim)', border: '1px solid var(--status-high)', color: 'var(--status-high)' }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleRunDiagnosis}
                disabled={loading || scenariosLoading}
                className="w-full py-3 rounded font-mono text-[12px] uppercase tracking-wider transition-all"
                style={{
                  background: loading || scenariosLoading ? 'var(--bg-panel-raised)' : 'var(--accent-signal)',
                  color: loading || scenariosLoading ? 'var(--text-tertiary)' : '#0b0f14',
                  cursor: loading || scenariosLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Running scan…' : 'Run Sensor Scan'}
              </button>
            </div>

            <div className="rounded p-6" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                How this pipeline works
              </div>
              <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>✓ Readings are generated from a mock profile — no OBD-II hardware involved in this prototype.</p>
                <p>✓ An IsolationForest model, trained on synthetic normal-range data, scores each reading set for anomalies.</p>
                <p>✓ If the model is unavailable, the backend falls back to explicit threshold checks — the response always discloses which method (<code>ml_isolation_forest</code> or <code>threshold_fallback</code>) produced the result.</p>
                <p>✓ This pipeline shares no code with photo-based diagnosis — see the backend&apos;s isolation tests.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Results */
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display font-semibold text-[28px] tracking-tight">{result.vehicle_id}</h1>
                <p className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Scan: {new Date(result.timestamp).toLocaleString()} · {formatScenarioLabel(selectedScenario)}
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

            <SensorDashboard
              sensor_readings={dashboardReadings}
              anomalies={dashboardAnomalies}
              vehicle_id={result.vehicle_id}
              timestamp={result.timestamp}
            />

            <div className="mt-8">
              <DiagnosisCard
                diagnosis={{
                  type: result.diagnosis.part_type,
                  issue: result.diagnosis.issue,
                  severity: (result.diagnosis.severity === 'none' ? 'low' : result.diagnosis.severity) as 'low' | 'medium' | 'high',
                  recommendation:
                    result.diagnosis.part_type === 'none'
                      ? 'All monitored sensors are within their normal operating range.'
                      : `Detected via ${methodLabel(result.diagnosis.method)}.`,
                  parts: result.diagnosis.recommended_parts,
                  confidence: result.diagnosis.confidence,
                  method: result.diagnosis.method,
                }}
              />
            </div>

            <ChatWidget
              diagnosisContext={{
                part_type: result.diagnosis.part_type,
                issue: result.diagnosis.issue,
                severity: result.diagnosis.severity,
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
