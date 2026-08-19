"""
Vehicle Sensor Data Models & OBD-II Integration

This module handles real-time sensor data ingestion from vehicles via:
1. OBD-II (On-Board Diagnostics) — standardized port on most cars post-1996
2. CAN bus protocols (e.g. J1939 for trucks, CANopen for industrial)
3. Telematics APIs (Hyundai BlueLink, BMW Connected Drive, etc.)
4. Direct GPIO/USB sensor feeds for DIY setups

All sensor data is normalized to a common schema and merged with photo-based
diagnosis for higher confidence results.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SensorType(str, Enum):
    """Standardized sensor identifiers across vehicle types."""
    # Engine
    ENGINE_TEMP = "engine_temperature"
    ENGINE_RPM = "engine_rpm"
    OIL_PRESSURE = "oil_pressure"
    OIL_TEMP = "oil_temperature"
    COOLANT_LEVEL = "coolant_level"
    COOLANT_TEMP = "coolant_temperature"

    # Electrical
    BATTERY_VOLTAGE = "battery_voltage"
    BATTERY_CURRENT = "battery_current"
    ALTERNATOR_OUTPUT = "alternator_output"

    # Fuel system
    FUEL_LEVEL = "fuel_level"
    FUEL_PRESSURE = "fuel_pressure"
    FUEL_CONSUMPTION = "fuel_consumption"

    # Emissions
    O2_SENSOR_FRONT = "o2_sensor_front"
    O2_SENSOR_REAR = "o2_sensor_rear"
    NOx_LEVEL = "nox_level"

    # Brakes
    BRAKE_PAD_WEAR = "brake_pad_wear"
    BRAKE_FLUID_LEVEL = "brake_fluid_level"
    BRAKE_PRESSURE = "brake_pressure"
    ABS_STATUS = "abs_status"

    # Suspension / Tire
    TIRE_PRESSURE_FL = "tire_pressure_front_left"
    TIRE_PRESSURE_FR = "tire_pressure_front_right"
    TIRE_PRESSURE_RL = "tire_pressure_rear_left"
    TIRE_PRESSURE_RR = "tire_pressure_rear_right"
    TIRE_TEMP_FL = "tire_temp_front_left"
    TIRE_TEMP_FR = "tire_temp_front_right"
    TIRE_TEMP_RL = "tire_temp_rear_left"
    TIRE_TEMP_RR = "tire_temp_rear_right"
    SUSPENSION_HEIGHT = "suspension_height"

    # Transmission
    GEAR_POSITION = "gear_position"
    TRANSMISSION_TEMP = "transmission_temp"
    TRANSMISSION_PRESSURE = "transmission_pressure"

    # Environmental
    AMBIENT_TEMP = "ambient_temperature"
    HUMIDITY = "humidity"
    AIR_QUALITY = "air_quality_index"

    # Mileage / Runtime
    ODOMETER = "odometer"
    ENGINE_HOURS = "engine_hours"
    TRIP_DISTANCE = "trip_distance"

    # Error codes
    DTC = "diagnostic_trouble_code"


class SensorReading(BaseModel):
    """A single timestamped sensor measurement."""
    sensor_type: SensorType
    value: float
    unit: str  # e.g. "°C", "PSI", "%", "V", "RPM"
    timestamp: datetime
    vehicle_id: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)  # How confident the sensor is in this reading


class VehicleProfile(BaseModel):
    """Vehicle metadata used to contextualize sensor readings."""
    vehicle_id: str
    make: str  # e.g. "Toyota"
    model: str  # e.g. "Corolla"
    year: int
    engine_type: str  # "diesel", "petrol", "hybrid", "electric"
    mileage: int
    vin: Optional[str] = None
    obd_port_available: bool = True  # OBD-II port (vs. direct CAN or telematics)
    last_service: Optional[datetime] = None
    last_service_mileage: Optional[int] = None


class DiagnosticTroubleCode(BaseModel):
    """OBD-II DTC (P0123, P0456, etc.) with interpretation."""
    code: str  # e.g. "P0420" (catalyst system inefficiency)
    description: str
    affected_system: str  # e.g. "emissions"
    severity: str  # "info", "warning", "critical"
    can_be_cleared: bool
    first_seen: datetime
    occurrence_count: int


class SensorFusionResult(BaseModel):
    """Diagnosis combining sensor data + photo-based analysis."""
    vehicle_id: str
    timestamp: datetime

    # Photo-based diagnosis (from /api/diagnose)
    photo_diagnosis: Optional[Dict[str, Any]] = None
    photo_confidence: Optional[float] = None

    # Sensor-based findings
    sensor_readings: List[SensorReading]
    dtcs: List[DiagnosticTroubleCode]
    anomalies: List[Dict[str, Any]]  # Sensor readings outside normal ranges for this vehicle/model

    # Fused result
    part_type: str
    issue: str
    severity: str  # "low", "medium", "high", "critical"
    recommended_parts: List[str]
    estimated_parts_cost: int  # INR

    # Fusion confidence — how certain are we across all data sources?
    overall_confidence: float
    contributing_factors: List[str]  # Which sensors/inputs led to this conclusion

    # Sensor-specific diagnostics
    sensor_diagnostics: Dict[str, str]  # sensor_type -> explanation
