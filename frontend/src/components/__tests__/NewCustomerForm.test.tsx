import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewCustomerForm from '../NewCustomerForm';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the Google Maps service
jest.mock('../../services/GoogleMapsService', () => ({
  GoogleMapsProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="google-maps-provider">{children}</div>,
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="google-map">{children}</div>,
  Marker: () => <div data-testid="google-marker" />,
  searchAddress: jest.fn().mockResolvedValue({ lat: 40.7128, lng: -74.0060 })
}));

// Mock the API
jest.mock('../../services/api', () => ({
  customerApi: {
    create: jest.fn().mockResolvedValue({ data: { id: 1 } })
  }
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('NewCustomerForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders the form with all sections', () => {
    renderWithRouter(<NewCustomerForm />);
    
    expect(screen.getByText('Add new customer')).toBeInTheDocument();
    expect(screen.getByText('Contact info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('renders required form fields', () => {
    renderWithRouter(<NewCustomerForm />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
  });

  it('updates display name when first and last name change', () => {
    renderWithRouter(<NewCustomerForm />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const displayNameInput = screen.getByLabelText(/display name/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    
    expect(displayNameInput).toHaveValue('John Doe');
  });

  it('shows validation errors for required fields', async () => {
    renderWithRouter(<NewCustomerForm />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithRouter(<NewCustomerForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('renders Google Maps component', () => {
    renderWithRouter(<NewCustomerForm />);
    
    expect(screen.getByTestId('google-maps-provider')).toBeInTheDocument();
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
  });

  it('handles role selection', () => {
    renderWithRouter(<NewCustomerForm />);
    
    const businessRadio = screen.getByLabelText(/business/i);
    const homeownerRadio = screen.getByLabelText(/homeowner/i);
    
    expect(homeownerRadio).toBeChecked();
    
    fireEvent.click(businessRadio);
    expect(businessRadio).toBeChecked();
    expect(homeownerRadio).not.toBeChecked();
  });

  it('handles cancel button click', () => {
    renderWithRouter(<NewCustomerForm />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    
    // Test that clicking cancel doesn't cause errors
    fireEvent.click(cancelButton);
  });

  it('renders notification settings', () => {
    renderWithRouter(<NewCustomerForm />);
    
    const sendNotificationsCheckbox = screen.getByLabelText(/send notifications/i);
    expect(sendNotificationsCheckbox).toBeInTheDocument();
    expect(sendNotificationsCheckbox).toBeChecked();
    
    const doNotServiceCheckbox = screen.getByLabelText(/mark as "do not service"/i);
    expect(doNotServiceCheckbox).toBeInTheDocument();
    expect(doNotServiceCheckbox).not.toBeChecked();
  });
});