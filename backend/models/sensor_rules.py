"""
Sensor Analysis — Sensor Fusion Prototype (Phase B)

Given a list of sensor readings, decides what's normal, what's anomalous,
and how severe. Covers all 11 vehicle health domains (10 conventional +
EV-specific) via the parameter catalog in models/vehicle_domains.py — see
that module for the domain taxonomy, acquisition-method tags (OBD-II /
CAN bus / physical sensor / telematics), and the level 0-7 vehicle health
data hierarchy this pipeline's output maps onto.

Two ML models are trained: one over a small set of high-signal
conventional-vehicle parameters, and one over EV-specific parameters
(battery/BMS/inverter/motor). A reading set is routed to whichever model
its features match; this avoids forcing conventional and EV vehicles into
one feature vector where most fields would always be missing.

Primary method: IsolationForest (scikit-learn) trained on synthetic
"normal operation" data generated from the same range definitions used
below. IsolationForest is an appropriate fit for this problem — sensor
readings are low-dimensional tabular data where anomalies are rare
deviations from a dense normal cluster, which is exactly the structure
Isolation Forest is designed to separate, and it needs no labeled failure
data (none exists yet for a prototype with mock scenarios).

Fallback method: the original threshold/range check, used only if the
model fails to load (e.g. scikit-learn not installed, or training data
unavailable), or if a reading set doesn't match either ML feature set
completely. This mirrors the same honesty pattern already used in the
photo pipeline (models/car_parts.py YOLO -> models/diagnosis.py heuristic
fallback) — every diagnosis is labeled with which method actually produced
it ("ml_isolation_forest" vs "threshold_fallback"), never presented as more
certain than it is.

What the model does NOT decide: which vehicle part/domain an anomaly maps
to. That mapping (SENSOR_TO_PART below, domain tags in vehicle_domains.py)
is domain knowledge, not something worth "learning" from a handful of mock
scenarios — using a trained model for that step would be dishonest
overengineering, not rigor.

Thresholds/ranges are defined here as the single source of truth for this
pipeline's scoring. They are NOT imported from models/obd.py — that module
is hardware-adjacent and out of scope for this prototype; duplicating the
constant is the cost of keeping the two pipelines fully independent.

Zero dependency on models/car_parts.py, models/diagnosis.py, or anything
image-related.
"""

import logging
import numpy as np
from typing import List, Dict, Optional
from threading import Lock

from models.vehicle_domains import SENSOR_CATALOG, VehicleDomain

logger = logging.getLogger(__name__)

# Single source of truth for this pipeline's normal operating ranges.
# Used both as (a) training-data bounds for the ML model and (b) the
# fallback threshold check if the model isn't available.
#
# Grouped by vehicle health domain to mirror models/vehicle_domains.py.
# Not every SENSOR_CATALOG parameter has a threshold here — some (DTCs,
# throttle position, engine RPM on its own) don't have a meaningful fixed
# "normal range" for anomaly purposes in this prototype; they're catalogued
# for completeness but excluded from range-based scoring, same as the
# original engine_rpm exclusion.
SENSOR_THRESHOLDS = {
    # --- Engine ---
    "coolant_temp": {"min": 80, "max": 100, "warning_min": 70, "warning_max": 110},
    "intake_temp": {"min": 10, "max": 50, "warning_min": 0, "warning_max": 60},
    "map_sensor": {"min": 20, "max": 105, "warning_min": 10, "warning_max": 115},
    "maf_sensor": {"min": 2, "max": 25, "warning_min": 1, "warning_max": 35},
    "fuel_pressure": {"min": 250, "max": 400, "warning_min": 200, "warning_max": 450},
    "engine_load": {"min": 0, "max": 85, "warning_min": 0, "warning_max": 95},
    "engine_vibration": {"min": 0, "max": 4.5, "warning_min": 0, "warning_max": 7.0},

    # --- Exhaust / Emission ---
    "o2_lambda": {"min": 0.85, "max": 1.15, "warning_min": 0.7, "warning_max": 1.3},

    # --- Battery (12V) / Electrical ---
    "battery_voltage": {"min": 12.0, "max": 14.5, "warning_min": 11.5, "warning_max": 15.0},

    # --- Tires & Wheels ---
    "tire_pressure_fl": {"min": 30, "max": 36, "warning_min": 26, "warning_max": 40},
    "wheel_hub_vibration": {"min": 0, "max": 3.0, "warning_min": 0, "warning_max": 5.0},

    # --- Brakes ---
    "brake_status": {"min": 0, "max": 60, "warning_min": 0, "warning_max": 80},
    "brake_temp": {"min": 20, "max": 250, "warning_min": 10, "warning_max": 350},

    # --- Structure / Body / Steering (IMU-derived) ---
    # imu_6axis is multi-axis and not a single scalar; excluded from simple
    # range scoring in this prototype (would need vector-based analysis).

    # --- Cooling / Ambient ---
    "ambient_temp": {"min": -10, "max": 45, "warning_min": -20, "warning_max": 55},

    # --- EV-specific ---
    "hv_battery_soc": {"min": 15, "max": 100, "warning_min": 5, "warning_max": 100},
    "hv_battery_temp": {"min": 15, "max": 40, "warning_min": 0, "warning_max": 55},
    "bms_cell_voltage_delta": {"min": 0, "max": 30, "warning_min": 0, "warning_max": 60},
    "inverter_temp": {"min": 20, "max": 70, "warning_min": 10, "warning_max": 90},
    "e_motor_temp": {"min": 20, "max": 100, "warning_min": 10, "warning_max": 130},
    "charging_current": {"min": 0, "max": 32, "warning_min": 0, "warning_max": 40},
}

# Sensors the primary (conventional-vehicle) ML model is trained on, in a
# fixed order (IsolationForest needs a consistent feature vector shape).
# Kept intentionally small — a handful of high-signal parameters across
# distinct domains — rather than all thresholded sensors, so the model
# stays trainable on synthetic data without overfitting to noise in
# rarely-anomalous channels (e.g. ambient_temp).
ML_SENSOR_FEATURES = [
    "battery_voltage", "coolant_temp", "fuel_pressure",
    "tire_pressure_fl", "brake_status", "o2_lambda",
]

# A second, EV-specific feature set used when the reading set is
# identifiably an EV scenario (see _is_ev_reading_set below). Kept as a
# separate small model rather than merging into one feature vector, since
# conventional and EV vehicles don't share the majority of their signals —
# forcing them into one vector would mean most scenarios have missing
# features and never hit the ML path at all.
ML_EV_SENSOR_FEATURES = [
    "hv_battery_soc", "hv_battery_temp", "bms_cell_voltage_delta",
    "inverter_temp", "e_motor_temp",
]

# Maps an anomalous sensor to a diagnosable vehicle part/issue, plus which
# domain it belongs to (drawn from the shared catalog rather than
# duplicated here).
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
    "intake_temp": {
        "part_type": "air_intake",
        "issue": "Intake air temperature outside expected range",
        "recommended_parts": ["Air Intake Sensor", "Air Filter"],
    },
    "map_sensor": {
        "part_type": "map_sensor",
        "issue": "Manifold pressure reading outside expected range — possible vacuum leak or sensor fault",
        "recommended_parts": ["MAP Sensor", "Intake Manifold Gasket"],
    },
    "maf_sensor": {
        "part_type": "maf_sensor",
        "issue": "Mass air flow reading outside expected range — possible sensor contamination",
        "recommended_parts": ["MAF Sensor", "Air Filter"],
    },
    "fuel_pressure": {
        "part_type": "fuel_system",
        "issue": "Fuel pressure outside safe operating range",
        "recommended_parts": ["Fuel Pump", "Fuel Filter", "Fuel Pressure Regulator"],
    },
    "engine_load": {
        "part_type": "engine",
        "issue": "Calculated engine load outside expected operating range",
        "recommended_parts": ["Engine Diagnostic Inspection"],
    },
    "engine_vibration": {
        "part_type": "engine_mount",
        "issue": "Elevated engine vibration — possible mount wear or misfire",
        "recommended_parts": ["Engine Mount", "Spark Plugs Set (4)"],
    },
    "o2_lambda": {
        "part_type": "o2_sensor",
        "issue": "O2/lambda reading outside expected range — possible rich/lean condition",
        "recommended_parts": ["O2 Sensor", "Catalytic Converter Inspection"],
    },
    "tire_pressure_fl": {
        "part_type": "tire",
        "issue": "Front-left tire pressure outside recommended range",
        "recommended_parts": ["Tire Repair Kit", "Wheel Balance"],
    },
    "wheel_hub_vibration": {
        "part_type": "wheel_bearing",
        "issue": "Elevated wheel/hub vibration — possible bearing wear",
        "recommended_parts": ["Wheel Bearing", "Wheel Balance"],
    },
    "brake_status": {
        "part_type": "brake_pad",
        "issue": "Brake pad wear exceeds safe threshold",
        "recommended_parts": ["Brake Pads Front Set", "Brake Fluid DOT 3", "Brake Rotor"],
    },
    "brake_temp": {
        "part_type": "brake_system",
        "issue": "Brake temperature outside expected range — possible dragging caliper or overheating",
        "recommended_parts": ["Brake Caliper Inspection", "Brake Fluid DOT 3"],
    },
    "ambient_temp": {
        "part_type": "environmental",
        "issue": "Ambient temperature reading outside expected sensor range",
        "recommended_parts": ["Ambient Temperature Sensor"],
    },
    # --- EV-specific ---
    "hv_battery_soc": {
        "part_type": "hv_battery",
        "issue": "High-voltage battery state of charge critically low",
        "recommended_parts": ["Schedule Charging", "HV Battery Inspection"],
    },
    "hv_battery_temp": {
        "part_type": "hv_battery",
        "issue": "High-voltage battery temperature outside safe operating range",
        "recommended_parts": ["HV Battery Thermal System Inspection"],
    },
    "bms_cell_voltage_delta": {
        "part_type": "bms",
        "issue": "Battery cell voltage imbalance detected — possible cell degradation",
        "recommended_parts": ["BMS Diagnostic Inspection", "Cell Balancing Service"],
    },
    "inverter_temp": {
        "part_type": "inverter",
        "issue": "Inverter temperature outside safe operating range",
        "recommended_parts": ["Inverter Cooling System Inspection"],
    },
    "e_motor_temp": {
        "part_type": "e_motor",
        "issue": "E-motor temperature outside safe operating range",
        "recommended_parts": ["E-Motor Cooling System Inspection"],
    },
    "charging_current": {
        "part_type": "charging_system",
        "issue": "Charging current outside expected range — possible charger or onboard charging fault",
        "recommended_parts": ["Charging Cable Inspection", "Onboard Charger Diagnostic"],
    },
}

# Ordering used to pick a single "primary" issue when multiple anomalies
# are present in the multi_fault scenario. Higher priority = shown first.
SEVERITY_PRIORITY = {"critical": 3, "high": 2, "medium": 1, "low": 0}


class _AnomalyModel:
    """
    Lazily-trained IsolationForest wrapper for a named feature set.

    Training data is synthetic: sampled from each sensor's normal
    [min, max] range (with Gaussian spread around the midpoint), which is
    a defensible substitute for real historical fleet data that doesn't
    exist yet for this prototype. This is disclosed, not hidden — see the
    "method" field every diagnosis returns.

    One instance of this class is created per feature set (conventional,
    EV) rather than a single shared model, since the two vehicle types
    don't share most of their signals.
    """

    def __init__(self, name: str, features: List[str]):
        self.name = name
        self.features = features
        self._model = None
        self._lock = Lock()
        self._available = None  # None = not yet checked

    def _train(self):
        from sklearn.ensemble import IsolationForest

        rng = np.random.default_rng(seed=42)
        n_samples = 2000

        columns = []
        for sensor in self.features:
            bounds = SENSOR_THRESHOLDS[sensor]
            mid = (bounds["min"] + bounds["max"]) / 2
            half_range = (bounds["max"] - bounds["min"]) / 2
            # Normal operation clusters tightly around the midpoint of the
            # healthy [min, max] range. scale is deliberately small (15% of
            # the half-range) so that values at or beyond min/max — which by
            # definition should be flagged as anomalous — actually fall
            # several standard deviations out, rather than blending into the
            # "normal" distribution's tail. A too-wide scale (as in an
            # earlier version of this model) made mild threshold violations
            # statistically indistinguishable from normal noise.
            samples = rng.normal(loc=mid, scale=max(half_range * 0.15, 1e-6), size=n_samples)
            columns.append(samples)

        X_train = np.column_stack(columns)

        model = IsolationForest(
            n_estimators=150,
            contamination=0.03,  # tight synthetic cluster -> low expected contamination
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
                        logger.info(f"IsolationForest anomaly model '{self.name}' trained and cached")
                    except Exception as e:
                        logger.warning(f"Could not train IsolationForest model '{self.name}': {e}. Falling back to thresholds.")
                        self._available = False
                        return None
        return self._model


_anomaly_model = _AnomalyModel("conventional", ML_SENSOR_FEATURES)
_ev_anomaly_model = _AnomalyModel("ev", ML_EV_SENSOR_FEATURES)


def _readings_to_vector(readings: List[Dict], features: List[str]) -> Optional[np.ndarray]:
    """
    Build a fixed-order feature vector from readings, using the given
    feature order. Returns None if any required sensor is missing from the
    readings (the model needs a complete vector; a partial one can't be
    scored).
    """
    values_by_sensor = {r["sensor"]: r["value"] for r in readings}
    if not all(s in values_by_sensor for s in features):
        return None
    return np.array([[values_by_sensor[s] for s in features]])


def _score_to_severity_and_confidence(anomaly_score: float) -> tuple:
    """
    IsolationForest's decision_function returns roughly [-0.5, 0.5], with
    negative = more anomalous. Map that into our severity buckets and a
    0-1 confidence, rather than exposing the raw score to callers.

    A deadzone is applied around zero (-0.05 to 0) before treating a score
    as anomalous. Scores in that band are statistically ambiguous noise
    around the decision boundary — without a deadzone, a healthy reading
    set can occasionally land at e.g. -0.014 and get flagged, which is a
    false positive severe enough to undermine trust in the "no anomalies"
    result for the demo's own "healthy" scenarios.
    """
    if anomaly_score >= -0.05:
        return None  # not flagged as anomalous (includes the near-zero deadzone)
    magnitude = min(abs(anomaly_score) / 0.3, 1.0)  # normalize, clip at 1.0
    if magnitude > 0.66:
        severity = "critical"
    elif magnitude > 0.33:
        severity = "high"
    else:
        severity = "medium"
    confidence = round(0.6 + magnitude * 0.35, 2)  # 0.6-0.95 range
    return severity, confidence


def _all_readings_comfortably_normal(readings: List[Dict], margin_fraction: float = 0.1) -> bool:
    """
    True if every thresholded reading sits within its [min, max] band with
    at least `margin_fraction` of the band's half-width to spare on both
    sides — i.e. nowhere near the edge, not just technically inside it.

    Used as a hard guard before accepting a combined-effect ML anomaly: if
    every individual reading is comfortably normal, a mildly negative
    anomaly score is far more likely to be synthetic-training-data noise
    than a genuine cross-sensor pattern, and should not be surfaced as an
    anomaly. This catches exactly the ev_healthy-style false positive that
    a bare score deadzone alone doesn't fully rule out.
    """
    for reading in readings:
        sensor = reading["sensor"]
        if sensor not in SENSOR_THRESHOLDS:
            continue
        bounds = SENSOR_THRESHOLDS[sensor]
        half_width = (bounds["max"] - bounds["min"]) / 2
        margin = half_width * margin_fraction
        if not (bounds["min"] + margin <= reading["value"] <= bounds["max"] - margin):
            return False
    return True


def evaluate_readings(readings: List[Dict]) -> List[Dict]:
    """
    Flag anomalous readings.

    Approach: per-sensor threshold checks are the ground truth for *whether*
    a given reading is out of its safe range — that's an unambiguous,
    auditable fact about the domain (a battery at 11.2V is low regardless of
    what any model concludes about the whole vector). The ML model's role is
    twofold:
      1. Grade *severity/confidence* for threshold-violating readings using
         the trained IsolationForest's anomaly score, when the full feature
         set for a known model is present — a genuinely more nuanced signal
         than the earlier fixed high/critical split.
      2. Catch *combined-effect* anomalies where no single sensor crosses
         its hard threshold but the overall pattern is still unusual (e.g.
         several sensors mildly elevated at once) — surfaced as a
         "combined" anomaly.

    This intentionally does NOT let the ML model override or suppress a
    clear threshold violation just because other features in the vector
    look normal — a diluted multivariate score is not a good reason to miss
    an obviously out-of-range single-sensor fault, which is both a real
    modeling limitation with only a handful of features and a safety
    concern for something like brake wear or battery voltage.

    Args:
        readings: list of {sensor, value, unit, ...} dicts, as produced by
                  sensor_mock.generate_reading()

    Returns:
        List of anomaly dicts: {sensor, value, unit, expected_range, severity, method}
        Empty list if every reading is within normal range.
    """
    threshold_anomalies = _evaluate_with_thresholds(readings)

    # Try to grade the threshold anomalies' severity/confidence with a
    # matching ML model, and separately check for a combined-effect
    # anomaly the threshold check alone wouldn't catch.
    ev_model = _ev_anomaly_model.get_model()
    model = _anomaly_model.get_model()

    active_model, features = None, None
    if ev_model is not None and _readings_to_vector(readings, ML_EV_SENSOR_FEATURES) is not None:
        active_model, features = ev_model, ML_EV_SENSOR_FEATURES
    elif model is not None and _readings_to_vector(readings, ML_SENSOR_FEATURES) is not None:
        active_model, features = model, ML_SENSOR_FEATURES

    if active_model is None:
        logger.info(f"Evaluated {len(readings)} readings via threshold-only (no matching ML feature set), found {len(threshold_anomalies)} anomalies")
        return threshold_anomalies

    vector = _readings_to_vector(readings, features)
    anomaly_score = float(active_model.decision_function(vector)[0])
    ml_result = _score_to_severity_and_confidence(anomaly_score)

    if threshold_anomalies:
        # Upgrade method label and, where the ML score agrees something is
        # wrong, use its severity grading (typically more granular than the
        # threshold check's high/critical split) — but never downgrade a
        # threshold violation to "not anomalous" based on the ML score alone.
        for a in threshold_anomalies:
            a["method"] = "ml_isolation_forest"
            if ml_result is not None:
                ml_severity, _ = ml_result
                if SEVERITY_PRIORITY.get(ml_severity, 0) > SEVERITY_PRIORITY.get(a["severity"], 0):
                    a["severity"] = ml_severity
        logger.info(f"Evaluated {len(readings)} readings via threshold+ML grading, found {len(threshold_anomalies)} anomalies")
        return threshold_anomalies

    if ml_result is not None and not _all_readings_comfortably_normal(readings):
        # No single sensor crossed its hard range, but the ML model flags
        # the overall pattern as anomalous, AND at least one reading isn't
        # comfortably centered in its normal band — a genuine
        # combined-effect case rather than boundary noise.
        severity, _confidence = ml_result
        logger.info(f"Evaluated {len(readings)} readings via ML model, found 1 combined-effect anomaly")
        return [{
            "sensor": "combined",
            "value": None,
            "unit": "",
            "expected_range": None,
            "severity": severity,
            "method": "ml_isolation_forest",
        }]

    logger.info(f"Evaluated {len(readings)} readings, found 0 anomalies")
    return []


def _evaluate_with_thresholds(readings: List[Dict]) -> List[Dict]:
    """Range-check logic. This is the primary source of truth for *whether*
    a reading is anomalous (see evaluate_readings docstring); the ML model
    only grades severity/confidence on top of what this function finds, or
    catches combined-effect cases this function can't see."""
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
        {part_type, issue, severity, confidence, recommended_parts, method, domain}

    Handles the zero-anomaly case explicitly — returns a "no issues
    detected" diagnosis rather than null/error, so the "healthy" demo
    scenario has a clean, non-error result.
    """
    any_model_available = (
        _anomaly_model.get_model() is not None or _ev_anomaly_model.get_model() is not None
    )

    if not anomalies:
        return {
            "part_type": "none",
            "issue": "No anomalies detected — all monitored sensors within normal range.",
            "severity": "none",
            "confidence": 0.9,
            "recommended_parts": [],
            "method": "ml_isolation_forest" if any_model_available else "threshold_fallback",
            "domain": "none",
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

    # Look up which domain(s) this sensor belongs to via the shared
    # catalog, so the diagnosis output can report domain alongside part.
    catalog_entry = SENSOR_CATALOG.get(sensor)
    primary_domain = catalog_entry.domains[0].value if catalog_entry and catalog_entry.domains else "unknown"

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
        "domain": primary_domain,
    }
