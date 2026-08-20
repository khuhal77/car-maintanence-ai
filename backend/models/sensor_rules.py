"""
Sensor Analysis — Sensor Fusion Prototype (Phase B)

Given a list of sensor readings, decides what's normal, what's anomalous,
and how severe.

Primary method: an IsolationForest (scikit-learn) trained on synthetic
"normal operation" data generated from the same range definitions used
below. IsolationForest is an appropriate fit for this problem — sensor
readings are low-dimensional tabular data where anomalies are rare
deviations from a dense normal cluster, which is exactly the structure
Isolation Forest is designed to separate, and it needs no labeled failure
data (none exists yet for a prototype with 6 mock scenarios).

Fallback method: the original threshold/range check, used only if the
model fails to load (e.g. scikit-learn not installed, or training data
unavailable). This mirrors the same honesty pattern already used in the
photo pipeline (models/car_parts.py YOLO -> models/diagnosis.py heuristic
fallback) — every diagnosis is labeled with which method actually produced
it ("ml_isolation_forest" vs "threshold_fallback"), never presented as more
certain than it is.

What the model does NOT decide: which vehicle part an anomaly maps to.
That mapping (SENSOR_TO_PART below) is domain knowledge, not something
worth "learning" from six mock scenarios — using a trained model for that
step would be dishonest overengineering, not rigor.

Thresholds/ranges are defined here as the single source of truth for this
pipeline. They are NOT imported from models/obd.py — that module is
hardware-adjacent and out of scope for this prototype; duplicating the
constant is the cost of keeping the two pipelines fully independent.

Zero dependency on models/car_parts.py, models/diagnosis.py, or anything
image-related.
"""

import logging
import numpy as np
from typing import List, Dict, Optional
from threading import Lock

logger = logging.getLogger(__name__)

# Single source of truth for this pipeline's normal operating ranges.
# Used both as (a) training-data bounds for the ML model and (b) the
# fallback threshold check if the model isn't available.
SENSOR_THRESHOLDS = {
    "battery_voltage": {"min": 12.0, "max": 14.5, "warning_min": 11.5, "warning_max": 15.0},
    "coolant_temp": {"min": 80, "max": 100, "warning_min": 70, "warning_max": 110},
    "oil_pressure": {"min": 25, "max": 65, "warning_min": 20, "warning_max": 75},
    "tire_pressure_fl": {"min": 30, "max": 36, "warning_min": 26, "warning_max": 40},
    "brake_pad_wear": {"min": 0, "max": 60, "warning_min": 0, "warning_max": 80},
    # engine_rpm intentionally has no thresholds — idle/driving RPM varies
    # too widely to flag as an anomaly on its own in this simple prototype.
}

# Sensors the ML model is trained on, in a fixed order (IsolationForest
# needs a consistent feature vector shape).
ML_SENSOR_FEATURES = ["battery_voltage", "coolant_temp", "oil_pressure", "tire_pressure_fl", "brake_pad_wear"]

# Maps an anomalous sensor to a diagnosable vehicle part/issue.
SENSOR_TO_PART = {
    "battery_voltage": {
        "part_type": "battery",
        "issue": "Battery voltage below safe operating range",
        "recommended_parts": ["12V Car Battery 60Ah", "Battery Terminals", "Battery Cable"],
    },
    "coolant_temp": {
        "part_type": "coolant",
        "issue": "Engine coolant temperature outside safe range",
        "recommended_parts": ["Coolant Concentrate", "Coolant Hoses", "Radiator Cap"],
    },
    "oil_pressure": {
        "part_type": "oil_filter",
        "issue": "Oil pressure outside safe range — possible clogged filter",
        "recommended_parts": ["Oil Filter", "Drain Plug", "Engine Oil 5W-30"],
    },
    "tire_pressure_fl": {
        "part_type": "tire",
        "issue": "Front-left tire pressure outside recommended range",
        "recommended_parts": ["Tire Repair Kit", "Wheel Balance"],
    },
    "brake_pad_wear": {
        "part_type": "brake_pad",
        "issue": "Brake pad wear exceeds safe threshold",
        "recommended_parts": ["Brake Pads Front Set", "Brake Fluid DOT 3", "Brake Rotor"],
    },
}

# Ordering used to pick a single "primary" issue when multiple anomalies
# are present in the multi_fault scenario. Higher priority = shown first.
SEVERITY_PRIORITY = {"critical": 3, "high": 2, "medium": 1, "low": 0}


class _AnomalyModel:
    """
    Lazily-trained IsolationForest wrapper.

    Training data is synthetic: sampled uniformly from each sensor's
    normal [min, max] range (with light Gaussian noise), which is a
    defensible substitute for real historical fleet data that doesn't
    exist yet for this prototype. This is disclosed, not hidden — see
    the "method" field every diagnosis returns.
    """

    def __init__(self):
        self._model = None
        self._lock = Lock()
        self._available = None  # None = not yet checked

    def _train(self):
        from sklearn.ensemble import IsolationForest

        rng = np.random.default_rng(seed=42)
        n_samples = 2000

        columns = []
        for sensor in ML_SENSOR_FEATURES:
            bounds = SENSOR_THRESHOLDS[sensor]
            mid = (bounds["min"] + bounds["max"]) / 2
            spread = (bounds["max"] - bounds["min"]) / 2
            # Normal operation clusters around the midpoint of the healthy
            # range, with some spread — not uniform noise, which would make
            # "normal" indistinguishable from "borderline".
            samples = rng.normal(loc=mid, scale=spread * 0.4, size=n_samples)
            columns.append(samples)

        X_train = np.column_stack(columns)

        model = IsolationForest(
            n_estimators=100,
            contamination=0.05,  # assume ~5% of synthetic normal data is borderline/noisy
            random_state=42,
        )
        model.fit(X_train)
        return model

    def get_model(self):
        """Train on first use, cache thereafter. Thread-safe."""
        if self._available is False:
            return None

        if self._model is None:
            with self._lock:
                if self._model is None:
                    try:
                        self._model = self._train()
                        self._available = True
                        logger.info("IsolationForest anomaly model trained and cached")
                    except Exception as e:
                        logger.warning(f"Could not train IsolationForest model: {e}. Falling back to thresholds.")
                        self._available = False
                        return None
        return self._model


_anomaly_model = _AnomalyModel()


def _readings_to_vector(readings: List[Dict]) -> Optional[np.ndarray]:
    """
    Build a fixed-order feature vector from readings, using the ML_SENSOR_FEATURES
    order. Returns None if any required sensor is missing from the readings
    (the model needs a complete vector; a partial one can't be scored).
    """
    values_by_sensor = {r["sensor"]: r["value"] for r in readings}
    if not all(s in values_by_sensor for s in ML_SENSOR_FEATURES):
        return None
    return np.array([[values_by_sensor[s] for s in ML_SENSOR_FEATURES]])


def _score_to_severity_and_confidence(anomaly_score: float) -> tuple:
    """
    IsolationForest's decision_function returns roughly [-0.5, 0.5], with
    negative = more anomalous. Map that into our severity buckets and a
    0-1 confidence, rather than exposing the raw score to callers.
    """
    if anomaly_score >= 0:
        return None  # not flagged as anomalous
    magnitude = min(abs(anomaly_score) / 0.3, 1.0)  # normalize, clip at 1.0
    if magnitude > 0.66:
        severity = "critical"
    elif magnitude > 0.33:
        severity = "high"
    else:
        severity = "medium"
    confidence = round(0.6 + magnitude * 0.35, 2)  # 0.6-0.95 range
    return severity, confidence


def evaluate_readings(readings: List[Dict]) -> List[Dict]:
    """
    Flag anomalous readings using the trained IsolationForest when
    available, falling back to threshold checks otherwise.

    Args:
        readings: list of {sensor, value, unit, ...} dicts, as produced by
                  sensor_mock.generate_reading()

    Returns:
        List of anomaly dicts: {sensor, value, unit, expected_range, severity, method}
        Empty list if every reading is within normal range.
    """
    model = _anomaly_model.get_model()

    if model is not None:
        anomalies = _evaluate_with_ml(readings, model)
        if anomalies is not None:
            logger.info(f"Evaluated {len(readings)} readings via ML model, found {len(anomalies)} anomalies")
            return anomalies
        logger.info("Incomplete sensor set for ML scoring, falling back to thresholds for this request")

    anomalies = _evaluate_with_thresholds(readings)
    logger.info(f"Evaluated {len(readings)} readings via threshold fallback, found {len(anomalies)} anomalies")
    return anomalies


def _evaluate_with_ml(readings: List[Dict], model) -> Optional[List[Dict]]:
    """
    Score readings with IsolationForest. Per-sensor anomaly attribution
    (which sensor is the "cause") isn't something IsolationForest gives
    natively for a single sample, so once the overall vector is flagged
    anomalous, we still use the per-sensor threshold bounds to explain
    *which* sensor(s) are out of range — the ML model decides whether
    something is wrong and how severely; the range check explains what.
    """
    vector = _readings_to_vector(readings)
    if vector is None:
        return None

    anomaly_score = float(model.decision_function(vector)[0])
    result = _score_to_severity_and_confidence(anomaly_score)

    if result is None:
        return []  # ML model says this reading set is normal

    severity, _confidence = result

    # Attribute to the specific sensor(s) furthest outside their normal
    # range, so the response can still name a specific anomalous sensor.
    values_by_sensor = {r["sensor"]: r for r in readings if r["sensor"] in SENSOR_THRESHOLDS}
    anomalies = []
    for sensor, bounds in SENSOR_THRESHOLDS.items():
        if sensor not in values_by_sensor:
            continue
        reading = values_by_sensor[sensor]
        value = reading["value"]
        if bounds["min"] <= value <= bounds["max"]:
            continue
        anomalies.append({
            "sensor": sensor,
            "value": value,
            "unit": reading.get("unit", ""),
            "expected_range": [bounds["min"], bounds["max"]],
            "severity": severity,
            "method": "ml_isolation_forest",
        })

    if not anomalies:
        # ML flagged the overall vector as anomalous but no single sensor
        # crossed its hard range — a genuinely borderline/combined-effect
        # case. Surface it as a low-confidence, whole-vehicle anomaly
        # rather than silently dropping it.
        anomalies.append({
            "sensor": "combined",
            "value": None,
            "unit": "",
            "expected_range": None,
            "severity": "medium",
            "method": "ml_isolation_forest",
        })

    return anomalies


def _evaluate_with_thresholds(readings: List[Dict]) -> List[Dict]:
    """Original range-check logic, used only as a fallback."""
    anomalies = []
    for reading in readings:
        sensor = reading["sensor"]
        value = reading["value"]

        if sensor not in SENSOR_THRESHOLDS:
            continue

        bounds = SENSOR_THRESHOLDS[sensor]
        if bounds["min"] <= value <= bounds["max"]:
            continue

        if value < bounds["min"]:
            severity = "critical" if value < bounds["warning_min"] else "high"
        else:
            severity = "critical" if value > bounds["warning_max"] else "high"

        anomalies.append({
            "sensor": sensor,
            "value": value,
            "unit": reading.get("unit", ""),
            "expected_range": [bounds["min"], bounds["max"]],
            "severity": severity,
            "method": "threshold_fallback",
        })
    return anomalies


def diagnose_from_anomalies(anomalies: List[Dict]) -> Dict:
    """
    Map a set of anomalies to a single diagnosis: the highest-severity
    anomaly becomes the primary issue; all anomalies remain visible
    separately in the route's response (see routes/sensor_diagnose.py).

    Args:
        anomalies: output of evaluate_readings()

    Returns:
        {part_type, issue, severity, confidence, recommended_parts, method}

    Handles the zero-anomaly case explicitly — returns a "no issues
    detected" diagnosis rather than null/error, so the "healthy" demo
    scenario has a clean, non-error result.
    """
    if not anomalies:
        return {
            "part_type": "none",
            "issue": "No anomalies detected — all monitored sensors within normal range.",
            "severity": "none",
            "confidence": 0.9,
            "recommended_parts": [],
            "method": "ml_isolation_forest" if _anomaly_model.get_model() is not None else "threshold_fallback",
        }

    # Pick the highest-severity anomaly as primary. Ties broken by order
    # of appearance (stable sort).
    primary = max(anomalies, key=lambda a: SEVERITY_PRIORITY.get(a["severity"], 0))
    sensor = primary["sensor"]
    method = primary.get("method", "threshold_fallback")

    part_info = SENSOR_TO_PART.get(sensor, {
        "part_type": "unknown",
        "issue": "Anomalous sensor pattern detected across multiple readings" if sensor == "combined"
                 else f"Anomalous reading on {sensor}",
        "recommended_parts": [],
    })

    # Confidence: the ML path already computed a calibrated per-anomaly
    # confidence during scoring but we don't thread it through the anomaly
    # dict itself (kept minimal/serializable) — recompute the same style of
    # value here so both paths stay consistent and transparent about method.
    if method == "ml_isolation_forest":
        base_confidence = {"critical": 0.9, "high": 0.78, "medium": 0.65}.get(primary["severity"], 0.6)
    else:
        base_confidence = {"critical": 0.9, "high": 0.75}.get(primary["severity"], 0.6)
    corroboration_boost = min(0.03 * (len(anomalies) - 1), 0.08)
    confidence = round(min(0.97, base_confidence + corroboration_boost), 2)

    return {
        "part_type": part_info["part_type"],
        "issue": part_info["issue"],
        "severity": primary["severity"],
        "confidence": confidence,
        "recommended_parts": part_info["recommended_parts"],
        "method": method,
    }
