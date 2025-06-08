import { test, expect } from '@playwright/test';

test.describe('Customer Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to customers page', async ({ page }) => {
    await page.click('[data-testid="nav-customers"]');
    await expect(page).toHaveURL('/customers');
    await expect(page.locator('h1')).toContainText('Customers');
  });

  test('should display customer list', async ({ page }) => {
    await page.goto('/customers');
    
    // Wait for customers to load
    await page.waitForSelector('[data-testid="customer-list"]', { timeout: 10000 });
    
    // Should show customer cards or empty state
    const customerCards = page.locator('[data-testid="customer-card"]');
    const emptyState = page.locator('[data-testid="empty-customers"]');
    
    await expect(customerCards.first().or(emptyState)).toBeVisible();
  });

  test('should create a new customer', async ({ page }) => {
    await page.goto('/customers/new');
    
    // Fill out customer form
    await page.fill('[name="first_name"]', 'John');
    await page.fill('[name="last_name"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="mobile_phone"]', '555-123-4567');
    await page.fill('[name="street"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="zip"]', '10001');
    
    // Select state
    await page.click('[data-testid="state-select"]');
    await page.click('[data-value="NY"]');
    
    // Save customer
    await page.click('button:has-text("Save")');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/customers/new');
    
    // Try to save without filling required fields
    await page.click('button:has-text("Save")');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="error-first-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-last-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
  });

  test('should search customers', async ({ page }) => {
    await page.goto('/customers');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Search for a customer
    await page.fill('[data-testid="search-input"]', 'John');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Results should be filtered
    const searchResults = page.locator('[data-testid="customer-card"]');
    if (await searchResults.count() > 0) {
      await expect(searchResults.first()).toContainText('John');
    }
  });

  test('should filter customers by type', async ({ page }) => {
    await page.goto('/customers');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Filter by commercial customers
    await page.click('[data-testid="customer-type-filter"]');
    await page.click('[data-value="commercial"]');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Check that commercial filter is applied
    const filterSelect = page.locator('[data-testid="customer-type-filter"]');
    await expect(filterSelect).toHaveValue('commercial');
  });

  test('should navigate to customer detail', async ({ page }) => {
    await page.goto('/customers');
    
    // Wait for customers to load
    await page.waitForSelector('[data-testid="customer-card"]', { timeout: 10000 });
    
    // Click on first customer if it exists
    const firstCustomer = page.locator('[data-testid="customer-card"]').first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();
      
      // Should navigate to customer detail page
      await expect(page).toHaveURL(/\/customers\/\d+/);
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should handle customer form cancellation', async ({ page }) => {
    await page.goto('/customers/new');
    
    // Fill some fields
    await page.fill('[name="first_name"]', 'Test');
    await page.fill('[name="last_name"]', 'User');
    
    // Cancel the form
    await page.click('button:has-text("Cancel")');
    
    // Should navigate back to customers list
    await expect(page).toHaveURL('/customers');
  });
});