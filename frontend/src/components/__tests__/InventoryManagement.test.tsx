import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InventoryManagement from '../InventoryManagement';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockInventoryItems = [
  {
    id: 1,
    name: 'Circuit Breaker 20A',
    category: 'electrical',
    sku: 'CB-20A-001',
    description: '20 Amp single pole circuit breaker',
    currentStock: 25,
    minimumStock: 10,
    maximumStock: 50,
    unitPrice: 15.99,
    supplier: 'Electrical Supply Co',
    location: 'Warehouse A-1',
    lastRestocked: '2024-02-10T09:00:00Z',
    status: 'in_stock'
  },
  {
    id: 2,
    name: 'GFCI Outlet',
    category: 'electrical',
    sku: 'GFCI-15A-002',
    description: '15 Amp GFCI outlet with test/reset',
    currentStock: 5,
    minimumStock: 15,
    maximumStock: 30,
    unitPrice: 22.50,
    supplier: 'Home Depot',
    location: 'Warehouse B-2',
    lastRestocked: '2024-01-28T14:30:00Z',
    status: 'low_stock'
  },
  {
    id: 3,
    name: 'Electrical Wire 12 AWG',
    category: 'wiring',
    sku: 'WIRE-12AWG-100',
    description: '12 AWG copper wire, 100ft roll',
    currentStock: 0,
    minimumStock: 5,
    maximumStock: 20,
    unitPrice: 89.99,
    supplier: 'Wire & Cable Inc',
    location: 'Warehouse C-3',
    lastRestocked: '2024-01-15T11:00:00Z',
    status: 'out_of_stock'
  },
  {
    id: 4,
    name: 'LED Light Bulb 60W',
    category: 'lighting',
    sku: 'LED-60W-004',
    description: 'Energy efficient LED bulb, 60W equivalent',
    currentStock: 100,
    minimumStock: 25,
    maximumStock: 150,
    unitPrice: 8.99,
    supplier: 'Lighting Solutions',
    location: 'Warehouse D-4',
    lastRestocked: '2024-02-05T16:45:00Z',
    status: 'in_stock'
  }
];

const mockSuppliers = [
  { id: 1, name: 'Electrical Supply Co' },
  { id: 2, name: 'Home Depot' },
  { id: 3, name: 'Wire & Cable Inc' },
  { id: 4, name: 'Lighting Solutions' }
];

describe('InventoryManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockImplementation((url) => {
      if (url === '/api/inventory/') {
        return Promise.resolve({ data: mockInventoryItems });
      }
      if (url === '/api/suppliers/') {
        return Promise.resolve({ data: mockSuppliers });
      }
      return Promise.resolve({ data: [] });
    });
    mockedApi.post.mockResolvedValue({ data: { id: 5, name: 'New Item' } });
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders inventory management component', () => {
    render(<InventoryManagement />);
    
    expect(screen.getByText(/inventory management/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays list of inventory items after loading', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Circuit Breaker 20A')).toBeInTheDocument();
      expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
      expect(screen.getByText('Electrical Wire 12 AWG')).toBeInTheDocument();
      expect(screen.getByText('LED Light Bulb 60W')).toBeInTheDocument();
    });
  });

  test('shows inventory item details', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('CB-20A-001')).toBeInTheDocument();
      expect(screen.getByText('$15.99')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // Current stock
      expect(screen.getByText('Electrical Supply Co')).toBeInTheDocument();
    });
  });

  test('displays stock status indicators with correct styling', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      const inStockBadge = screen.getAllByText('in_stock')[0];
      const lowStockBadge = screen.getByText('low_stock');
      const outOfStockBadge = screen.getByText('out_of_stock');
      
      expect(inStockBadge).toHaveClass('status-in-stock');
      expect(lowStockBadge).toHaveClass('status-low-stock');
      expect(outOfStockBadge).toHaveClass('status-out-of-stock');
    });
  });

  test('filters inventory by category', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/category filter/i)).toBeInTheDocument();
    });
    
    const categoryFilter = screen.getByLabelText(/category filter/i);
    await user.selectOptions(categoryFilter, 'lighting');
    
    expect(screen.getByText('LED Light Bulb 60W')).toBeInTheDocument();
    expect(screen.queryByText('Circuit Breaker 20A')).not.toBeInTheDocument();
  });

  test('filters inventory by stock status', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/status filter/i)).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByLabelText(/status filter/i);
    await user.selectOptions(statusFilter, 'low_stock');
    
    expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
    expect(screen.queryByText('Circuit Breaker 20A')).not.toBeInTheDocument();
  });

  test('searches inventory items by name or SKU', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search inventory/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search inventory/i);
    await user.type(searchInput, 'GFCI');
    
    expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
    expect(screen.queryByText('Circuit Breaker 20A')).not.toBeInTheDocument();
  });

  test('sorts inventory by stock level', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'stock-asc');
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/inventory/', {
      params: expect.objectContaining({
        ordering: 'currentStock'
      })
    });
  });

  test('opens add new item dialog', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    const addItemButton = screen.getByRole('button', { name: /add item/i });
    await user.click(addItemButton);
    
    expect(screen.getByText(/new inventory item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sku/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  test('creates new inventory item', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    // Open add item dialog
    const addItemButton = screen.getByRole('button', { name: /add item/i });
    await user.click(addItemButton);
    
    // Fill form
    const nameInput = screen.getByLabelText(/item name/i);
    await user.type(nameInput, 'New Switch');
    
    const skuInput = screen.getByLabelText(/sku/i);
    await user.type(skuInput, 'SW-001');
    
    const categorySelect = screen.getByLabelText(/category/i);
    await user.selectOptions(categorySelect, 'electrical');
    
    const priceInput = screen.getByLabelText(/unit price/i);
    await user.type(priceInput, '12.99');
    
    const stockInput = screen.getByLabelText(/current stock/i);
    await user.type(stockInput, '20');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add item/i });
    await user.click(submitButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/inventory/', expect.objectContaining({
      name: 'New Switch',
      sku: 'SW-001',
      category: 'electrical',
      unitPrice: '12.99',
      currentStock: '20'
    }));
  });

  test('edits existing inventory item', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit/i })[0]).toBeInTheDocument();
    });
    
    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    await user.click(editButton);
    
    expect(screen.getByText(/edit inventory item/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Circuit Breaker 20A')).toBeInTheDocument();
    
    // Update stock
    const stockInput = screen.getByLabelText(/current stock/i);
    await user.clear(stockInput);
    await user.type(stockInput, '30');
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/inventory/1/', expect.objectContaining({
      currentStock: '30'
    }));
  });

  test('updates stock quantity with quick actions', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /adjust stock/i })[0]).toBeInTheDocument();
    });
    
    const adjustStockButton = screen.getAllByRole('button', { name: /adjust stock/i })[0];
    await user.click(adjustStockButton);
    
    expect(screen.getByText(/adjust stock/i)).toBeInTheDocument();
    
    const quantityInput = screen.getByLabelText(/quantity/i);
    await user.type(quantityInput, '10');
    
    const reasonSelect = screen.getByLabelText(/reason/i);
    await user.selectOptions(reasonSelect, 'restock');
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/inventory/1/adjust-stock/', {
      quantity: '10',
      reason: 'restock'
    });
  });

  test('shows low stock alerts', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/low stock alerts/i)).toBeInTheDocument();
      const lowStockItem = screen.getByText('GFCI Outlet').closest('.inventory-row');
      expect(lowStockItem).toHaveClass('low-stock-alert');
    });
  });

  test('shows out of stock warnings', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      const outOfStockItem = screen.getByText('Electrical Wire 12 AWG').closest('.inventory-row');
      expect(outOfStockItem).toHaveClass('out-of-stock-warning');
    });
  });

  test('creates reorder for low stock items', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /reorder/i })[0]).toBeInTheDocument();
    });
    
    const reorderButton = screen.getAllByRole('button', { name: /reorder/i })[0];
    await user.click(reorderButton);
    
    expect(screen.getByText(/create reorder/i)).toBeInTheDocument();
    
    const quantityInput = screen.getByLabelText(/order quantity/i);
    expect(quantityInput).toHaveValue('25'); // Should suggest maximum stock - current stock
    
    const submitButton = screen.getByRole('button', { name: /create order/i });
    await user.click(submitButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/inventory/reorders/', expect.objectContaining({
      itemId: 2,
      quantity: 25
    }));
  });

  test('deletes inventory item with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete/i })[0]).toBeInTheDocument();
    });
    
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this item?');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/inventory/1/');
    
    confirmSpy.mockRestore();
  });

  test('exports inventory to CSV', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    render(<InventoryManagement />);
    
    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/inventory/export/', {
      responseType: 'blob'
    });
  });

  test('bulk updates inventory items', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });
    
    // Select multiple items
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);
    
    expect(screen.getByRole('button', { name: /bulk update/i })).toBeInTheDocument();
    
    const bulkUpdateButton = screen.getByRole('button', { name: /bulk update/i });
    await user.click(bulkUpdateButton);
    
    expect(screen.getByText(/bulk update inventory/i)).toBeInTheDocument();
  });

  test('scans barcode for quick item lookup', async () => {
    const user = userEvent.setup();
    
    // Mock barcode scanner
    const mockScan = jest.fn().mockResolvedValue({ text: 'CB-20A-001' });
    global.BarcodeDetector = jest.fn().mockImplementation(() => ({
      detect: mockScan
    }));
    
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scan barcode/i })).toBeInTheDocument();
    });
    
    const scanButton = screen.getByRole('button', { name: /scan barcode/i });
    await user.click(scanButton);
    
    await waitFor(() => {
      expect(mockScan).toHaveBeenCalled();
    });
  });

  test('shows inventory movement history', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /history/i })[0]).toBeInTheDocument();
    });
    
    const historyButton = screen.getAllByRole('button', { name: /history/i })[0];
    await user.click(historyButton);
    
    expect(screen.getByText(/inventory history/i)).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/api/inventory/1/history/');
  });

  test('displays total inventory value', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      // Calculate total: (25 * 15.99) + (5 * 22.50) + (0 * 89.99) + (100 * 8.99) = 1411.25
      expect(screen.getByText(/total inventory value/i)).toBeInTheDocument();
      expect(screen.getByText('$1,411.25')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading inventory/i)).toBeInTheDocument();
    });
  });

  test('refreshes inventory data', async () => {
    const user = userEvent.setup();
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockedApi.get).toHaveBeenCalledTimes(3); // Initial load + refresh
  });

  test('shows inventory location information', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Warehouse A-1')).toBeInTheDocument();
      expect(screen.getByText('Warehouse B-2')).toBeInTheDocument();
      expect(screen.getByText('Warehouse C-3')).toBeInTheDocument();
      expect(screen.getByText('Warehouse D-4')).toBeInTheDocument();
    });
  });

  test('displays last restock dates', async () => {
    render(<InventoryManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/feb 10, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 28, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument();
    });
  });
});