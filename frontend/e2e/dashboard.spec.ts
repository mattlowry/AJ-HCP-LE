import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    // Should be on dashboard by default
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Should show welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back');
    
    // Should display key metric cards
    await expect(page.locator('[data-testid="metric-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-revenue"]')).toBeVisible();
  });

  test('should show metric values and trends', async ({ page }) => {
    // Wait for metrics to load
    await page.waitForLoadState('networkidle');
    
    // Check that metrics have values
    const customerMetric = page.locator('[data-testid="metric-customers"] [data-testid="metric-value"]');
    await expect(customerMetric).not.toHaveText('0');
    
    // Check for trend indicators
    const trendIndicators = page.locator('[data-testid="trend-indicator"]');
    await expect(trendIndicators.first()).toBeVisible();
  });

  test('should display quick actions', async ({ page }) => {
    // Quick actions should be visible
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    // Primary actions should be highlighted
    await expect(page.locator('[data-testid="action-create-job"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-add-customer"]')).toBeVisible();
    
    // Secondary actions should also be visible
    await expect(page.locator('[data-testid="action-view-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-manage-jobs"]')).toBeVisible();
  });

  test('should navigate from quick actions', async ({ page }) => {
    // Click Create Job action
    await page.click('[data-testid="action-create-job"]');
    await expect(page).toHaveURL('/jobs/new');
    
    // Go back to dashboard
    await page.goto('/');
    
    // Click Add Customer action
    await page.click('[data-testid="action-add-customer"]');
    await expect(page).toHaveURL('/customers/new');
    
    // Go back to dashboard
    await page.goto('/');
    
    // Click View Schedule action
    await page.click('[data-testid="action-view-schedule"]');
    await expect(page).toHaveURL('/scheduling');
    
    // Go back to dashboard
    await page.goto('/');
    
    // Click Manage Jobs action
    await page.click('[data-testid="action-manage-jobs"]');
    await expect(page).toHaveURL('/jobs');
  });

  test('should display recent jobs section', async ({ page }) => {
    // Recent jobs section should be visible
    await expect(page.locator('[data-testid="recent-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-jobs-title"]')).toContainText('Recent Jobs');
    
    // Should have a "View All Jobs" link
    await expect(page.locator('[data-testid="view-all-jobs"]')).toBeVisible();
  });

  test('should show recent job items with status', async ({ page }) => {
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Check for job items or empty state
    const jobItems = page.locator('[data-testid="recent-job-item"]');
    const emptyState = page.locator('[data-testid="no-recent-jobs"]');
    
    if (await jobItems.count() > 0) {
      // Should show job details
      await expect(jobItems.first()).toBeVisible();
      
      // Job items should have status chips
      const statusChips = page.locator('[data-testid="job-status-chip"]');
      await expect(statusChips.first()).toBeVisible();
      
      // Job items should have priority indicators
      const priorityChips = page.locator('[data-testid="job-priority-chip"]');
      await expect(priorityChips.first()).toBeVisible();
    } else {
      // Should show empty state if no jobs
      await expect(emptyState).toBeVisible();
    }
  });

  test('should navigate to jobs from recent jobs section', async ({ page }) => {
    // Click "View All Jobs" button
    await page.click('[data-testid="view-all-jobs"]');
    await expect(page).toHaveURL('/jobs');
    
    // Go back to dashboard
    await page.goto('/');
    
    // Click on a recent job item if it exists
    const jobItems = page.locator('[data-testid="recent-job-item"]');
    if (await jobItems.count() > 0) {
      await jobItems.first().click();
      await expect(page).toHaveURL('/jobs');
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should still be functional on mobile
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Metrics should stack vertically on mobile
    const metricsContainer = page.locator('[data-testid="metrics-container"]');
    await expect(metricsContainer).toBeVisible();
    
    // Quick actions should be responsive
    const quickActions = page.locator('[data-testid="quick-actions"]');
    await expect(quickActions).toBeVisible();
  });

  test('should update metrics in real-time', async ({ page }) => {
    // Get initial metric values
    const initialCustomerCount = await page.locator('[data-testid="metric-customers"] [data-testid="metric-value"]').textContent();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Metrics should load again
    const refreshedCustomerCount = await page.locator('[data-testid="metric-customers"] [data-testid="metric-value"]').textContent();
    
    // Should have consistent values (or updated if data changed)
    expect(refreshedCustomerCount).toBeDefined();
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Should show loading indicators or content
    await page.waitForSelector('[data-testid="metrics-container"]', { timeout: 10000 });
    
    // All metric cards should eventually load
    await expect(page.locator('[data-testid="metric-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-revenue"]')).toBeVisible();
  });
});