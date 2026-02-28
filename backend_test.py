#!/usr/bin/env python3
"""
MyStudyPlanner Backend API Test Script
Tests functionality: Account Settings (Password Change, Account Deletion), Admin User Management, Hidden Items
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

    def admin_login(self, email="admin@mystudyplanner.com", password="Admin123!"):
        """Login as admin to get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                admin_token = data["access_token"]
                admin_user_id = data["user"]["id"]
                self.log_result("Admin Login", True, f"Successfully logged in as {email}")
                return admin_token, admin_user_id
            else:
                self.log_result("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return None, None
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return None, None

    def test_account_password_change(self):
        """Test account password change functionality"""
        try:
            # Test password change
            change_data = {
                "current_password": "demo123",
                "new_password": "newdemo456"
            }
            
            response = requests.put(
                f"{self.base_url}/account/password",
                json=change_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                self.log_result("Change Password", True, "Password changed successfully")
                
                # Test login with new password
                new_login_response = requests.post(
                    f"{self.base_url}/auth/login",
                    json={"email": "demo@test.com", "password": "newdemo456"},
                    timeout=30
                )
                
                if new_login_response.status_code == 200:
                    self.log_result("Login with New Password", True, "Successfully logged in with new password")
                    
                    # Reset password back to original
                    reset_data = {
                        "current_password": "newdemo456",
                        "new_password": "demo123"
                    }
                    
                    new_token = new_login_response.json()["access_token"]
                    reset_headers = {"Authorization": f"Bearer {new_token}"}
                    
                    reset_response = requests.put(
                        f"{self.base_url}/account/password",
                        json=reset_data,
                        headers=reset_headers,
                        timeout=30
                    )
                    
                    if reset_response.status_code == 200:
                        self.log_result("Reset Password", True, "Successfully reset password to original")
                    else:
                        self.log_result("Reset Password", False, f"Failed to reset password: {reset_response.text}")
                else:
                    self.log_result("Login with New Password", False, f"Failed to login with new password: {new_login_response.text}")
            else:
                self.log_result("Change Password", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Change Password", False, f"Exception: {str(e)}")

    def test_account_password_validation(self):
        """Test password change validation"""
        try:
            # Test wrong current password
            wrong_password_data = {
                "current_password": "wrongpassword",
                "new_password": "newdemo456"
            }
            
            response = requests.put(
                f"{self.base_url}/account/password",
                json=wrong_password_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 400:
                self.log_result("Wrong Current Password Validation", True, "Correctly rejected wrong current password")
            else:
                self.log_result("Wrong Current Password Validation", False, f"Expected 400, got {response.status_code}")
                
            # Test short new password
            short_password_data = {
                "current_password": "demo123",
                "new_password": "123"
            }
            
            response = requests.put(
                f"{self.base_url}/account/password",
                json=short_password_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 400:
                self.log_result("Short Password Validation", True, "Correctly rejected short password")
            else:
                self.log_result("Short Password Validation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Password Validation", False, f"Exception: {str(e)}")

    def test_account_deletion_validation(self):
        """Test account deletion validation (without actually deleting)"""
        try:
            # Test wrong password
            wrong_password_data = {
                "password": "wrongpassword",
                "confirmation": "SUPPRIMER"
            }
            
            response = requests.delete(
                f"{self.base_url}/account",
                json=wrong_password_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 400:
                self.log_result("Account Deletion - Wrong Password", True, "Correctly rejected wrong password")
            else:
                self.log_result("Account Deletion - Wrong Password", False, f"Expected 400, got {response.status_code}")
                
            # Test wrong confirmation
            wrong_confirm_data = {
                "password": "demo123",
                "confirmation": "WRONG"
            }
            
            response = requests.delete(
                f"{self.base_url}/account",
                json=wrong_confirm_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 400:
                self.log_result("Account Deletion - Wrong Confirmation", True, "Correctly rejected wrong confirmation")
            else:
                self.log_result("Account Deletion - Wrong Confirmation", False, f"Expected 400, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Account Deletion Validation", False, f"Exception: {str(e)}")

    def test_admin_user_management(self):
        """Test admin user management functionality"""
        admin_token, admin_user_id = self.admin_login()
        if not admin_token:
            self.log_result("Admin User Management", False, "Cannot test without admin access")
            return
            
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        try:
            # Test 1: Get all users
            response = requests.get(
                f"{self.base_url}/admin/users",
                headers=admin_headers,
                timeout=30
            )
            
            if response.status_code == 200:
                users = response.json()
                self.log_result("Get All Users", True, f"Retrieved {len(users)} users")
                
                # Find a regular user for testing block/unblock
                regular_user = None
                for user in users:
                    if user["role"] != "admin":
                        regular_user = user
                        break
                
                if regular_user:
                    user_id = regular_user["id"]
                    
                    # Test 2: Block user
                    block_response = requests.post(
                        f"{self.base_url}/admin/users/{user_id}/block",
                        json={"reason": "Test block reason"},
                        headers=admin_headers,
                        timeout=30
                    )
                    
                    if block_response.status_code == 200:
                        self.log_result("Block User", True, f"Successfully blocked user {user_id}")
                        
                        # Test 3: Unblock user
                        unblock_response = requests.post(
                            f"{self.base_url}/admin/users/{user_id}/unblock",
                            headers=admin_headers,
                            timeout=30
                        )
                        
                        if unblock_response.status_code == 200:
                            self.log_result("Unblock User", True, f"Successfully unblocked user {user_id}")
                        else:
                            self.log_result("Unblock User", False, f"Status: {unblock_response.status_code}")
                    else:
                        self.log_result("Block User", False, f"Status: {block_response.status_code}")
                else:
                    self.log_result("Find Regular User", False, "No regular users found for block/unblock testing")
            else:
                self.log_result("Get All Users", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Admin User Management", False, f"Exception: {str(e)}")

    def test_hidden_items_management(self):
        """Test hidden items management"""
        try:
            # First get catalog to find an item to hide
            catalog_response = requests.get(
                f"{self.base_url}/catalog/all",
                headers=self.get_headers(),
                timeout=30
            )
            
            if catalog_response.status_code == 200:
                catalog_items = catalog_response.json()
                admin_item = None
                
                # Find an admin item (not personal)
                for item in catalog_items:
                    if not item.get("is_personal", False):
                        admin_item = item
                        break
                
                if admin_item:
                    item_id = admin_item["id"]
                    
                    # Test 1: Hide item
                    hide_response = requests.post(
                        f"{self.base_url}/user/hidden",
                        json={"item_id": item_id},
                        headers=self.get_headers(),
                        timeout=30
                    )
                    
                    if hide_response.status_code == 200:
                        self.log_result("Hide Item", True, f"Successfully hid item {item_id}")
                        
                        # Test 2: Get hidden items
                        hidden_response = requests.get(
                            f"{self.base_url}/user/hidden",
                            headers=self.get_headers(),
                            timeout=30
                        )
                        
                        if hidden_response.status_code == 200:
                            hidden_items = hidden_response.json()
                            hidden_ids = [item["id"] for item in hidden_items]
                            
                            if item_id in hidden_ids:
                                self.log_result("Get Hidden Items", True, f"Hidden item correctly appears in list")
                                
                                # Test 3: Unhide item
                                unhide_response = requests.delete(
                                    f"{self.base_url}/user/hidden/{item_id}",
                                    headers=self.get_headers(),
                                    timeout=30
                                )
                                
                                if unhide_response.status_code == 200:
                                    self.log_result("Unhide Item", True, f"Successfully unhid item {item_id}")
                                else:
                                    self.log_result("Unhide Item", False, f"Status: {unhide_response.status_code}")
                            else:
                                self.log_result("Get Hidden Items", False, f"Hidden item not found in list")
                        else:
                            self.log_result("Get Hidden Items", False, f"Status: {hidden_response.status_code}")
                    else:
                        self.log_result("Hide Item", False, f"Status: {hide_response.status_code}")
                else:
                    self.log_result("Find Admin Item", False, "No admin items found for hiding test")
            else:
                self.log_result("Get Catalog", False, f"Status: {catalog_response.status_code}")
                
        except Exception as e:
            self.log_result("Hidden Items Management", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("=== MyStudyPlanner Backend Account Settings & Admin Test ===")
        
        # Test 1: Login
        if not self.login():
            self.log("CRITICAL: Cannot proceed without login", "ERROR")
            return False
            
        # Test 2: Account Settings - Password Change
        self.test_account_password_change()
        
        # Test 3: Account Settings - Password Validation
        self.test_account_password_validation()
        
        # Test 4: Account Settings - Account Deletion Validation
        self.test_account_deletion_validation()
        
        # Test 5: Admin User Management
        self.test_admin_user_management()
        
        # Test 6: Hidden Items Management
        self.test_hidden_items_management()
        
        # Test 7: Authentication requirements
        self.test_authentication_requirements()
        
        # Test 8: Hidden items endpoint details
        self.test_hidden_items_endpoint()
        
        # Test 9: Create test course for notes testing
        course_id = self.create_test_course()
        if not course_id:
            self.log("ERROR: Cannot test notes without a course", "ERROR")
        else:
            # Test 10: Course notes CRUD operations
            self.test_course_notes_crud(course_id)
            
            # Test 11: Personal course deletion
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