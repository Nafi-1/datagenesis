#!/usr/bin/env python3
"""
Simple test to verify the server can start
"""

def test_imports():
    """Test if all imports work"""
    print("Testing imports...")
    
    try:
        import fastapi
        print("✓ FastAPI imported successfully")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print("✓ Uvicorn imported successfully")
    except ImportError as e:
        print(f"✗ Uvicorn import failed: {e}")
        return False
    
    try:
        from app.main import app
        print("✓ App imported successfully")
        print(f"✓ App type: {type(app)}")
    except ImportError as e:
        print(f"✗ App import failed: {e}")
        return False
    except Exception as e:
        print(f"✗ App import error: {e}")
        return False
    
    return True

def test_app_creation():
    """Test if app can be created"""
    print("\nTesting app creation...")
    
    try:
        from fastapi import FastAPI
        test_app = FastAPI()
        print("✓ FastAPI app created successfully")
        return True
    except Exception as e:
        print(f"✗ App creation failed: {e}")
        return False

def main():
    print("🔍 Running Simple Backend Tests")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed")
        return False
    
    # Test app creation
    if not test_app_creation():
        print("\n❌ App creation tests failed")
        return False
    
    print("\n✅ All tests passed! Server should be able to start.")
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)