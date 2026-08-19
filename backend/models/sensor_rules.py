"""
Rule-Based Sensor Analysis — Sensor Fusion Prototype (Phase B)

Given a list of sensor readings, decides what's normal, what's anomalous,
and how severe. This is "the model" for the prototype — explicitly
threshold/rule-based rather than a trained model. That's a deliberate,
disclosed choice (see docs/SENSOR_FUSION_BACKEND_PLAN.md §4 Phase B):

- Deterministic and demoable without a training pipeline.
- Same tier of honesty as the photo pipeline's heuristic fallback in
  models/diagnosis.py — this module labels its own output "rule_based" so
  nothing overstates itself as a trained model.
- A clean seam: a future trained anomaly-detection model can replace the
  internals of evaluate_readings()/diagnose_from_anomalies() without the
  route or the mock generator needing to change.

Thresholds are defined here as the single source of truth for this
pipeline. They are NOT imported from models/obd.py — that module is
hardware-adjacent and out of scope for this prototype; duplicating the
constant is the cost of keeping the two pipelines fully independent.

Zero dependency on models/car_parts.py, models/diagnosis.py, or anything
image-related.
"""

import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Single source of truth for this pipeline's normal operating ranges.
# severity below is what's reported when a value falls in the "warning"
# band; values beyond the warning band are always "critical".
SENSOR_THRESHOLDS = {
    "battery_voltage": {"min": 12.0, "max": 14.5, "warning_min": 11.5, "warning_max": 15.0},
    "coolant_temp": {"min": 80, "max": 100, "warning_min": 70, "warning_max": 110},
    "oil_pressure": {"min": 25, "max": 65, "warning_min": 20, "warning_max": 75},
    "tire_pressure_fl": {"min": 30, "max": 36, "warning_min": 26, "warning_max": 40},
    "brake_pad_wear": {"min": 0, "max": 60, "warning_min": 0, "warning_max": 80},
    # engine_rpm intentionally has no thresholds — idle/driving RPM varies
    # too widely to flag as an anomaly on its own in this simple prototype.
}

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


def evaluate_readings(readings: List[Dict]) -> List[Dict]:
    """
    Compare each reading against SENSOR_THRESHOLDS and flag anomalies.

    Args:
        readings: list of {sensor, value, unit, ...} dicts, as produced by
                  sensor_mock.generate_reading()

    Returns:
        List of anomaly dicts: {sensor, value, unit, expected_range, severity}
        Empty list if every reading is within its normal range (or has no
        defined threshold, e.g. engine_rpm).
    """
    anomalies = []

    for reading in readings:
        sensor = reading["sensor"]
        value = reading["value"]

        if sensor not in SENSOR_THRESHOLDS:
            continue

        bounds = SENSOR_THRESHOLDS[sensor]

        if bounds["min"] <= value <= bounds["max"]:
            continue  # within normal range, not an anomaly

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
        })

    logger.info(f"Evaluated {len(readings)} readings, found {len(anomalies)} anomalies")
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
            "confidence": 0.95,
            "recommended_parts": [],
            "method": "rule_based",
        }

    # Pick the highest-severity anomaly as primary. Ties broken by order
    # of appearance (stable sort).
    primary = max(anomalies, key=lambda a: SEVERITY_PRIORITY.get(a["severity"], 0))
    sensor = primary["sensor"]

    part_info = SENSOR_TO_PART.get(sensor, {
        "part_type": "unknown",
        "issue": f"Anomalous reading on {sensor}",
        "recommended_parts": [],
    })

    # Confidence reflects how far outside the normal range the primary
    # anomaly is, and whether other anomalies corroborate a broader issue.
    base_confidence = 0.75 if primary["severity"] == "high" else 0.9
    corroboration_boost = min(0.05 * (len(anomalies) - 1), 0.1)
    confidence = round(min(0.95, base_confidence + corroboration_boost), 2)

    return {
        "part_type": part_info["part_type"],
        "issue": part_info["issue"],
        "severity": primary["severity"],
        "confidence": confidence,
        "recommended_parts": part_info["recommended_parts"],
        "method": "rule_based",
    }
