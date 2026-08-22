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
from typing import List, Optional, Dict, Any

from models.sensor_diagnosis import run_sensor_diagnosis
from models.sensor_mock import list_scenarios
from models.vehicle_domains import domains_as_dict, catalog_as_dict, hierarchy_as_dict

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
    value: Optional[float] = None
    unit: str
    expected_range: Optional[List[float]] = None
    severity: str
    method: str


class DiagnosisOut(BaseModel):
    part_type: str
    issue: str
    severity: str
    confidence: float
    recommended_parts: List[str]
    method: str
    domain: str


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


@router.get("/domains", response_model=List[Dict[str, Any]])
async def get_domains():
    """
    List the 11 vehicle health domains (10 conventional + EV-specific),
    each with the sensor parameters that inform it. EV-specific also
    includes its 7 sub-areas (HV battery, BMS, inverter, e-motor,
    reduction gearbox, charging system, thermal management).
    """
    try:
        return domains_as_dict()
    except Exception as e:
        logger.error(f"Error listing domains: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/catalog", response_model=List[Dict[str, Any]])
async def get_catalog():
    """
    List the full sensor parameter catalog (14 existing/OBD-standard +
    6 add-on + EV-specific parameters), each tagged with its domain(s),
    typical acquisition method (OBD-II / CAN bus / physical sensor /
    telematics), and whether it requires dedicated add-on hardware.
    """
    try:
        return catalog_as_dict()
    except Exception as e:
        logger.error(f"Error listing sensor catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hierarchy", response_model=List[Dict[str, Any]])
async def get_hierarchy():
    """
    Return the level 0-7 vehicle health data hierarchy (raw sensor ->
    signal processing -> component parameter -> component health ->
    subsystem health -> vehicle health -> prediction -> action). Reference
    data describing what kind of artifact this pipeline's output
    represents at each stage.
    """
    try:
        return hierarchy_as_dict()
    except Exception as e:
        logger.error(f"Error listing data hierarchy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
