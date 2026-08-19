"""
OBD-II Protocol Handler & Sensor Data Ingestion

Handles real-time vehicle diagnostics via OBD-II port:
- Communicates with vehicle ECU (Engine Control Unit) via ELM327/OBD-II dongle
- Parses PIDs (Parameter IDs) into standardized sensor readings
- Builds a running history of sensor values for anomaly detection
- Triggers diagnosis when thresholds are crossed

For MVP demo: mock vehicle data; production swaps in real pyobd library or
websocket feed from a connected vehicle.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from models.sensors import SensorReading, SensorType, DiagnosticTroubleCode, VehicleProfile
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# OBD-II PID mappings (standard PIDs defined in SAE J1979)
OBD_PID_MAP = {
    "0105": (SensorType.COOLANT_TEMP, "°C", lambda x: int(x, 16) - 40),
    "010C": (SensorType.ENGINE_RPM, "RPM", lambda x: (int(x, 16) * 256 + int(x, 16)) / 4),
    "010D": (SensorType.FUEL_LEVEL, "%", lambda x: int(x, 16) * 100 / 255),
    "0111": (SensorType.ENGINE_RPM, "%", lambda x: int(x, 16) * 100 / 255),
    "015E": (SensorType.ENGINE_HOURS, "hours", lambda x: (int(x, 16) * 256 + int(x, 16)) / 60),
}

# Normal ranges for common sensors (varies by make/model, this is a baseline)
SENSOR_THRESHOLDS = {
    SensorType.ENGINE_TEMP: {"min": 80, "max": 100, "warning_min": 70, "warning_max": 110},
    SensorType.OIL_PRESSURE: {"min": 25, "max": 65, "warning_min": 20, "warning_max": 75},
    SensorType.BATTERY_VOLTAGE: {"min": 12.0, "max": 14.5, "warning_min": 11.5, "warning_max": 15.0},
    SensorType.TIRE_PRESSURE_FL: {"min": 32, "max": 36, "warning_min": 28, "warning_max": 40},
    SensorType.COOLANT_LEVEL: {"min": 50, "max": 100, "warning_min": 30, "warning_max": 105},
    SensorType.BRAKE_FLUID_LEVEL: {"min": 50, "max": 100, "warning_min": 25, "warning_max": 105},
}


class OBDIIHandler:
    """
    Interface to vehicle diagnostics via OBD-II.
    
    In production, this would:
    - Open a serial connection to an ELM327 dongle (via pyobd library)
    - Continuously poll PIDs at configurable intervals
    - Buffer readings into a time-series store
    
    For MVP: loads mock sensor data from JSON so the demo works without hardware.
    """

    def __init__(self, vehicle_id: str, vehicle_profile: Optional[VehicleProfile] = None, use_mock: bool = True):
        self.vehicle_id = vehicle_id
        self.vehicle_profile = vehicle_profile
        self.use_mock = use_mock
        self.connection = None
        self.last_readings: Dict[SensorType, SensorReading] = {}

    def connect(self) -> bool:
        """Connect to OBD-II port (mock or real)."""
        if self.use_mock:
            logger.info(f"OBD handler initialized in MOCK mode for vehicle {self.vehicle_id}")
            return True

        try:
            # Production: serial.Serial('/dev/ttyUSB0', 38400) or similar
            # Then send "AT Z" (reset), "AT E0" (no echo), "0100" (check connection)
            logger.info(f"Connected to OBD-II port for vehicle {self.vehicle_id}")
            return True
        except Exception as e:
            logger.error(f"OBD connection failed: {e}")
            return False

    def read_pid(self, pid: str) -> Optional[float]:
        """
        Query a single PID (Parameter ID) from the vehicle.
        Returns the decoded numeric value or None if read fails.
        """
        if not self.use_mock:
            # Production: send command to ELM327, parse response
            # e.g. self.connection.write(b"0105\r\n")  # coolant temp
            # response = self.connection.readline()
            # return OBD_PID_MAP[pid][2](response.hex())
            pass
        else:
            # Mock: return synthetic data for demo
            return self._get_mock_reading(pid)

    def _get_mock_reading(self, pid: str) -> float:
        """Generate realistic mock sensor data for demo."""
        mock_data = {
            "0105": 92,  # Coolant temp: 92°C (normal)
            "010C": 2500,  # RPM: 2500
            "010D": 85,  # Fuel level: 85%
            "0111": 35,  # Throttle: 35%
            "015E": 5200,  # Engine hours: 5200
        }
        return mock_data.get(pid, 0.0)

    def get_all_sensors(self) -> List[SensorReading]:
        """Poll all available PIDs and return current readings."""
        readings = []
        for pid, (sensor_type, unit, decoder) in OBD_PID_MAP.items():
            try:
                value = self.read_pid(pid)
                if value is not None:
                    reading = SensorReading(
                        sensor_type=sensor_type,
                        value=value,
                        unit=unit,
                        timestamp=datetime.now(),
                        vehicle_id=self.vehicle_id,
                        confidence=0.95,
                    )
                    readings.append(reading)
                    self.last_readings[sensor_type] = reading
            except Exception as e:
                logger.warning(f"Failed to read PID {pid}: {e}")
        return readings

    def read_dtcs(self) -> List[DiagnosticTroubleCode]:
        """
        Read Diagnostic Trouble Codes (error codes) from the vehicle.
        DTCs are 5-character codes like P0420 (emissions system fault).
        """
        if self.use_mock:
            # Mock: no errors for a healthy vehicle
            return []

        # Production: send "03" (read DTCs), parse response
        # Format: 43 XX YY ZZ ... where XX YY ZZ are DTC bytes
        dtcs = []
        # Parse each DTC pair and look up in standards database
        return dtcs

    def clear_dtcs(self) -> bool:
        """Clear diagnostic trouble codes (only for non-critical codes)."""
        if self.use_mock:
            return True
        # Production: send "04" command to ECU
        return False

    def get_sensor_history(self, sensor_type: SensorType, hours: int = 24) -> List[SensorReading]:
        """Retrieve historical sensor data for trend analysis."""
        # Production: query time-series DB (InfluxDB, Prometheus, etc.)
        # For MVP: return empty list or mock data
        return []

    def detect_anomalies(self, readings: List[SensorReading]) -> List[Dict]:
        """Flag sensor readings that deviate from normal ranges."""
        anomalies = []
        for reading in readings:
            if reading.sensor_type in SENSOR_THRESHOLDS:
                thresholds = SENSOR_THRESHOLDS[reading.sensor_type]
                if reading.value < thresholds["min"]:
                    anomalies.append({
                        "sensor": reading.sensor_type.value,
                        "value": reading.value,
                        "unit": reading.unit,
                        "issue": f"Below normal range (min: {thresholds['min']})",
                        "severity": "warning" if reading.value >= thresholds["warning_min"] else "critical",
                    })
                elif reading.value > thresholds["max"]:
                    anomalies.append({
                        "sensor": reading.sensor_type.value,
                        "value": reading.value,
                        "unit": reading.unit,
                        "issue": f"Above normal range (max: {thresholds['max']})",
                        "severity": "warning" if reading.value <= thresholds["warning_max"] else "critical",
                    })
        return anomalies


class SensorDataStore:
    """
    In-memory cache + persistent store for sensor readings.
    
    Production: backed by InfluxDB (time-series), Postgres (metadata),
    or S3 (long-term archive). MVP: JSON file for simplicity.
    """

    def __init__(self, vehicle_id: str, storage_path: str = "./data/sensor_logs"):
        self.vehicle_id = vehicle_id
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.readings_file = self.storage_path / f"{vehicle_id}_readings.jsonl"

    def store_reading(self, reading: SensorReading):
        """Append a sensor reading to the log."""
        with open(self.readings_file, "a") as f:
            f.write(reading.model_dump_json() + "\n")

    def store_batch(self, readings: List[SensorReading]):
        """Batch write multiple readings."""
        for reading in readings:
            self.store_reading(reading)

    def get_latest(self, sensor_type: Optional[SensorType] = None) -> Optional[SensorReading]:
        """Retrieve the most recent reading for a sensor."""
        readings = []
        try:
            with open(self.readings_file, "r") as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        if not sensor_type or data["sensor_type"] == sensor_type.value:
                            readings.append(data)
        except FileNotFoundError:
            return None

        return readings[-1] if readings else None

    def get_trend(self, sensor_type: SensorType, hours: int = 24) -> List[Dict]:
        """Retrieve historical readings for a sensor over a time window."""
        cutoff = datetime.now() - timedelta(hours=hours)
        trend = []
        try:
            with open(self.readings_file, "r") as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        if data["sensor_type"] == sensor_type.value:
                            ts = datetime.fromisoformat(data["timestamp"])
                            if ts >= cutoff:
                                trend.append(data)
        except FileNotFoundError:
            pass
        return trend
