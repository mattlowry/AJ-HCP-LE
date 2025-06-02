import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary, { ComponentErrorBoundary, PageErrorBoundary } from './ErrorBoundary';

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Test component that works normally
const WorkingComponent: React.FC = () => {
  return <div>Working component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred in this component. Don\'t worry, your data is safe.')).toBeInTheDocument();
  });

  it('should show both retry and reload buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should handle retry button click', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    // Click should not throw error
    expect(() => fireEvent.click(retryButton)).not.toThrow();
  });

  it('should use default error messages', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('⚠️ Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred in this component. Don\'t worry, your data is safe.')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error message should be visible in development
    expect(screen.getByText('Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include error ID when available', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show an error ID
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
  });
});

describe('ComponentErrorBoundary', () => {
  it('should render with component-specific styling', () => {
    render(
      <ComponentErrorBoundary>
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('Component encountered an error')).toBeInTheDocument();
  });

  it('should use default fallback UI for component errors', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <ThrowError />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('TestComponent encountered an error')).toBeInTheDocument();
  });
});

describe('PageErrorBoundary', () => {
  it('should render with page-specific styling', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText('🚨 Page Error')).toBeInTheDocument();
    expect(screen.getByText(/page encountered an error and couldn't load properly/)).toBeInTheDocument();
  });

  it('should provide page-specific actions', () => {
    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should reload page when button is clicked', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: mockReload
      },
      writable: true
    });

    render(
      <PageErrorBoundary>
        <ThrowError />
      </PageErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);
    
    expect(mockReload).toHaveBeenCalledTimes(1);
  });
});