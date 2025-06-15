import React, { useState, useEffect } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  Button, 
  Box, 
  Collapse,
  Typography 
} from '@mui/material';
import { errorLogger, ErrorDetails, ErrorSeverity } from '../utils/errorHandling';

const GlobalErrorHandler: React.FC = () => {
  // Commented out unused errors state for build optimization
  // const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Subscribe to error events
    const unsubscribe = errorLogger.onError((error) => {
      // setErrors(prev => [error, ...prev.slice(0, 4)]); // Keep last 5 errors - commented out for build optimization
      
      // Auto-show high priority errors
      if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
        setCurrentError(error);
      }
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    setCurrentError(null);
    setShowDetails(false);
  };

  const handleShowDetails = () => {
    setShowDetails(!showDetails);
  };

  const getSeverityProps = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return { severity: 'error' as const, color: '#d32f2f' };
      case ErrorSeverity.HIGH:
        return { severity: 'error' as const, color: '#f57c00' };
      case ErrorSeverity.MEDIUM:
        return { severity: 'warning' as const, color: '#ed6c02' };
      case ErrorSeverity.LOW:
        return { severity: 'info' as const, color: '#0288d1' };
      default:
        return { severity: 'info' as const, color: '#0288d1' };
    }
  };

  const getAutoHideDuration = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return null; // Never auto-hide
      case ErrorSeverity.HIGH:
        return 8000;
      case ErrorSeverity.MEDIUM:
        return 6000;
      case ErrorSeverity.LOW:
        return 4000;
      default:
        return 6000;
    }
  };

  if (!currentError) {
    return null;
  }

  const severityProps = getSeverityProps(currentError.severity);
  const autoHideDuration = getAutoHideDuration(currentError.severity);

  return (
    <Snackbar
      open={!!currentError}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }} // Below the app bar
    >
      <Alert
        severity={severityProps.severity}
        onClose={handleClose}
        sx={{ 
          minWidth: 300,
          maxWidth: 500,
          '& .MuiAlert-message': { width: '100%' }
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {process.env.NODE_ENV === 'development' && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleShowDetails}
              >
                {showDetails ? 'Hide' : 'Details'}
              </Button>
            )}
          </Box>
        }
      >
        <AlertTitle>
          {currentError.severity === ErrorSeverity.CRITICAL && '🚨 Critical Error'}
          {currentError.severity === ErrorSeverity.HIGH && '⚠️ Error'}
          {currentError.severity === ErrorSeverity.MEDIUM && '⚠️ Warning'}
          {currentError.severity === ErrorSeverity.LOW && 'ℹ️ Notice'}
        </AlertTitle>
        
        <Typography variant="body2">
          {currentError.userMessage}
        </Typography>

        {process.env.NODE_ENV === 'development' && (
          <Collapse in={showDetails}>
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Error ID:</strong> {currentError.id}
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Type:</strong> {currentError.type}
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Component:</strong> {currentError.component || 'Unknown'}
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Action:</strong> {currentError.action || 'Unknown'}
              </Typography>
              <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                <strong>Message:</strong> {currentError.message}
              </Typography>
              {currentError.metadata && (
                <Typography variant="caption" component="div">
                  <strong>Metadata:</strong> {JSON.stringify(currentError.metadata, null, 2)}
                </Typography>
              )}
            </Box>
          </Collapse>
        )}
      </Alert>
    </Snackbar>
  );
};

// Error Statistics Component (for development/admin)
export const ErrorStats: React.FC = () => {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);

  useEffect(() => {
    const unsubscribe = errorLogger.onError(() => {
      setErrors(errorLogger.getErrors({ limit: 20 }));
    });

    // Initial load
    setErrors(errorLogger.getErrors({ limit: 20 }));

    return unsubscribe;
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 1000 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => console.table(errors)}
        disabled={errors.length === 0}
      >
        Errors: {errors.length}
      </Button>
    </Box>
  );
};

export default GlobalErrorHandler;