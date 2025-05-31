// Centralized Error Handling and Logging System
// This module provides consistent error handling, logging, and user feedback across the application

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  USER_INPUT = 'USER_INPUT'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetails {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  stack?: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: ErrorDetails[] = [];
  private listeners: ((error: ErrorDetails) => void)[] = [];

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  // Log an error with full details
  logError(error: Partial<ErrorDetails> & { message: string; userMessage: string }): ErrorDetails {
    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      type: error.type || ErrorType.SYSTEM,
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: new Date(),
      userId: error.userId,
      component: error.component,
      action: error.action,
      metadata: error.metadata,
      stack: error.stack || new Error().stack
    };

    // Store error locally
    this.errors.push(errorDetails);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error ${errorDetails.severity}: ${errorDetails.type}`);
      console.error('Message:', errorDetails.message);
      console.error('User Message:', errorDetails.userMessage);
      console.error('Component:', errorDetails.component);
      console.error('Action:', errorDetails.action);
      console.error('Metadata:', errorDetails.metadata);
      console.error('Stack:', errorDetails.stack);
      console.groupEnd();
    }

    // In production, would send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(errorDetails);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(errorDetails));

    return errorDetails;
  }

  // Simplified error logging for common cases
  logNetworkError(message: string, userMessage: string, metadata?: Record<string, any>): ErrorDetails {
    return this.logError({
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.HIGH,
      message,
      userMessage,
      metadata
    });
  }

  logValidationError(message: string, userMessage: string, metadata?: Record<string, any>): ErrorDetails {
    return this.logError({
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      message,
      userMessage,
      metadata
    });
  }

  logAuthError(message: string, userMessage: string = 'Authentication required. Please log in again.'): ErrorDetails {
    return this.logError({
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message,
      userMessage
    });
  }

  logBusinessError(message: string, userMessage: string, metadata?: Record<string, any>): ErrorDetails {
    return this.logError({
      type: ErrorType.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage,
      metadata
    });
  }

  // Handle JavaScript errors and API errors
  handleError(error: any, context: { component?: string; action?: string; userMessage?: string } = {}): ErrorDetails {
    let errorType = ErrorType.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let message = 'Unknown error occurred';
    let userMessage = context.userMessage || 'An unexpected error occurred. Please try again.';

    if (error?.response) {
      // API Error
      errorType = ErrorType.NETWORK;
      message = `API Error: ${error.response.status} - ${error.response.statusText}`;
      
      if (error.response.status === 401) {
        errorType = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        userMessage = 'Your session has expired. Please log in again.';
      } else if (error.response.status === 403) {
        errorType = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        userMessage = 'You do not have permission to perform this action.';
      } else if (error.response.status === 404) {
        severity = ErrorSeverity.LOW;
        userMessage = 'The requested resource was not found.';
      } else if (error.response.status === 422) {
        errorType = ErrorType.VALIDATION;
        severity = ErrorSeverity.LOW;
        userMessage = 'Please check your input and try again.';
      } else if (error.response.status >= 500) {
        severity = ErrorSeverity.HIGH;
        userMessage = 'Server error occurred. Our team has been notified.';
      }
    } else if (error?.request) {
      // Network Error
      errorType = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      message = 'Network request failed';
      userMessage = 'Network connection error. Please check your internet connection.';
    } else if (error instanceof Error) {
      // JavaScript Error
      message = error.message;
      userMessage = context.userMessage || 'An unexpected error occurred. Please try again.';
    } else if (typeof error === 'string') {
      message = error;
    }

    return this.logError({
      type: errorType,
      severity,
      message,
      userMessage,
      component: context.component,
      action: context.action,
      metadata: {
        originalError: error,
        errorName: error?.name,
        errorCode: error?.code,
        url: error?.config?.url,
        method: error?.config?.method
      },
      stack: error?.stack
    });
  }

  // Subscribe to error events
  onError(callback: (error: ErrorDetails) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get error history
  getErrors(filter?: { type?: ErrorType; severity?: ErrorSeverity; limit?: number }): ErrorDetails[] {
    let filtered = this.errors;

    if (filter?.type) {
      filtered = filtered.filter(error => error.type === filter.type);
    }

    if (filter?.severity) {
      filtered = filtered.filter(error => error.severity === filter.severity);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Clear error history
  clearErrors(): void {
    this.errors = [];
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToExternalLogger(error: ErrorDetails): void {
    // In production, send to external logging service like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging endpoint
    
    try {
      // Example: Send to custom logging endpoint
      // fetch('/api/logs/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error)
      // });
    } catch (loggingError) {
      console.error('Failed to send error to external logger:', loggingError);
    }
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance();

// Utility functions for common error handling patterns
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { component?: string; action?: string; userMessage?: string } = {}
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      errorLogger.handleError(error, context);
      return null;
    }
  };
};

export const withSyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  context: { component?: string; action?: string; userMessage?: string } = {}
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      errorLogger.handleError(error, context);
      return null;
    }
  };
};

// User-friendly error messages
export const ERROR_MESSAGES = {
  NETWORK: {
    CONNECTION_FAILED: 'Unable to connect to the server. Please check your internet connection.',
    TIMEOUT: 'The request timed out. Please try again.',
    SERVER_ERROR: 'Server error occurred. Our team has been notified.'
  },
  AUTHENTICATION: {
    EXPIRED_SESSION: 'Your session has expired. Please log in again.',
    INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.'
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_FORMAT: 'Please enter a valid format.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PHONE: 'Please enter a valid phone number.'
  },
  BUSINESS_LOGIC: {
    JOB_NOT_FOUND: 'The requested job could not be found.',
    CUSTOMER_NOT_FOUND: 'The requested customer could not be found.',
    ESTIMATE_EXPIRED: 'This estimate has expired and cannot be modified.',
    INSUFFICIENT_INVENTORY: 'Not enough inventory available for this item.'
  }
};