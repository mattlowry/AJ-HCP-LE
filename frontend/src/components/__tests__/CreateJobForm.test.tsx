import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateJobForm from '../CreateJobForm';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

// Mock the API
jest.mock('../../services/api', () => ({
  jobApi: {
    create: jest.fn().mockResolvedValue({ data: { id: 1 } })
  },
  customerApi: {
    getAll: jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            full_name: 'John Doe',
            full_address: '123 Main St, City, State 12345'
          }
        ]
      }
    })
  }
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('CreateJobForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders the form with all sections', () => {
    renderWithRouter(<CreateJobForm />);
    
    expect(screen.getByText('Create New Job')).toBeInTheDocument();
    expect(screen.getByText('Customer & Property')).toBeInTheDocument();
    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Line Items & Pricing')).toBeInTheDocument();
  });

  it('renders required form fields', () => {
    renderWithRouter(<CreateJobForm />);
    
    expect(screen.getByLabelText(/select customer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    renderWithRouter(<CreateJobForm />);
    
    const createButton = screen.getByRole('button', { name: /create job/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/customer is required/i)).toBeInTheDocument();
      expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/service type is required/i)).toBeInTheDocument();
    });
  });

  it('renders line items table', () => {
    renderWithRouter(<CreateJobForm />);
    
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByText('Qty')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('opens line item dialog when Add Item is clicked', () => {
    renderWithRouter(<CreateJobForm />);
    
    const addItemButton = screen.getByRole('button', { name: /add item/i });
    fireEvent.click(addItemButton);
    
    expect(screen.getByText('Add Line Item')).toBeInTheDocument();
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit price/i)).toBeInTheDocument();
  });

  it('calculates line item total correctly', () => {
    renderWithRouter(<CreateJobForm />);
    
    const addItemButton = screen.getByRole('button', { name: /add item/i });
    fireEvent.click(addItemButton);
    
    const quantityInput = screen.getByLabelText(/quantity/i);
    const unitPriceInput = screen.getByLabelText(/unit price/i);
    
    fireEvent.change(quantityInput, { target: { value: '5' } });
    fireEvent.change(unitPriceInput, { target: { value: '10.50' } });
    
    expect(screen.getByText('Total: $52.50')).toBeInTheDocument();
  });

  it('renders pricing summary section', () => {
    renderWithRouter(<CreateJobForm />);
    
    expect(screen.getByText('Subtotal:')).toBeInTheDocument();
    expect(screen.getByLabelText(/discount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tax rate/i)).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
  });

  it('handles priority selection', () => {
    renderWithRouter(<CreateJobForm />);
    
    const prioritySelect = screen.getByLabelText(/priority/i);
    fireEvent.mouseDown(prioritySelect);
    
    const highOption = screen.getByText('High');
    fireEvent.click(highOption);
    
    expect(prioritySelect).toHaveTextContent('High');
  });

  it('handles cancel button click', () => {
    renderWithRouter(<CreateJobForm />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    
    // Test that clicking cancel doesn't cause errors
    fireEvent.click(cancelButton);
  });

  it('renders service type options', () => {
    renderWithRouter(<CreateJobForm />);
    
    const serviceTypeSelect = screen.getByLabelText(/service type/i);
    fireEvent.mouseDown(serviceTypeSelect);
    
    expect(screen.getByText('Electrical Repair')).toBeInTheDocument();
    expect(screen.getByText('Panel Installation')).toBeInTheDocument();
    expect(screen.getByText('Emergency Service')).toBeInTheDocument();
  });

  it('renders technician selection', () => {
    renderWithRouter(<CreateJobForm />);
    
    const technicianSelect = screen.getByLabelText(/assigned technician/i);
    fireEvent.mouseDown(technicianSelect);
    
    expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
    expect(screen.getByText('Tom Wilson')).toBeInTheDocument();
    expect(screen.getByText('Steve Miller')).toBeInTheDocument();
  });
});