import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import CustomerList from '../CustomerList';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock react-router-dom hooks
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockCustomers = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+1234567890',
    streetAddress: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '90210',
    customerType: 'residential',
    createdAt: '2024-01-15T10:00:00Z',
    lastServiceDate: '2024-01-20T14:30:00Z',
    totalJobs: 5,
    totalSpent: 2500.00
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@email.com',
    phone: '+1234567891',
    streetAddress: '456 Oak Ave',
    city: 'Somewhere',
    state: 'NY',
    zipCode: '10001',
    customerType: 'commercial',
    createdAt: '2024-01-10T09:00:00Z',
    lastServiceDate: '2024-01-25T11:00:00Z',
    totalJobs: 3,
    totalSpent: 4500.00
  },
  {
    id: 3,
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@email.com',
    phone: '+1234567892',
    streetAddress: '789 Pine Rd',
    city: 'Elsewhere',
    state: 'TX',
    zipCode: '75001',
    customerType: 'residential',
    createdAt: '2024-01-05T16:30:00Z',
    lastServiceDate: null,
    totalJobs: 0,
    totalSpent: 0.00
  }
];

const CustomerListWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('CustomerList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockCustomers });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders customer list component', () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    expect(screen.getByText(/customers/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays list of customers after loading', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  test('shows customer contact information', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('Anytown, CA')).toBeInTheDocument();
    });
  });

  test('displays customer type badges', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      const residentialBadges = screen.getAllByText(/residential/i);
      const commercialBadge = screen.getByText(/commercial/i);
      
      expect(residentialBadges).toHaveLength(2);
      expect(commercialBadge).toBeInTheDocument();
      expect(commercialBadge).toHaveClass('badge-commercial');
    });
  });

  test('shows customer statistics', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('5 jobs')).toBeInTheDocument();
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
      expect(screen.getByText('3 jobs')).toBeInTheDocument();
      expect(screen.getByText('$4,500.00')).toBeInTheDocument();
      expect(screen.getByText('0 jobs')).toBeInTheDocument();
    });
  });

  test('searches customers by name', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search customers/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search customers/i);
    await user.type(searchInput, 'John');
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  test('searches customers by email', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search customers/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search customers/i);
    await user.type(searchInput, 'jane.smith');
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  test('filters customers by type', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/customer type/i)).toBeInTheDocument();
    });
    
    const typeFilter = screen.getByLabelText(/customer type/i);
    await user.selectOptions(typeFilter, 'commercial');
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  test('sorts customers by name', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/sort by/i)).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'name-desc');
    
    // Verify API call with sort parameter
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers/', {
      params: expect.objectContaining({
        ordering: '-lastName'
      })
    });
  });

  test('sorts customers by total spent', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'spent-desc');
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers/', {
      params: expect.objectContaining({
        ordering: '-totalSpent'
      })
    });
  });

  test('navigates to customer detail page', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const customerRow = screen.getByText('John Doe').closest('tr');
    await user.click(customerRow!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/customers/1');
  });

  test('opens new customer form', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    const newCustomerButton = screen.getByRole('button', { name: /new customer/i });
    await user.click(newCustomerButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/customers/new');
  });

  test('deletes customer with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete/i })[0]).toBeInTheDocument();
    });
    
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this customer?');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/customers/1/');
    
    confirmSpy.mockRestore();
  });

  test('exports customer list to CSV', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/customers/export/', {
      responseType: 'blob'
    });
  });

  test('shows no customers message when list is empty', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
    });
  });

  test('displays pagination when many customers', async () => {
    const manyCustomers = Array.from({ length: 25 }, (_, i) => ({
      ...mockCustomers[0],
      id: i + 1,
      firstName: `Customer${i + 1}`,
      lastName: 'Test'
    }));
    
    mockedApi.get.mockResolvedValue({ 
      data: {
        results: manyCustomers.slice(0, 20),
        count: 25,
        next: '/api/customers/?page=2',
        previous: null
      }
    });
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error loading customers/i)).toBeInTheDocument();
    });
  });

  test('shows last service date or "Never" for new customers', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/jan 20, 2024/i)).toBeInTheDocument(); // John's last service
      expect(screen.getByText(/jan 25, 2024/i)).toBeInTheDocument(); // Jane's last service
      expect(screen.getByText(/never/i)).toBeInTheDocument(); // Bob's last service
    });
  });

  test('bulk selects customers', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });
    
    // Select all customers
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);
    
    // Check that bulk actions become available
    expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk export/i })).toBeInTheDocument();
  });

  test('performs bulk delete operation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });
    
    // Select all customers
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);
    
    // Perform bulk delete
    const bulkDeleteButton = screen.getByRole('button', { name: /bulk delete/i });
    await user.click(bulkDeleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete 3 customers?');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/customers/bulk/', {
      data: { ids: [1, 2, 3] }
    });
    
    confirmSpy.mockRestore();
  });

  test('refreshes customer list', async () => {
    const user = userEvent.setup();
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  test('shows customer creation date', async () => {
    render(
      <CustomerListWithRouter>
        <CustomerList />
      </CustomerListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/since jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/since jan 10, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/since jan 5, 2024/i)).toBeInTheDocument();
    });
  });
});