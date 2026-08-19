"""
Tests for models/sensor_mock.py — Phase A of the sensor fusion prototype.
"""

import pytest
from models.sensor_mock import generate_reading, list_scenarios, SENSOR_UNITS


def test_list_scenarios_returns_all_profiles():
    scenarios = list_scenarios()
    names = {s["scenario"] for s in scenarios}
    assert "healthy" in names
    assert "battery_degraded" in names
    assert "multi_fault" in names


def test_generate_reading_known_scenario():
    readings = generate_reading("healthy", "test-vehicle")
    assert len(readings) > 0
    for r in readings:
        assert r["vehicle_id"] == "test-vehicle"
        assert "sensor" in r
        assert "value" in r
        assert "timestamp" in r
        assert r["unit"] == SENSOR_UNITS.get(r["sensor"], "")


def test_generate_reading_unknown_scenario_raises():
    with pytest.raises(ValueError):
        generate_reading("nonexistent_scenario", "test-vehicle")


def test_generate_reading_jitter_is_small():
    """Values should stay close to the profile baseline (within ~5%)."""
    readings = generate_reading("battery_degraded", "test-vehicle")
    battery_reading = next(r for r in readings if r["sensor"] == "battery_voltage")
    # Profile baseline is 11.2 — jitter is ±2%, allow a little margin
    assert 10.8 <= battery_reading["value"] <= 11.6
