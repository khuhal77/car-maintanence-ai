"""
Sensor Diagnosis Orchestration — Sensor Fusion Prototype (Phase C)

Single entry point the API route calls. Wires sensor_mock.py (data) and
sensor_rules.py (analysis) together and formats the final response payload.

This is the ONLY file in the sensor pipeline that "knows about" both the
mock generator and the rules engine — kept deliberately thin so the
separation established in Phase A/B doesn't erode over time.

Zero dependency on models/car_parts.py, models/diagnosis.py, or anything
image-related. See docs/SENSOR_FUSION_BACKEND_PLAN.md for the full plan
and the isolation guarantee this module is expected to uphold.
"""

import logging
from datetime import datetime
from typing import Dict

from models.sensor_mock import generate_reading
from models.sensor_rules import evaluate_readings, diagnose_from_anomalies

logger = logging.getLogger(__name__)


def run_sensor_diagnosis(vehicle_id: str, scenario: str) -> Dict:
    """
    Run a complete mock-sensor diagnosis for a given scenario.

    Args:
        vehicle_id: caller-supplied identifier, echoed back in the response
        scenario: key into data/sensor_profiles.json (e.g. "battery_degraded")

    Returns:
        {
          "vehicle_id": ...,
          "timestamp": ...,
          "readings": [...],
          "anomalies": [...],
          "diagnosis": {...}
        }

    Raises:
        ValueError if the scenario is unknown (propagated from
        sensor_mock.generate_reading — the route layer turns this into a
        400 response).
    """
    readings = generate_reading(scenario, vehicle_id)
    anomalies = evaluate_readings(readings)
    diagnosis = diagnose_from_anomalies(anomalies)

    logger.info(
        f"Sensor diagnosis for {vehicle_id} (scenario={scenario}): "
        f"{diagnosis['part_type']} / {diagnosis['severity']}"
    )

    return {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now().isoformat(),
        "readings": readings,
        "anomalies": anomalies,
        "diagnosis": diagnosis,
    }
