"""
Sensor Fusion Engine

Combines photo-based diagnosis with real-time OBD-II sensor data to produce
a higher-confidence, multi-source diagnostic result.

Fusion logic:
1. Photo diagnosis: part type + issue (photo-only)
2. Sensor data: continuous readings + anomalies (OBD-only)
3. Fused: both data sources weighted by confidence

Example:
- Photo shows worn battery terminal
- Sensor data shows low battery voltage + high cranking effort
- Fused diagnosis: "Battery failure (photo + electrical data agree)"
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from models.sensors import (
    SensorReading, SensorType, DiagnosticTroubleCode,
    VehicleProfile, SensorFusionResult
)
from models.obd import OBDIIHandler, SensorDataStore

logger = logging.getLogger(__name__)

# Rules mapping sensor patterns to part/issue diagnoses
SENSOR_FUSION_RULES = {
    "battery": {
        "sensors": [SensorType.BATTERY_VOLTAGE, SensorType.ENGINE_RPM],
        "low_voltage": {"threshold": 11.5, "severity": "high", "issue": "Battery voltage critically low"},
        "slow_crank": {"threshold": 300, "severity": "medium", "issue": "Slow engine cranking (battery weak)"},
    },
    "brake_pad": {
        "sensors": [SensorType.BRAKE_PAD_WEAR, SensorType.BRAKE_PRESSURE],
        "wear_high": {"threshold": 80, "severity": "high", "issue": "Brake pad wear exceeds 80%"},
        "pressure_low": {"threshold": 60, "severity": "medium", "issue": "Brake system pressure low"},
    },
    "oil_filter": {
        "sensors": [SensorType.OIL_PRESSURE, SensorType.OIL_TEMP],
        "low_pressure": {"threshold": 20, "severity": "high", "issue": "Oil pressure critically low (filter clogged)"},
        "high_temp": {"threshold": 115, "severity": "medium", "issue": "Oil temperature elevated (poor flow)"},
    },
    "coolant": {
        "sensors": [SensorType.COOLANT_LEVEL, SensorType.ENGINE_TEMP, SensorType.COOLANT_TEMP],
        "low_level": {"threshold": 30, "severity": "high", "issue": "Coolant level critical"},
        "overtemp": {"threshold": 110, "severity": "critical", "issue": "Engine overheating"},
    },
    "tire": {
        "sensors": [
            SensorType.TIRE_PRESSURE_FL, SensorType.TIRE_PRESSURE_FR,
            SensorType.TIRE_PRESSURE_RL, SensorType.TIRE_PRESSURE_RR,
            SensorType.TIRE_TEMP_FL, SensorType.TIRE_TEMP_FR,
            SensorType.TIRE_TEMP_RL, SensorType.TIRE_TEMP_RR,
        ],
        "low_pressure": {"threshold": 28, "severity": "medium", "issue": "Tire pressure below recommended"},
        "high_temp": {"threshold": 80, "severity": "high", "issue": "Tire temperature elevated (possible blowout risk)"},
    },
    "spark_plug": {
        "sensors": [SensorType.ENGINE_RPM, SensorType.O2_SENSOR_FRONT],
        "rough_idle": {"threshold": 600, "severity": "low", "issue": "Engine idle unstable (spark misfire)"},
        "high_emissions": {"threshold": 1.2, "severity": "medium", "issue": "High O2 levels (lean condition)"},
    },
}

DTC_TO_PART_MAP = {
    "P0400": ("air_filter", "EGR system issue — check intake"),
    "P0420": ("catalytic_converter", "Catalytic converter efficiency low"),
    "P0101": ("air_filter", "Mass air flow sensor out of range"),
    "P0171": ("fuel_system", "System too lean"),
    "P0300": ("spark_plug", "Multiple cylinder misfire"),
    "P0505": ("idle_control", "Idle speed control issue"),
}


class SensorFusionEngine:
    """Merge photo + sensor data into a unified diagnosis."""

    def __init__(self, vehicle_profile: VehicleProfile, use_mock_obd: bool = True):
        self.vehicle_profile = vehicle_profile
        self.obd = OBDIIHandler(vehicle_profile.vehicle_id, vehicle_profile, use_mock_obd)
        self.store = SensorDataStore(vehicle_profile.vehicle_id)

    def fuse_diagnosis(
        self,
        photo_diagnosis: Optional[Dict] = None,
        collect_sensor_data: bool = True,
    ) -> SensorFusionResult:
        """
        Run a complete diagnostic fusion:
        1. Collect current sensor readings
        2. Detect anomalies
        3. Read DTCs
        4. Merge with photo diagnosis
        5. Return fused result with confidence score
        """
        timestamp = datetime.now()

        # Sensor data collection
        sensor_readings = []
        anomalies = []
        dtcs = []

        if collect_sensor_data:
            sensor_readings = self.obd.get_all_sensors()
            self.store.store_batch(sensor_readings)
            anomalies = self.obd.detect_anomalies(sensor_readings)
            dtcs = self.obd.read_dtcs()

        # Photo-based part type (if provided)
        photo_part_type = photo_diagnosis.get("type", "unknown") if photo_diagnosis else "unknown"
        photo_confidence = photo_diagnosis.get("confidence", 0.0) if photo_diagnosis else 0.0

        # Sensor-based diagnosis
        sensor_part_type, sensor_severity, sensor_diagnostics = self._diagnose_from_sensors(
            sensor_readings, anomalies, dtcs
        )

        # Fusion: if both photo and sensors agree on a part type, boost confidence
        fused_part_type = photo_part_type
        fused_severity = "medium"
        confidence_boost = 0.0

        if photo_part_type != "unknown" and sensor_part_type != "unknown":
            if photo_part_type == sensor_part_type:
                # Photo and sensors agree — high confidence
                confidence_boost = 0.3
                fused_severity = sensor_severity
            else:
                # Conflict — prefer sensor data (more objective), lower confidence
                fused_part_type = sensor_part_type
                confidence_boost = 0.1
                fused_severity = sensor_severity
        elif sensor_part_type != "unknown":
            fused_part_type = sensor_part_type
            fused_severity = sensor_severity
            confidence_boost = 0.15
        elif photo_part_type != "unknown":
            fused_part_type = photo_part_type
            fused_severity = photo_diagnosis.get("severity", "medium") if photo_diagnosis else "medium"

        # Confidence calculation
        fused_confidence = min(1.0, photo_confidence + confidence_boost)

        # Recommended parts (from photo or sensor diagnosis)
        recommended_parts = []
        if photo_diagnosis and "parts" in photo_diagnosis:
            recommended_parts = photo_diagnosis["parts"]
        elif fused_part_type in ["battery", "brake_pad", "oil_filter", "spark_plug"]:
            recommended_parts = self._get_parts_for_type(fused_part_type)

        issue_desc = photo_diagnosis.get("issue", "") if photo_diagnosis else ""
        if sensor_diagnostics:
            issue_desc += f" [Sensor: {'; '.join(sensor_diagnostics.values())}]"

        return SensorFusionResult(
            vehicle_id=self.vehicle_profile.vehicle_id,
            timestamp=timestamp,
            photo_diagnosis=photo_diagnosis,
            photo_confidence=photo_confidence,
            sensor_readings=sensor_readings,
            dtcs=dtcs,
            anomalies=anomalies,
            part_type=fused_part_type,
            issue=issue_desc or f"Potential {fused_part_type} issue",
            severity=fused_severity,
            recommended_parts=recommended_parts,
            estimated_parts_cost=self._estimate_cost(fused_part_type),
            overall_confidence=fused_confidence,
            contributing_factors=[
                f"Photo diagnosis: {photo_part_type} ({photo_confidence*100:.0f}%)" if photo_diagnosis else "No photo",
                f"Sensor data: {sensor_part_type}" if sensor_readings else "No sensor data",
                f"{len(dtcs)} diagnostic trouble codes detected" if dtcs else "No DTCs",
            ],
            sensor_diagnostics=sensor_diagnostics,
        )

    def _diagnose_from_sensors(
        self, readings: List[SensorReading], anomalies: List[Dict], dtcs: List[DiagnosticTroubleCode]
    ) -> Tuple[str, str, Dict[str, str]]:
        """Infer part type and severity from sensor data alone."""
        part_type = "unknown"
        severity = "low"
        diagnostics = {}

        # Check DTCs first (highest priority)
        for dtc in dtcs:
            if dtc.code in DTC_TO_PART_MAP:
                inferred_part, desc = DTC_TO_PART_MAP[dtc.code]
                part_type = inferred_part
                severity = dtc.severity
                diagnostics[dtc.code] = desc
                break

        # Check anomalies
        for anomaly in anomalies:
            sensor_name = anomaly["sensor"]
            if "battery" in sensor_name.lower() or "voltage" in sensor_name.lower():
                part_type = "battery"
                severity = anomaly["severity"]
                diagnostics["battery_voltage"] = anomaly["issue"]
            elif "brake" in sensor_name.lower():
                part_type = "brake_pad"
                severity = anomaly["severity"]
                diagnostics["brake"] = anomaly["issue"]
            elif "oil" in sensor_name.lower():
                part_type = "oil_filter"
                severity = anomaly["severity"]
                diagnostics["oil"] = anomaly["issue"]
            elif "coolant" in sensor_name.lower() or "engine_temp" in sensor_name.lower():
                part_type = "coolant"
                severity = anomaly["severity"]
                diagnostics["coolant"] = anomaly["issue"]
            elif "tire" in sensor_name.lower():
                part_type = "tire"
                severity = anomaly["severity"]
                diagnostics["tire"] = anomaly["issue"]

        return part_type, severity, diagnostics

    def _get_parts_for_type(self, part_type: str) -> List[str]:
        """Return recommended replacement parts for a part type."""
        parts_map = {
            "battery": ["12V Car Battery 60Ah", "Battery Terminals", "Battery Cable"],
            "brake_pad": ["Brake Pads Front Set", "Brake Fluid DOT 3", "Brake Rotor"],
            "oil_filter": ["Oil Filter", "Drain Plug", "Engine Oil 5W-30"],
            "spark_plug": ["Spark Plugs Set (4)", "Ignition Coil", "Spark Plug Wire"],
            "coolant": ["Coolant Concentrate", "Coolant Hoses", "Radiator Cap"],
            "tire": ["Tire (Size dependent)", "Tire Repair Kit", "Wheel Balance"],
        }
        return parts_map.get(part_type, [])

    def _estimate_cost(self, part_type: str) -> int:
        """Rough INR cost estimate for a part type."""
        cost_map = {
            "battery": 3500,
            "brake_pad": 1200,
            "oil_filter": 300,
            "spark_plug": 800,
            "coolant": 400,
            "tire": 2000,
        }
        return cost_map.get(part_type, 500)
