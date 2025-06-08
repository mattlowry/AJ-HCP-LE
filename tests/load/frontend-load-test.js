import { chromium } from 'k6/experimental/browser';
import { check } from 'k6';

// Frontend load test configuration
export const options = {
  scenarios: {
    browser: {
      executor: 'constant-vus',
      exec: 'browserTest',
      vus: 5,
      duration: '5m',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    browser_web_vital_lcp: ['p(95)<3000'], // Largest Contentful Paint
    browser_web_vital_fid: ['p(95)<100'],  // First Input Delay
    browser_web_vital_cls: ['p(95)<0.1'],  // Cumulative Layout Shift
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export async function browserTest() {
  const browser = chromium.launch({ headless: true });
  const page = browser.newPage();

  try {
    // 1. Test Dashboard Load Performance
    await page.goto(`${BASE_URL}/`);
    
    // Wait for key elements to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    check(page, {
      'dashboard title loads': page.locator('h1').textContent().includes('Dashboard'),
    });

    // Check for performance metrics
    const navigationTiming = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
    });

    check(navigationTiming, {
      'page load time < 3s': (timing) => timing.loadEventEnd - timing.navigationStart < 3000,
      'DOM content loaded < 2s': (timing) => timing.domContentLoadedEventEnd - timing.navigationStart < 2000,
    });

    // 2. Test Customer List Page
    await page.click('[data-testid="nav-customers"]');
    await page.waitForSelector('[data-testid="customer-list"], [data-testid="empty-customers"]', { timeout: 5000 });
    
    check(page, {
      'customers page loads': page.url().includes('/customers'),
    });

    // 3. Test New Customer Form
    await page.click('button:has-text("Add Customer")');
    await page.waitForSelector('h1:has-text("Add new customer")', { timeout: 5000 });
    
    // Test form performance
    const formLoadTime = await page.evaluate(() => {
      return performance.now();
    });
    
    // Fill form fields to test input responsiveness
    await page.fill('[name="first_name"]', 'Load Test User');
    await page.fill('[name="last_name"]', 'Performance');
    await page.fill('[name="email"]', 'loadtest@example.com');
    
    const formInteractionTime = await page.evaluate(() => {
      return performance.now();
    });
    
    check({ formTime: formInteractionTime - formLoadTime }, {
      'form interaction time < 500ms': (metrics) => metrics.formTime < 500,
    });

    // 4. Test Jobs Page Performance
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForSelector('h1:has-text("Jobs")', { timeout: 5000 });
    
    // Test table rendering performance
    const jobsPageStart = await page.evaluate(() => performance.now());
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="empty-jobs"]', { timeout: 5000 });
    const jobsPageEnd = await page.evaluate(() => performance.now());
    
    check({ jobsLoadTime: jobsPageEnd - jobsPageStart }, {
      'jobs table loads < 1s': (metrics) => metrics.jobsLoadTime < 1000,
    });

    // 5. Test Create Job Form Performance
    await page.click('button:has-text("Create Job")');
    await page.waitForSelector('h1:has-text("Create New Job")', { timeout: 5000 });
    
    // Test complex form with line items
    await page.fill('[name="title"]', 'Performance Test Job');
    
    // Test line item addition performance
    const lineItemStart = await page.evaluate(() => performance.now());
    await page.click('button:has-text("Add Item")');
    await page.waitForSelector('[name="item_name"]', { timeout: 3000 });
    const lineItemEnd = await page.evaluate(() => performance.now());
    
    check({ lineItemTime: lineItemEnd - lineItemStart }, {
      'line item dialog opens < 300ms': (metrics) => metrics.lineItemTime < 300,
    });

    // 6. Test Search Performance
    await page.goto(`${BASE_URL}/customers`);
    const searchStart = await page.evaluate(() => performance.now());
    await page.fill('[data-testid="search-input"]', 'test');
    
    // Wait for search debounce and results
    await page.waitForTimeout(1000);
    const searchEnd = await page.evaluate(() => performance.now());
    
    check({ searchTime: searchEnd - searchStart }, {
      'search response < 1s': (metrics) => metrics.searchTime < 1000,
    });

    // 7. Test Mobile Performance (viewport change)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`);
    
    const mobileLoadStart = await page.evaluate(() => performance.now());
    await page.waitForSelector('h1', { timeout: 5000 });
    const mobileLoadEnd = await page.evaluate(() => performance.now());
    
    check({ mobileLoadTime: mobileLoadEnd - mobileLoadStart }, {
      'mobile load time < 2s': (metrics) => metrics.mobileLoadTime < 2000,
    });

    // 8. Test Memory Usage
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryInfo) {
      check(memoryInfo, {
        'memory usage reasonable': (info) => info.used < info.limit * 0.7, // Less than 70% of limit
        'memory not exceeding 100MB': (info) => info.used < 100 * 1024 * 1024,
      });
    }

    // 9. Test Resource Loading
    const resourceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize,
      }));
    });

    const slowResources = resourceEntries.filter(resource => resource.duration > 1000);
    
    check(slowResources, {
      'no resources taking > 1s': (resources) => resources.length === 0,
    });

    // Check for large resources
    const largeResources = resourceEntries.filter(resource => resource.transferSize > 1024 * 1024); // > 1MB
    
    check(largeResources, {
      'no resources > 1MB': (resources) => resources.length === 0,
    });

  } catch (error) {
    console.error('Browser test error:', error);
    check(false, { 'browser test completed without errors': false });
  } finally {
    page.close();
    browser.close();
  }
}

export function teardown() {
  console.log('Frontend performance test completed');
}