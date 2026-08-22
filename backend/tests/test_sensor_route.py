"""
Tests for routes/sensor_diagnose.py — Phase D.
Uses FastAPI's TestClient against the full app, but only exercises the
sensor-diagnose endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_scenarios_endpoint_lists_profiles():
    response = client.get("/api/sensor-diagnose/scenarios")
    assert response.status_code == 200
    data = response.json()
    names = {item["scenario"] for item in data}
    assert "healthy" in names
    assert "multi_fault" in names


def test_sensor_diagnose_valid_scenario():
    response = client.post(
        "/api/sensor-diagnose",
        json={"vehicle_id": "demo-1", "scenario": "overheating"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["vehicle_id"] == "demo-1"
    assert data["diagnosis"]["part_type"] == "coolant"
    assert data["diagnosis"]["severity"] == "critical"


def test_sensor_diagnose_unknown_scenario_returns_400():
    response = client.post(
        "/api/sensor-diagnose",
        json={"vehicle_id": "demo-1", "scenario": "does_not_exist"},
    )
    assert response.status_code == 400


def test_sensor_diagnose_missing_fields_returns_422():
    response = client.post("/api/sensor-diagnose", json={"vehicle_id": "demo-1"})
    assert response.status_code == 422


def test_domains_endpoint_lists_eleven_domains():
    response = client.get("/api/sensor-diagnose/domains")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 11
    ev_entry = next(d for d in data if d["domain"] == "ev_specific")
    assert len(ev_entry["sub_areas"]) == 7


def test_catalog_endpoint_lists_full_parameter_set():
    response = client.get("/api/sensor-diagnose/catalog")
    assert response.status_code == 200
    data = response.json()
    keys = {item["key"] for item in data}
    assert "battery_voltage" in keys
    assert "hv_battery_soc" in keys
    assert "engine_vibration" in keys  # add-on sensor


def test_hierarchy_endpoint_lists_eight_levels():
    response = client.get("/api/sensor-diagnose/hierarchy")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 8  # levels 0-7
    assert data[0]["level"] == 0
    assert data[-1]["level"] == 7
