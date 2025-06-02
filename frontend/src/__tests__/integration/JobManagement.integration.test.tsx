import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import SchedulingCalendar from '../../components/SchedulingCalendar';
import JobList from '../../components/JobList';

// Mock the API services
jest.mock('../../services/api', () => ({
  jobApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    assignTechnicians: jest.fn()
  },
  customerApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getProperties: jest.fn()
  },
  inventoryApi: {
    getItems: jest.fn(),
    adjustStock: jest.fn(),
    getCategories: jest.fn()
  }
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const { jobApi, customerApi, inventoryApi } = require('../../services/api');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Job Management Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Creation Workflow', () => {
    it('should create a new job with customer and property selection', async () => {
      const mockCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
      ];

      const mockProperties = [
        {
          id: 1,
          customer: 1,
          street_address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62701'
        },
        {
          id: 2,
          customer: 1,
          street_address: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62702'
        }
      ];

      const newJob = {
        id: 1,
        title: 'Outlet Installation',
        description: 'Install new GFCI outlets in kitchen',
        customer: 1,
        property: 1,
        scheduled_date: '2024-01-15',
        scheduled_time: '10:00',
        status: 'scheduled'
      };

      customerApi.getAll.mockResolvedValue({ data: { results: mockCustomers } });
      customerApi.getProperties.mockResolvedValue({ data: mockProperties });
      jobApi.create.mockResolvedValue({ data: newJob });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(customerApi.getAll).toHaveBeenCalled();
      });

      // Click on a calendar date to create a job
      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Fill out job form
      await waitFor(() => {
        expect(screen.getByText(/create new job/i)).toBeInTheDocument();
      });

      // Fill job title
      const titleInput = screen.getByLabelText(/job title/i);
      fireEvent.change(titleInput, { target: { value: 'Outlet Installation' } });

      // Fill job description
      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Install new GFCI outlets in kitchen' } });

      // Select customer
      const customerSelect = screen.getByLabelText(/customer/i);
      fireEvent.change(customerSelect, { target: { value: '1' } });

      // Wait for properties to load
      await waitFor(() => {
        expect(customerApi.getProperties).toHaveBeenCalledWith(1);
      });

      // Select property
      const propertySelect = screen.getByLabelText(/property/i);
      fireEvent.change(propertySelect, { target: { value: '1' } });

      // Set schedule time
      const timeInput = screen.getByLabelText(/time/i);
      fireEvent.change(timeInput, { target: { value: '10:00' } });

      // Submit job
      const createButton = screen.getByText(/create job/i);
      fireEvent.click(createButton);

      // Verify job creation
      await waitFor(() => {
        expect(jobApi.create).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Outlet Installation',
          description: 'Install new GFCI outlets in kitchen',
          customer: 1,
          property: 1,
          scheduled_date: '2024-01-15',
          scheduled_time: '10:00'
        }));
      });
    });

    it('should validate required job fields', async () => {
      customerApi.getAll.mockResolvedValue({ data: { results: [] } });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      // Click on a calendar date
      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Try to submit empty form
      await waitFor(() => {
        expect(screen.getByText(/create new job/i)).toBeInTheDocument();
      });

      const createButton = screen.getByText(/create job/i);
      fireEvent.click(createButton);

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/customer is required/i)).toBeInTheDocument();
      });

      // Verify job was not created
      expect(jobApi.create).not.toHaveBeenCalled();
    });
  });

  describe('Job with Materials Workflow', () => {
    it('should add materials to job with markup calculation', async () => {
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
          name: 'Wire Nuts',
          sku: 'CONN-WN-100',
          cost_price: 12.98,
          current_stock: 100,
          category: 2
        }
      ];

      const mockCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe' }
      ];

      const mockProperties = [
        { id: 1, customer: 1, street_address: '123 Main St' }
      ];

      customerApi.getAll.mockResolvedValue({ data: { results: mockCustomers } });
      customerApi.getProperties.mockResolvedValue({ data: mockProperties });
      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });
      inventoryApi.getCategories.mockResolvedValue({ data: [] });
      jobApi.create.mockResolvedValue({ data: { id: 1 } });
      inventoryApi.adjustStock.mockResolvedValue({ data: {} });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      // Create a job first
      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      await waitFor(() => {
        expect(screen.getByText(/create new job/i)).toBeInTheDocument();
      });

      // Fill basic job info
      const titleInput = screen.getByLabelText(/job title/i);
      fireEvent.change(titleInput, { target: { value: 'Kitchen Outlets' } });

      const customerSelect = screen.getByLabelText(/customer/i);
      fireEvent.change(customerSelect, { target: { value: '1' } });

      await waitFor(() => {
        expect(customerApi.getProperties).toHaveBeenCalledWith(1);
      });

      const propertySelect = screen.getByLabelText(/property/i);
      fireEvent.change(propertySelect, { target: { value: '1' } });

      // Click on materials tab
      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      // Wait for materials to load
      await waitFor(() => {
        expect(inventoryApi.getItems).toHaveBeenCalled();
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
      });

      // Add GFCI outlet to job
      const gfciAddButton = screen.getByTestId('add-material-1');
      fireEvent.click(gfciAddButton);

      // Set quantity
      const quantityInput = screen.getByTestId('material-quantity-1');
      fireEvent.change(quantityInput, { target: { value: '3' } });

      // Verify markup calculation is displayed
      await waitFor(() => {
        // GFCI Outlet cost $18.97, should have 50% markup = $28.46 each
        expect(screen.getByText(/\$28\.46/)).toBeInTheDocument();
        // Total for 3 units = $85.38
        expect(screen.getByText(/\$85\.38/)).toBeInTheDocument();
      });

      // Create job with materials
      const createButton = screen.getByText(/create job/i);
      fireEvent.click(createButton);

      // Verify job creation and inventory adjustment
      await waitFor(() => {
        expect(jobApi.create).toHaveBeenCalled();
        expect(inventoryApi.adjustStock).toHaveBeenCalledWith(1, -3, expect.any(String));
      });
    });

    it('should handle different markup tiers correctly', async () => {
      const mockMaterials = [
        // Low cost item (50% markup)
        { id: 1, name: 'Wire Nuts', cost_price: 12.98, current_stock: 100 },
        // Mid cost item (40% markup) 
        { id: 2, name: 'Switch', cost_price: 35.00, current_stock: 25 },
        // Higher cost item (30% markup)
        { id: 3, name: 'Breaker', cost_price: 150.00, current_stock: 10 },
        // Premium item (20% markup)
        { id: 4, name: 'Panel', cost_price: 750.00, current_stock: 2 }
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Go to materials tab
      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      await waitFor(() => {
        expect(screen.getByText('Wire Nuts')).toBeInTheDocument();
      });

      // Verify markup calculations for different tiers
      // Wire Nuts: $12.98 * 1.50 = $19.47 (50% markup)
      expect(screen.getByText(/\$19\.47/)).toBeInTheDocument();
      
      // Switch: $35.00 * 1.40 = $49.00 (40% markup)
      expect(screen.getByText(/\$49\.00/)).toBeInTheDocument();
      
      // Breaker: $150.00 * 1.30 = $195.00 (30% markup)
      expect(screen.getByText(/\$195\.00/)).toBeInTheDocument();
      
      // Panel: $750.00 * 1.20 = $900.00 (20% markup)
      expect(screen.getByText(/\$900\.00/)).toBeInTheDocument();
    });
  });

  describe('Job Status Management Workflow', () => {
    it('should update job status through workflow stages', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Kitchen Outlets',
          status: 'scheduled',
          customer_name: 'John Doe',
          scheduled_date: '2024-01-15',
          scheduled_time: '10:00'
        }
      ];

      jobApi.getAll.mockResolvedValue({ data: { results: mockJobs } });
      jobApi.updateStatus.mockResolvedValue({ data: { id: 1, status: 'in_progress' } });

      render(
        <TestWrapper>
          <JobList />
        </TestWrapper>
      );

      // Wait for jobs to load
      await waitFor(() => {
        expect(screen.getByText('Kitchen Outlets')).toBeInTheDocument();
        expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
      });

      // Click status dropdown
      const statusButton = screen.getByTestId('job-status-1');
      fireEvent.click(statusButton);

      // Select new status
      const inProgressOption = screen.getByText(/in progress/i);
      fireEvent.click(inProgressOption);

      // Verify status update
      await waitFor(() => {
        expect(jobApi.updateStatus).toHaveBeenCalledWith(1, 'in_progress');
      });
    });

    it('should handle complete job workflow with final status', async () => {
      const mockJob = {
        id: 1,
        title: 'Kitchen Outlets',
        status: 'in_progress',
        customer_name: 'John Doe'
      };

      jobApi.getAll.mockResolvedValue({ data: { results: [mockJob] } });
      jobApi.updateStatus.mockResolvedValue({ data: { id: 1, status: 'completed' } });

      render(
        <TestWrapper>
          <JobList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Kitchen Outlets')).toBeInTheDocument();
      });

      // Update to completed
      const statusButton = screen.getByTestId('job-status-1');
      fireEvent.click(statusButton);

      const completedOption = screen.getByText(/completed/i);
      fireEvent.click(completedOption);

      await waitFor(() => {
        expect(jobApi.updateStatus).toHaveBeenCalledWith(1, 'completed');
      });
    });
  });

  describe('Job-Customer-Property Integration', () => {
    it('should show correct property information for job location', async () => {
      const mockCustomer = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const mockProperty = {
        id: 1,
        customer: 1,
        street_address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip_code: '62701',
        electrical_panel_location: 'Basement',
        electrical_panel_type: '200A Main',
        special_instructions: 'Key under mat'
      };

      const mockJob = {
        id: 1,
        title: 'Panel Upgrade',
        customer: 1,
        property: 1,
        status: 'scheduled'
      };

      customerApi.getAll.mockResolvedValue({ data: { results: [mockCustomer] } });
      customerApi.getProperties.mockResolvedValue({ data: [mockProperty] });
      jobApi.create.mockResolvedValue({ data: mockJob });

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      // Create job with property details
      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      await waitFor(() => {
        expect(screen.getByText(/create new job/i)).toBeInTheDocument();
      });

      // Fill job details
      const titleInput = screen.getByLabelText(/job title/i);
      fireEvent.change(titleInput, { target: { value: 'Panel Upgrade' } });

      const customerSelect = screen.getByLabelText(/customer/i);
      fireEvent.change(customerSelect, { target: { value: '1' } });

      await waitFor(() => {
        expect(customerApi.getProperties).toHaveBeenCalledWith(1);
      });

      const propertySelect = screen.getByLabelText(/property/i);
      fireEvent.change(propertySelect, { target: { value: '1' } });

      // Verify property details are displayed
      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
        expect(screen.getByText('Springfield, IL 62701')).toBeInTheDocument();
        expect(screen.getByText('Basement')).toBeInTheDocument(); // Panel location
        expect(screen.getByText('200A Main')).toBeInTheDocument(); // Panel type
        expect(screen.getByText('Key under mat')).toBeInTheDocument(); // Special instructions
      });
    });
  });

  describe('Error Handling in Job Workflows', () => {
    it('should handle job creation failures gracefully', async () => {
      const mockCustomers = [
        { id: 1, first_name: 'John', last_name: 'Doe' }
      ];

      customerApi.getAll.mockResolvedValue({ data: { results: mockCustomers } });
      customerApi.getProperties.mockResolvedValue({ data: [] });
      jobApi.create.mockRejectedValue(new Error('Failed to create job'));

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Fill minimal job form
      const titleInput = screen.getByLabelText(/job title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Job' } });

      const customerSelect = screen.getByLabelText(/customer/i);
      fireEvent.change(customerSelect, { target: { value: '1' } });

      const createButton = screen.getByText(/create job/i);
      fireEvent.click(createButton);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to create job/i)).toBeInTheDocument();
      });
    });

    it('should handle inventory stock errors during job creation', async () => {
      const mockMaterials = [
        { id: 1, name: 'GFCI Outlet', cost_price: 18.97, current_stock: 1 }
      ];

      inventoryApi.getItems.mockResolvedValue({ data: { results: mockMaterials } });
      inventoryApi.adjustStock.mockRejectedValue(new Error('Insufficient stock'));

      render(
        <TestWrapper>
          <SchedulingCalendar />
        </TestWrapper>
      );

      const calendarDate = screen.getByText('15');
      fireEvent.click(calendarDate);

      // Try to add more materials than available
      const materialsTab = screen.getByText(/materials/i);
      fireEvent.click(materialsTab);

      await waitFor(() => {
        expect(screen.getByText('GFCI Outlet')).toBeInTheDocument();
      });

      const addButton = screen.getByTestId('add-material-1');
      fireEvent.click(addButton);

      const quantityInput = screen.getByTestId('material-quantity-1');
      fireEvent.change(quantityInput, { target: { value: '5' } }); // More than stock

      // Verify warning is shown
      await waitFor(() => {
        expect(screen.getByText(/insufficient stock/i)).toBeInTheDocument();
      });
    });

    it('should handle job status update failures', async () => {
      const mockJobs = [
        { id: 1, title: 'Test Job', status: 'scheduled' }
      ];

      jobApi.getAll.mockResolvedValue({ data: { results: mockJobs } });
      jobApi.updateStatus.mockRejectedValue(new Error('Failed to update status'));

      render(
        <TestWrapper>
          <JobList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Job')).toBeInTheDocument();
      });

      const statusButton = screen.getByTestId('job-status-1');
      fireEvent.click(statusButton);

      const inProgressOption = screen.getByText(/in progress/i);
      fireEvent.click(inProgressOption);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to update job status/i)).toBeInTheDocument();
      });
    });
  });
});