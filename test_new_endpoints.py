#!/usr/bin/env python3
"""
Focused test for new calendar endpoints
"""
import sys
import os
sys.path.append('/app')

from backend_test import RevisionMedAPITester

def test_new_endpoints():
    """Test only the two new endpoints"""
    tester = RevisionMedAPITester()
    
    # First authenticate
    tester.log("🔐 Authenticating user", "INFO") 
    auth_result = tester.test_auth_register_login()
    if not auth_result:
        tester.log("Failed to authenticate - cannot proceed", "ERROR")
        return False
    
    results = {}
    
    # Test the two new endpoints
    tester.log("🧪 Testing new Calendar endpoints", "TEST")
    results["calendar_all_events"] = tester.test_calendar_all_events()
    results["course_rename_api"] = tester.test_course_rename_api()
    
    # Print results
    tester.print_test_summary(results)
    
    return all(results.values())

if __name__ == "__main__":
    success = test_new_endpoints()
    exit(0 if success else 1)