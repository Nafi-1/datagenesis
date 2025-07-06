#!/usr/bin/env python3
"""
Test script to verify server connectivity
"""

import requests
import socket
import time

def test_port_open(host, port):
    """Test if port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"Error testing port: {e}")
        return False

def test_health_endpoint(host, port):
    """Test health endpoint"""
    try:
        url = f"http://{host}:{port}/api/health"
        response = requests.get(url, timeout=5)
        return response.status_code == 200, response.json()
    except Exception as e:
        return False, str(e)

def main():
    host = "127.0.0.1"
    port = 8000
    
    print("🔍 Testing DataGenesis AI Backend Connectivity")
    print("=" * 50)
    
    # Test 1: Port connectivity
    print(f"1. Testing port {host}:{port}...")
    if test_port_open(host, port):
        print("✅ Port is open and accepting connections")
    else:
        print("❌ Port is not accessible")
        print("💡 Make sure the backend server is running: python run.py")
        return
    
    # Test 2: Root endpoint
    print("\n2. Testing root endpoint...")
    try:
        response = requests.get(f"http://{host}:{port}/", timeout=5)
        if response.status_code == 200:
            print("✅ Root endpoint accessible")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Root endpoint returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
    
    # Test 3: Health endpoint
    print("\n3. Testing health endpoint...")
    healthy, result = test_health_endpoint(host, port)
    if healthy:
        print("✅ Health endpoint working correctly")
        print(f"Health status: {result}")
    else:
        print(f"❌ Health endpoint failed: {result}")
    
    # Test 4: API documentation
    print("\n4. Testing API documentation...")
    try:
        response = requests.get(f"http://{host}:{port}/api/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API documentation accessible")
        else:
            print(f"❌ API docs returned status {response.status_code}")
    except Exception as e:
        print(f"❌ API docs failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed. If all tests pass, the backend is ready for frontend integration.")

if __name__ == "__main__":
    main()