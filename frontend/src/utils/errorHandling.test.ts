import { ErrorLogger, ErrorType, withErrorHandling } from './errorHandling';

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  
  beforeEach(() => {
    jest.clearAllMocks();
    errorLogger = ErrorLogger.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = { code: 'NETWORK_ERROR', message: 'Network failed' };
      const category = errorLogger.categorizeError(networkError);
      expect(category).toBe(ErrorType.NETWORK);
    });

    it('should categorize timeout errors correctly', () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout' };
      const category = errorLogger.categorizeError(timeoutError);
      expect(category).toBe(ErrorType.NETWORK);
    });

    it('should categorize validation errors correctly', () => {
      const validationError = { 
        response: { status: 422, data: { message: 'Validation failed' } }
      };
      const category = errorLogger.categorizeError(validationError);
      expect(category).toBe(ErrorType.VALIDATION);
    });

    it('should categorize authentication errors correctly', () => {
      const authError = { 
        response: { status: 401, data: { message: 'Unauthorized' } }
      };
      const category = errorLogger.categorizeError(authError);
      expect(category).toBe(ErrorType.AUTHENTICATION);
    });

    it('should categorize authorization errors correctly', () => {
      const authzError = { 
        response: { status: 403, data: { message: 'Forbidden' } }
      };
      const category = errorLogger.categorizeError(authzError);
      expect(category).toBe(ErrorType.AUTHORIZATION);
    });

    it('should categorize server errors correctly', () => {
      const serverError = { 
        response: { status: 500, data: { message: 'Internal Server Error' } }
      };
      const category = errorLogger.categorizeError(serverError);
      expect(category).toBe(ErrorType.SERVER);
    });

    it('should categorize unknown errors as UNKNOWN', () => {
      const unknownError = { message: 'Something went wrong' };
      const category = errorLogger.categorizeError(unknownError);
      expect(category).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      // Mock console methods
      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'log').mockImplementation();
    });

    it('should log error with correct details', () => {
      const errorDetails = {
        message: 'Test error',
        userMessage: 'Something went wrong',
        component: 'TestComponent',
        action: 'testAction'
      };

      const loggedError = errorLogger.logError(errorDetails);

      expect(loggedError.id).toBeDefined();
      expect(loggedError.timestamp).toBeDefined();
      expect(loggedError.message).toBe('Test error');
      expect(loggedError.userMessage).toBe('Something went wrong');
      expect(loggedError.component).toBe('TestComponent');
      expect(loggedError.action).toBe('testAction');
      expect(loggedError.type).toBe(ErrorType.UNKNOWN);
    });

    it('should categorize error based on error object', () => {
      const errorDetails = {
        message: 'Network error',
        userMessage: 'Connection failed',
        error: { code: 'NETWORK_ERROR' }
      };

      const loggedError = errorLogger.logError(errorDetails);
      expect(loggedError.type).toBe(ErrorType.NETWORK);
    });

    it('should include stack trace if available', () => {
      const error = new Error('Test error');
      const errorDetails = {
        message: 'Test error',
        userMessage: 'Something went wrong',
        error
      };

      const loggedError = errorLogger.logError(errorDetails);
      expect(loggedError.stack).toBe(error.stack);
    });
  });

  describe('handleError', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation();
    });

    it('should handle error and return error details', () => {
      const error = new Error('Test error');
      const context = {
        component: 'TestComponent',
        action: 'testAction',
        userMessage: 'Something went wrong'
      };

      const errorDetails = errorLogger.handleError(error, context);

      expect(errorDetails.message).toBe('Test error');
      expect(errorDetails.component).toBe('TestComponent');
      expect(errorDetails.action).toBe('testAction');
      expect(errorDetails.userMessage).toBe('Something went wrong');
    });

    it('should handle axios errors with response', () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        },
        message: 'Request failed'
      };

      const errorDetails = errorLogger.handleError(axiosError);
      expect(errorDetails.type).toBe(ErrorType.VALIDATION);
      expect(errorDetails.httpStatus).toBe(400);
    });
  });
});

describe('withErrorHandling', () => {
  let mockAsyncFunction: jest.Mock;
  let errorLogger: ErrorLogger;

  beforeEach(() => {
    mockAsyncFunction = jest.fn();
    errorLogger = ErrorLogger.getInstance();
    jest.spyOn(errorLogger, 'handleError').mockImplementation(() => ({
      id: 'test-id',
      timestamp: new Date().toISOString(),
      message: 'Test error',
      userMessage: 'Something went wrong',
      type: ErrorType.UNKNOWN,
      component: 'TestComponent'
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute function successfully when no error occurs', async () => {
    const expectedResult = { data: 'success' };
    mockAsyncFunction.mockResolvedValue(expectedResult);

    const wrappedFunction = withErrorHandling(mockAsyncFunction, {
      component: 'TestComponent',
      action: 'testAction'
    });

    const result = await wrappedFunction();
    expect(result).toEqual(expectedResult);
    expect(mockAsyncFunction).toHaveBeenCalledTimes(1);
  });

  it('should handle errors and rethrow them', async () => {
    const error = new Error('Test error');
    mockAsyncFunction.mockRejectedValue(error);

    const wrappedFunction = withErrorHandling(mockAsyncFunction, {
      component: 'TestComponent',
      action: 'testAction'
    });

    await expect(wrappedFunction()).rejects.toThrow('Test error');
    expect(errorLogger.handleError).toHaveBeenCalledWith(error, {
      component: 'TestComponent',
      action: 'testAction'
    });
  });

  it('should pass arguments to wrapped function', async () => {
    const expectedResult = { data: 'success' };
    mockAsyncFunction.mockResolvedValue(expectedResult);

    const wrappedFunction = withErrorHandling(mockAsyncFunction, {
      component: 'TestComponent'
    });

    await wrappedFunction('arg1', 'arg2', 123);
    expect(mockAsyncFunction).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });
});