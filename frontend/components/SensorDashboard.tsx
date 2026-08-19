'use client';

/**
 * Sensor Data Dashboard
 * Displays real-time OBD-II sensor readings and fused diagnosis
 */

import React from 'react';

interface SensorReading {
  sensor_type: string;
  value: number;
  unit: string;
  timestamp: string;
  confidence?: number;
}

interface Anomaly {
  sensor: string;
  value: number;
  unit: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SensorDashboardProps {
  sensor_readings: SensorReading[];
  anomalies: Anomaly[];
  vehicle_id: string;
  timestamp: string;
}

const anomalyStyling = {
  critical: { bg: 'var(--status-high-dim)', border: 'var(--status-high)', text: 'var(--status-high)' },
  high: { bg: 'var(--status-high-dim)', border: 'var(--status-high)', text: 'var(--status-high)' },
  medium: { bg: 'var(--status-medium-dim)', border: 'var(--status-medium)', text: 'var(--status-medium)' },
  low: { bg: 'var(--status-low-dim)', border: 'var(--status-low)', text: 'var(--status-low)' },
};

export const SensorDashboard: React.FC<SensorDashboardProps> = ({
  sensor_readings,
  anomalies,
  vehicle_id,
  timestamp,
}) => {
  const formatSensorName = (name: string) =>
    name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Live sensor readings */}
      <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-hairline)', background: 'var(--bg-panel-raised)' }}>
          <h3 className="font-display font-semibold text-[17px]">Live sensor readings</h3>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {sensor_readings.length} sensors · {vehicle_id.slice(0, 8)}...
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-px" style={{ background: 'var(--border-hairline)' }}>
          {sensor_readings.length > 0 ? (
            sensor_readings.map((reading, idx) => (
              <div key={idx} className="p-4" style={{ background: 'var(--bg-base)' }}>
                <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {formatSensorName(reading.sensor_type)}
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {reading.value.toFixed(1)}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {reading.unit}
                  </span>
                </div>
                {reading.confidence !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--bg-panel-raised)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${reading.confidence * 100}%`,
                          background: 'var(--accent-diagnostic)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                      {(reading.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
              No sensor data available. Check OBD-II connection.
            </div>
          )}
        </div>
      </div>

      {/* Anomalies flagged by sensors */}
      {anomalies.length > 0 && (
        <div className="rounded overflow-hidden" style={{ border: '1px solid var(--border-hairline)', background: 'var(--bg-panel)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-hairline)', background: 'var(--bg-panel-raised)' }}>
            <h3 className="font-display font-semibold text-[17px]">Sensor anomalies detected</h3>
          </div>

          <div className="space-y-px" style={{ background: 'var(--border-hairline)' }}>
            {anomalies.map((anomaly, idx) => {
              const style = anomalyStyling[anomaly.severity];
              return (
                <div
                  key={idx}
                  className="px-6 py-4 flex items-start justify-between"
                  style={{ background: 'var(--bg-base)' }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: style.text }}
                      />
                      <span className="font-semibold text-[14px]">
                        {formatSensorName(anomaly.sensor)}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {anomaly.value.toFixed(1)} {anomaly.unit}
                      </span>
                    </div>
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {anomaly.issue}
                    </p>
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded flex-shrink-0"
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      color: style.text,
                    }}
                  >
                    {anomaly.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
