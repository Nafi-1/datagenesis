#!/usr/bin/env python3
"""
Quick connectivity test for DataGenesis AI Backend
"""

import requests
import time
import sys

def test_connectivity():
    """Test backend connectivity"""
    print("🔍 Testing DataGenesis AI Backend Connectivity")
    print("=" * 50)
    
    base_urls = [
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    for base_url in base_urls:
        print(f"\n🔗 Testing {base_url}")
        
        # Test root endpoint
        try:
            response = requests.get(f"{base_url}/", timeout=5)
            if response.status_code == 200:
                print(f"✅ Root endpoint accessible: {response.status_code}")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ Root endpoint failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Root endpoint error: {e}")
            continue
        
        # Test health endpoint
        try:
            response = requests.get(f"{base_url}/api/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ Health endpoint accessible: {response.status_code}")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Health endpoint error: {e}")
        
        # Test CORS preflight
        try:
            response = requests.options(f"{base_url}/api/health", 
                                      headers={
                                          'Origin': 'http://localhost:5173',
                                          'Access-Control-Request-Method': 'GET'
                                      }, timeout=5)
            print(f"✅ CORS preflight: {response.status_code}")
            print(f"   CORS headers: {dict(response.headers)}")
        except Exception as e:
            print(f"❌ CORS preflight error: {e}")

if __name__ == "__main__":
    test_connectivity()