"""
Tests for models/sensor_diagnosis.py — Phase C, and the isolation guarantee
that the sensor pipeline never pulls in the photo pipeline.

See docs/SENSOR_FUSION_BACKEND_PLAN.md §1 and §6 for why this separation
matters and what "isolation" means concretely here.
"""

import sys
from models.sensor_diagnosis import run_sensor_diagnosis


def test_run_sensor_diagnosis_full_contract_shape():
    result = run_sensor_diagnosis("v1", "battery_degraded")
    assert result["vehicle_id"] == "v1"
    assert "timestamp" in result
    assert isinstance(result["readings"], list) and len(result["readings"]) > 0
    assert isinstance(result["anomalies"], list)
    assert "diagnosis" in result
    assert result["diagnosis"]["part_type"] == "battery"


def test_run_sensor_diagnosis_healthy_scenario_has_no_anomalies():
    result = run_sensor_diagnosis("v1", "healthy")
    assert result["anomalies"] == []
    assert result["diagnosis"]["part_type"] == "none"


def test_run_sensor_diagnosis_ev_scenario():
    result = run_sensor_diagnosis("v1", "ev_battery_thermal_event")
    assert result["diagnosis"]["part_type"] == "hv_battery"
    assert result["diagnosis"]["domain"] == "ev_specific"


def test_run_sensor_diagnosis_ev_healthy_scenario_has_no_anomalies():
    result = run_sensor_diagnosis("v1", "ev_healthy")
    assert result["anomalies"] == []
    assert result["diagnosis"]["part_type"] == "none"


def test_sensor_pipeline_does_not_import_photo_pipeline():
    """
    Concrete isolation check: importing the sensor diagnosis module (and
    running it) must not pull models.car_parts or models.diagnosis (the
    photo pipeline) into sys.modules.

    This is the automated version of the manual check described in the
    dev plan: "still works if models/car_parts.py is temporarily renamed."
    """
    # Force a fresh import state for the modules under test so a prior
    # test/module in the same session that happened to import the photo
    # pipeline doesn't produce a false negative here.
    for mod_name in list(sys.modules.keys()):
        if mod_name.startswith("models.sensor_") or mod_name in (
            "models.car_parts", "models.diagnosis"
        ):
            del sys.modules[mod_name]

    import models.sensor_diagnosis as sd
    sd.run_sensor_diagnosis("v1", "healthy")

    assert "models.car_parts" not in sys.modules, (
        "Sensor pipeline must not import the photo pipeline (models.car_parts)"
    )
    assert "models.diagnosis" not in sys.modules, (
        "Sensor pipeline must not import the photo pipeline (models.diagnosis)"
    )
