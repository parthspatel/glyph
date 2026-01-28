"""Tests for NER suggestions handler."""

import pytest
from fastapi.testclient import TestClient

from ml_suggestions.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ml-suggestions"


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Glyph ML Suggestions"


def test_ner_suggestions():
    """Test NER suggestions endpoint."""
    response = client.post(
        "/api/v1/suggestions/ner",
        json={
            "text": "Patient has diabetes and hypertension.",
            "entity_types": ["condition", "medication"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert "model" in data
    assert "processing_time_ms" in data


def test_quality_prediction():
    """Test quality prediction endpoint."""
    response = client.post(
        "/api/v1/suggestions/quality",
        json={
            "annotation_data": {"entities": []},
            "user_id": "user-123",
            "task_type": "ner",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "predicted_quality" in data
    assert 0 <= data["predicted_quality"] <= 1


def test_active_learning():
    """Test active learning endpoint."""
    response = client.post(
        "/api/v1/suggestions/active-learning",
        json={
            "project_id": "project-123",
            "user_id": "user-123",
            "strategy": "uncertainty",
            "count": 5,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "task_ids" in data
    assert data["strategy_used"] == "uncertainty"
