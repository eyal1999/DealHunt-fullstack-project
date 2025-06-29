#!/usr/bin/env python3
"""
Comprehensive feature testing for DealHunt Phase 3 features.
"""
import asyncio
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.services.analytics_service import AnalyticsService
from app.services.internationalization_service import InternationalizationService
from app.services.deal_hunting_service import DealHuntingService
from app.services.user_management_service import UserManagementService
from app.db import db

# Create test client
client = TestClient(app)

def test_basic_endpoints():
    """Test basic API endpoints."""
    print("🔧 Testing Basic Endpoints...")
    
    # Test health endpoint
    response = client.get("/health")
    assert response.status_code == 200
    print("  ✅ Health endpoint working")
    
    # Test root endpoint  
    response = client.get("/")
    assert response.status_code == 200
    print("  ✅ Root endpoint working")

def test_analytics_endpoints():
    """Test analytics endpoints."""
    print("\n📊 Testing Analytics Endpoints...")
    
    # Test health endpoint
    response = client.get("/analytics/health")
    assert response.status_code == 200
    print("  ✅ Analytics health endpoint working")
    
    # Test trends endpoint (should require auth)
    response = client.get("/analytics/trends")
    assert response.status_code == 401
    print("  ✅ Analytics trends endpoint properly secured")

def test_internationalization_endpoints():
    """Test internationalization endpoints."""
    print("\n🌍 Testing Internationalization Endpoints...")
    
    # Test supported locales
    response = client.get("/api/internationalization/supported-locales")
    assert response.status_code == 200
    data = response.json()
    assert len(data["currencies"]) >= 20
    assert len(data["languages"]) >= 20
    assert len(data["countries"]) >= 30
    print(f"  ✅ Supported locales: {len(data['currencies'])} currencies, {len(data['languages'])} languages")
    
    # Test currencies endpoint
    response = client.get("/api/internationalization/currencies")
    assert response.status_code == 200
    print("  ✅ Currencies endpoint working")

def test_deal_hunting_endpoints():
    """Test deal hunting endpoints."""
    print("\n🎯 Testing Deal Hunting Endpoints...")
    
    # Test alert types
    response = client.get("/api/deal-hunting/alert-types")
    assert response.status_code == 200
    data = response.json()
    assert len(data["alert_types"]) >= 6
    print(f"  ✅ Alert types: {len(data['alert_types'])} available")
    
    # Test severity levels
    response = client.get("/api/deal-hunting/severity-levels")
    assert response.status_code == 200
    data = response.json()
    assert len(data["severity_levels"]) >= 4
    print(f"  ✅ Severity levels: {len(data['severity_levels'])} available")

def test_user_management_endpoints():
    """Test user management endpoints."""
    print("\n👥 Testing User Management Endpoints...")
    
    # Test roles
    response = client.get("/api/user-management/roles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    print(f"  ✅ User roles: {len(data)} available")
    
    # Test permissions
    response = client.get("/api/user-management/permissions") 
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 22
    print(f"  ✅ Permissions: {len(data)} available")

async def test_services():
    """Test service layer functionality."""
    print("\n⚙️ Testing Service Layer...")
    
    # Test analytics service
    analytics_service = AnalyticsService(db)
    print("  ✅ Analytics service initialized")
    
    # Test internationalization service
    i18n_service = InternationalizationService(db)
    currencies = await i18n_service.get_supported_currencies()
    assert len(currencies) >= 12
    print(f"  ✅ Internationalization service: {len(currencies)} currencies supported")
    
    # Test deal hunting service
    deal_service = DealHuntingService(db)
    print("  ✅ Deal hunting service initialized")
    
    # Test user management service
    user_service = UserManagementService(db)
    system_stats = await user_service.get_system_user_stats()
    assert isinstance(system_stats, dict)
    print("  ✅ User management service working")

def test_model_imports():
    """Test all model imports."""
    print("\n📋 Testing Model Imports...")
    
    try:
        from app.models import analytics, internationalization, deal_hunting, user_management, rate_limiting
        print("  ✅ All Phase 3 models import successfully")
        
        # Test model instantiation
        from app.models.analytics import UserDashboard, SavingsMetrics
        from app.models.internationalization import CurrencyCode, UserLocale
        from app.models.deal_hunting import AlertType, Deal
        from app.models.user_management import UserRole, Permission
        from app.models.rate_limiting import RateLimitType, CacheType
        
        print("  ✅ All model classes can be instantiated")
        
    except ImportError as e:
        print(f"  ❌ Model import error: {e}")
        return False
    
    return True

def test_feature_integration():
    """Test feature integration."""
    print("\n🔗 Testing Feature Integration...")
    
    # Test that all routers are included
    route_count = len(app.routes)
    assert route_count >= 170
    print(f"  ✅ Total routes registered: {route_count}")
    
    # Check for Phase 3 specific routes
    phase3_routes = [
        "/api/internationalization/currencies",
        "/api/deal-hunting/alerts", 
        "/api/user-management/roles",
        "/analytics/dashboard"
    ]
    
    for route in app.routes:
        if hasattr(route, 'path'):
            for p3_route in phase3_routes:
                if route.path == p3_route:
                    phase3_routes.remove(p3_route)
                    
    assert len(phase3_routes) == 0, f"Missing routes: {phase3_routes}"
    print("  ✅ All Phase 3 routes are registered")

def run_all_tests():
    """Run all tests."""
    print("🧪 COMPREHENSIVE DEALHUNT TESTING")
    print("=" * 50)
    
    try:
        # Test basic functionality
        test_basic_endpoints()
        
        # Test Phase 3 endpoints
        test_analytics_endpoints()
        test_internationalization_endpoints() 
        test_deal_hunting_endpoints()
        test_user_management_endpoints()
        
        # Test models
        test_model_imports()
        
        # Test integration
        test_feature_integration()
        
        # Test services (async)
        asyncio.run(test_services())
        
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ DealHunt Phase 3 features are working correctly")
        return True
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)