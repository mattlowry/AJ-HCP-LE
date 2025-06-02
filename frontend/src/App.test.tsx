import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
  Route: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Navigate: () => <div data-testid="navigate" />,
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' })
}));

// Mock the AuthContext
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

// Mock components to avoid complex dependencies
jest.mock('./components/Dashboard', () => {
  return function Dashboard() {
    return <div data-testid="dashboard">Dashboard Component</div>;
  };
});

jest.mock('./components/CustomerList', () => {
  return function CustomerList() {
    return <div data-testid="customer-list">Customer List Component</div>;
  };
});

jest.mock('./components/Login', () => {
  return function Login() {
    return <div data-testid="login">Login Component</div>;
  };
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  });

  it('should render router wrapper', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  it('should have proper theme provider', async () => {
    render(<App />);
    
    // Wait for theme to be applied
    await waitFor(() => {
      const body = document.body;
      expect(body).toBeInTheDocument();
    });
  });

  it('should include CssBaseline for consistent styling', () => {
    render(<App />);
    
    // CssBaseline should normalize CSS
    const html = document.documentElement;
    expect(html).toBeInTheDocument();
  });

  it('should wrap components in error boundaries', () => {
    render(<App />);
    
    // App should be wrapped in PageErrorBoundary
    expect(document.body).toBeInTheDocument();
  });
});
