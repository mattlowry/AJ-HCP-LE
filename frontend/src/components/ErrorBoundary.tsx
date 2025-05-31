import React, { Component, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { errorLogger, ErrorType, ErrorSeverity } from '../utils/errorHandling';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    const errorDetails = errorLogger.logError({
      type: ErrorType.SYSTEM,
      severity: ErrorSeverity.HIGH,
      message: `React Error Boundary: ${error.message}`,
      userMessage: 'A component error occurred. The page has been reset.',
      component: this.props.component || 'Unknown',
      action: 'Component Render',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      },
      stack: error.stack
    });

    this.setState({ errorId: errorDetails.id });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            m: 2, 
            textAlign: 'center',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff9800'
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" color="error" gutterBottom>
              ⚠️ Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              An unexpected error occurred in this component. Don't worry, your data is safe.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
                  {this.state.error.message}
                </Typography>
              </Alert>
            )}
            
            {this.state.errorId && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Error ID: {this.state.errorId}
              </Typography>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={this.handleRetry}
              color="primary"
            >
              Try Again
            </Button>
            <Button 
              variant="contained" 
              onClick={this.handleReload}
              color="primary"
            >
              Reload Page
            </Button>
          </Box>
        </Paper>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundaryComponent;
};

// Specialized error boundaries for different parts of the app
export const PageErrorBoundary: React.FC<{ children: ReactNode; pageName?: string }> = ({ 
  children, 
  pageName = 'Page' 
}) => (
  <ErrorBoundary
    component={`${pageName}Page`}
    fallback={
      <Box 
        sx={{ 
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 3
        }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          🚨 Page Error
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          The {pageName.toLowerCase()} page encountered an error and couldn't load properly.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          color="primary"
        >
          Reload Page
        </Button>
      </Box>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName?: string;
  minimal?: boolean;
}> = ({ 
  children, 
  componentName = 'Component',
  minimal = false 
}) => (
  <ErrorBoundary
    component={componentName}
    fallback={
      minimal ? (
        <Alert severity="error" sx={{ m: 1 }}>
          {componentName} failed to load
        </Alert>
      ) : (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 2, 
            m: 1, 
            textAlign: 'center',
            backgroundColor: '#ffebee'
          }}
        >
          <Typography variant="h6" color="error">
            Component Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {componentName} encountered an error
          </Typography>
        </Paper>
      )
    }
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;