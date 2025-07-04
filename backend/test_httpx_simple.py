#!/usr/bin/env python3
"""
Simple httpx test to isolate 503 error issue
"""

import asyncio
import httpx
import sys

async def test_simple_request():
    """Test a simple httpx request to isolate the 503 issue"""
    
    base_url = "http://localhost:8090"
    
    print("🔍 Testing httpx connection to FastAPI server...")
    print(f"Base URL: {base_url}")
    
    try:
        # Test 1: Basic connection with minimal timeout
        print("\n1️⃣ Basic httpx request (no connection pooling):")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/health")
            print(f"Status: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            print(f"Content: {response.text}")
    except Exception as e:
        print(f"❌ Basic request failed: {e}")
    
    try:
        # Test 2: Force IPv4 only
        print("\n2️⃣ Force IPv4 connection:")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get("http://127.0.0.1:8090/health")
            print(f"Status: {response.status_code}")
            print(f"Content: {response.text}")
    except Exception as e:
        print(f"❌ IPv4 request failed: {e}")
    
    try:
        # Test 3: HTTP/1.1 with no keep-alive
        print("\n3️⃣ HTTP/1.1 without keep-alive:")
        headers = {"Connection": "close"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{base_url}/health", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Content: {response.text}")
    except Exception as e:
        print(f"❌ No keep-alive request failed: {e}")
    
    try:
        # Test 4: Very basic request with minimal config
        print("\n4️⃣ Minimal httpx configuration:")
        client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_keepalive_connections=0, max_connections=1),
            http2=False
        )
        async with client:
            response = await client.get(f"{base_url}/health")
            print(f"Status: {response.status_code}")
            print(f"Content: {response.text}")
    except Exception as e:
        print(f"❌ Minimal config request failed: {e}")
    
    try:
        # Test 5: Synchronous httpx for comparison
        print("\n5️⃣ Synchronous httpx request:")
        with httpx.Client(timeout=30.0) as client:
            response = client.get(f"{base_url}/health")
            print(f"Status: {response.status_code}")
            print(f"Content: {response.text}")
    except Exception as e:
        print(f"❌ Sync request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_simple_request())