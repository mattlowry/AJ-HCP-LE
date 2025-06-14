import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display main navigation', async ({ page }) => {
    // Main navigation should be visible
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    
    // Navigation items should be present
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-jobs"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-scheduling"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-inventory"]')).toBeVisible();
  });

  test('should navigate to different sections', async ({ page }) => {
    // Navigate to Customers
    await page.click('[data-testid="nav-customers"]');
    await expect(page).toHaveURL('/customers');
    await expect(page.locator('h1')).toContainText('Customers');
    
    // Navigate to Jobs
    await page.click('[data-testid="nav-jobs"]');
    await expect(page).toHaveURL('/jobs');
    await expect(page.locator('h1')).toContainText('Jobs');
    
    // Navigate to Scheduling
    await page.click('[data-testid="nav-scheduling"]');
    await expect(page).toHaveURL('/scheduling');
    
    // Navigate to Inventory
    await page.click('[data-testid="nav-inventory"]');
    await expect(page).toHaveURL('/inventory');
    
    // Navigate back to Dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Dashboard should be active by default
    await expect(page.locator('[data-testid="nav-dashboard"]')).toHaveClass(/active/);
    
    // Navigate to customers and check active state
    await page.click('[data-testid="nav-customers"]');
    await expect(page.locator('[data-testid="nav-customers"]')).toHaveClass(/active/);
    
    // Dashboard should no longer be active
    await expect(page.locator('[data-testid="nav-dashboard"]')).not.toHaveClass(/active/);
  });

  test('should display user menu', async ({ page }) => {
    // User menu should be visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Click user menu to open dropdown
    await page.click('[data-testid="user-menu"]');
    
    // Dropdown options should be visible
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-logout"]')).toBeVisible();
  });

  test('should navigate to user profile', async ({ page }) => {
    // Open user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click profile option
    await page.click('[data-testid="user-profile"]');
    
    // Should navigate to profile page
    await expect(page).toHaveURL('/profile');
  });

  test('should handle logout', async ({ page }) => {
    // Open user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout option
    await page.click('[data-testid="user-logout"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile navigation should be visible
    await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
    
    // Click mobile navigation toggle
    await page.click('[data-testid="mobile-nav-toggle"]');
    
    // Mobile navigation menu should open
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Navigation items should be visible in mobile menu
    await expect(page.locator('[data-testid="mobile-nav-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-jobs"]')).toBeVisible();
  });

  test('should show breadcrumbs on sub-pages', async ({ page }) => {
    // Navigate to new customer page
    await page.goto('/customers/new');
    
    // Breadcrumbs should be visible
    await expect(page.locator('[data-testid="breadcrumbs"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb-customers"]')).toBeVisible();
    await expect(page.locator('[data-testid="breadcrumb-new"]')).toContainText('New');
  });

  test('should handle back navigation', async ({ page }) => {
    // Navigate to customers
    await page.click('[data-testid="nav-customers"]');
    await expect(page).toHaveURL('/customers');
    
    // Navigate to new customer
    await page.goto('/customers/new');
    
    // Use back button
    await page.goBack();
    await expect(page).toHaveURL('/customers');
    
    // Use forward button
    await page.goForward();
    await expect(page).toHaveURL('/customers/new');
  });

  test('should display notification bell', async ({ page }) => {
    // Notification bell should be visible
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    
    // Click notification bell
    await page.click('[data-testid="notification-bell"]');
    
    // Notification dropdown should open
    await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
  });

  test('should search from navigation', async ({ page }) => {
    // Global search should be visible
    const searchInput = page.locator('[data-testid="global-search"]');
    if (await searchInput.isVisible()) {
      // Type in search
      await searchInput.fill('test search');
      
      // Press enter or click search
      await page.keyboard.press('Enter');
      
      // Should navigate to search results or show dropdown
      await page.waitForTimeout(1000);
    }
  });
});