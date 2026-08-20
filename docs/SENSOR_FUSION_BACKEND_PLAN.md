# Backend Development Plan — Sensor Fusion Prototype

**Scope**: Mock sensor data → ML/rules model → diagnosis. No hardware layer.
**Explicit non-goal**: No ELM327/Bluetooth/CAN bus work in this plan — that's a
separate later phase. This plan starts *after* "if we had real sensor data,
what would we do with it" and stops *before* "how do we actually get it from
a car."
**Separation principle**: The sensor pipeline and the photo pipeline are
**two independent backends** that never import from each other. They may
optionally be merged by a thin combiner layer, but each must run, be tested,
and be demoed with the other one deleted.

---

## 1. Why separate the two pipelines completely

Currently `models/fusion.py` imports `detect_car_part` from `car_parts.py`
and calls both from one function. That coupling is the thing to undo:

| Problem with coupling | Fix |
|---|---|
| A bug/change in photo detection can break sensor diagnosis and vice versa | Two independent modules, independent routers, independent tests |
| Can't demo/test sensor logic without also touching image code | Sensor pipeline takes only structured data in, structured data out |
| Unclear ownership if two people work on this in parallel | Clean file/route boundary = clean work boundary |
| Fusion becomes a tangle of "if photo exists do X, else Y" | Fusion becomes a small, optional, final step — not the main path |

**Rule for this build**: `models/sensor_diagnosis.py` and everything it
imports must have **zero references** to `car_parts.py`, `diagnosis.py`, or
anything image-related. If it needs to import `PIL`, `cv2`, or `ultralytics`,
that's a violation.

---

## 2. Target architecture (end of this plan)

```
backend/
├── models/
│   ├── car_parts.py          # UNCHANGED — photo pipeline (existing)
│   ├── diagnosis.py          # UNCHANGED — photo pipeline (existing)
│   │
│   ├── sensor_mock.py         # NEW — generates mock sensor readings
│   ├── sensor_rules.py        # NEW — thresholds + rule-based diagnosis
│   └── sensor_diagnosis.py    # NEW — orchestrates mock→analysis, the "model"
│
├── routes/
│   ├── diagnose.py            # UNCHANGED — /api/diagnose (photo)
│   ├── prices.py              # UNCHANGED
│   └── sensor_diagnose.py     # NEW — /api/sensor-diagnose (sensors only)
│
└── data/
    └── sensor_profiles.json   # NEW — mock data presets (healthy, battery-fail, etc.)
```

**No `fusion.py` in this plan.** Fusion is explicitly out of scope — it's a
future combiner that reads the *outputs* of both pipelines, and doesn't
belong in a "keep them separate" build. Noted in the roadmap section only.

---

## 3. Data contract (defined first, before any code)

This is the interface the sensor backend promises to the frontend — get this
right and the rest is implementation detail.

### Input (what triggers a sensor diagnosis)

```json
{
  "vehicle_id": "demo-vehicle-01",
  "scenario": "battery_degraded"   // selects which mock profile to run — see §5
}
```

No image, no file upload, no vehicle make/model form required for this
endpoint. It is intentionally the simplest possible input, since hardware
acquisition is out of scope — the "input" is really just "which mock
scenario do you want to see."

### Output

```json
{
  "vehicle_id": "demo-vehicle-01",
  "timestamp": "2026-08-18T10:00:00",
  "readings": [
    { "sensor": "battery_voltage", "value": 11.2, "unit": "V", "status": "critical" },
    { "sensor": "engine_rpm", "value": 780, "unit": "RPM", "status": "normal" }
  ],
  "anomalies": [
    { "sensor": "battery_voltage", "value": 11.2, "expected_range": [12.0, 14.5], "severity": "high" }
  ],
  "diagnosis": {
    "part_type": "battery",
    "issue": "Battery voltage below safe operating range",
    "severity": "high",
    "confidence": 0.9,
    "recommended_parts": ["12V Car Battery 60Ah", "Battery Terminals", "Battery Cable"]
  }
}
```

This shape is deliberately close to the existing `/api/diagnose` photo
response (`part_type`, `issue`, `severity`, `recommended_parts`) — not
because they share code, but so the *frontend* can reuse the same
`DiagnosisCard` component against either backend without a translation layer.

---

## 4. Phase breakdown

### Phase A — Mock data generator (Day 1)

**File**: `models/sensor_mock.py`

**Responsibility**: produce plausible sensor readings for a named scenario.
No analysis, no thresholds, no diagnosis logic — purely data generation.

**Tasks**:
- Define `SENSOR_SCENARIOS` — a dict of named presets (`healthy`,
  `battery_degraded`, `brake_wear_high`, `overheating`, `low_tire_pressure`,
  `multi_fault`) each mapping sensor name → value.
- `generate_reading(scenario: str, vehicle_id: str) -> list[dict]` — returns
  a list of `{sensor, value, unit, timestamp}` for that scenario, with small
  randomized jitter (±2–5%) so repeated calls aren't bit-identical (keeps
  the demo feeling "live" rather than static fixtures).
- No dependency on FastAPI, no dependency on the photo pipeline.

**Definition of done**: Can be run directly in a Python REPL —
`generate_reading("battery_degraded", "v1")` — and printed, with zero server
running.

---

### Phase B — Rule-based analysis layer (Day 1–2)

**File**: `models/sensor_rules.py`

**Responsibility**: given a list of sensor readings, decide what's normal,
what's anomalous, and how severe. This is "the ML model" for the prototype
— explicitly threshold/rule-based rather than a trained model, because:
- It's deterministic and demoable without a training pipeline.
- It's the same tier of "model" as `diagnosis.py`'s heuristic fallback on
  the photo side — consistent honesty about what's actually AI vs. rules.
- It's a clean seam to later swap in a real trained model (e.g., an
  anomaly-detection model or LSTM on sensor history) without touching the
  route or the mock generator.

**Tasks**:
- Port/extend `SENSOR_THRESHOLDS` (already exists in `models/obd.py`) into
  this file as the single source of truth — **do not** import it from
  `obd.py`, copy it here, since `obd.py` is hardware-adjacent and out of
  scope for this backend.
- `evaluate_readings(readings: list[dict]) -> list[dict]` — returns
  anomalies (sensor, value, expected range, severity).
- `diagnose_from_anomalies(anomalies: list[dict]) -> dict` — maps the
  anomaly set to a `part_type` / `issue` / `severity` / `confidence` /
  `recommended_parts`, following the same `SENSOR_FUSION_RULES`-style
  mapping already sketched in `models/fusion.py`, but standalone here (no
  import from `fusion.py`).
- Handle the **zero-anomaly case** explicitly: return a "no issues
  detected" diagnosis rather than `null`/error, so the "healthy" scenario
  demos cleanly.
- Handle the **multi-anomaly case**: when more than one sensor is
  anomalous, pick the highest-severity one as primary `part_type` but list
  all anomalies in the response (the frontend already supports rendering an
  anomalies array separately from the single diagnosis card).

**Definition of done**: Given any output from Phase A, this module produces
a diagnosis dict with no FastAPI/HTTP code involved — testable as plain
Python functions.

---

### Phase C — Orchestration module (Day 2)

**File**: `models/sensor_diagnosis.py`

**Responsibility**: the single entry point the route calls. Wires Phase A →
Phase B together and formats the final response payload. This is the only
file that "knows about" both the mock generator and the rules engine — kept
thin on purpose.

```python
def run_sensor_diagnosis(vehicle_id: str, scenario: str) -> dict:
    readings = generate_reading(scenario, vehicle_id)
    anomalies = evaluate_readings(readings)
    diagnosis = diagnose_from_anomalies(anomalies)
    return {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now().isoformat(),
        "readings": readings,
        "anomalies": anomalies,
        "diagnosis": diagnosis,
    }
```

**Definition of done**: One function call produces the full contract from
§3, deterministically testable.

---

### Phase D — API route (Day 2–3)

**File**: `routes/sensor_diagnose.py`

**Tasks**:
- `POST /api/sensor-diagnose` — request body `{vehicle_id, scenario}`,
  calls `run_sensor_diagnosis`, returns the contract from §3.
- `GET /api/sensor-diagnose/scenarios` — returns the list of available mock
  scenario names + short descriptions, so the frontend can populate a
  dropdown instead of hardcoding scenario strings.
- Register router in `main.py` **independently** of `diagnose_router` —
  no shared dependencies, no shared Pydantic models between the two route
  files (duplicate the small ones if needed; the duplication cost is worth
  the isolation).

**Definition of done**: `curl -X POST localhost:5000/api/sensor-diagnose -d
'{"vehicle_id":"v1","scenario":"battery_degraded"}'` returns a full
diagnosis with the photo backend never touched, never imported, and — as a
sanity check — still works if `models/car_parts.py` is temporarily renamed.

---

### Phase E — Mock scenario data file (Day 3)

**File**: `data/sensor_profiles.json`

**Responsibility**: externalize the scenario definitions from Phase A's
Python code into JSON, matching the existing project convention
(`parts-db.json`, `prices.json`) of editable-without-redeploy mock data.

```json
{
  "healthy": {
    "battery_voltage": 13.2,
    "engine_rpm": 800,
    "coolant_temp": 90,
    "oil_pressure": 45,
    "tire_pressure_fl": 34
  },
  "battery_degraded": {
    "battery_voltage": 11.2,
    "engine_rpm": 750,
    "coolant_temp": 91,
    "oil_pressure": 44,
    "tire_pressure_fl": 33
  },
  "overheating": {
    "battery_voltage": 13.0,
    "engine_rpm": 2200,
    "coolant_temp": 118,
    "oil_pressure": 40,
    "tire_pressure_fl": 34
  },
  "multi_fault": {
    "battery_voltage": 11.0,
    "engine_rpm": 850,
    "coolant_temp": 112,
    "oil_pressure": 22,
    "tire_pressure_fl": 27
  }
}
```

`sensor_mock.py` loads this file rather than hardcoding scenarios inline —
so a teammate can add a new demo scenario by editing JSON, no code change,
no redeploy.

**Definition of done**: Adding a new scenario key to this file makes it
immediately selectable via `GET /api/sensor-diagnose/scenarios` with no
code touched.

---

### Phase F — Tests (Day 3–4)

Scoped narrowly to prove the separation, not full coverage:

- `test_sensor_mock.py` — every scenario in the JSON file produces valid
  readings.
- `test_sensor_rules.py` — known-bad readings (e.g. `battery_voltage: 10.5`)
  produce the expected anomaly + severity; known-good readings produce zero
  anomalies.
- `test_sensor_route.py` — hits `/api/sensor-diagnose`, asserts response
  shape matches §3.
- **Isolation test** (the one that matters most for this plan): a test that
  imports `models.sensor_diagnosis` and asserts `sys.modules` contains no
  `car_parts` or `diagnosis` (photo) modules after the import — a cheap,
  concrete guarantee the separation held.

---

## 5. Demo scenarios to ship (content plan, not just code)

| Scenario key | Story it tells |
|---|---|
| `healthy` | All sensors nominal — proves the "no issue" path isn't a dead end |
| `battery_degraded` | Single-sensor anomaly, medium confidence |
| `brake_wear_high` | Safety-critical severity=high, tests urgency messaging |
| `overheating` | severity=critical, tests the top of the severity scale |
| `low_tire_pressure` | Low-severity, everyday scenario |
| `multi_fault` | Multiple simultaneous anomalies, tests primary-issue selection logic |

Six scenarios is enough to demonstrate range (severity levels, single vs.
multi-anomaly, healthy baseline) without inflating scope.

---

## 6. Explicit non-goals for this plan

Stated up front so scope doesn't creep mid-build:

- ❌ No OBD-II/ELM327/Bluetooth code — Phase A generates data directly in
  Python, no serial port, no device pairing.
- ❌ No sensor history/time-series persistence (`SensorDataStore` from
  `models/obd.py` is not used here) — each request is stateless.
- ❌ No fusion with photo diagnosis — that's a future, clearly separate
  combiner step (see §7).
- ❌ No trained ML model (LSTM, anomaly-detection network) — rules/thresholds
  only, explicitly labeled as such in the response (`"method": "rule_based"`
  can be added to the diagnosis object for honesty, mirroring how the photo
  pipeline labels `"method": "yolo"` vs `"method": "heuristic_fallback"`).
- ❌ No changes to `models/car_parts.py`, `models/diagnosis.py`,
  `routes/diagnose.py`, or `models/fusion.py` — they're left exactly as-is.

---

## 7. Roadmap after this plan (not part of current scope)

1. **Hardware layer** — reintroduce `models/obd.py`-style ELM327 handling as
   a *separate* module that produces the same reading shape as
   `sensor_mock.py`, so `sensor_rules.py` doesn't need to change at all when
   real hardware replaces mock data. This is the payoff of keeping Phase B
   pure: the rules engine never needs to know whether readings came from a
   mock generator or a real dongle.
2. **Persistence** — reintroduce `SensorDataStore` once there's a reason to
   look at trends over time, not just point-in-time snapshots.
3. **Fusion (optional, later)** — a thin `models/fusion.py` that calls
   `run_sensor_diagnosis()` and the existing photo `detect_car_part()`
   independently, then merges only their *output dicts* — never their
   internals. This preserves the separation this plan establishes; fusion
   becomes an additive layer, not a rewrite.
4. **Real ML model** — ✅ **Implemented.** `sensor_rules.py` now uses a
   trained `IsolationForest` (scikit-learn) as the primary anomaly-scoring
   method, trained on synthetic normal-range data since no real historical
   fleet data exists yet. The original threshold check remains as an
   explicit, labeled fallback (`method: "threshold_fallback"` vs
   `"ml_isolation_forest"` in every response) — same honesty pattern as the
   photo pipeline's YOLO→heuristic cascade. Swapping in a model trained on
   real historical sensor data later requires no route or contract change.

---

## 8. Effort estimate

| Phase | Task | Effort |
|---|---|---|
| A | Mock data generator | 3–4 hrs |
| B | Rule-based analysis layer | 5–6 hrs |
| C | Orchestration module | 2 hrs |
| D | API route | 3 hrs |
| E | Scenario JSON + wiring to loader | 2 hrs |
| F | Tests (incl. isolation test) | 4 hrs |
| **Total** | | **~19–21 hrs (2.5–3 days, 1 backend engineer)** |

No frontend work is included in this estimate — the existing
`SensorDashboard.tsx` and `DiagnosisCard.tsx` components already match the
§3 response shape closely enough to point at the new endpoint with minimal
prop mapping, which is a follow-up task once this backend plan is complete.
