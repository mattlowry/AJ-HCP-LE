import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Authentication token (would be set in CI/CD environment)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  },
};

export default function () {
  // Test API endpoints with realistic load patterns
  
  // 1. Dashboard data load (most common request)
  let response = http.get(`${BASE_URL}/api/analytics/dashboard/`, params);
  check(response, {
    'dashboard loads successfully': (r) => r.status === 200,
    'dashboard response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Customer list (common request)
  response = http.get(`${BASE_URL}/api/customers/`, params);
  check(response, {
    'customers list loads': (r) => r.status === 200,
    'customers response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 3. Jobs list (common request)
  response = http.get(`${BASE_URL}/api/jobs/`, params);
  check(response, {
    'jobs list loads': (r) => r.status === 200,
    'jobs response time < 1.5s': (r) => r.timings.duration < 1500,
  }) || errorRate.add(1);

  sleep(1);

  // 4. Create customer (less frequent but important)
  if (Math.random() < 0.2) { // 20% of users create customers
    const customerData = {
      first_name: `Test${Math.floor(Math.random() * 1000)}`,
      last_name: 'User',
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      phone: '555-123-4567',
      customer_type: 'residential',
      street_address: '123 Test St',
      city: 'Test City',
      state: 'NY',
      zip_code: '12345',
      preferred_contact_method: 'email',
    };

    response = http.post(`${BASE_URL}/api/customers/`, JSON.stringify(customerData), params);
    check(response, {
      'customer creation succeeds': (r) => r.status === 201,
      'customer creation time < 2s': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  }

  sleep(1);

  // 5. Create job (less frequent but critical)
  if (Math.random() < 0.15) { // 15% of users create jobs
    const jobData = {
      title: `Load Test Job ${Math.floor(Math.random() * 1000)}`,
      description: 'Load testing job creation',
      customer: 1, // Assuming customer with ID 1 exists
      property: 1, // Assuming property with ID 1 exists
      service_type: 'Electrical Repair',
      status: 'pending',
      priority: 'medium',
      estimated_duration: 2,
      estimated_cost: 150.00,
    };

    response = http.post(`${BASE_URL}/api/jobs/`, JSON.stringify(jobData), params);
    check(response, {
      'job creation succeeds': (r) => r.status === 201,
      'job creation time < 2s': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);
  }

  sleep(1);

  // 6. Inventory check (moderate frequency)
  if (Math.random() < 0.3) { // 30% of users check inventory
    response = http.get(`${BASE_URL}/api/inventory/items/`, params);
    check(response, {
      'inventory loads': (r) => r.status === 200,
      'inventory response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  }

  sleep(1);

  // 7. Search functionality (occasional use)
  if (Math.random() < 0.1) { // 10% of users perform searches
    response = http.get(`${BASE_URL}/api/customers/?search=test`, params);
    check(response, {
      'search works': (r) => r.status === 200,
      'search response time < 1.5s': (r) => r.timings.duration < 1500,
    }) || errorRate.add(1);
  }

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

export function teardown() {
  // Cleanup any test data if needed
  console.log('Load test completed');
}