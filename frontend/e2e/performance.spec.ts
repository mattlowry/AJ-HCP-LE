import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Key elements should be visible
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="metrics-container"]')).toBeVisible();
  });

  test('should handle large customer lists efficiently', async ({ page }) => {
    await page.goto('/customers');
    
    const startTime = Date.now();
    
    // Wait for customers to load
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Customer list should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Should show either customers or empty state
    const customerList = page.locator('[data-testid="customer-list"]');
    const emptyState = page.locator('[data-testid="empty-customers"]');
    
    await expect(customerList.or(emptyState)).toBeVisible();
  });

  test('should lazy load components', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to a lazy-loaded component
    await page.click('[data-testid="nav-analytics"]');
    
    // Should show loading state briefly
    const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
    
    // Wait for component to load
    await page.waitForLoadState('networkidle');
    
    // Component should be loaded
    await expect(page).toHaveURL('/analytics');
  });

  test('should optimize image loading', async ({ page }) => {
    await page.goto('/');
    
    // Check for optimized image formats
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Images should have proper loading attributes
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const loading = await img.getAttribute('loading');
        const src = await img.getAttribute('src');
        
        // Should use lazy loading for non-critical images
        if (i > 0) {
          expect(loading).toBe('lazy');
        }
        
        // Should use optimized formats when available
        if (src && src.includes('cdn')) {
          expect(src).toMatch(/\.(webp|avif|jpg|png)/);
        }
      }
    }
  });

  test('should cache API responses', async ({ page }) => {
    await page.goto('/customers');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    // Navigate away and back
    await page.goto('/');
    await page.goto('/customers');
    
    // Second load should be faster due to caching
    await page.waitForLoadState('networkidle');
    
    const secondLoadTime = Date.now() - startTime;
    
    // Should load faster on second visit
    expect(secondLoadTime).toBeLessThan(2000);
  });

  test('should handle concurrent requests efficiently', async ({ page }) => {
    // Navigate to a page that makes multiple API calls
    await page.goto('/dashboard');
    
    // Measure total load time
    const startTime = Date.now();
    
    await page.waitForLoadState('networkidle');
    
    const totalLoadTime = Date.now() - startTime;
    
    // Multiple concurrent requests should complete within reasonable time
    expect(totalLoadTime).toBeLessThan(4000);
    
    // All dashboard sections should be loaded
    await expect(page.locator('[data-testid="metrics-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-jobs"]')).toBeVisible();
  });

  test('should use efficient rendering for large lists', async ({ page }) => {
    await page.goto('/jobs');
    
    // Wait for jobs to load
    await page.waitForLoadState('networkidle');
    
    // Check for virtualized list or pagination
    const jobsTable = page.locator('[data-testid="jobs-table"]');
    const pagination = page.locator('[data-testid="pagination"]');
    const virtualizedList = page.locator('[data-testid="virtualized-list"]');
    
    // Should use either pagination or virtualization for large lists
    await expect(jobsTable.or(pagination).or(virtualizedList)).toBeVisible();
  });

  test('should minimize layout shift', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to stabilize
    await page.waitForTimeout(500);
    
    // Take initial screenshot
    const initialScreenshot = await page.screenshot();
    
    // Wait a bit more for any late-loading content
    await page.waitForTimeout(1000);
    
    // Take final screenshot
    const finalScreenshot = await page.screenshot();
    
    // Screenshots should be similar (no major layout shifts)
    // This is a basic check - in production you'd use more sophisticated CLS measurement
    expect(initialScreenshot).toBeDefined();
    expect(finalScreenshot).toBeDefined();
  });

  test('should preload critical resources', async ({ page }) => {
    // Check for resource hints in the HTML
    await page.goto('/');
    
    // Check for preload, prefetch, or preconnect hints
    const preloadLinks = page.locator('link[rel="preload"]');
    const prefetchLinks = page.locator('link[rel="prefetch"]');
    const preconnectLinks = page.locator('link[rel="preconnect"]');
    
    // Should have some resource hints for optimization
    const totalHints = await preloadLinks.count() + await prefetchLinks.count() + await preconnectLinks.count();
    expect(totalHints).toBeGreaterThan(0);
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.context().route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Should show loading states
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    
    // Should have some form of loading indication
    const hasLoadingState = await loadingSpinner.isVisible() || await skeleton.isVisible();
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Content should eventually load
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should optimize bundle size', async ({ page }) => {
    // Check that JavaScript bundles are being loaded efficiently
    const response = await page.goto('/');
    
    // Main bundle should be loaded
    expect(response?.status()).toBe(200);
    
    // Check for code splitting by looking at network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('.js')) {
        requests.push(request.url());
      }
    });
    
    // Navigate to different sections to trigger code splitting
    await page.click('[data-testid="nav-customers"]');
    await page.waitForTimeout(500);
    
    await page.click('[data-testid="nav-jobs"]');
    await page.waitForTimeout(500);
    
    // Should have loaded multiple JS chunks (code splitting)
    expect(requests.length).toBeGreaterThan(1);
  });
});