import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import CustomerList from '../../components/CustomerList';
import CustomerDetail from '../../components/CustomerDetail';

// Mock the API service
jest.mock('../../services/api', () => ({
  customerApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getProperties: jest.fn(),
    addProperty: jest.fn(),
    updateProperty: jest.fn(),
    deleteProperty: jest.fn()
  }
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ customerId: '1' })
}));

const { customerApi } = require('../../services/api');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Customer Management Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer List to Detail Navigation Workflow', () => {
    it('should navigate from customer list to customer detail', async () => {
      // Mock customer list data
      const mockCustomers = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      customerApi.getAll.mockResolvedValue({
        data: { results: mockCustomers, count: 2 }
      });

      // Render customer list
      render(
        <TestWrapper>
          <CustomerList />
        </TestWrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Click on a customer
      const johnCustomerRow = screen.getByText('John Doe');
      fireEvent.click(johnCustomerRow);

      // Verify navigation was called
      expect(mockNavigate).toHaveBeenCalledWith('/customers/1');
    });

    it('should allow searching and filtering customers', async () => {
      const allCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        { id: 3, first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com' }
      ];

      const filteredCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      ];

      // Initially load all customers
      customerApi.getAll.mockResolvedValueOnce({
        data: { results: allCustomers, count: 3 }
      });

      render(
        <TestWrapper>
          <CustomerList />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });

      // Mock filtered results
      customerApi.getAll.mockResolvedValueOnce({
        data: { results: filteredCustomers, count: 1 }
      });

      // Search for "John"
      const searchInput = screen.getByPlaceholderText(/search customers/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      // Verify API was called with search parameter
      await waitFor(() => {
        expect(customerApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'John' })
        );
      });
    });
  });

  describe('Customer Detail Property Management Workflow', () => {
    it('should load customer details and manage properties', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701'
      };

      const mockProperties = [
        {
          id: 1,
          customer: 1,
          street_address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62701',
          property_type: 'single_family'
        }
      ];

      customerApi.getById.mockResolvedValue({ data: mockCustomer });
      customerApi.getProperties.mockResolvedValue({ data: mockProperties });

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for customer and properties to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      // Verify API calls were made
      expect(customerApi.getById).toHaveBeenCalledWith('1');
      expect(customerApi.getProperties).toHaveBeenCalledWith('1');
    });

    it('should add a new property to customer', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const newProperty = {
        id: 2,
        customer: 1,
        street_address: '456 Oak Ave',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62702',
        property_type: 'single_family'
      };

      customerApi.getById.mockResolvedValue({ data: mockCustomer });
      customerApi.getProperties.mockResolvedValue({ data: [] });
      customerApi.addProperty.mockResolvedValue({ data: newProperty });

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for customer to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click "Add Property" button
      const addPropertyButton = screen.getByText(/add property/i);
      fireEvent.click(addPropertyButton);

      // Fill out property form
      const addressInput = screen.getByLabelText(/street address/i);
      const cityInput = screen.getByLabelText(/city/i);
      const stateInput = screen.getByLabelText(/state/i);
      const zipInput = screen.getByLabelText(/zip code/i);

      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });
      fireEvent.change(cityInput, { target: { value: 'Springfield' } });
      fireEvent.change(stateInput, { target: { value: 'IL' } });
      fireEvent.change(zipInput, { target: { value: '62702' } });

      // Submit form
      const saveButton = screen.getByText(/save property/i);
      fireEvent.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(customerApi.addProperty).toHaveBeenCalledWith(1, expect.objectContaining({
          street_address: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62702'
        }));
      });
    });

    it('should edit existing property', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const existingProperty = {
        id: 1,
        customer: 1,
        street_address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        property_type: 'single_family'
      };

      customerApi.getById.mockResolvedValue({ data: mockCustomer });
      customerApi.getProperties.mockResolvedValue({ data: [existingProperty] });
      customerApi.updateProperty.mockResolvedValue({ 
        data: { ...existingProperty, street_address: '123 Main Street' }
      });

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      // Click edit button for property
      const editButton = screen.getByText(/edit/i);
      fireEvent.click(editButton);

      // Modify address
      const addressInput = screen.getByDisplayValue('123 Main St');
      fireEvent.change(addressInput, { target: { value: '123 Main Street' } });

      // Save changes
      const saveButton = screen.getByText(/save property/i);
      fireEvent.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(customerApi.updateProperty).toHaveBeenCalledWith(1, expect.objectContaining({
          street_address: '123 Main Street'
        }));
      });
    });

    it('should delete property with confirmation', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const existingProperty = {
        id: 1,
        customer: 1,
        street_address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        property_type: 'single_family'
      };

      customerApi.getById.mockResolvedValue({ data: mockCustomer });
      customerApi.getProperties.mockResolvedValue({ data: [existingProperty] });
      customerApi.deleteProperty.mockResolvedValue({});

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByText(/delete/i);
      fireEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      fireEvent.click(confirmButton);

      // Verify API call
      await waitFor(() => {
        expect(customerApi.deleteProperty).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Customer Creation Workflow', () => {
    it('should create new customer with validation', async () => {
      const newCustomer = {
        id: 3,
        first_name: 'Alice',
        last_name: 'Wilson',
        email: 'alice@example.com',
        phone: '555-9999'
      };

      customerApi.create.mockResolvedValue({ data: newCustomer });

      render(
        <TestWrapper>
          <CustomerList />
        </TestWrapper>
      );

      // Click "Add Customer" button
      const addButton = screen.getByText(/add customer/i);
      fireEvent.click(addButton);

      // Fill out customer form
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      fireEvent.change(firstNameInput, { target: { value: 'Alice' } });
      fireEvent.change(lastNameInput, { target: { value: 'Wilson' } });
      fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });
      fireEvent.change(phoneInput, { target: { value: '555-9999' } });

      // Submit form
      const saveButton = screen.getByText(/save customer/i);
      fireEvent.click(saveButton);

      // Verify API call
      await waitFor(() => {
        expect(customerApi.create).toHaveBeenCalledWith(expect.objectContaining({
          first_name: 'Alice',
          last_name: 'Wilson',
          email: 'alice@example.com',
          phone: '555-9999'
        }));
      });
    });

    it('should show validation errors for invalid customer data', async () => {
      render(
        <TestWrapper>
          <CustomerList />
        </TestWrapper>
      );

      // Click "Add Customer" button
      const addButton = screen.getByText(/add customer/i);
      fireEvent.click(addButton);

      // Try to submit empty form
      const saveButton = screen.getByText(/save customer/i);
      fireEvent.click(saveButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(customerApi.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling in Customer Workflow', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      customerApi.getAll.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <CustomerList />
        </TestWrapper>
      );

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to load customers/i)).toBeInTheDocument();
      });
    });

    it('should handle customer detail loading errors', async () => {
      customerApi.getById.mockRejectedValue(new Error('Customer not found'));

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to load customer/i)).toBeInTheDocument();
      });
    });

    it('should handle property management errors', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      customerApi.getById.mockResolvedValue({ data: mockCustomer });
      customerApi.getProperties.mockResolvedValue({ data: [] });
      customerApi.addProperty.mockRejectedValue(new Error('Failed to add property'));

      render(
        <TestWrapper>
          <CustomerDetail />
        </TestWrapper>
      );

      // Wait for customer to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Try to add property
      const addPropertyButton = screen.getByText(/add property/i);
      fireEvent.click(addPropertyButton);

      // Fill minimal form
      const addressInput = screen.getByLabelText(/street address/i);
      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });

      // Submit form
      const saveButton = screen.getByText(/save property/i);
      fireEvent.click(saveButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to add property/i)).toBeInTheDocument();
      });
    });
  });
});