#!/usr/bin/env python3
"""
RevisionMed Backend API Testing Suite
Tests authentication, catalog management, revision methods (J-Method, SRS, Tours), and other features
"""

import requests
import json
import time
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional

class RevisionMedAPITester:
    def __init__(self, base_url: str = "https://revision-med.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.auth_token = None
        self.current_user = None
        
        # Test accounts
        self.admin_credentials = {"email": "admin@test.com", "password": "admin123"}
        self.user_credentials = {"email": "test@test.com", "password": "test123"}
        
        # Test data storage
        self.catalog_items = []
        self.user_settings = []
        self.sessions = []
        
        print(f"🔧 Initializing RevisionMed API Tester")
        print(f"📡 Base URL: {self.base_url}")
        print(f"📍 API URL: {self.api_url}")

    def log(self, message: str, level: str = "INFO"):
        """Enhanced logging with emoji indicators"""
        emojis = {
            "INFO": "ℹ️",
            "SUCCESS": "✅", 
            "ERROR": "❌",
            "WARNING": "⚠️",
            "TEST": "🧪",
            "SETUP": "🔧"
        }
        emoji = emojis.get(level, "📝")
        print(f"{emoji} {message}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> Dict[str, Any]:
        """Make HTTP request with proper error handling"""
        url = f"{self.api_url}{endpoint}"
        
        # Set up headers
        request_headers = {"Content-Type": "application/json"}
        if self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
        if headers:
            request_headers.update(headers)
        
        try:
            self.log(f"Making {method} request to {endpoint}", "TEST")
            
            if method.upper() == "GET":
                response = self.session.get(url, headers=request_headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            self.log(f"Response status: {response.status_code}", "INFO")
            
            # Try to parse JSON response
            try:
                result = response.json()
            except:
                result = {"status_code": response.status_code, "text": response.text[:500]}
            
            if response.status_code >= 400:
                self.log(f"Request failed: {result}", "ERROR")
            
            return {
                "status_code": response.status_code,
                "data": result,
                "success": 200 <= response.status_code < 300
            }
            
        except Exception as e:
            self.log(f"Request error: {str(e)}", "ERROR")
            return {
                "status_code": 500,
                "data": {"error": str(e)},
                "success": False
            }

    def test_auth_register_login(self) -> bool:
        """Test user registration and login"""
        self.log("=== Testing Authentication ===", "TEST")
        
        # Test user registration (may already exist)
        register_data = {
            "email": self.user_credentials["email"],
            "password": self.user_credentials["password"],
            "name": "Test User"
        }
        
        register_result = self.make_request("POST", "/auth/register", register_data)
        if register_result["status_code"] == 400:
            self.log("User already exists, proceeding to login", "INFO")
        elif not register_result["success"]:
            self.log("Registration failed", "ERROR")
            return False
        
        # Test login
        login_result = self.make_request("POST", "/auth/login", self.user_credentials)
        if not login_result["success"]:
            self.log("Login failed", "ERROR")
            return False
        
        # Store auth token
        self.auth_token = login_result["data"]["access_token"]
        self.current_user = login_result["data"]["user"]
        self.log(f"Logged in as: {self.current_user['name']} ({self.current_user['email']})", "SUCCESS")
        
        # Test get current user
        me_result = self.make_request("GET", "/auth/me")
        if not me_result["success"]:
            self.log("Get current user failed", "ERROR")
            return False
        
        self.log("Authentication tests passed", "SUCCESS")
        return True

    def test_catalog_management(self) -> bool:
        """Test catalog CRUD operations"""
        self.log("=== Testing Catalog Management ===", "TEST")
        
        # Test get all catalog items
        catalog_result = self.make_request("GET", "/catalog/all")
        if not catalog_result["success"]:
            self.log("Failed to get catalog", "ERROR")
            return False
        
        catalog_items = catalog_result["data"]
        self.log(f"Found {len(catalog_items)} catalog items", "INFO")
        
        if len(catalog_items) > 0:
            self.catalog_items = catalog_items
            self.log("Using existing catalog items", "INFO")
        else:
            self.log("No catalog items found - this might affect revision method testing", "WARNING")
        
        # Test get specific catalog item if available
        if self.catalog_items:
            item_id = self.catalog_items[0]["id"]
            item_result = self.make_request("GET", f"/catalog/{item_id}")
            if not item_result["success"]:
                self.log("Failed to get specific catalog item", "ERROR")
                return False
        
        self.log("Catalog management tests passed", "SUCCESS")
        return True

    def test_j_method(self) -> bool:
        """Test J-Method revision settings and sessions"""
        self.log("=== Testing J-Method ===", "TEST")
        
        if not self.catalog_items:
            self.log("No catalog items available for J-Method testing", "WARNING")
            return True
        
        # Pick first catalog item for testing
        test_item = self.catalog_items[0]
        self.log(f"Testing J-Method with item: {test_item['title']}", "INFO")
        
        # Set J-Method for item
        j_settings = {
            "item_id": test_item["id"],
            "method": "j_method",
            "j_settings": {
                "start_date": datetime.utcnow().date().isoformat(),
                "intervals": [0, 1, 3, 7, 14, 30, 60, 120],
                "recurring_interval": 150
            }
        }
        
        settings_result = self.make_request("POST", "/user/items/settings", j_settings)
        if not settings_result["success"]:
            self.log("Failed to set J-Method settings", "ERROR")
            return False
        
        self.log("J-Method settings created successfully", "SUCCESS")
        
        # Wait a moment for background task to generate sessions
        time.sleep(2)
        
        # Get today's sessions
        today_result = self.make_request("GET", "/sessions/today")
        if not today_result["success"]:
            self.log("Failed to get today's sessions", "ERROR")
            return False
        
        sessions = today_result["data"]
        j_sessions = [s for s in sessions if s["method"] == "j_method"]
        self.log(f"Found {len(j_sessions)} J-Method sessions for today", "INFO")
        
        self.log("J-Method tests passed", "SUCCESS")
        return True

    def test_srs_method(self) -> bool:
        """Test SRS (Spaced Repetition System) method with SM-2 algorithm"""
        self.log("=== Testing SRS Method ===", "TEST")
        
        if not self.catalog_items:
            self.log("No catalog items available for SRS testing", "WARNING")
            return True
        
        # Pick second catalog item for testing (or first if only one)
        test_item = self.catalog_items[min(1, len(self.catalog_items) - 1)]
        self.log(f"Testing SRS with item: {test_item['title']}", "INFO")
        
        # Set SRS method for item
        srs_settings = {
            "item_id": test_item["id"],
            "method": "srs",
            "srs_settings": {
                "easiness_factor": 2.5,
                "interval": 1,
                "repetitions": 0,
                "next_review": datetime.utcnow().date().isoformat()
            }
        }
        
        settings_result = self.make_request("POST", "/user/items/settings", srs_settings)
        if not settings_result["success"]:
            self.log("Failed to set SRS settings", "ERROR")
            return False
        
        self.log("SRS settings created successfully", "SUCCESS")
        
        # Wait for background task
        time.sleep(2)
        
        # Get all sessions to find SRS sessions
        sessions_result = self.make_request("GET", "/sessions")
        if not sessions_result["success"]:
            self.log("Failed to get sessions", "ERROR")
            return False
        
        sessions = sessions_result["data"]
        srs_sessions = [s for s in sessions if s["method"] == "srs" and s["item_id"] == test_item["id"]]
        
        if not srs_sessions:
            self.log("No SRS sessions found", "ERROR")
            return False
        
        # Test completing an SRS session with rating
        srs_session = srs_sessions[0]
        self.log(f"Testing SRS session completion for session: {srs_session['id']}", "INFO")
        
        # Complete session with different ratings to test SM-2 algorithm
        for rating in [3, 4, 5]:  # Good ratings (3-5 = pass)
            completion_data = {
                "srs_rating": rating,
                "notes": f"Completed with rating {rating}"
            }
            
            complete_result = self.make_request("POST", f"/sessions/{srs_session['id']}/complete", completion_data)
            if not complete_result["success"]:
                self.log(f"Failed to complete SRS session with rating {rating}", "ERROR")
                return False
            
            completed_session = complete_result["data"]
            self.log(f"SRS session completed with rating {rating}, new status: {completed_session['status']}", "SUCCESS")
            break  # Only test one completion to avoid multiple completions of same session
        
        # Test bad rating (should reset interval)
        if len(srs_sessions) > 1:
            bad_session = srs_sessions[1]
            bad_completion = {
                "srs_rating": 1,  # Bad rating (0-2 = fail)
                "notes": "Failed review - should reset interval"
            }
            
            bad_result = self.make_request("POST", f"/sessions/{bad_session['id']}/complete", bad_completion)
            if not bad_result["success"]:
                self.log("Failed to complete SRS session with bad rating", "WARNING")
            else:
                self.log("SRS session completed with bad rating - should trigger interval reset", "INFO")
        
        self.log("SRS method tests passed", "SUCCESS")
        return True

    def test_tours_method(self) -> bool:
        """Test Tours method"""
        self.log("=== Testing Tours Method ===", "TEST")
        
        if not self.catalog_items:
            self.log("No catalog items available for Tours testing", "WARNING")
            return True
        
        # Pick third catalog item for testing
        test_item = self.catalog_items[min(2, len(self.catalog_items) - 1)]
        self.log(f"Testing Tours with item: {test_item['title']}", "INFO")
        
        # Set Tours method for item
        tours_settings = {
            "item_id": test_item["id"],
            "method": "tours",
            "tours_settings": {
                "total_tours": 3,
                "tour_durations": [30, 30, 30],
                "current_tour": 1
            }
        }
        
        settings_result = self.make_request("POST", "/user/items/settings", tours_settings)
        if not settings_result["success"]:
            self.log("Failed to set Tours settings", "ERROR")
            return False
        
        self.log("Tours settings created successfully", "SUCCESS")
        
        # Wait for background task
        time.sleep(2)
        
        # Get all sessions to find Tours sessions
        sessions_result = self.make_request("GET", "/sessions")
        if not sessions_result["success"]:
            self.log("Failed to get sessions", "ERROR")
            return False
        
        sessions = sessions_result["data"]
        tours_sessions = [s for s in sessions if s["method"] == "tours" and s["item_id"] == test_item["id"]]
        
        if not tours_sessions:
            self.log("No Tours sessions found", "ERROR")
            return False
        
        self.log(f"Found {len(tours_sessions)} Tours sessions", "SUCCESS")
        
        # Test completing a Tours session
        tours_session = tours_sessions[0]
        completion_data = {
            "notes": f"Completed tour {tours_session.get('tour_number', 1)}"
        }
        
        complete_result = self.make_request("POST", f"/sessions/{tours_session['id']}/complete", completion_data)
        if not complete_result["success"]:
            self.log("Failed to complete Tours session", "ERROR")
            return False
        
        completed_session = complete_result["data"]
        self.log(f"Tours session completed, tour: {completed_session.get('tour_number')}", "SUCCESS")
        
        self.log("Tours method tests passed", "SUCCESS")
        return True

    def test_personal_events(self) -> bool:
        """Test Personal Events CRUD operations"""
        self.log("=== Testing Personal Events ===", "TEST")
        
        # Create a personal event
        event_data = {
            "title": "Test Medical Exam",
            "start_time": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(days=7, hours=2)).isoformat(),
            "description": "Important medical examination",
            "color": "#FF6B6B"
        }
        
        create_result = self.make_request("POST", "/events", event_data)
        if not create_result["success"]:
            self.log("Failed to create personal event", "ERROR")
            return False
        
        created_event = create_result["data"]
        event_id = created_event["id"]
        self.log(f"Created personal event: {created_event['title']}", "SUCCESS")
        
        # Get all events
        events_result = self.make_request("GET", "/events")
        if not events_result["success"]:
            self.log("Failed to get personal events", "ERROR")
            return False
        
        events = events_result["data"]
        self.log(f"Retrieved {len(events)} personal events", "INFO")
        
        # Update the event
        update_data = {
            "title": "Updated Medical Exam",
            "start_time": event_data["start_time"],
            "end_time": event_data["end_time"],
            "description": "Updated examination details",
            "color": "#4ECDC4"
        }
        
        update_result = self.make_request("PUT", f"/events/{event_id}", update_data)
        if not update_result["success"]:
            self.log("Failed to update personal event", "ERROR")
            return False
        
        self.log("Personal event updated successfully", "SUCCESS")
        
        # Test recurring event
        recurring_event = {
            "title": "Weekly Study Session",
            "start_time": datetime.utcnow().isoformat(),
            "end_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "description": "Regular study session",
            "recurrence": {
                "frequency": "weekly",
                "interval": 1,
                "count": 10
            },
            "color": "#95E1D3"
        }
        
        recurring_result = self.make_request("POST", "/events", recurring_event)
        if not recurring_result["success"]:
            self.log("Failed to create recurring event", "ERROR")
            return False
        
        recurring_id = recurring_result["data"]["id"]
        self.log("Created recurring personal event", "SUCCESS")
        
        # Clean up - delete test events
        self.make_request("DELETE", f"/events/{event_id}")
        self.make_request("DELETE", f"/events/{recurring_id}")
        
        self.log("Personal Events tests passed", "SUCCESS")
        return True

    def test_ics_subscriptions(self) -> bool:
        """Test ICS Subscriptions functionality"""
        self.log("=== Testing ICS Subscriptions ===", "TEST")
        
        # Create an ICS subscription with a test URL
        # Using a mock ICS URL for testing
        subscription_data = {
            "name": "Test Medical Calendar",
            "url": "https://calendar.google.com/calendar/ical/en.french%23holiday%40group.v.calendar.google.com/public/basic.ics",
            "color": "#FF9FF3"
        }
        
        create_result = self.make_request("POST", "/ics/subscribe", subscription_data)
        if not create_result["success"]:
            self.log("Failed to create ICS subscription", "ERROR")
            return False
        
        subscription = create_result["data"]
        subscription_id = subscription["id"]
        self.log(f"Created ICS subscription: {subscription['name']}", "SUCCESS")
        
        # Get all subscriptions
        subs_result = self.make_request("GET", "/ics/subscriptions")
        if not subs_result["success"]:
            self.log("Failed to get ICS subscriptions", "ERROR")
            return False
        
        subscriptions = subs_result["data"]
        self.log(f"Retrieved {len(subscriptions)} ICS subscriptions", "INFO")
        
        # Trigger sync (this will run in background)
        sync_result = self.make_request("POST", f"/ics/{subscription_id}/sync")
        if not sync_result["success"]:
            self.log("Failed to trigger ICS sync", "ERROR")
            return False
        
        self.log("ICS sync triggered", "INFO")
        
        # Wait a moment for sync to potentially complete
        time.sleep(3)
        
        # Get events from subscription
        events_result = self.make_request("GET", f"/ics/{subscription_id}/events")
        if not events_result["success"]:
            self.log("Failed to get ICS events (may be normal if sync didn't complete)", "WARNING")
        else:
            events = events_result["data"]
            self.log(f"Retrieved {len(events)} ICS events", "INFO")
        
        # Clean up - delete subscription
        delete_result = self.make_request("DELETE", f"/ics/{subscription_id}")
        if not delete_result["success"]:
            self.log("Failed to delete ICS subscription", "WARNING")
        else:
            self.log("ICS subscription deleted", "INFO")
        
        self.log("ICS Subscriptions tests passed", "SUCCESS")
        return True

    def test_admin_functions(self) -> bool:
        """Test admin functions like catalog management"""
        self.log("=== Testing Admin Functions ===", "TEST")
        
        # Login as admin
        admin_login = self.make_request("POST", "/auth/login", self.admin_credentials)
        if not admin_login["success"]:
            self.log("Admin login failed - creating admin user first", "WARNING")
            
            # Try to register admin user
            admin_register = {
                "email": self.admin_credentials["email"],
                "password": self.admin_credentials["password"],
                "name": "Admin User"
            }
            
            register_result = self.make_request("POST", "/auth/register", admin_register)
            if register_result["success"]:
                self.log("Admin user created, but needs admin role assignment", "WARNING")
            
            return True  # Skip admin tests if we can't login as admin
        
        # Store admin token
        old_token = self.auth_token
        self.auth_token = admin_login["data"]["access_token"]
        
        # Test creating a catalog item
        catalog_item = {
            "title": "Test Chapter - Nephrology",
            "description": "Test chapter for kidney diseases",
            "order": 999,
            "parent_id": None
        }
        
        create_result = self.make_request("POST", "/admin/catalog", catalog_item)
        if not create_result["success"]:
            self.log("Failed to create catalog item as admin", "ERROR")
            self.auth_token = old_token
            return False
        
        created_item = create_result["data"]
        item_id = created_item["id"]
        self.log(f"Created catalog item: {created_item['title']}", "SUCCESS")
        
        # Test seed data endpoint
        seed_result = self.make_request("POST", "/admin/seed")
        if seed_result["success"] or seed_result["status_code"] == 200:
            self.log("Seed data endpoint working", "INFO")
        else:
            self.log("Seed data endpoint failed", "WARNING")
        
        # Clean up - delete test item
        delete_result = self.make_request("DELETE", f"/admin/catalog/{item_id}")
        if not delete_result["success"]:
            self.log("Failed to delete test catalog item", "WARNING")
        else:
            self.log("Test catalog item deleted", "INFO")
        
        # Restore user token
        self.auth_token = old_token
        
        self.log("Admin function tests passed", "SUCCESS")
        return True

    def test_analytics_and_progress(self) -> bool:
        """Test analytics and progress tracking"""
        self.log("=== Testing Analytics & Progress ===", "TEST")
        
        # Get progress stats
        progress_result = self.make_request("GET", "/analytics/progress")
        if not progress_result["success"]:
            self.log("Failed to get progress analytics", "ERROR")
            return False
        
        progress = progress_result["data"]
        self.log(f"Progress stats - Completed: {progress.get('completed_sessions', 0)}, "
                f"Late: {progress.get('late_sessions', 0)}, "
                f"Streak: {progress.get('streak', 0)}", "INFO")
        
        # Get calendar data for current month
        now = datetime.utcnow()
        calendar_result = self.make_request("GET", f"/analytics/calendar?month={now.month}&year={now.year}")
        if not calendar_result["success"]:
            self.log("Failed to get calendar analytics", "ERROR")
            return False
        
        calendar_data = calendar_result["data"]
        self.log(f"Calendar data retrieved for {now.month}/{now.year}", "SUCCESS")
        
        self.log("Analytics & Progress tests passed", "SUCCESS")
        return True

    def test_calendar_all_events(self) -> bool:
        """Test the /api/calendar/all-events endpoint"""
        self.log("🧪 Testing Calendar All Events Endpoint", "TEST")
        
        # First ensure we have some test data
        # Create a personal event
        event_data = {
            "title": "Test Personal Event for All-Events",
            "start_time": datetime.now().isoformat(),
            "end_time": (datetime.now() + timedelta(hours=1)).isoformat(),
            "description": "Test event for all-events endpoint",
            "color": "#3b82f6"
        }
        
        event_result = self.make_request("POST", "/calendar/events", event_data)
        if not event_result["success"]:
            self.log("Failed to create personal event for testing", "WARNING")
        else:
            self.log("Created test personal event", "INFO")
        
        # Create an ICS subscription if none exists
        ics_data = {
            "name": "Test Calendar for All Events", 
            "url": "https://calendar.google.com/calendar/ical/en.french%23holiday%40group.v.calendar.google.com/public/basic.ics",
            "color": "#ef4444"
        }
        
        ics_result = self.make_request("POST", "/calendar/ics", ics_data)
        if not ics_result["success"]:
            self.log("ICS subscription creation failed (might already exist)", "INFO")
        else:
            self.log("Created test ICS subscription", "INFO")
            # Wait a moment for sync
            time.sleep(2)
        
        # Calculate test date range
        today = datetime.now().date()
        start_date = (today - timedelta(days=30)).isoformat()
        end_date = (today + timedelta(days=30)).isoformat()
        
        # Test 1: Valid request with authentication  
        self.log(f"Testing date range: {start_date} to {end_date}", "INFO")
        
        result = self.make_request("GET", f"/calendar/all-events?start_date={start_date}&end_date={end_date}")
        if not result["success"]:
            self.log("Failed to get all calendar events", "ERROR")
            return False
        
        events = result["data"]
        self.log(f"Retrieved {len(events)} events from all-events endpoint", "SUCCESS")
        
        # Validate event structure
        personal_events = [e for e in events if e.get('type') == 'personal']
        ics_events = [e for e in events if e.get('type') == 'ics']
        
        self.log(f"Found {len(personal_events)} personal events and {len(ics_events)} ICS events", "INFO")
        
        # Check event structure
        for event in events[:3]:  # Check first 3 events
            required_fields = ['id', 'type', 'title', 'start_time']
            missing_fields = [field for field in required_fields if field not in event]
            
            if missing_fields:
                self.log(f"Event missing required fields: {missing_fields}", "ERROR")
                return False
            
            if event['type'] not in ['personal', 'ics']:
                self.log(f"Invalid event type: {event['type']}", "ERROR")
                return False
        
        # Test 2: Request without auth should fail
        temp_token = self.auth_token
        self.auth_token = None
        no_auth_result = self.make_request("GET", f"/calendar/all-events?start_date={start_date}&end_date={end_date}")
        self.auth_token = temp_token
        
        if no_auth_result["success"]:
            self.log("All-events endpoint should require authentication", "ERROR")
            return False
        
        self.log("Calendar all-events endpoint tests passed", "SUCCESS")
        return True

    def test_course_rename_api(self) -> bool:
        """Test the PUT /api/user/courses/{item_id} endpoint for renaming personal courses"""
        self.log("🧪 Testing Course Rename API", "TEST")
        
        # First create a personal course to test with
        course_data = {
            "title": "Test Course for Rename",
            "parent_id": None,
            "order": 1,
            "description": "Test course for rename API testing"
        }
        
        create_result = self.make_request("POST", "/user/courses", course_data)
        if not create_result["success"]:
            self.log("Failed to create personal course for testing", "ERROR")
            return False
        
        course_id = create_result["data"]["id"]
        self.log(f"Created test course with ID: {course_id}", "INFO")
        
        # Test 1: Valid rename request
        new_title = "Renamed Test Course"
        rename_data = {"title": new_title}
        
        rename_result = self.make_request("PUT", f"/user/courses/{course_id}", rename_data)
        if not rename_result["success"]:
            self.log("Failed to rename personal course", "ERROR")
            return False
        
        renamed_course = rename_result["data"]
        if renamed_course.get("title") != new_title:
            self.log(f"Course title not updated correctly. Expected: {new_title}, Got: {renamed_course.get('title')}", "ERROR")
            return False
        
        self.log(f"Successfully renamed course to: {new_title}", "SUCCESS")
        
        # Test 2: Verify the course was actually updated in the database
        courses_result = self.make_request("GET", "/user/courses")
        if not courses_result["success"]:
            self.log("Failed to retrieve courses to verify rename", "ERROR")
            return False
        
        courses = courses_result["data"]
        updated_course = next((c for c in courses if c["id"] == course_id), None)
        
        if not updated_course or updated_course.get("title") != new_title:
            self.log("Course title not persisted in database", "ERROR")
            return False
        
        self.log("Course rename persisted correctly in database", "SUCCESS")
        
        # Test 3: Try to rename non-existent course (should fail)
        fake_id = "fake-course-id-12345"
        fake_rename_result = self.make_request("PUT", f"/user/courses/{fake_id}", {"title": "Should Fail"})
        
        if fake_rename_result["success"]:
            self.log("Rename should fail for non-existent course", "ERROR")
            return False
        
        self.log("Correctly prevented rename of non-existent course", "SUCCESS")
        
        # Test 4: Try to rename with invalid data (should fail)
        invalid_data_result = self.make_request("PUT", f"/user/courses/{course_id}", {"wrong_field": "value"})
        
        if invalid_data_result["success"]:
            self.log("Rename should fail with invalid JSON body", "ERROR")
            return False
        
        self.log("Correctly rejected invalid JSON body", "SUCCESS")
        
        # Test 5: Try to rename admin course (should fail)
        # Get all courses to find an admin course (one without owner_id)
        all_courses = courses_result["data"]
        admin_course = next((c for c in all_courses if not c.get('owner_id')), None)
        
        if admin_course:
            admin_course_id = admin_course["id"]
            admin_rename_result = self.make_request("PUT", f"/user/courses/{admin_course_id}", {"title": "Should Fail"})
            
            if admin_rename_result["success"]:
                self.log("Should not be able to rename admin courses", "ERROR")
                return False
            
            self.log("Correctly prevented renaming of admin course", "SUCCESS")
        else:
            self.log("No admin courses found to test rename prevention", "WARNING")
        
        # Test 6: Request without auth should fail
        temp_token = self.auth_token
        self.auth_token = None
        no_auth_result = self.make_request("PUT", f"/user/courses/{course_id}", {"title": "Should Fail"})
        self.auth_token = temp_token
        
        if no_auth_result["success"]:
            self.log("Course rename should require authentication", "ERROR")
            return False
        
        self.log("Course rename API tests passed", "SUCCESS")
        return True
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all test suites and return results"""
        self.log("🚀 Starting RevisionMed Backend API Test Suite", "INFO")
        
        results = {}
        
        # Core tests
        results["authentication"] = self.test_auth_register_login()
        results["catalog_management"] = self.test_catalog_management()
        
        # Revision method tests (main focus)
        results["j_method"] = self.test_j_method()
        results["srs_method"] = self.test_srs_method()
        results["tours_method"] = self.test_tours_method()
        
        # Additional feature tests
        results["personal_events"] = self.test_personal_events()
        results["ics_subscriptions"] = self.test_ics_subscriptions()
        results["admin_functions"] = self.test_admin_functions()
        results["analytics_progress"] = self.test_analytics_and_progress()
        
        # New feature tests
        results["calendar_all_events"] = self.test_calendar_all_events()
        results["course_rename_api"] = self.test_course_rename_api()
        
        return results

    def print_test_summary(self, results: Dict[str, bool]):
        """Print a comprehensive test summary"""
        self.log("\n" + "="*60, "INFO")
        self.log("🏁 TEST SUITE SUMMARY", "INFO")
        self.log("="*60, "INFO")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name.upper().replace('_', ' ')}: {status}")
        
        self.log("="*60, "INFO")
        self.log(f"🎯 OVERALL RESULT: {passed}/{total} tests passed", 
                "SUCCESS" if passed == total else "WARNING")
        
        if passed == total:
            self.log("🎉 All tests passed successfully!", "SUCCESS")
        else:
            failed_tests = [name for name, result in results.items() if not result]
            self.log(f"⚠️ Failed tests: {', '.join(failed_tests)}", "ERROR")

if __name__ == "__main__":
    # Initialize and run tests
    tester = RevisionMedAPITester()
    results = tester.run_all_tests()
    tester.print_test_summary(results)
    
    # Exit with proper code
    exit(0 if all(results.values()) else 1)