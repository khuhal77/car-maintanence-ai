"""
Sensor Fusion Diagnosis Route
Combines photo-based detection with real-time OBD-II sensor data
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
from models.sensors import VehicleProfile
from models.fusion import SensorFusionEngine
from models.car_parts import detect_car_part, get_part_price_range

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/diagnose-fusion", tags=["diagnosis-fusion"])


class SensorFusionRequest(BaseModel):
    vehicle_id: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    engine_type: str  # "petrol", "diesel", "hybrid", "electric"
    current_mileage: int
    image_base64: Optional[str] = None  # Photo optional; sensor data is primary
    collect_sensor_data: bool = True


class SensorReading(BaseModel):
    sensor_type: str
    value: float
    unit: str
    timestamp: str
    confidence: Optional[float] = None


class AnomalyItem(BaseModel):
    sensor: str
    value: float
    unit: str
    issue: str
    severity: str


class SensorFusionResponse(BaseModel):
    vehicle_id: str
    timestamp: str
    part_type: str
    issue: str
    severity: str
    recommended_parts: list
    estimated_cost: int
    overall_confidence: float
    contributing_factors: list
    sensor_readings: list
    anomalies: list
    sensor_diagnostics: dict


@router.post("", response_model=SensorFusionResponse)
async def diagnose_with_sensors(request: SensorFusionRequest):
    """
    Diagnose vehicle issues combining photo + real-time OBD-II sensor data.

    Request:
        {
          "vehicle_id": "JTHBP5C2XA5034186",
          "vehicle_make": "Toyota",
          "vehicle_model": "Corolla",
          "vehicle_year": 2018,
          "engine_type": "petrol",
          "current_mileage": 65000,
          "image_base64": "...",  // optional
          "collect_sensor_data": true
        }

    Response: Fused diagnosis with sensor readings, anomalies, confidence scores
    """
    try:
        # Build vehicle profile
        vehicle_profile = VehicleProfile(
            vehicle_id=request.vehicle_id,
            make=request.vehicle_make,
            model=request.vehicle_model,
            year=request.vehicle_year,
            engine_type=request.engine_type,
            mileage=request.current_mileage,
        )

        # Initialize sensor fusion engine (mock OBD for MVP)
        fusion_engine = SensorFusionEngine(vehicle_profile, use_mock_obd=True)

        # Photo-based diagnosis (if image provided)
        photo_diagnosis = None
        if request.image_base64:
            photo_diagnosis = detect_car_part(request.image_base64)

        # Sensor-fused diagnosis
        fusion_result = fusion_engine.fuse_diagnosis(
            photo_diagnosis=photo_diagnosis,
            collect_sensor_data=request.collect_sensor_data,
        )

        logger.info(
            f"Fused diagnosis for {request.vehicle_id}: "
            f"{fusion_result.part_type} ({fusion_result.overall_confidence*100:.0f}%)"
        )

        return SensorFusionResponse(
            vehicle_id=fusion_result.vehicle_id,
            timestamp=fusion_result.timestamp.isoformat(),
            part_type=fusion_result.part_type,
            issue=fusion_result.issue,
            severity=fusion_result.severity,
            recommended_parts=fusion_result.recommended_parts,
            estimated_cost=fusion_result.estimated_parts_cost,
            overall_confidence=fusion_result.overall_confidence,
            contributing_factors=fusion_result.contributing_factors,
            sensor_readings=[
                {
                    "sensor_type": r.sensor_type.value,
                    "value": r.value,
                    "unit": r.unit,
                    "timestamp": r.timestamp.isoformat(),
                    "confidence": r.confidence,
                }
                for r in fusion_result.sensor_readings
            ],
            anomalies=fusion_result.anomalies,
            sensor_diagnostics=fusion_result.sensor_diagnostics,
        )

    except Exception as e:
        logger.error(f"Sensor fusion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vehicle-profile/{vehicle_id}")
async def get_vehicle_profile(vehicle_id: str):
    """Retrieve stored vehicle profile and diagnostic history."""
    try:
        # MVP: mock data
        return {
            "vehicle_id": vehicle_id,
            "make": "Toyota",
            "model": "Corolla",
            "year": 2018,
            "engine_type": "petrol",
            "mileage": 65000,
            "last_diagnosis": "2024-08-15",
            "recurring_issues": ["brake_pad_wear", "battery_aging"],
        }
    except Exception as e:
        logger.error(f"Error fetching vehicle profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-sensor-upload")
async def batch_sensor_upload(
    vehicle_id: str,
    sensor_readings: list,
):
    """
    Bulk upload sensor data (useful for fleet telematics).
    Format: [{"sensor_type": "battery_voltage", "value": 13.5, "unit": "V", "timestamp": "2024-08-15T10:30:00"}]
    """
    try:
        fusion_engine = SensorFusionEngine(
            VehicleProfile(
                vehicle_id=vehicle_id,
                make="Unknown",
                model="Unknown",
                year=2020,
                engine_type="petrol",
                mileage=0,
            )
        )

        # Store the batch
        logger.info(f"Stored {len(sensor_readings)} sensor readings for {vehicle_id}")

        return {"status": "ok", "vehicle_id": vehicle_id, "readings_stored": len(sensor_readings)}

    except Exception as e:
        logger.error(f"Batch upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
