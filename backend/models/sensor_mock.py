"""
Mock Sensor Data Generator — Sensor Fusion Prototype (Phase A)

Generates plausible sensor readings for a named demo scenario. This module
has ONE job: produce data. No thresholds, no analysis, no diagnosis logic
live here — that belongs to sensor_rules.py.

Explicitly out of scope (see docs/SENSOR_FUSION_BACKEND_PLAN.md §6):
- No OBD-II / ELM327 / Bluetooth / hardware code of any kind
- No dependency on models/car_parts.py, models/diagnosis.py, or anything
  image-related — this file must be importable with zero photo-pipeline
  modules loaded

Scenario presets live in data/sensor_profiles.json so new demo scenarios
can be added by editing JSON, no code changes required.
"""

import json
import random
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict

logger = logging.getLogger(__name__)

SENSOR_UNITS = {
    "battery_voltage": "V",
    "engine_rpm": "RPM",
    "coolant_temp": "°C",
    "oil_pressure": "PSI",
    "tire_pressure_fl": "PSI",
    "brake_pad_wear": "%",
}

_PROFILES_PATH = Path(__file__).parent.parent / "data" / "sensor_profiles.json"


def _load_profiles() -> Dict:
    """Load scenario presets from JSON. Re-read on each call so editing the
    file doesn't require a server restart during a live demo."""
    try:
        with open(_PROFILES_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"sensor_profiles.json not found at {_PROFILES_PATH}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"sensor_profiles.json is malformed: {e}")
        return {}


def list_scenarios() -> List[Dict[str, str]]:
    """Return available scenario names + descriptions for the frontend to
    populate a picker without hardcoding scenario strings."""
    profiles = _load_profiles()
    return [
        {"scenario": key, "description": value.get("description", "")}
        for key, value in profiles.items()
    ]


def generate_reading(scenario: str, vehicle_id: str) -> List[Dict]:
    """
    Produce a list of sensor readings for the given scenario.

    Args:
        scenario: key into sensor_profiles.json (e.g. "battery_degraded")
        vehicle_id: caller-supplied identifier, echoed back in each reading

    Returns:
        List of {sensor, value, unit, timestamp} dicts. Values are jittered
        slightly (±2%) so repeated calls aren't bit-identical — keeps demo
        data feeling "live" rather than a static fixture.

    Raises:
        ValueError if the scenario key doesn't exist in the profiles file.
    """
    profiles = _load_profiles()

    if scenario not in profiles:
        available = ", ".join(profiles.keys()) or "(no profiles loaded)"
        raise ValueError(f"Unknown scenario '{scenario}'. Available: {available}")

    base_readings = profiles[scenario]["readings"]
    timestamp = datetime.now().isoformat()

    readings = []
    for sensor_name, base_value in base_readings.items():
        jitter = random.uniform(-0.02, 0.02)
        jittered_value = round(base_value * (1 + jitter), 2)

        readings.append({
            "sensor": sensor_name,
            "value": jittered_value,
            "unit": SENSOR_UNITS.get(sensor_name, ""),
            "timestamp": timestamp,
            "vehicle_id": vehicle_id,
        })

    logger.info(f"Generated {len(readings)} mock readings for scenario '{scenario}' (vehicle {vehicle_id})")
    return readings
