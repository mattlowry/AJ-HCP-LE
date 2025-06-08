import { test, expect } from '@playwright/test';

test.describe('Job Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to jobs page', async ({ page }) => {
    await page.click('[data-testid="nav-jobs"]');
    await expect(page).toHaveURL('/jobs');
    await expect(page.locator('h1')).toContainText('Jobs');
  });

  test('should display jobs list with stats', async ({ page }) => {
    await page.goto('/jobs');
    
    // Wait for jobs to load
    await page.waitForLoadState('networkidle');
    
    // Should show stats cards
    await expect(page.locator('[data-testid="stats-total-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-pending"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-completed"]')).toBeVisible();
  });

  test('should create a new job', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Fill out job form - Customer & Property section
    await page.click('[data-testid="customer-select"]');
    await page.fill('[data-testid="customer-search"]', 'John Doe');
    await page.click('[data-testid="customer-option"]:first-child');
    
    await page.fill('[name="property_address"]', '456 Oak Ave, New York, NY 10002');
    
    // Job Details section
    await page.fill('[name="title"]', 'Kitchen Outlet Repair');
    await page.click('[data-testid="service-type-select"]');
    await page.click('[data-value="Electrical Repair"]');
    await page.fill('[name="description"]', 'Replace faulty kitchen outlet');
    
    // Scheduling section
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await page.fill('[name="scheduled_date"]', dateString);
    await page.fill('[name="scheduled_time"]', '09:00');
    await page.fill('[name="estimated_duration"]', '2');
    
    // Add line item
    await page.click('button:has-text("Add Item")');
    await page.fill('[name="item_name"]', 'GFCI Outlet');
    await page.fill('[name="quantity"]', '2');
    await page.fill('[name="unit_price"]', '25.00');
    await page.click('button:has-text("Add Item")', { timeout: 5000 });
    
    // Save job
    await page.click('button:has-text("Create Job")');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should validate required job fields', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Try to save without filling required fields
    await page.click('button:has-text("Create Job")');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="error-customer"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-service-type"]')).toBeVisible();
  });

  test('should manage line items', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Add first line item
    await page.click('button:has-text("Add Item")');
    await page.fill('[name="item_name"]', 'Wire Nut');
    await page.fill('[name="quantity"]', '10');
    await page.fill('[name="unit_price"]', '0.50');
    await page.click('button:has-text("Add Item")');
    
    // Verify line item appears in table
    await expect(page.locator('[data-testid="line-item-row"]')).toContainText('Wire Nut');
    await expect(page.locator('[data-testid="line-item-total"]')).toContainText('$5.00');
    
    // Add second line item
    await page.click('button:has-text("Add Item")');
    await page.fill('[name="item_name"]', 'Outlet');
    await page.fill('[name="quantity"]', '1');
    await page.fill('[name="unit_price"]', '15.00');
    await page.click('button:has-text("Add Item")');
    
    // Verify pricing calculations
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('$20.00');
    
    // Edit line item
    await page.click('[data-testid="edit-line-item"]:first-child');
    await page.fill('[name="quantity"]', '20');
    await page.click('button:has-text("Update Item")');
    
    // Verify updated total
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('$25.00');
    
    // Delete line item
    await page.click('[data-testid="delete-line-item"]:first-child');
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('$15.00');
  });

  test('should filter jobs by status', async ({ page }) => {
    await page.goto('/jobs');
    
    // Wait for jobs to load
    await page.waitForLoadState('networkidle');
    
    // Filter by in progress status
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-value="in_progress"]');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Verify filter is applied
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await expect(statusFilter).toHaveValue('in_progress');
  });

  test('should search jobs', async ({ page }) => {
    await page.goto('/jobs');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Search for a job
    await page.fill('[data-testid="search-jobs"]', 'Kitchen');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Results should be filtered
    const searchResults = page.locator('[data-testid="job-row"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first()).toContainText('Kitchen');
    }
  });

  test('should calculate pricing with tax and discount', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Add line item
    await page.click('button:has-text("Add Item")');
    await page.fill('[name="item_name"]', 'Test Item');
    await page.fill('[name="quantity"]', '1');
    await page.fill('[name="unit_price"]', '100.00');
    await page.click('button:has-text("Add Item")');
    
    // Verify subtotal
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('$100.00');
    
    // Add discount
    await page.fill('[name="discount_amount"]', '10.00');
    
    // Tax should be calculated on discounted amount
    // 8.25% tax on $90 = $7.43
    await expect(page.locator('[data-testid="tax-amount"]')).toContainText('$7.43');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$97.43');
    
    // Change tax rate
    await page.fill('[name="tax_rate"]', '10');
    
    // New tax: 10% of $90 = $9.00
    await expect(page.locator('[data-testid="tax-amount"]')).toContainText('$9.00');
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$99.00');
  });

  test('should handle job form cancellation', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Fill some fields
    await page.fill('[name="title"]', 'Test Job');
    
    // Cancel the form
    await page.click('button:has-text("Cancel")');
    
    // Should navigate back to jobs list
    await expect(page).toHaveURL('/jobs');
  });
});