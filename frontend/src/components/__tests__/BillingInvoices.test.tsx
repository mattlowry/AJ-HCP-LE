import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BillingInvoices from '../BillingInvoices';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockInvoices = [
  {
    id: 1,
    invoiceNumber: 'INV-001',
    customerId: 1,
    customerName: 'John Doe',
    amount: 500.00,
    status: 'paid',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    items: [
      { description: 'Electrical repair', quantity: 1, rate: 500.00, amount: 500.00 }
    ]
  },
  {
    id: 2,
    invoiceNumber: 'INV-002',
    customerId: 2,
    customerName: 'Jane Smith',
    amount: 750.00,
    status: 'pending',
    issueDate: '2024-01-20',
    dueDate: '2024-02-20',
    items: [
      { description: 'Panel upgrade', quantity: 1, rate: 750.00, amount: 750.00 }
    ]
  },
  {
    id: 3,
    invoiceNumber: 'INV-003',
    customerId: 3,
    customerName: 'Bob Johnson',
    amount: 300.00,
    status: 'overdue',
    issueDate: '2023-12-01',
    dueDate: '2024-01-01',
    items: [
      { description: 'Outlet installation', quantity: 2, rate: 150.00, amount: 300.00 }
    ]
  }
];

describe('BillingInvoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockInvoices });
    mockedApi.post.mockResolvedValue({ data: { id: 4, invoiceNumber: 'INV-004' } });
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders billing invoices component', () => {
    render(<BillingInvoices />);
    
    expect(screen.getByText(/billing & invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays list of invoices after loading', async () => {
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('INV-003')).toBeInTheDocument();
    });
  });

  test('shows customer names and amounts', async () => {
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('$750.00')).toBeInTheDocument();
      expect(screen.getByText('$300.00')).toBeInTheDocument();
    });
  });

  test('displays different invoice statuses with correct styling', async () => {
    render(<BillingInvoices />);
    
    await waitFor(() => {
      const paidStatus = screen.getByText('paid');
      const pendingStatus = screen.getByText('pending');
      const overdueStatus = screen.getByText('overdue');
      
      expect(paidStatus).toBeInTheDocument();
      expect(pendingStatus).toBeInTheDocument();
      expect(overdueStatus).toBeInTheDocument();
      
      expect(paidStatus).toHaveClass('status-paid');
      expect(pendingStatus).toHaveClass('status-pending');
      expect(overdueStatus).toHaveClass('status-overdue');
    });
  });

  test('filters invoices by status', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByRole('combobox');
    await user.selectOptions(statusFilter, 'paid');
    
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.queryByText('INV-002')).not.toBeInTheDocument();
    expect(screen.queryByText('INV-003')).not.toBeInTheDocument();
  });

  test('searches invoices by invoice number or customer name', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search invoices/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search invoices/i);
    await user.type(searchInput, 'John');
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  test('opens create invoice dialog', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    const createButton = screen.getByRole('button', { name: /create invoice/i });
    await user.click(createButton);
    
    expect(screen.getByText(/new invoice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  test('creates new invoice', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    // Open create dialog
    const createButton = screen.getByRole('button', { name: /create invoice/i });
    await user.click(createButton);
    
    // Fill form
    const customerSelect = screen.getByLabelText(/customer/i);
    await user.selectOptions(customerSelect, '1');
    
    const dueDateInput = screen.getByLabelText(/due date/i);
    await user.type(dueDateInput, '2024-03-15');
    
    // Add line item
    const addItemButton = screen.getByRole('button', { name: /add item/i });
    await user.click(addItemButton);
    
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Test service');
    
    const quantityInput = screen.getByLabelText(/quantity/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, '2');
    
    const rateInput = screen.getByLabelText(/rate/i);
    await user.clear(rateInput);
    await user.type(rateInput, '100');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/invoices/', expect.objectContaining({
      customerId: '1',
      dueDate: '2024-03-15',
      items: expect.arrayContaining([
        expect.objectContaining({
          description: 'Test service',
          quantity: 2,
          rate: 100
        })
      ])
    }));
  });

  test('views invoice details', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
    
    const viewButton = screen.getAllByRole('button', { name: /view/i })[0];
    await user.click(viewButton);
    
    expect(screen.getByText(/invoice details/i)).toBeInTheDocument();
    expect(screen.getByText('Electrical repair')).toBeInTheDocument();
  });

  test('marks invoice as paid', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
    
    const markPaidButton = screen.getByRole('button', { name: /mark paid/i });
    await user.click(markPaidButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/invoices/2/', {
      status: 'paid'
    });
  });

  test('sends invoice reminder', async () => {
    const user = userEvent.setup();
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-002')).toBeInTheDocument();
    });
    
    const reminderButton = screen.getByRole('button', { name: /send reminder/i });
    await user.click(reminderButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/invoices/2/send-reminder/');
  });

  test('deletes invoice with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-001')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this invoice?');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/invoices/1/');
    
    confirmSpy.mockRestore();
  });

  test('exports invoices to PDF', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    render(<BillingInvoices />);
    
    const exportButton = screen.getByRole('button', { name: /export pdf/i });
    await user.click(exportButton);
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/invoices/export/', {
      responseType: 'blob'
    });
  });

  test('calculates total amounts correctly', async () => {
    render(<BillingInvoices />);
    
    await waitFor(() => {
      // Total: $500 + $750 + $300 = $1,550
      expect(screen.getByText(/total: \$1,550.00/i)).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading invoices/i)).toBeInTheDocument();
    });
  });

  test('shows overdue invoices prominently', async () => {
    render(<BillingInvoices />);
    
    await waitFor(() => {
      const overdueInvoice = screen.getByText('INV-003').closest('.invoice-row');
      expect(overdueInvoice).toHaveClass('overdue');
    });
  });

  test('displays pagination when many invoices', async () => {
    const manyInvoices = Array.from({ length: 25 }, (_, i) => ({
      ...mockInvoices[0],
      id: i + 1,
      invoiceNumber: `INV-${(i + 1).toString().padStart(3, '0')}`
    }));
    
    mockedApi.get.mockResolvedValue({ data: manyInvoices });
    
    render(<BillingInvoices />);
    
    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
    });
  });
});