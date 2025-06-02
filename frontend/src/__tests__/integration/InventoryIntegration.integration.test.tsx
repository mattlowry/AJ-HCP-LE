import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import InventoryManagement from '../../components/InventoryManagement';
import SchedulingCalendar from '../../components/SchedulingCalendar';

// Mock the API services
jest.mock('../../services/api', () => ({
  inventoryApi: {
    getItems: jest.fn(),
    getCategories: jest.fn(),
    adjustStock: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn()
  },
  jobApi: {
    getAll: jest.fn(),
    create: jest.fn()
  },
  customerApi: {
    getAll: jest.fn(),
    getProperties: jest.fn()
  }
}));

const { inventoryApi, jobApi, customerApi } = require('../../services/api');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Inventory Integration Workflow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Inventory Management Workflow', () => {
    it('should load and display inventory items with categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Outlets' },
        { id: 2, name: 'Switches' },
        { id: 3, name: 'Breakers' }
      ];

      const mockItems = [
        {
          id: 1,
          name: 'GFCI Outlet',
          sku: 'OUT-GFCI-001',
          cost_price: 18.97,
          current_stock: 50,
          reorder_level: 10,
          category: 1,
          is_active: true
        },
        {
          id: 2,
          name: 'Standard Switch',
          sku: 'SW-STD-001',
          cost_price: 8.45,
          current_stock: 25,
          reorder_level: 15,
          category: 2,
          is_active: true
        },
        {
          id: 3,
          name: '20A Breaker',
          sku: 'BR-20A-001',
          cost_price: 24.99,
          current_stock: 5,
          reorder_level: 10,
          category: 3,
          is_active: true
        }
      ];

      inventoryApi.getCategories.mockResolvedValue({ data: mockCategories });
      inventoryApi.getItems.mockResolvedValue({ data: { results: mockItems } });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
        expect(screen.getByText('Standard Switch')).toBeInTheDocument();
        expect(screen.getByText('20A Breaker')).toBeInTheDocument();
      });

      // Verify stock levels and reorder alerts
      expect(screen.getByText('50')).toBeInTheDocument(); // GFCI stock
      expect(screen.getByText('25')).toBeInTheDocument(); // Switch stock
      expect(screen.getByText('5')).toBeInTheDocument(); // Breaker stock (low stock)
      
      // Should show low stock warning for breaker
      expect(screen.getByText(/low stock/i)).toBeInTheDocument();
    });

    it('should filter inventory by category', async () => {
      const mockCategories = [
        { id: 1, name: 'Outlets' },
        { id: 2, name: 'Switches' }
      ];

      const allItems = [
        { id: 1, name: 'GFCI Outlet', category: 1, current_stock: 50 },
        { id: 2, name: 'Standard Outlet', category: 1, current_stock: 75 },
        { id: 3, name: 'Dimmer Switch', category: 2, current_stock: 30 }
      ];

      const outletItems = [
        { id: 1, name: 'GFCI Outlet', category: 1, current_stock: 50 },
        { id: 2, name: 'Standard Outlet', category: 1, current_stock: 75 }
      ];

      inventoryApi.getCategories.mockResolvedValue({ data: mockCategories });
      inventoryApi.getItems.mockResolvedValueOnce({ data: { results: allItems } });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
        expect(screen.getByText('Dimmer Switch')).toBeInTheDocument();
      });

      // Filter by Outlets category
      inventoryApi.getItems.mockResolvedValueOnce({ data: { results: outletItems } });
      
      const categoryFilter = screen.getByLabelText(/category/i);
      fireEvent.change(categoryFilter, { target: { value: '1' } });

      // Verify filtered results
      await waitFor(() => {
        expect(inventoryApi.getItems).toHaveBeenCalledWith(
          expect.objectContaining({ category: 1 })
        );
      });
    });

    it('should adjust inventory stock levels', async () => {
      const mockItem = {
        id: 1,
        name: 'GFCI Outlet',
        current_stock: 50,
        cost_price: 18.97
      };

      inventoryApi.getItems.mockResolvedValue({ data: { results: [mockItem] } });
      inventoryApi.adjustStock.mockResolvedValue({ data: { ...mockItem, current_stock: 47 } });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
      });

      // Click adjust stock button
      const adjustButton = screen.getByTestId('adjust-stock-1');
      fireEvent.click(adjustButton);

      // Enter adjustment
      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '-3' } });

      const reasonInput = screen.getByLabelText(/reason/i);
      fireEvent.change(reasonInput, { target: { value: 'Used in job #123' } });

      // Submit adjustment
      const submitButton = screen.getByText(/adjust stock/i);
      fireEvent.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(inventoryApi.adjustStock).toHaveBeenCalledWith(1, -3, 'Used in job #123');
      });
    });

    it('should create new inventory item', async () => {
      const newItem = {
        id: 4,
        name: 'USB Outlet',
        sku: 'OUT-USB-001',
        cost_price: 32.50,
        current_stock: 20,
        reorder_level: 5,
        category: 1
      };

      const mockCategories = [
        { id: 1, name: 'Outlets' }
      ];

      inventoryApi.getCategories.mockResolvedValue({ data: mockCategories });
      inventoryApi.getItems.mockResolvedValue({ data: { results: [] } });
      inventoryApi.createItem.mockResolvedValue({ data: newItem });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      // Click add item button
      const addButton = screen.getByText(/add item/i);
      fireEvent.click(addButton);

      // Fill form
      const nameInput = screen.getByLabelText(/item name/i);
      fireEvent.change(nameInput, { target: { value: 'USB Outlet' } });

      const skuInput = screen.getByLabelText(/sku/i);
      fireEvent.change(skuInput, { target: { value: 'OUT-USB-001' } });

      const costInput = screen.getByLabelText(/cost price/i);
      fireEvent.change(costInput, { target: { value: '32.50' } });

      const stockInput = screen.getByLabelText(/initial stock/i);
      fireEvent.change(stockInput, { target: { value: '20' } });

      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: '1' } });

      // Submit form
      const saveButton = screen.getByText(/save item/i);
      fireEvent.click(saveButton);

      // Verify creation
      await waitFor(() => {
        expect(inventoryApi.createItem).toHaveBeenCalledWith(expect.objectContaining({
          name: 'USB Outlet',
          sku: 'OUT-USB-001',
          cost_price: 32.50,
          current_stock: 20,
          category: 1
        }));
      });
    });
  });

  describe('Inventory-Job Integration Workflow', () => {
    it('should integrate inventory with job material selection', async () => {
      const mockMaterials = [
        {
          id: 1,
          name: 'GFCI Outlet',
          sku: 'OUT-GFCI-001',
          cost_price: 18.97,
          current_stock: 50,
          category: 1
        },
        {
          id: 2,
          name: 'Wire Nuts (100pk)',
          sku: 'CONN-WN-100',
          cost_price: 12.98,
          current_stock: 25,
          category: 2
        }
      ];

      const mockCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe' }
      ];

      customerApi.getAll.mockResolvedValue({ data: { results: mockCustomers } });
      customerApi.getProperties.mockResolvedValue({ data: [] });
      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });
      inventoryApi.getCategories.mockResolvedValue({ data: [] });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      // Create a job
      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Go to materials tab
      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      // Wait for materials to load
      await waitFor(() => {
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
        expect(screen.getByText('Wire Nuts (100pk)')).toBeInTheDocument();
      });

      // Verify stock levels are shown
      expect(screen.getByText('50 in stock')).toBeInTheDocument();
      expect(screen.getByText('25 in stock')).toBeInTheDocument();

      // Add materials to job
      const addGfciButton = screen.getByTestId('add-material-1');
      fireEvent.click(addGfciButton);

      const quantityInput = screen.getByTestId('material-quantity-1');
      fireEvent.change(quantityInput, { target: { value: '3' } });

      // Verify calculated pricing with markup
      // GFCI: $18.97 cost * 1.50 markup = $28.46 each
      await waitFor(() => {
        expect(screen.getByText(/\$28\.46/)).toBeInTheDocument(); // Unit price
        expect(screen.getByText(/\$85\.38/)).toBeInTheDocument(); // Total (3 × $28.46)
      });

      // Verify remaining stock calculation
      expect(screen.getByText('47 remaining after job')).toBeInTheDocument();
    });

    it('should warn about insufficient inventory stock', async () => {
      const mockMaterials = [
        {
          id: 1,
          name: 'Low Stock Item',
          cost_price: 25.00,
          current_stock: 2,
          reorder_level: 5
        }
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      await waitFor(() => {
        expect(screen.getByText('Low Stock Item')).toBeInTheDocument();
      });

      // Try to add more than available
      const addButton = screen.getByTestId('add-material-1');
      fireEvent.click(addButton);

      const quantityInput = screen.getByTestId('material-quantity-1');
      fireEvent.change(quantityInput, { target: { value: '5' } });

      // Verify warning
      await waitFor(() => {
        expect(screen.getByText(/insufficient stock/i)).toBeInTheDocument();
        expect(screen.getByText(/only 2 available/i)).toBeInTheDocument();
      });
    });

    it('should calculate total job cost with materials and markup', async () => {
      const mockMaterials = [
        { id: 1, name: 'Outlet', cost_price: 15.00, current_stock: 50 }, // 50% markup = $22.50
        { id: 2, name: 'Switch', cost_price: 35.00, current_stock: 30 }, // 40% markup = $49.00  
        { id: 3, name: 'Breaker', cost_price: 125.00, current_stock: 10 } // 30% markup = $162.50
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      await waitFor(() => {
        expect(screen.getByText('Outlet')).toBeInTheDocument();
      });

      // Add multiple materials
      const addOutletButton = screen.getByTestId('add-material-1');
      fireEvent.click(addOutletButton);
      
      const outletQuantity = screen.getByTestId('material-quantity-1');
      fireEvent.change(outletQuantity, { target: { value: '4' } }); // 4 × $22.50 = $90.00

      const addSwitchButton = screen.getByTestId('add-material-2');
      fireEvent.click(addSwitchButton);
      
      const switchQuantity = screen.getByTestId('material-quantity-2');
      fireEvent.change(switchQuantity, { target: { value: '2' } }); // 2 × $49.00 = $98.00

      const addBreakerButton = screen.getByTestId('add-material-3');
      fireEvent.click(addBreakerButton);
      
      const breakerQuantity = screen.getByTestId('material-quantity-3');
      fireEvent.change(breakerQuantity, { target: { value: '1' } }); // 1 × $162.50 = $162.50

      // Verify total calculation
      await waitFor(() => {
        // Total: $90.00 + $98.00 + $162.50 = $350.50
        expect(screen.getByText(/Total Materials: \$350\.50/)).toBeInTheDocument();
      });
    });
  });

  describe('Inventory Reorder and Stock Management', () => {
    it('should identify items needing reorder', async () => {
      const mockItems = [
        {
          id: 1,
          name: 'Normal Stock Item',
          current_stock: 50,
          reorder_level: 10,
          cost_price: 20.00
        },
        {
          id: 2,
          name: 'Low Stock Item',
          current_stock: 5,
          reorder_level: 10,
          cost_price: 15.00
        },
        {
          id: 3,
          name: 'Out of Stock Item',
          current_stock: 0,
          reorder_level: 5,
          cost_price: 25.00
        }
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockItems } });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Normal Stock Item')).toBeInTheDocument();
        expect(screen.getByText('Low Stock Item')).toBeInTheDocument();
        expect(screen.getByText('Out of Stock Item')).toBeInTheDocument();
      });

      // Verify stock status indicators
      expect(screen.getByText(/low stock/i)).toBeInTheDocument(); // For item 2
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument(); // For item 3

      // Check reorder suggestions
      expect(screen.getByText(/needs reorder/i)).toBeInTheDocument();
    });

    it('should generate reorder report', async () => {
      const mockItems = [
        { id: 1, name: 'Item A', current_stock: 3, reorder_level: 10, cost_price: 20.00 },
        { id: 2, name: 'Item B', current_stock: 0, reorder_level: 5, cost_price: 15.00 }
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockItems } });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Item A')).toBeInTheDocument();
      });

      // Click reorder report button
      const reorderButton = screen.getByText(/reorder report/i);
      fireEvent.click(reorderButton);

      // Verify reorder items are listed
      await waitFor(() => {
        expect(screen.getByText(/items needing reorder/i)).toBeInTheDocument();
        expect(screen.getByText('Item A')).toBeInTheDocument();
        expect(screen.getByText('Item B')).toBeInTheDocument();
      });

      // Verify suggested order quantities
      expect(screen.getByText(/suggest order: 7 units/i)).toBeInTheDocument(); // For Item A (10 - 3)
      expect(screen.getByText(/suggest order: 5 units/i)).toBeInTheDocument(); // For Item B (5 - 0)
    });
  });

  describe('Error Handling in Inventory Workflows', () => {
    it('should handle inventory loading errors', async () => {
      inventoryApi.getItems.mockRejectedValue(new Error('Failed to load inventory'));
      inventoryApi.getCategories.mockResolvedValue({ data: [] });

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load inventory/i)).toBeInTheDocument();
      });
    });

    it('should handle stock adjustment errors', async () => {
      const mockItem = {
        id: 1,
        name: 'Test Item',
        current_stock: 50
      };

      inventoryApi.getItems.mockResolvedValue({ data: { results: [mockItem] } });
      inventoryApi.adjustStock.mockRejectedValue(new Error('Stock adjustment failed'));

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      const adjustButton = screen.getByTestId('adjust-stock-1');
      fireEvent.click(adjustButton);

      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '-5' } });

      const submitButton = screen.getByText(/adjust stock/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to adjust stock/i)).toBeInTheDocument();
      });
    });

    it('should handle item creation validation errors', async () => {
      inventoryApi.getCategories.mockResolvedValue({ data: [] });
      inventoryApi.createItem.mockRejectedValue(new Error('SKU already exists'));

      render(
        <TestWrapper>
          <InventoryManagement />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add item/i);
      fireEvent.click(addButton);

      // Try to submit with duplicate SKU
      const nameInput = screen.getByLabelText(/item name/i);
      fireEvent.change(nameInput, { target: { value: 'Duplicate Item' } });

      const skuInput = screen.getByLabelText(/sku/i);
      fireEvent.change(skuInput, { target: { value: 'EXISTING-SKU' } });

      const saveButton = screen.getByText(/save item/i);
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/sku already exists/i)).toBeInTheDocument();
      });
    });
  });
});