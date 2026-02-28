#!/usr/bin/env python3
"""
MyStudyPlanner Backend API Test Script
Tests specific functionality: Course Notes CRUD, Personal Course Deletion, Hidden Items
"""

import requests
import json
import sys
import uuid
from datetime import datetime

class BackendTester:
    def __init__(self):
        self.base_url = "https://revision-med.preview.emergentagent.com/api"
        self.access_token = None
        self.user_id = None
        self.test_results = []
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def log_result(self, test_name, success, details=""):
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        self.log(f"{status}: {test_name} - {details}")

    def login(self, email="demo@test.com", password="demo123"):
        """Login to get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("User Login", True, f"Successfully logged in as {email}")
                return True
            else:
                self.log_result("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.access_token}"}

    def create_test_course(self):
        """Create a test personal course for notes testing"""
        try:
            course_data = {
                "title": f"Test Course for Notes {uuid.uuid4().hex[:8]}",
                "description": "Test course for testing notes functionality"
            }
            
            response = requests.post(
                f"{self.base_url}/user/courses",
                json=course_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                course = response.json()
                course_id = course["id"]
                self.log_result("Create Test Course", True, f"Created course with ID: {course_id}")
                return course_id
            else:
                self.log_result("Create Test Course", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("Create Test Course", False, f"Exception: {str(e)}")
            return None

    def test_course_notes_crud(self, course_id):
        """Test full CRUD operations for course notes"""
        note_id = None
        
        # Test 1: Create a note (POST)
        try:
            note_data = {
                "content": "This is my first note about this course. Very important concepts to remember!"
            }
            
            response = requests.post(
                f"{self.base_url}/courses/{course_id}/notes",
                json=note_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                note = response.json()
                note_id = note["id"]
                self.log_result("Create Course Note", True, f"Created note with ID: {note_id}")
            else:
                self.log_result("Create Course Note", False, f"Status: {response.status_code}, Response: {response.text}")
                return
                
        except Exception as e:
            self.log_result("Create Course Note", False, f"Exception: {str(e)}")
            return

        # Test 2: Get notes for course (GET)
        try:
            response = requests.get(
                f"{self.base_url}/courses/{course_id}/notes",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                notes = response.json()
                if len(notes) > 0 and notes[0]["id"] == note_id:
                    self.log_result("Get Course Notes", True, f"Retrieved {len(notes)} notes")
                else:
                    self.log_result("Get Course Notes", False, f"Expected note not found. Got: {notes}")
            else:
                self.log_result("Get Course Notes", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get Course Notes", False, f"Exception: {str(e)}")

        # Test 3: Update note (PUT)
        try:
            updated_note_data = {
                "content": "This is my UPDATED note about this course. Added more important details and corrections!"
            }
            
            response = requests.put(
                f"{self.base_url}/courses/{course_id}/notes/{note_id}",
                json=updated_note_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                updated_note = response.json()
                if "UPDATED" in updated_note["content"]:
                    self.log_result("Update Course Note", True, f"Updated note content successfully")
                else:
                    self.log_result("Update Course Note", False, f"Note content not updated correctly: {updated_note}")
            else:
                self.log_result("Update Course Note", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Update Course Note", False, f"Exception: {str(e)}")

        # Test 4: Delete note (DELETE)
        try:
            response = requests.delete(
                f"{self.base_url}/courses/{course_id}/notes/{note_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                self.log_result("Delete Course Note", True, f"Successfully deleted note")
                
                # Verify note is gone
                verify_response = requests.get(
                    f"{self.base_url}/courses/{course_id}/notes",
                    headers=self.get_headers(),
                    timeout=30
                )
                
                if verify_response.status_code == 200:
                    remaining_notes = verify_response.json()
                    if len(remaining_notes) == 0:
                        self.log_result("Verify Note Deletion", True, "Note successfully removed from list")
                    else:
                        self.log_result("Verify Note Deletion", False, f"Note still exists: {remaining_notes}")
                        
            else:
                self.log_result("Delete Course Note", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Delete Course Note", False, f"Exception: {str(e)}")

    def test_personal_course_deletion(self, course_id):
        """Test personal course deletion"""
        try:
            response = requests.delete(
                f"{self.base_url}/user/courses/{course_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                self.log_result("Delete Personal Course", True, f"Successfully deleted course: {course_id}")
                
                # Verify course is gone from catalog
                verify_response = requests.get(
                    f"{self.base_url}/catalog/{course_id}",
                    headers=self.get_headers(),
                    timeout=30
                )
                
                if verify_response.status_code == 404:
                    self.log_result("Verify Course Deletion", True, "Course successfully removed from catalog")
                else:
                    self.log_result("Verify Course Deletion", False, f"Course still exists with status: {verify_response.status_code}")
                    
            else:
                self.log_result("Delete Personal Course", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Delete Personal Course", False, f"Exception: {str(e)}")

    def test_hidden_items_endpoint(self):
        """Test GET /api/user/hidden endpoint with item details"""
        try:
            response = requests.get(
                f"{self.base_url}/user/hidden",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                hidden_items = response.json()
                self.log_result("Get Hidden Items", True, f"Retrieved {len(hidden_items)} hidden items")
                
                # Check if response includes required fields (title, level)
                if len(hidden_items) > 0:
                    item = hidden_items[0]
                    required_fields = ["id", "title", "level"]
                    has_all_fields = all(field in item for field in required_fields)
                    
                    if has_all_fields:
                        self.log_result("Hidden Items Structure", True, f"Response includes required fields: {required_fields}")
                    else:
                        self.log_result("Hidden Items Structure", False, f"Missing fields in response: {item}")
                else:
                    self.log_result("Hidden Items Structure", True, "No hidden items to check structure (empty list is valid)")
                    
            else:
                self.log_result("Get Hidden Items", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Get Hidden Items", False, f"Exception: {str(e)}")

    def test_authentication_requirements(self):
        """Test that endpoints require authentication"""
        test_endpoints = [
            ("GET", f"{self.base_url}/user/hidden"),
            ("GET", f"{self.base_url}/courses/test_id/notes"),
            ("DELETE", f"{self.base_url}/user/courses/test_id")
        ]
        
        for method, url in test_endpoints:
            try:
                if method == "GET":
                    response = requests.get(url, timeout=30)
                elif method == "DELETE":
                    response = requests.delete(url, timeout=30)
                    
                if response.status_code == 401:
                    self.log_result(f"Auth Required - {method} {url.split('/')[-2:]}", True, "Correctly rejected unauthenticated request")
                else:
                    self.log_result(f"Auth Required - {method} {url.split('/')[-2:]}", False, f"Expected 401, got {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Auth Required - {method} {url.split('/')[-2:]}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("=== MyStudyPlanner Backend Notes Functionality Test ===")
        
        # Test 1: Login
        if not self.login():
            self.log("CRITICAL: Cannot proceed without login", "ERROR")
            return False
            
        # Test 2: Authentication requirements
        self.test_authentication_requirements()
        
        # Test 3: Hidden items endpoint
        self.test_hidden_items_endpoint()
        
        # Test 4: Create test course for notes testing
        course_id = self.create_test_course()
        if not course_id:
            self.log("ERROR: Cannot test notes without a course", "ERROR")
        else:
            # Test 5: Course notes CRUD operations
            self.test_course_notes_crud(course_id)
            
            # Test 6: Personal course deletion
            self.test_personal_course_deletion(course_id)
        
        return True

    def print_summary(self):
        """Print test summary"""
        self.log("\n=== TEST SUMMARY ===")
        
        passed = sum(1 for r in self.test_results if r["success"])
        failed = len(self.test_results) - passed
        
        self.log(f"Total Tests: {len(self.test_results)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        if failed > 0:
            self.log("\n=== FAILED TESTS ===")
            for result in self.test_results:
                if not result["success"]:
                    self.log(f"❌ {result['test']}: {result['details']}")
        
        return failed == 0

def main():
    tester = BackendTester()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All tests passed! Backend notes functionality is working correctly.")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed. Check the details above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()