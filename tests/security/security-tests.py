#!/usr/bin/env python3
"""
Security testing suite for AJ Long Electric FSM
"""

import requests
import json
import time
import sys
from urllib.parse import urljoin


class SecurityTester:
    """Security testing class for API endpoints"""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
    
    def log_result(self, test_name, passed, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": time.time()
        }
        self.results.append(result)
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {test_name}: {details}")
    
    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        test_name = "SQL Injection Protection"
        
        # Common SQL injection payloads
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' AND 1=1 --",
            "admin'--",
            "' OR 1=1#"
        ]
        
        vulnerable = False
        
        for payload in payloads:
            # Test login endpoint
            response = self.session.post(
                urljoin(self.base_url, "/api/auth/login/"),
                json={"email": payload, "password": "test"},
                headers={"Content-Type": "application/json"}
            )
            
            # Check for signs of SQL injection success
            if response.status_code == 200 or "error" not in response.text.lower():
                vulnerable = True
                break
        
        self.log_result(
            test_name, 
            not vulnerable, 
            "No SQL injection vulnerabilities detected" if not vulnerable else "Potential SQL injection vulnerability found"
        )
    
    def test_xss_protection(self):
        """Test for Cross-Site Scripting (XSS) vulnerabilities"""
        test_name = "XSS Protection"
        
        # XSS payloads
        payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "');alert('XSS');//"
        ]
        
        vulnerable = False
        
        for payload in payloads:
            # Test customer creation endpoint
            response = self.session.post(
                urljoin(self.base_url, "/api/customers/"),
                json={
                    "first_name": payload,
                    "last_name": "Test",
                    "email": "test@example.com",
                    "phone": "555-123-4567",
                    "customer_type": "residential",
                    "street_address": "123 Test St",
                    "city": "Test City",
                    "state": "NY",
                    "zip_code": "12345"
                },
                headers={"Content-Type": "application/json"}
            )
            
            # Check if payload is reflected without encoding
            if payload in response.text and "<script>" in response.text:
                vulnerable = True
                break
        
        self.log_result(
            test_name,
            not vulnerable,
            "XSS protection working" if not vulnerable else "Potential XSS vulnerability found"
        )
    
    def test_csrf_protection(self):
        """Test for CSRF protection"""
        test_name = "CSRF Protection"
        
        # Try to make a state-changing request without CSRF token
        response = self.session.post(
            urljoin(self.base_url, "/api/customers/"),
            json={
                "first_name": "CSRF",
                "last_name": "Test",
                "email": "csrf@example.com",
                "phone": "555-123-4567",
                "customer_type": "residential",
                "street_address": "123 Test St",
                "city": "Test City",
                "state": "NY",
                "zip_code": "12345"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Should be rejected due to missing CSRF token or authentication
        csrf_protected = response.status_code in [401, 403, 422]
        
        self.log_result(
            test_name,
            csrf_protected,
            "CSRF protection active" if csrf_protected else "CSRF protection may be missing"
        )
    
    def test_authentication_bypass(self):
        """Test for authentication bypass vulnerabilities"""
        test_name = "Authentication Bypass Protection"
        
        # Try to access protected endpoints without authentication
        protected_endpoints = [
            "/api/customers/",
            "/api/jobs/",
            "/api/inventory/items/",
            "/api/analytics/dashboard/"
        ]
        
        bypassed = False
        
        for endpoint in protected_endpoints:
            response = self.session.get(urljoin(self.base_url, endpoint))
            
            # Should return 401 or 403 for unauthenticated requests
            if response.status_code == 200:
                bypassed = True
                break
        
        self.log_result(
            test_name,
            not bypassed,
            "Authentication properly enforced" if not bypassed else "Authentication bypass detected"
        )
    
    def test_rate_limiting(self):
        """Test for rate limiting protection"""
        test_name = "Rate Limiting"
        
        # Make rapid requests to test rate limiting
        rapid_requests = 0
        successful_requests = 0
        
        for i in range(20):  # Try 20 rapid requests
            response = self.session.get(urljoin(self.base_url, "/api/customers/"))
            rapid_requests += 1
            
            if response.status_code == 200:
                successful_requests += 1
            elif response.status_code == 429:  # Rate limited
                break
            
            time.sleep(0.1)  # Small delay
        
        # Rate limiting should kick in before all 20 requests succeed
        rate_limited = successful_requests < rapid_requests or successful_requests < 15
        
        self.log_result(
            test_name,
            rate_limited,
            f"Rate limiting detected after {successful_requests} requests" if rate_limited 
            else "No rate limiting detected"
        )
    
    def test_directory_traversal(self):
        """Test for directory traversal vulnerabilities"""
        test_name = "Directory Traversal Protection"
        
        # Directory traversal payloads
        payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//....//etc/passwd"
        ]
        
        vulnerable = False
        
        for payload in payloads:
            # Test file serving endpoints if any
            response = self.session.get(
                urljoin(self.base_url, f"/static/{payload}")
            )
            
            # Check for system file content
            if "root:" in response.text or "administrator" in response.text.lower():
                vulnerable = True
                break
        
        self.log_result(
            test_name,
            not vulnerable,
            "Directory traversal protection working" if not vulnerable 
            else "Potential directory traversal vulnerability"
        )
    
    def test_security_headers(self):
        """Test for important security headers"""
        test_name = "Security Headers"
        
        response = self.session.get(self.base_url)
        headers = response.headers
        
        required_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': None,  # Should exist
            'Content-Security-Policy': None,    # Should exist
        }
        
        missing_headers = []
        
        for header, expected_value in required_headers.items():
            if header not in headers:
                missing_headers.append(header)
            elif expected_value and isinstance(expected_value, list):
                if headers[header] not in expected_value:
                    missing_headers.append(f"{header} (incorrect value)")
            elif expected_value and headers[header] != expected_value:
                missing_headers.append(f"{header} (incorrect value)")
        
        headers_ok = len(missing_headers) == 0
        
        self.log_result(
            test_name,
            headers_ok,
            "All security headers present" if headers_ok 
            else f"Missing headers: {', '.join(missing_headers)}"
        )
    
    def test_sensitive_data_exposure(self):
        """Test for sensitive data exposure"""
        test_name = "Sensitive Data Exposure"
        
        # Test error pages for information disclosure
        response = self.session.get(urljoin(self.base_url, "/nonexistent-endpoint"))
        
        # Check for sensitive information in error responses
        sensitive_patterns = [
            "traceback",
            "django",
            "secret_key",
            "password",
            "database",
            "internal server error",
            "debug"
        ]
        
        exposed = False
        for pattern in sensitive_patterns:
            if pattern.lower() in response.text.lower():
                exposed = True
                break
        
        self.log_result(
            test_name,
            not exposed,
            "No sensitive data exposure detected" if not exposed 
            else "Potential sensitive data exposure in error responses"
        )
    
    def run_all_tests(self):
        """Run all security tests"""
        print("Starting security tests...")
        print("=" * 50)
        
        self.test_sql_injection()
        self.test_xss_protection()
        self.test_csrf_protection()
        self.test_authentication_bypass()
        self.test_rate_limiting()
        self.test_directory_traversal()
        self.test_security_headers()
        self.test_sensitive_data_exposure()
        
        print("=" * 50)
        
        # Summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["passed"])
        failed_tests = total_tests - passed_tests
        
        print(f"Security Test Summary:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFailed Tests:")
            for result in self.results:
                if not result["passed"]:
                    print(f"- {result['test']}: {result['details']}")
        
        # Return exit code
        return 0 if failed_tests == 0 else 1


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Security testing suite")
    parser.add_argument(
        "--base-url", 
        default="http://localhost:8000",
        help="Base URL of the application to test"
    )
    parser.add_argument(
        "--output",
        help="Output file for results (JSON format)"
    )
    
    args = parser.parse_args()
    
    tester = SecurityTester(args.base_url)
    exit_code = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(tester.results, f, indent=2)
        print(f"\nResults saved to {args.output}")
    
    sys.exit(exit_code)