import { errorLogger, ErrorType, withErrorHandling } from './errorHandling';

describe('ErrorLogger', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    errorLogger.clearErrors();
  });

  describe('errorLogger instance', () => {
    it('should be available as singleton', () => {
      expect(errorLogger).toBeDefined();
      expect(typeof errorLogger.logError).toBe('function');
    });
  });

  describe('logError', () => {
    it('should log an error with correct details', () => {
      const error = {
        message: 'Test error',
        userMessage: 'Something went wrong',
        type: ErrorType.NETWORK
      };
      
      const loggedError = errorLogger.logError(error);
      
      expect(loggedError.message).toBe('Test error');
      expect(loggedError.userMessage).toBe('Something went wrong');
      expect(loggedError.type).toBe(ErrorType.NETWORK);
      expect(loggedError.id).toBeDefined();
    });

    it('should store error in history', () => {
      const error = {
        message: 'Test error',
        userMessage: 'Something went wrong'
      };
      
      errorLogger.logError(error);
      const errors = errorLogger.getErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
    });

    it('should generate unique error IDs', () => {
      const error1 = errorLogger.logError({
        message: 'Error 1',
        userMessage: 'Error 1'
      });
      
      const error2 = errorLogger.logError({
        message: 'Error 2', 
        userMessage: 'Error 2'
      });
      
      expect(error1.id).not.toBe(error2.id);
    });

  });

  describe('getErrors', () => {
    it('should return filtered errors by type', () => {
      errorLogger.logError({
        message: 'Network error',
        userMessage: 'Connection failed',
        type: ErrorType.NETWORK
      });
      
      errorLogger.logError({
        message: 'Validation error',
        userMessage: 'Invalid input',
        type: ErrorType.VALIDATION
      });

      const networkErrors = errorLogger.getErrors({ type: ErrorType.NETWORK });
      expect(networkErrors).toHaveLength(1);
      expect(networkErrors[0].type).toBe(ErrorType.NETWORK);
    });

    it('should clear errors', () => {
      errorLogger.logError({
        message: 'Test error',
        userMessage: 'Test message'
      });
      
      expect(errorLogger.getErrors()).toHaveLength(1);
      errorLogger.clearErrors();
      expect(errorLogger.getErrors()).toHaveLength(0);
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
      expect(errorDetails.type).toBe(ErrorType.BUSINESS_LOGIC);
      expect(errorDetails.metadata?.status).toBe(400);
    });
  });
});

describe('withErrorHandling', () => {
  let mockAsyncFunction: jest.Mock;

  beforeEach(() => {
    mockAsyncFunction = jest.fn();
    jest.spyOn(errorLogger, 'handleError').mockImplementation(() => ({
      id: 'test-id',
      timestamp: new Date(),
      message: 'Test error',
      userMessage: 'Something went wrong',
      type: ErrorType.SYSTEM,
      severity: 'MEDIUM' as any
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