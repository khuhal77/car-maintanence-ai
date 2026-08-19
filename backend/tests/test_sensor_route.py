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
