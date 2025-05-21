from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to DealHunt!"}

def test_search_endpoint():
    response = client.get("/search/?q=test")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "test"
    assert isinstance(data.get("results"), list)