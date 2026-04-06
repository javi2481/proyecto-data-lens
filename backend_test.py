#!/usr/bin/env python3
import requests
import sys
import json
import time
from datetime import datetime

class DataLensAPITester:
    def __init__(self, base_url="https://data-inspector-18.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart
                    test_headers.pop('Content-Type', None)
                    response = requests.post(url, files=files, headers=test_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_session(self):
        """Create test user and session in MongoDB"""
        print("\n🔧 Creating test user and session...")
        
        import subprocess
        timestamp = int(time.time())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongo_script = f"""
use('test_database');
var userId = '{user_id}';
var sessionToken = '{session_token}';
db.users.insertOne({{
  user_id: userId,
  email: 'test.user.{timestamp}@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  plan: 'pro',
  reports_this_month: 0,
  month_reset: new Date().toISOString().slice(0, 7),
  created_at: new Date().toISOString()
}});
db.user_sessions.insertOne({{
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
}});
print('Session created successfully');
"""
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                print(f"✅ Test session created")
                print(f"   User ID: {user_id}")
                print(f"   Session Token: {session_token}")
                return True
            else:
                print(f"❌ MongoDB error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to create test session: {e}")
            return False

    def test_basic_endpoints(self):
        """Test basic public endpoints"""
        print("\n📡 Testing Basic Endpoints")
        
        # Test root endpoint
        self.run_test("Root API", "GET", "", 200)
        
        # Test plans endpoint
        success, plans_data = self.run_test("Plans API", "GET", "plans", 200)
        if success and isinstance(plans_data, dict):
            expected_plans = ['free', 'pro', 'team']
            found_plans = list(plans_data.keys())
            if all(plan in found_plans for plan in expected_plans):
                print("   ✅ All expected plans found")
            else:
                print(f"   ⚠️  Expected plans {expected_plans}, found {found_plans}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Auth Endpoints")
        
        if not self.session_token:
            print("❌ No session token available, skipping auth tests")
            return False
            
        # Test /auth/me
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success and isinstance(user_data, dict):
            if 'user_id' in user_data and 'email' in user_data:
                print("   ✅ User data structure correct")
            else:
                print("   ⚠️  Missing expected user fields")
        
        return success

    def test_file_upload_flow(self):
        """Test file upload and analysis flow"""
        print("\n📁 Testing File Upload Flow")
        
        if not self.session_token:
            print("❌ No session token available, skipping upload tests")
            return False
        
        # Create test CSV content
        csv_content = """name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago
Alice,28,Miami
"""
        
        # Test file upload
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        success, upload_response = self.run_test(
            "File Upload", 
            "POST", 
            "upload", 
            200, 
            files=files
        )
        
        if not success or not isinstance(upload_response, dict):
            return False
            
        report_id = upload_response.get('report_id')
        if not report_id:
            print("   ❌ No report_id in upload response")
            return False
            
        print(f"   📊 Report ID: {report_id}")
        
        # Test analysis
        success, analysis_response = self.run_test(
            "Analyze Report",
            "POST",
            f"reports/{report_id}/analyze",
            200
        )
        
        if success and isinstance(analysis_response, dict):
            profile_data = analysis_response.get('profile_data', {})
            if 'overview' in profile_data and 'variables' in profile_data:
                print("   ✅ Analysis completed with expected structure")
                
                # Check overview data
                overview = profile_data['overview']
                expected_fields = ['n_rows', 'n_columns', 'n_missing', 'missing_percent']
                if all(field in overview for field in expected_fields):
                    print(f"   📈 Rows: {overview['n_rows']}, Columns: {overview['n_columns']}")
                else:
                    print("   ⚠️  Missing expected overview fields")
                    
                # Check variables
                variables = profile_data['variables']
                if len(variables) > 0:
                    print(f"   📊 Variables analyzed: {list(variables.keys())}")
                else:
                    print("   ⚠️  No variables found in analysis")
                    
                # Check alerts
                alerts = profile_data.get('alerts', [])
                print(f"   🚨 Quality alerts: {len(alerts)}")
                
            else:
                print("   ⚠️  Missing expected analysis structure")
        
        # Test get report
        self.run_test("Get Report", "GET", f"reports/{report_id}", 200)
        
        # Test list reports
        self.run_test("List Reports", "GET", "reports", 200)
        
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.user_id:
            print(f"\n🧹 Cleaning up test data for user: {self.user_id}")
            
            import subprocess
            cleanup_script = f"""
use('test_database');
db.reports.deleteMany({{"user_id": "{self.user_id}"}});
db.user_sessions.deleteMany({{"user_id": "{self.user_id}"}});
db.users.deleteMany({{"user_id": "{self.user_id}"}});
print('Cleanup completed');
"""
            
            try:
                subprocess.run(['mongosh', '--eval', cleanup_script], timeout=10)
                print("✅ Test data cleaned up")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {e}")

def main():
    print("🚀 DataLens API Testing Suite")
    print("=" * 50)
    
    tester = DataLensAPITester()
    
    try:
        # Test basic endpoints first
        tester.test_basic_endpoints()
        
        # Create test session for authenticated endpoints
        if tester.create_test_session():
            # Test authenticated endpoints
            tester.test_auth_endpoints()
            tester.test_file_upload_flow()
        else:
            print("⚠️  Skipping authenticated tests due to session creation failure")
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return_code = 0
        else:
            print("❌ Some tests failed")
            return_code = 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return_code = 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return_code = 1
    finally:
        # Cleanup
        tester.cleanup_test_data()
    
    return return_code

if __name__ == "__main__":
    sys.exit(main())