#!/usr/bin/env python3
"""
Backend API Testing for MyStudyPlanner
Testing admin endpoints, hidden items, and profile photo functionality
"""

import asyncio
import httpx
import json
import base64
from datetime import datetime
import os

# Backend URL from environment
BACKEND_URL = "https://revision-med.preview.emergentagent.com/api"

# Test credentials
REGULAR_USER = {"email": "demo@test.com", "password": "demo123"}
ADMIN_USER = {"email": "admin@mystudyplanner.com", "password": "Admin123!"}

# Global variables for tokens and test data
regular_token = None
admin_token = None
test_user_id = None
test_catalog_item_id = None

async def make_request(method: str, endpoint: str, data=None, headers=None, token=None):
    """Make HTTP request with optional authentication"""
    url = f"{BACKEND_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json"}
    
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    
    if headers:
        req_headers.update(headers)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method.upper() == "GET":
            response = await client.get(url, headers=req_headers)
        elif method.upper() == "POST":
            response = await client.post(url, json=data, headers=req_headers)
        elif method.upper() == "PUT":
            response = await client.put(url, json=data, headers=req_headers)
        elif method.upper() == "DELETE":
            response = await client.delete(url, headers=req_headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
    
    return response

async def setup_test_users():
    """Setup test users - create regular user and admin"""
    global regular_token, admin_token, test_user_id
    
    print("🔧 Setting up test users...")
    
    # Create admin user first
    response = await make_request("POST", "/admin/create")
    print(f"Admin creation: {response.status_code} - {response.text[:100]}")
    
    # Login as admin
    response = await make_request("POST", "/auth/login", ADMIN_USER)
    if response.status_code == 200:
        admin_data = response.json()
        admin_token = admin_data["access_token"]
        print("✅ Admin login successful")
    else:
        print(f"❌ Admin login failed: {response.status_code} - {response.text}")
        return False
    
    # Register regular user
    regular_register = {
        "email": REGULAR_USER["email"],
        "password": REGULAR_USER["password"],
        "name": "Demo User"
    }
    
    response = await make_request("POST", "/auth/register", regular_register)
    if response.status_code == 200:
        user_data = response.json()
        regular_token = user_data["access_token"]
        test_user_id = user_data["user"]["id"]
        print("✅ Regular user registration successful")
    else:
        # Try login if user already exists
        response = await make_request("POST", "/auth/login", REGULAR_USER)
        if response.status_code == 200:
            user_data = response.json()
            regular_token = user_data["access_token"]
            test_user_id = user_data["user"]["id"]
            print("✅ Regular user login successful")
        else:
            print(f"❌ Regular user setup failed: {response.status_code} - {response.text}")
            return False
    
    return True

async def test_admin_endpoints():
    """Test admin-specific endpoints"""
    global regular_token, admin_token, test_user_id
    print("\n🔒 Testing Admin Endpoints...")
    
    # Test 1: Create admin user (should already exist)
    print("\n1. Testing POST /admin/create")
    response = await make_request("POST", "/admin/create")
    print(f"   Status: {response.status_code}")
    if response.status_code in [200, 409]:  # 200 = created, 409 = already exists
        print("   ✅ Admin creation endpoint working")
    else:
        print(f"   ❌ Admin creation failed: {response.text}")
    
    # Test 2: Get all users (requires admin auth)
    print("\n2. Testing GET /admin/users")
    response = await make_request("GET", "/admin/users", token=admin_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        users = response.json()
        print(f"   ✅ Retrieved {len(users)} users")
        for user in users[:3]:  # Show first 3
            print(f"   User: {user['email']} (Role: {user['role']}, Blocked: {user['is_blocked']})")
    else:
        print(f"   ❌ Failed to get users: {response.text}")
    
    # Test 3: Test without admin auth (should fail)
    print("\n3. Testing GET /admin/users without admin auth")
    response = await make_request("GET", "/admin/users", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 403:
        print("   ✅ Correctly denied non-admin access")
    else:
        print(f"   ❌ Should have denied access: {response.text}")
    
    # Test 4: Block user
    print("\n4. Testing POST /admin/users/{id}/block")
    if test_user_id:
        block_data = {"reason": "Test blocking"}
        response = await make_request("POST", f"/admin/users/{test_user_id}/block", 
                                    data=block_data, token=admin_token)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ User blocked successfully")
        else:
            print(f"   ❌ Failed to block user: {response.text}")
    
    # Test 5: Verify user is blocked (login should fail)
    print("\n5. Testing blocked user login")
    response = await make_request("POST", "/auth/login", REGULAR_USER)
    print(f"   Status: {response.status_code}")
    if response.status_code == 403:
        print("   ✅ Blocked user correctly denied login")
    else:
        print(f"   ❌ Blocked user should not be able to login: {response.text}")
    
    # Test 6: Unblock user
    print("\n6. Testing POST /admin/users/{id}/unblock")
    if test_user_id:
        response = await make_request("POST", f"/admin/users/{test_user_id}/unblock", token=admin_token)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ User unblocked successfully")
            # Re-login to get new token
            response = await make_request("POST", "/auth/login", REGULAR_USER)
            if response.status_code == 200:
                regular_token = response.json()["access_token"]
                print("   ✅ User can login again after unblocking")
        else:
            print(f"   ❌ Failed to unblock user: {response.text}")
    
    # Test 7: Delete user (GDPR)
    print("\n7. Testing DELETE /admin/users/{id} (GDPR)")
    # We'll skip this for the main test user, but test with non-existent user
    response = await make_request("DELETE", "/admin/users/non-existent-id", token=admin_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 404:
        print("   ✅ Correctly returns 404 for non-existent user")
    else:
        print(f"   ❌ Unexpected response: {response.text}")

async def test_hidden_items():
    """Test hidden items functionality"""
    global test_catalog_item_id
    print("\n👁️ Testing Hidden Items...")
    
    # First get some catalog items to work with
    print("\n1. Getting catalog items")
    response = await make_request("GET", "/catalog", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        catalog_items = response.json()
        if catalog_items:
            test_catalog_item_id = catalog_items[0]["id"]
            print(f"   ✅ Got {len(catalog_items)} catalog items")
            print(f"   Test item: {catalog_items[0]['title']} (ID: {test_catalog_item_id})")
        else:
            # Create seed data if no items exist
            print("   No catalog items found, creating seed data...")
            response = await make_request("POST", "/admin/seed", token=admin_token)
            if response.status_code == 200:
                print("   ✅ Seed data created")
                # Get items again
                response = await make_request("GET", "/catalog", token=regular_token)
                if response.status_code == 200:
                    catalog_items = response.json()
                    if catalog_items:
                        test_catalog_item_id = catalog_items[0]["id"]
                        print(f"   Test item: {catalog_items[0]['title']} (ID: {test_catalog_item_id})")
    else:
        print(f"   ❌ Failed to get catalog items: {response.text}")
        return
    
    if not test_catalog_item_id:
        print("   ❌ No test catalog item available")
        return
    
    # Test 2: Hide an item
    print("\n2. Testing POST /user/hidden")
    hide_data = {"item_id": test_catalog_item_id}
    response = await make_request("POST", "/user/hidden", data=hide_data, token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Item hidden successfully")
    else:
        print(f"   ❌ Failed to hide item: {response.text}")
    
    # Test 3: Get hidden items list
    print("\n3. Testing GET /user/hidden")
    response = await make_request("GET", "/user/hidden", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        hidden_items = response.json()
        print(f"   ✅ Retrieved {len(hidden_items)} hidden items")
        if hidden_items:
            print(f"   Hidden item: {hidden_items[0]['title']} (Level: {hidden_items[0]['level']})")
    else:
        print(f"   ❌ Failed to get hidden items: {response.text}")
    
    # Test 4: Verify item is hidden in catalog
    print("\n4. Verifying item is hidden in catalog")
    response = await make_request("GET", "/catalog", token=regular_token)
    if response.status_code == 200:
        catalog_items = response.json()
        hidden_item_found = any(item["id"] == test_catalog_item_id for item in catalog_items)
        if not hidden_item_found:
            print("   ✅ Hidden item correctly excluded from catalog")
        else:
            print("   ❌ Hidden item still appears in catalog")
    
    # Test 5: Unhide the item
    print("\n5. Testing DELETE /user/hidden/{item_id}")
    response = await make_request("DELETE", f"/user/hidden/{test_catalog_item_id}", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Item unhidden successfully")
    else:
        print(f"   ❌ Failed to unhide item: {response.text}")
    
    # Test 6: Verify item is back in catalog
    print("\n6. Verifying item is back in catalog")
    response = await make_request("GET", "/catalog", token=regular_token)
    if response.status_code == 200:
        catalog_items = response.json()
        unhidden_item_found = any(item["id"] == test_catalog_item_id for item in catalog_items)
        if unhidden_item_found:
            print("   ✅ Unhidden item correctly appears in catalog")
        else:
            print("   ❌ Unhidden item missing from catalog")
    
    # Test 7: Test without authentication
    print("\n7. Testing hidden items without auth")
    response = await make_request("GET", "/user/hidden")
    print(f"   Status: {response.status_code}")
    if response.status_code == 401:
        print("   ✅ Correctly requires authentication")
    else:
        print(f"   ❌ Should require authentication: {response.text}")

async def test_profile_photo():
    """Test profile photo functionality"""
    print("\n📸 Testing Profile Photo...")
    
    # Test 1: Get avatar options
    print("\n1. Testing GET /profile/avatars")
    response = await make_request("GET", "/profile/avatars")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        avatars = response.json()
        print(f"   ✅ Retrieved {len(avatars)} avatar options")
        if avatars:
            print(f"   First avatar: {avatars[0]['name']} (ID: {avatars[0]['id']})")
            test_avatar_id = avatars[0]['id']
        else:
            print("   ❌ No avatars returned")
            return
    else:
        print(f"   ❌ Failed to get avatars: {response.text}")
        return
    
    # Test 2: Set profile avatar
    print("\n2. Testing PUT /profile/avatar/{avatar_id}")
    response = await make_request("PUT", f"/profile/avatar/{test_avatar_id}", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Avatar set successfully: {result['avatar']['name']}")
    else:
        print(f"   ❌ Failed to set avatar: {response.text}")
    
    # Test 3: Verify avatar in user profile
    print("\n3. Verifying avatar in user profile")
    response = await make_request("GET", "/auth/me", token=regular_token)
    if response.status_code == 200:
        user_data = response.json()
        if user_data.get("avatar_id") == test_avatar_id:
            print("   ✅ Avatar correctly saved in profile")
        else:
            print(f"   ❌ Avatar not saved correctly. Expected: {test_avatar_id}, Got: {user_data.get('avatar_id')}")
    
    # Test 4: Update profile photo with base64 data
    print("\n4. Testing PUT /profile/photo")
    # Create a simple base64 encoded image (1x1 pixel PNG)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    photo_data = {
        "photo_base64": test_image_base64,
        "photo_type": "custom"
    }
    response = await make_request("PUT", "/profile/photo", data=photo_data, token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Profile photo updated successfully")
    else:
        print(f"   ❌ Failed to update profile photo: {response.text}")
    
    # Test 5: Verify custom photo in profile
    print("\n5. Verifying custom photo in user profile")
    response = await make_request("GET", "/auth/me", token=regular_token)
    if response.status_code == 200:
        user_data = response.json()
        if user_data.get("photo_type") == "custom" and user_data.get("profile_photo"):
            print("   ✅ Custom photo correctly saved in profile")
        else:
            print(f"   ❌ Custom photo not saved correctly. Type: {user_data.get('photo_type')}")
    
    # Test 6: Delete profile photo
    print("\n6. Testing DELETE /profile/photo")
    response = await make_request("DELETE", "/profile/photo", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Profile photo deleted successfully")
    else:
        print(f"   ❌ Failed to delete profile photo: {response.text}")
    
    # Test 7: Test invalid avatar ID
    print("\n7. Testing invalid avatar ID")
    response = await make_request("PUT", "/profile/avatar/invalid-id", token=regular_token)
    print(f"   Status: {response.status_code}")
    if response.status_code == 404:
        print("   ✅ Correctly returns 404 for invalid avatar ID")
    else:
        print(f"   ❌ Should return 404 for invalid avatar: {response.text}")
    
    # Test 8: Test without authentication
    print("\n8. Testing profile photo without auth")
    response = await make_request("GET", "/profile/avatars")
    print(f"   Avatar list (no auth): {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Avatar list accessible without auth (public endpoint)")
    
    response = await make_request("PUT", "/profile/photo", data=photo_data)
    print(f"   Photo update (no auth): {response.status_code}")
    if response.status_code == 401:
        print("   ✅ Photo update correctly requires authentication")
    else:
        print(f"   ❌ Photo update should require auth: {response.text}")

async def run_all_tests():
    """Run all test suites"""
    print("🚀 Starting MyStudyPlanner Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Setup
    if not await setup_test_users():
        print("❌ Failed to setup test users. Aborting tests.")
        return
    
    try:
        # Run test suites
        await test_admin_endpoints()
        await test_hidden_items()
        await test_profile_photo()
        
        print("\n✅ All tests completed!")
        print("\nTest Summary:")
        print("- Admin endpoints: User management, blocking, GDPR deletion")
        print("- Hidden items: Hide/unhide catalog items, visibility control")
        print("- Profile photos: Avatar options, custom photos, deletion")
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_all_tests())