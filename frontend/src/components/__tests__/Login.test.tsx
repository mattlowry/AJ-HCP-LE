import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
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

// Mock AuthContext
const mockSetIsAuthenticated = jest.fn();
const mockSetUser = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    setIsAuthenticated: mockSetIsAuthenticated,
    setUser: mockSetUser,
    user: null
  })
}));

const LoginWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders login form', () => {
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  test('validates minimum password length', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, '123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });

  test('submits login form with valid credentials', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        token: 'test-token',
        user: {
          id: 1,
          username: 'testuser',
          role: 'manager',
          firstName: 'Test',
          lastName: 'User'
        }
      }
    };
    
    mockedApi.post.mockResolvedValue(mockResponse);
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/login/', {
        username: 'testuser',
        password: 'password123'
      });
    });
  });

  test('stores token and user data on successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        token: 'test-token',
        user: {
          id: 1,
          username: 'testuser',
          role: 'manager',
          firstName: 'Test',
          lastName: 'User'
        }
      }
    };
    
    mockedApi.post.mockResolvedValue(mockResponse);
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);
      expect(mockSetUser).toHaveBeenCalledWith(mockResponse.data.user);
    });
  });

  test('redirects to dashboard after successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        token: 'test-token',
        user: {
          id: 1,
          username: 'testuser',
          role: 'manager'
        }
      }
    };
    
    mockedApi.post.mockResolvedValue(mockResponse);
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Invalid credentials' }
      }
    });
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpass');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockedApi.post.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          data: { token: 'test-token', user: { username: 'test' } } 
        }), 100)
      )
    );
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('remembers username when "Remember me" is checked', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const rememberCheckbox = screen.getByLabelText(/remember me/i);
    
    await user.type(usernameInput, 'testuser');
    await user.click(rememberCheckbox);
    
    expect(localStorage.getItem('rememberedUsername')).toBe('testuser');
  });

  test('loads remembered username on component mount', () => {
    localStorage.setItem('rememberedUsername', 'saveduser');
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    expect(usernameInput).toHaveValue('saveduser');
  });

  test('clears form when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const resetButton = screen.getByRole('button', { name: /reset/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    await user.click(resetButton);
    
    expect(usernameInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });

  test('submits form when Enter key is pressed', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({
      data: { token: 'test-token', user: { username: 'test' } }
    });
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.type(passwordInput, '{enter}');
    
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalled();
    });
  });

  test('navigates to forgot password page', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const forgotPasswordLink = screen.getByText(/forgot password/i);
    await user.click(forgotPasswordLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  test('navigates to registration page', async () => {
    const user = userEvent.setup();
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const signUpLink = screen.getByText(/don't have an account/i);
    await user.click(signUpLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  test('handles network error gracefully', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValue(new Error('Network Error'));
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test('disables form during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockedApi.post.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ 
          data: { token: 'test-token', user: { username: 'test' } } 
        }), 100)
      )
    );
    
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  test('applies appropriate ARIA labels for accessibility', () => {
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Login form');
    expect(screen.getByLabelText(/username/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-required', 'true');
  });

  test('displays company logo and branding', () => {
    render(
      <LoginWithRouter>
        <Login />
      </LoginWithRouter>
    );
    
    expect(screen.getByAltText(/aj long electric logo/i)).toBeInTheDocument();
    expect(screen.getByText(/field service management/i)).toBeInTheDocument();
  });
});