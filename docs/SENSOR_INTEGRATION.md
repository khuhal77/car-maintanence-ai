# VEHIQ Sensor Integration Guide

## Overview

VEHIQ now integrates real-time vehicle sensor data via **OBD-II (On-Board Diagnostics)** protocols, enabling production-grade diagnostics that combine photo-based analysis with continuous vehicle telemetry.

---

## 1. OBD-II Protocol Architecture

### What is OBD-II?

OBD-II is a standardized vehicle diagnostic port (J1962 connector) available on:
- **Cars**: Post-1996 (mandatory in most markets)
- **Motorcycles**: Post-2003 (varies by region)
- **Trucks/Commercial**: Post-1980s (via J1939 CAN bus variant)

### Data Access Methods

| Method | Hardware | Latency | Cost | Use Case |
|---|---|---|---|---|
| **ELM327 Bluetooth dongle** | $10–30 | 500ms–2s | Minimal | Consumer vehicles, DIY |
| **Native vehicle APIs** | Cloud subscription | 100–500ms | $50–200/yr | OEM (Tesla, BMW, Hyundai) |
| **Direct CAN bus** | Specialized adapter | <100ms | $200–500 | Commercial fleets, racing |
| **Telematics provider** | Existing subscription | 1–5s | $5–20/mo | Insurance, fleet management |

VEHIQ MVP uses **mock OBD** (simulated sensor data) for demo; production swaps in real ELM327 via the `pyobd` library.

---

## 2. Sensor Data Ingestion

### Step 1: Vehicle Registration

User enters vehicle details on `/sensor-diagnostics` page:
```json
{
  "vehicle_id": "JTHBP5C2XA5034186",  // VIN or custom ID
  "vehicle_make": "Toyota",
  "vehicle_model": "Corolla",
  "vehicle_year": 2018,
  "engine_type": "petrol",
  "current_mileage": 65000
}
```

This creates a `VehicleProfile` stored in the system for personalized anomaly thresholds.

### Step 2: OBD Connection

When "Run OBD-II Scan" is clicked:

1. Backend initializes `OBDIIHandler` with vehicle ID
2. Connects to ELM327 dongle (real) or loads mock data (MVP)
3. Polls PIDs (Parameter IDs) for common sensors

### Step 3: Sensor Reading

Standard PIDs polled from vehicle ECU:

| PID | Sensor | Unit | Normal Range |
|---|---|---|---|
| 0105 | Coolant Temperature | °C | 80–100 |
| 010C | Engine RPM | RPM | 600–3000 (idle) |
| 010D | Fuel Level | % | 0–100 |
| 0111 | Throttle Position | % | 0–100 |
| 015E | Engine Runtime Hours | hours | Varies |
| 01A0 | Fuel Rail Pressure | PSI | 40–60 |
| 01C0 | Transmission Gear | — | 0–6 |

Additional sensors (via CAN bus variants):
- Tire pressure (all 4 wheels)
- Tire temperature (all 4 wheels)
- Brake pad wear (%)
- Battery voltage/current
- Oil pressure, oil temperature
- ABS status
- O₂ sensor readings

---

## 3. Sensor Fusion Logic

### Multi-Source Diagnosis

Combines three data streams:

```
Photo Diagnosis
    ↓
    └─→ [Fusion Engine]
    ↑         ↑
Sensor Data  Chat/Context
    ↓
Final Diagnosis (higher confidence)
```

### Fusion Algorithm

1. **Photo only** → baseline diagnosis + confidence
2. **Sensors only** → anomaly detection + DTC interpretation
3. **Both agree** → boost confidence by 0.3 (e.g., 0.6 → 0.9)
4. **Both conflict** → prefer sensor data (more objective), lower confidence
5. **One source only** → use available data, lower confidence

**Example**:
- Photo: "Battery degraded, 70% confidence"
- Sensors: "Battery voltage 11.2V (low), quick crank"
- Fused: "Battery failure, 95% confidence, photo + electrical data align"

---

## 4. Anomaly Detection

Sensors are compared against **thresholds per vehicle make/model**:

```python
SENSOR_THRESHOLDS = {
    SensorType.BATTERY_VOLTAGE: {
        "min": 12.0,      # Normal
        "max": 14.5,      # Normal
        "warning_min": 11.5,  # Caution
        "warning_max": 15.0,  # Caution
    },
    SensorType.ENGINE_TEMP: {
        "min": 80,
        "max": 100,
        "warning_min": 70,
        "warning_max": 110,
    },
    # ... more sensors
}
```

When a reading falls outside normal range → **anomaly flagged** with severity:
- `low`: Within caution range, no immediate action
- `medium`: Borderline, monitor closely
- `high`: Out of range, needs attention
- `critical`: Immediate failure risk, stop driving

---

## 5. Diagnostic Trouble Codes (DTCs)

OBD-II vehicles store error codes whenever sensors detect faults. Format: **P-code** (e.g., `P0420`).

| Code | Description | Severity | Part |
|---|---|---|---|
| P0420 | Catalyst system efficiency low | Medium | Catalytic converter |
| P0171 | System too lean | Medium | Fuel system / Air filter |
| P0300 | Multiple cylinder misfire | High | Spark plugs / Coils |
| P0505 | Idle air control system malfunction | Low | Idle control valve |
| P0101 | Mass air flow sensor out of range | Medium | Air filter |

DTCs are stored in the vehicle's memory and automatically cleared (or manually via `04` command) once the fault is fixed.

---

## 6. API Reference

### POST `/api/diagnose-fusion`

Performs a complete OBD-II + photo diagnostic scan.

**Request**:
```json
{
  "vehicle_id": "JTHBP5C2XA5034186",
  "vehicle_make": "Toyota",
  "vehicle_model": "Corolla",
  "vehicle_year": 2018,
  "engine_type": "petrol",
  "current_mileage": 65000,
  "image_base64": "...",  // Optional: photo of a specific part
  "collect_sensor_data": true
}
```

**Response**:
```json
{
  "vehicle_id": "JTHBP5C2XA5034186",
  "timestamp": "2024-08-15T10:30:00Z",
  "part_type": "battery",
  "issue": "Battery voltage critically low [Sensor: Low voltage 11.2V]",
  "severity": "high",
  "recommended_parts": ["12V Car Battery 60Ah", "Battery Terminals"],
  "estimated_cost": 3500,
  "overall_confidence": 0.92,
  "contributing_factors": [
    "Photo diagnosis: battery (70%)",
    "Sensor data: battery",
    "1 diagnostic trouble code detected"
  ],
  "sensor_readings": [
    {
      "sensor_type": "battery_voltage",
      "value": 11.2,
      "unit": "V",
      "timestamp": "2024-08-15T10:30:00Z",
      "confidence": 0.95
    },
    // ... more sensors
  ],
  "anomalies": [
    {
      "sensor": "battery_voltage",
      "value": 11.2,
      "unit": "V",
      "issue": "Below normal range (min: 12.0)",
      "severity": "critical"
    }
  ],
  "sensor_diagnostics": {
    "battery_voltage": "Battery voltage critically low — replace battery"
  }
}
```

### POST `/api/diagnose-fusion/batch-sensor-upload`

Bulk upload sensor data for fleet diagnostics.

---

## 7. Hardware Setup (Production)

### ELM327 Bluetooth Dongle (Recommended for MVP→Production)

1. **Purchase**: ELM327 Bluetooth dongle (~$20–30) from Amazon/eBay
2. **Install**: Insert into OBD-II port (located below steering wheel, under dashboard)
3. **Pair**: Connect to phone/laptop via Bluetooth
4. **Install pyobd library**:
   ```bash
   pip install pyobd
   ```
5. **Code integration**:
   ```python
   import obd
   connection = obd.OBD()  # Auto-detects port
   response = connection.query(obd.commands.COOLANT_TEMP)
   print(response.value)  # 92 °C
   ```

### Native Vehicle APIs (High Trust, Fleet-Ready)

| OEM | API | Authentication | Latency |
|---|---|---|---|
| **Tesla** | Fleet Telematics API | OAuth | <500ms |
| **BMW** | ConnectedDrive API | API key | <1s |
| **Hyundai** | BlueLink API | OAuth | <2s |
| **Ford** | FordPass API | OAuth | <1s |
| **General Motors** | OnStar API | OAuth | <2s |

Each requires:
- Developer account signup
- OAuth 2.0 integration
- User consent (vehicle owner approves data sharing)
- Per-vehicle subscription or free tier with limits

---

## 8. Data Privacy & Security

### What VEHIQ Stores

✅ **Stored**:
- Vehicle profile (make, model, year, mileage, VIN—optional)
- Sensor readings with timestamps
- Diagnosis results
- Chat history

❌ **NOT Stored**:
- Raw location data (GPS)
- Driver behavior (harsh braking, speeding)
- Photos (deleted after diagnosis)
- Financial/payment info

### Retention Policy

- Sensor data: 90 days rolling window (older data archived)
- Diagnosis results: 1 year (for recurring issue detection)
- Chat: 30 days (per user preference)

### Security

- All API calls encrypted (HTTPS/TLS 1.3)
- No personal identifiable info (PII) linked to vehicle data unless user opts in
- Vehicle owner controls data sharing via app settings

---

## 9. Roadmap

### Phase 1 (MVP — Done)
- ✅ Mock OBD sensor data
- ✅ Sensor fusion engine
- ✅ OBD-II API contract

### Phase 2 (Beta — Q3 2024)
- ELM327 Bluetooth integration
- Real sensor data collection
- Anomaly detection with historical trends
- DTC auto-lookup database

### Phase 3 (Production — Q4 2024)
- Native vehicle APIs (Tesla, BMW, Hyundai)
- Fleet management dashboard
- Predictive maintenance (ML on sensor trends)
- Insurance integration (anonymized data sharing)

### Phase 4 (Scale — 2025)
- Mobile app with native OBD-II access
- Workshop/mechanic portal
- Sensor data monetization (opt-in, anonymized)
- Integration with existing telematics providers

---

## 10. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| No sensor data in mock mode | OBDIIHandler not initialized | Check `use_mock=True` in SensorFusionEngine |
| ELM327 not connecting | Dongle not in OBD port / Bluetooth not paired | Reseat dongle, re-pair Bluetooth, check COM port |
| Sensor reading is zero | PID not supported by vehicle | Some vehicles don't support all PIDs; fall back to available data |
| High latency (>2s) | Bluetooth congestion or slow polling | Reduce polling frequency or upgrade to direct CAN adapter |
| False anomaly alerts | Thresholds not tuned for vehicle | Customize SENSOR_THRESHOLDS based on vehicle make/model |

---

## 11. Example: End-to-End Sensor Workflow

```
User opens VEHIQ app
    ↓
[Home page] Chooses "OBD-II Sensor Scan"
    ↓
[Sensor Diagnostics Page]
    Enters: "2018 Toyota Corolla, VIN: JTHBP5C2XA5034186, 65000 km"
    ↓
Clicks "Run OBD-II Scan"
    ↓
Backend: OBDIIHandler.connect() → reads PIDs
    - 0105: 92 °C (coolant)
    - 010C: 2500 RPM
    - BATTERY_VOLTAGE: 11.2 V ← ANOMALY (below 12.0V)
    - TIRE_PRESSURE_FL: 28 PSI ← ANOMALY (below 32 PSI)
    ↓
Anomalies detected:
    - Battery critically low
    - Front-left tire under-inflated
    ↓
DTC read: P0422 (Catalyst efficiency low)
    ↓
SensorFusionEngine.fuse_diagnosis()
    Part type: "battery" (from sensor, not photo)
    Severity: "high" (from anomaly)
    Confidence: 0.92
    ↓
[Results Page]
    Diagnosis Card: "Battery voltage critically low"
    Sensor Dashboard: Shows live readings + anomalies
    Price Comparison: "12V Battery — ₹3500–3850 from 4 retailers"
    ↓
User clicks "Chat with Assistant"
    "Why is my tire pressure low?" → AI explains (seasonal, temperature sensitivity, etc.)
```

