"""
Vehicle Health Domain Taxonomy — Sensor Fusion Prototype

Defines the structural model this pipeline organizes itself around:

  - 11 vehicle health domains (10 conventional + 1 EV-specific, itself
    containing 7 sub-areas)
  - The 20-parameter sensor catalog (14 "existing"/OBD-standard parameters
    + 6 add-on parameters), each tagged with which domain(s) it informs and
    which acquisition method typically supplies it
  - The level 0-7 vehicle health data hierarchy, as an explicit structure
    rather than just documentation, so the API can report which level a
    given response occupies

This module is taxonomy/reference data only — no anomaly-scoring logic
lives here (that stays in sensor_rules.py). Keeping the "what exists and
how it's organized" question separate from "what counts as abnormal" means
the taxonomy can be extended (new domains, new sensors) without touching
scoring logic, and vice versa.

Zero dependency on models/car_parts.py, models/diagnosis.py, or anything
image-related — same isolation guarantee as the rest of this pipeline.
"""

from enum import Enum
from typing import Dict, List


class VehicleDomain(str, Enum):
    """The 11 vehicle health domains."""
    ENGINE = "engine"
    TRANSMISSION = "transmission"
    BATTERY = "battery"                # 12V/low-voltage starting battery
    ELECTRICAL = "electrical"
    TIRES_WHEELS = "tires_wheels"
    BRAKES = "brakes"
    STEERING = "steering"
    COOLING = "cooling"
    EXHAUST_EMISSION = "exhaust_emission"
    STRUCTURE_BODY = "structure_body"
    EV_SPECIFIC = "ev_specific"


# EV-specific domain is itself composed of 7 sub-areas. Modeled as a
# sub-enum rather than flattened into VehicleDomain so non-EV vehicles
# never need to reason about them, and EV vehicles get a clear grouping.
class EVSubArea(str, Enum):
    HIGH_VOLTAGE_BATTERY = "high_voltage_battery"
    BMS = "bms"  # Battery Management System
    INVERTER = "inverter"
    E_MOTOR = "e_motor"
    REDUCTION_GEARBOX = "reduction_gearbox"
    CHARGING_SYSTEM = "charging_system"
    THERMAL_MANAGEMENT = "thermal_management"


DOMAIN_LABELS: Dict[str, str] = {
    VehicleDomain.ENGINE: "Engine",
    VehicleDomain.TRANSMISSION: "Transmission",
    VehicleDomain.BATTERY: "Battery",
    VehicleDomain.ELECTRICAL: "Electrical",
    VehicleDomain.TIRES_WHEELS: "Tires & Wheels",
    VehicleDomain.BRAKES: "Brakes",
    VehicleDomain.STEERING: "Steering",
    VehicleDomain.COOLING: "Cooling",
    VehicleDomain.EXHAUST_EMISSION: "Exhaust / Emission",
    VehicleDomain.STRUCTURE_BODY: "Structure / Body",
    VehicleDomain.EV_SPECIFIC: "EV-Specific",
}

EV_SUBAREA_LABELS: Dict[str, str] = {
    EVSubArea.HIGH_VOLTAGE_BATTERY: "High-Voltage Battery",
    EVSubArea.BMS: "Battery Management System (BMS)",
    EVSubArea.INVERTER: "Inverter",
    EVSubArea.E_MOTOR: "E-Motor",
    EVSubArea.REDUCTION_GEARBOX: "Reduction Gearbox",
    EVSubArea.CHARGING_SYSTEM: "Charging System",
    EVSubArea.THERMAL_MANAGEMENT: "Thermal Management",
}


class AcquisitionMethod(str, Enum):
    """
    How a sensor parameter is typically obtained from a real vehicle.
    This prototype only implements the mock-data path (see
    models/sensor_mock.py) — these tags are metadata describing the
    real-world acquisition route each parameter would use, not something
    this prototype connects to. Physical hardware integration is
    explicitly out of scope here (see docs/SENSOR_FUSION_BACKEND_PLAN.md).
    """
    OBD_II = "obd_ii"            # Easiest prototype path — standard PIDs
    CAN_BUS = "can_bus"          # More powerful/detailed, vehicle-specific
    PHYSICAL_SENSOR = "physical_sensor"  # Dedicated add-on hardware (IMU, thermal cam, etc.)
    TELEMATICS = "telematics"    # Fleet-oriented — trucks, taxis, buses


class SensorParameter:
    """A single sensor parameter definition in the catalog."""
    def __init__(self, key: str, label: str, unit: str, domains: List[str],
                 method: str, category: str, existing: bool):
        self.key = key
        self.label = label
        self.unit = unit
        self.domains = domains          # one parameter can inform multiple domains
        self.method = method            # primary acquisition method
        self.category = category        # "existing" or "add_on"
        self.existing = existing


# ---------------------------------------------------------------------------
# The 20-parameter sensor catalog.
#
# "Existing" = commonly already present via standard OBD-II PIDs on
# post-1996 vehicles — no new hardware needed, matches "we don't need a
# physical sensor for every parameter, we can use already-existing sensors"
# guidance directly.
#
# "Add-on" = requires dedicated hardware not universally present (IMU,
# vibration accelerometers, brake/tire temp sensors, etc.)
# ---------------------------------------------------------------------------

SENSOR_CATALOG: Dict[str, SensorParameter] = {
    # --- Existing vehicle data (1-14) ---
    "engine_rpm": SensorParameter(
        "engine_rpm", "Engine RPM", "RPM",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "vehicle_speed": SensorParameter(
        "vehicle_speed", "Vehicle Speed", "km/h",
        [VehicleDomain.TRANSMISSION, VehicleDomain.TIRES_WHEELS], AcquisitionMethod.OBD_II, "existing", True),
    "coolant_temp": SensorParameter(
        "coolant_temp", "Coolant Temperature", "°C",
        [VehicleDomain.COOLING, VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "intake_temp": SensorParameter(
        "intake_temp", "Intake Air Temperature", "°C",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "map_sensor": SensorParameter(
        "map_sensor", "Manifold Absolute Pressure (MAP)", "kPa",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "maf_sensor": SensorParameter(
        "maf_sensor", "Mass Air Flow (MAF)", "g/s",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "throttle_position": SensorParameter(
        "throttle_position", "Throttle Position", "%",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "fuel_pressure": SensorParameter(
        "fuel_pressure", "Fuel Pressure", "kPa",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "o2_lambda": SensorParameter(
        "o2_lambda", "O2 / Lambda Sensor", "λ",
        [VehicleDomain.EXHAUST_EMISSION, VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "engine_load": SensorParameter(
        "engine_load", "Calculated Engine Load", "%",
        [VehicleDomain.ENGINE], AcquisitionMethod.OBD_II, "existing", True),
    "battery_voltage": SensorParameter(
        "battery_voltage", "Battery Voltage", "V",
        [VehicleDomain.BATTERY, VehicleDomain.ELECTRICAL], AcquisitionMethod.OBD_II, "existing", True),
    "wheel_speed": SensorParameter(
        "wheel_speed", "Wheel Speed", "km/h",
        [VehicleDomain.TIRES_WHEELS, VehicleDomain.BRAKES], AcquisitionMethod.CAN_BUS, "existing", True),
    "brake_status": SensorParameter(
        "brake_status", "Brake Status / Pad Wear", "%",
        [VehicleDomain.BRAKES], AcquisitionMethod.CAN_BUS, "existing", True),
    "dtc_codes": SensorParameter(
        "dtc_codes", "Diagnostic Trouble Codes (DTCs)", "count",
        [VehicleDomain.ENGINE, VehicleDomain.TRANSMISSION, VehicleDomain.EXHAUST_EMISSION,
         VehicleDomain.ELECTRICAL], AcquisitionMethod.OBD_II, "existing", True),

    # --- Add-on sensors (15-20) ---
    "imu_6axis": SensorParameter(
        "imu_6axis", "6-Axis IMU", "g/deg/s",
        [VehicleDomain.STRUCTURE_BODY, VehicleDomain.STEERING], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),
    "engine_vibration": SensorParameter(
        "engine_vibration", "Engine Vibration (Accelerometer)", "mm/s",
        [VehicleDomain.ENGINE], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),
    "wheel_hub_vibration": SensorParameter(
        "wheel_hub_vibration", "Wheel/Hub Vibration", "mm/s",
        [VehicleDomain.TIRES_WHEELS], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),
    "brake_temp": SensorParameter(
        "brake_temp", "Brake Temperature", "°C",
        [VehicleDomain.BRAKES], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),
    "tire_pressure_fl": SensorParameter(
        "tire_pressure_fl", "Tire Pressure (Front-Left)", "PSI",
        [VehicleDomain.TIRES_WHEELS], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),
    "ambient_temp": SensorParameter(
        "ambient_temp", "Ambient Temperature", "°C",
        [VehicleDomain.COOLING, VehicleDomain.STRUCTURE_BODY], AcquisitionMethod.PHYSICAL_SENSOR, "add_on", False),

    # --- EV-specific parameters (extends the catalog for EV_SPECIFIC domain) ---
    "hv_battery_soc": SensorParameter(
        "hv_battery_soc", "HV Battery State of Charge", "%",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.CAN_BUS, "ev", False),
    "hv_battery_temp": SensorParameter(
        "hv_battery_temp", "HV Battery Temperature", "°C",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.CAN_BUS, "ev", False),
    "bms_cell_voltage_delta": SensorParameter(
        "bms_cell_voltage_delta", "BMS Cell Voltage Delta", "mV",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.CAN_BUS, "ev", False),
    "inverter_temp": SensorParameter(
        "inverter_temp", "Inverter Temperature", "°C",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.CAN_BUS, "ev", False),
    "e_motor_temp": SensorParameter(
        "e_motor_temp", "E-Motor Temperature", "°C",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.CAN_BUS, "ev", False),
    "charging_current": SensorParameter(
        "charging_current", "Charging Current", "A",
        [VehicleDomain.EV_SPECIFIC], AcquisitionMethod.TELEMATICS, "ev", False),
}

# Map each EV parameter to its specific sub-area for finer-grained display.
EV_PARAMETER_SUBAREA: Dict[str, str] = {
    "hv_battery_soc": EVSubArea.HIGH_VOLTAGE_BATTERY,
    "hv_battery_temp": EVSubArea.HIGH_VOLTAGE_BATTERY,
    "bms_cell_voltage_delta": EVSubArea.BMS,
    "inverter_temp": EVSubArea.INVERTER,
    "e_motor_temp": EVSubArea.E_MOTOR,
    "charging_current": EVSubArea.CHARGING_SYSTEM,
}


def get_catalog_for_domain(domain: str) -> List[SensorParameter]:
    """Return every sensor parameter that informs a given domain."""
    return [p for p in SENSOR_CATALOG.values() if domain in p.domains]


def catalog_as_dict() -> List[Dict]:
    """Serialize the full catalog for API responses / frontend consumption."""
    return [
        {
            "key": p.key,
            "label": p.label,
            "unit": p.unit,
            "domains": [d.value for d in p.domains],
            "method": p.method.value if hasattr(p.method, "value") else str(p.method),
            "category": p.category,
            "existing": p.existing,
        }
        for p in SENSOR_CATALOG.values()
    ]


def domains_as_dict() -> List[Dict]:
    """Serialize the 11-domain taxonomy for API responses."""
    result = []
    for domain in VehicleDomain:
        entry = {
            "domain": domain.value,
            "label": DOMAIN_LABELS[domain],
            "parameters": [p.key for p in get_catalog_for_domain(domain)],
        }
        if domain == VehicleDomain.EV_SPECIFIC:
            entry["sub_areas"] = [
                {"sub_area": sa.value, "label": EV_SUBAREA_LABELS[sa]} for sa in EVSubArea
            ]
        result.append(entry)
    return result


# ---------------------------------------------------------------------------
# Level 0-7 vehicle health data hierarchy.
#
# This is a reference structure describing what kind of artifact lives at
# each level of processing — used so API responses can self-report which
# level they represent (a raw reading is level 0; a full diagnosis is
# level 5-6; a recommended action is level 7). This prototype currently
# produces up through level 6 (prediction/diagnosis); level 7 (action) is
# represented by `recommended_parts` in the diagnosis output.
# ---------------------------------------------------------------------------

DATA_HIERARCHY = [
    {"level": 0, "name": "Raw Sensor", "description": "Unprocessed signal directly from a sensor or ECU (e.g. raw ADC voltage, raw PID response bytes)."},
    {"level": 1, "name": "Signal Processing", "description": "Filtering, decoding, and unit conversion of raw signals into physical values (e.g. hex PID -> °C)."},
    {"level": 2, "name": "Component Parameter", "description": "A named, unit-labeled measurement of a specific component (e.g. coolant_temp = 92°C)."},
    {"level": 3, "name": "Component Health", "description": "Whether a single component's parameter(s) indicate normal or anomalous operation."},
    {"level": 4, "name": "Subsystem Health", "description": "Aggregated health across related components within one domain (e.g. overall Cooling domain status)."},
    {"level": 5, "name": "Vehicle Health", "description": "Aggregated health across all domains — an overall vehicle status."},
    {"level": 6, "name": "Prediction", "description": "Forward-looking inference: likely failure, time-to-failure, or trend-based risk."},
    {"level": 7, "name": "Action", "description": "Concrete recommendation: parts to replace, service to schedule, or urgency of response."},
]


def hierarchy_as_dict() -> List[Dict]:
    return DATA_HIERARCHY
