import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import CustomerDetail from '../CustomerDetail';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
const mockParams = { id: '1' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

const mockCustomer = {
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
  totalJobsCompleted: 5,
  totalSpent: 2500.00,
  properties: [
    {
      id: 1,
      name: 'Main Residence',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
      propertyType: 'residential'
    }
  ],
  jobs: [
    {
      id: 1,
      title: 'Electrical Panel Upgrade',
      status: 'completed',
      scheduledDate: '2024-01-20',
      amount: 1500.00
    },
    {
      id: 2,
      title: 'Outlet Installation',
      status: 'pending',
      scheduledDate: '2024-02-10',
      amount: 300.00
    }
  ],
  contacts: [
    {
      id: 1,
      name: 'Jane Doe',
      relationship: 'spouse',
      phone: '+1234567891',
      email: 'jane.doe@email.com'
    }
  ]
};

const CustomerDetailWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('CustomerDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockCustomer });
    mockedApi.put.mockResolvedValue({ data: { ...mockCustomer, firstName: 'Johnny' } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders customer detail component with loading state', () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays customer information after loading', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@email.com')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('Anytown, CA 90210')).toBeInTheDocument();
    });
  });

  test('shows customer statistics', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total jobs
      expect(screen.getByText('$2,500.00')).toBeInTheDocument(); // Total spent
      expect(screen.getByText(/residential/i)).toBeInTheDocument(); // Customer type
    });
  });

  test('displays customer properties', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Main Residence')).toBeInTheDocument();
      expect(screen.getByText(/properties/i)).toBeInTheDocument();
    });
  });

  test('shows customer job history', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Electrical Panel Upgrade')).toBeInTheDocument();
      expect(screen.getByText('Outlet Installation')).toBeInTheDocument();
      expect(screen.getByText(/job history/i)).toBeInTheDocument();
    });
  });

  test('displays job status badges correctly', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      const completedBadge = screen.getByText('completed');
      const pendingBadge = screen.getByText('pending');
      
      expect(completedBadge).toHaveClass('status-completed');
      expect(pendingBadge).toHaveClass('status-pending');
    });
  });

  test('opens edit customer dialog', async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit customer/i })).toBeInTheDocument();
    });
    
    const editButton = screen.getByRole('button', { name: /edit customer/i });
    await user.click(editButton);
    
    expect(screen.getByText(/edit customer/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  test('updates customer information', async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    // Open edit dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit customer/i })).toBeInTheDocument();
    });
    
    const editButton = screen.getByRole('button', { name: /edit customer/i });
    await user.click(editButton);
    
    // Update first name
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Johnny');
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/customers/1/', expect.objectContaining({
      firstName: 'Johnny'
    }));
  });

  test('creates new job for customer', async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new job/i })).toBeInTheDocument();
    });
    
    const newJobButton = screen.getByRole('button', { name: /new job/i });
    await user.click(newJobButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/new', {
      state: { customerId: 1 }
    });
  });

  test('adds new property to customer', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ 
      data: { 
        id: 2, 
        name: 'Secondary Property',
        address: '456 Oak St',
        customerId: 1 
      } 
    });
    
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument();
    });
    
    const addPropertyButton = screen.getByRole('button', { name: /add property/i });
    await user.click(addPropertyButton);
    
    expect(screen.getByText(/new property/i)).toBeInTheDocument();
    
    // Fill property form
    const nameInput = screen.getByLabelText(/property name/i);
    await user.type(nameInput, 'Secondary Property');
    
    const addressInput = screen.getByLabelText(/address/i);
    await user.type(addressInput, '456 Oak St');
    
    const cityInput = screen.getByLabelText(/city/i);
    await user.type(cityInput, 'Otherville');
    
    const stateInput = screen.getByLabelText(/state/i);
    await user.type(stateInput, 'NY');
    
    const zipInput = screen.getByLabelText(/zip code/i);
    await user.type(zipInput, '10001');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add property/i });
    await user.click(submitButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/properties/', expect.objectContaining({
      name: 'Secondary Property',
      address: '456 Oak St',
      customerId: 1
    }));
  });

  test('displays customer contacts', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText(/spouse/i)).toBeInTheDocument();
      expect(screen.getByText('jane.doe@email.com')).toBeInTheDocument();
    });
  });

  test('adds emergency contact', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ 
      data: { 
        id: 2, 
        name: 'Emergency Contact',
        relationship: 'emergency',
        phone: '+1234567892'
      } 
    });
    
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add contact/i })).toBeInTheDocument();
    });
    
    const addContactButton = screen.getByRole('button', { name: /add contact/i });
    await user.click(addContactButton);
    
    // Fill contact form
    const nameInput = screen.getByLabelText(/contact name/i);
    await user.type(nameInput, 'Emergency Contact');
    
    const relationshipSelect = screen.getByLabelText(/relationship/i);
    await user.selectOptions(relationshipSelect, 'emergency');
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '+1234567892');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /save contact/i });
    await user.click(submitButton);
    
    expect(mockedApi.post).toHaveBeenCalledWith('/api/customer-contacts/', expect.objectContaining({
      name: 'Emergency Contact',
      relationship: 'emergency',
      phone: '+1234567892',
      customerId: 1
    }));
  });

  test('deletes customer with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete customer/i })).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByRole('button', { name: /delete customer/i });
    await user.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this customer? This action cannot be undone.');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/customers/1/');
    expect(mockNavigate).toHaveBeenCalledWith('/customers');
    
    confirmSpy.mockRestore();
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('Customer not found'));
    
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error loading customer/i)).toBeInTheDocument();
    });
  });

  test('shows customer since date', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/customer since/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument();
    });
  });

  test('displays last service date', async () => {
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/last service/i)).toBeInTheDocument();
      expect(screen.getByText(/jan 20, 2024/i)).toBeInTheDocument();
    });
  });

  test('navigates back to customer list', async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    const backButton = screen.getByRole('button', { name: /back to customers/i });
    await user.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/customers');
  });

  test('prints customer details', async () => {
    const user = userEvent.setup();
    
    // Mock window.print
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    
    render(
      <CustomerDetailWithRouter>
        <CustomerDetail />
      </CustomerDetailWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });
    
    const printButton = screen.getByRole('button', { name: /print/i });
    await user.click(printButton);
    
    expect(printSpy).toHaveBeenCalled();
    
    printSpy.mockRestore();
  });
});