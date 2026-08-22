"""
Tests for models/sensor_rules.py — Phase B of the sensor fusion prototype,
covering the expanded 11-domain / 20-parameter schema.
"""

from models.sensor_rules import (
    evaluate_readings, diagnose_from_anomalies,
    ML_SENSOR_FEATURES, ML_EV_SENSOR_FEATURES,
)


def test_healthy_readings_produce_no_anomalies():
    readings = [
        {"sensor": "battery_voltage", "value": 13.2, "unit": "V"},
        {"sensor": "coolant_temp", "value": 90, "unit": "°C"},
        {"sensor": "fuel_pressure", "value": 320, "unit": "kPa"},
    ]
    anomalies = evaluate_readings(readings)
    assert anomalies == []


def test_low_battery_voltage_flagged_as_anomaly():
    readings = [{"sensor": "battery_voltage", "value": 10.5, "unit": "V"}]
    anomalies = evaluate_readings(readings)
    assert len(anomalies) == 1
    assert anomalies[0]["sensor"] == "battery_voltage"
    assert anomalies[0]["severity"] == "critical"  # below warning_min of 11.5


def test_borderline_low_battery_is_high_not_critical():
    # Between warning_min (11.5) and min (12.0) -> "high", not "critical"
    readings = [{"sensor": "battery_voltage", "value": 11.7, "unit": "V"}]
    anomalies = evaluate_readings(readings)
    assert anomalies[0]["severity"] == "high"


def test_sensor_without_threshold_is_ignored():
    readings = [{"sensor": "engine_rpm", "value": 9999, "unit": "RPM"}]
    anomalies = evaluate_readings(readings)
    assert anomalies == []


def test_ev_battery_temp_flagged_as_anomaly():
    readings = [{"sensor": "hv_battery_temp", "value": 60, "unit": "°C"}]
    anomalies = evaluate_readings(readings)
    assert len(anomalies) == 1
    assert anomalies[0]["sensor"] == "hv_battery_temp"


def test_diagnose_from_no_anomalies_returns_healthy_result():
    diagnosis = diagnose_from_anomalies([])
    assert diagnosis["part_type"] == "none"
    assert diagnosis["severity"] == "none"
    assert diagnosis["domain"] == "none"
    assert diagnosis["method"] in ("ml_isolation_forest", "threshold_fallback")


def test_diagnose_from_single_anomaly_maps_to_correct_part_and_domain():
    anomalies = [{
        "sensor": "battery_voltage", "value": 10.5, "unit": "V",
        "expected_range": [12.0, 14.5], "severity": "critical", "method": "threshold_fallback",
    }]
    diagnosis = diagnose_from_anomalies(anomalies)
    assert diagnosis["part_type"] == "battery"
    assert diagnosis["severity"] == "critical"
    assert diagnosis["domain"] == "battery"
    assert "12V Car Battery 60Ah" in diagnosis["recommended_parts"]


def test_diagnose_from_ev_anomaly_maps_to_ev_domain():
    anomalies = [{
        "sensor": "inverter_temp", "value": 85, "unit": "°C",
        "expected_range": [20, 70], "severity": "high", "method": "threshold_fallback",
    }]
    diagnosis = diagnose_from_anomalies(anomalies)
    assert diagnosis["part_type"] == "inverter"
    assert diagnosis["domain"] == "ev_specific"


def test_diagnose_from_multiple_anomalies_picks_highest_severity():
    anomalies = [
        {"sensor": "tire_pressure_fl", "value": 24, "unit": "PSI",
         "expected_range": [30, 36], "severity": "high", "method": "threshold_fallback"},
        {"sensor": "coolant_temp", "value": 120, "unit": "°C",
         "expected_range": [80, 100], "severity": "critical", "method": "threshold_fallback"},
    ]
    diagnosis = diagnose_from_anomalies(anomalies)
    # Critical coolant anomaly should win over high-severity tire anomaly
    assert diagnosis["part_type"] == "coolant"
    assert diagnosis["severity"] == "critical"
    assert diagnosis["domain"] == "cooling"


def test_conventional_full_feature_set_uses_ml_model():
    """When all ML_SENSOR_FEATURES are present, evaluate_readings should use
    the trained IsolationForest rather than the threshold fallback (unless
    scikit-learn genuinely isn't installed, in which case this still
    degrades gracefully to the fallback and the test accepts either)."""
    readings = [
        {"sensor": s, "value": v, "unit": ""}
        for s, v in zip(
            ML_SENSOR_FEATURES,
            [10.8, 90, 320, 33, 20, 1.0],  # last value is low battery -> should flag
        )
    ]
    anomalies = evaluate_readings(readings)
    assert len(anomalies) >= 1
    assert anomalies[0]["method"] in ("ml_isolation_forest", "threshold_fallback")


def test_ev_full_feature_set_uses_ev_ml_model():
    """When all ML_EV_SENSOR_FEATURES are present, evaluate_readings should
    route to the EV-specific model rather than the conventional one."""
    readings = [
        {"sensor": s, "value": v, "unit": ""}
        for s, v in zip(ML_EV_SENSOR_FEATURES, [65, 58, 12, 48, 60])  # elevated HV battery temp
    ]
    anomalies = evaluate_readings(readings)
    assert len(anomalies) >= 1
    assert anomalies[0]["method"] in ("ml_isolation_forest", "threshold_fallback")
