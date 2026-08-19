"""
Sensor Diagnosis API Route — Sensor Fusion Prototype (Phase D)

Exposes the mock-sensor diagnosis pipeline as its own endpoint, fully
independent of routes/diagnose.py (the photo pipeline). No shared Pydantic
models, no shared imports between the two route files — see
docs/SENSOR_FUSION_BACKEND_PLAN.md §6 for why the duplication is
intentional.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from models.sensor_diagnosis import run_sensor_diagnosis
from models.sensor_mock import list_scenarios

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sensor-diagnose", tags=["sensor-diagnosis"])


class SensorDiagnoseRequest(BaseModel):
    vehicle_id: str
    scenario: str


class SensorReadingOut(BaseModel):
    sensor: str
    value: float
    unit: str
    timestamp: str
    vehicle_id: str


class AnomalyOut(BaseModel):
    sensor: str
    value: float
    unit: str
    expected_range: List[float]
    severity: str


class DiagnosisOut(BaseModel):
    part_type: str
    issue: str
    severity: str
    confidence: float
    recommended_parts: List[str]
    method: str


class SensorDiagnoseResponse(BaseModel):
    vehicle_id: str
    timestamp: str
    readings: List[SensorReadingOut]
    anomalies: List[AnomalyOut]
    diagnosis: DiagnosisOut


class ScenarioItem(BaseModel):
    scenario: str
    description: str


@router.post("", response_model=SensorDiagnoseResponse)
async def sensor_diagnose(request: SensorDiagnoseRequest):
    """
    Run a mock-sensor diagnosis for the given scenario.

    Request:
        { "vehicle_id": "demo-vehicle-01", "scenario": "battery_degraded" }

    Response: readings, flagged anomalies, and a single primary diagnosis.
    See GET /api/sensor-diagnose/scenarios for valid scenario values.
    """
    try:
        result = run_sensor_diagnosis(request.vehicle_id, request.scenario)
        return SensorDiagnoseResponse(**result)

    except ValueError as e:
        # Unknown scenario name — a client error, not a server error
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Sensor diagnosis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenarios", response_model=List[ScenarioItem])
async def get_scenarios():
    """
    List available mock scenarios so the frontend can populate a picker
    without hardcoding scenario strings.
    """
    try:
        return list_scenarios()
    except Exception as e:
        logger.error(f"Error listing scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
