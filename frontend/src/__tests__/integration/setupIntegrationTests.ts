// Setup file for integration tests
// This file configures the testing environment for integration tests

import '@testing-library/jest-dom';

// Mock console methods to reduce noise in test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Mock console.error to avoid React error boundary noise
  console.error = jest.fn((message) => {
    // Only suppress specific React error boundary messages
    if (
      typeof message === 'string' &&
      (message.includes('Error boundaries should not be used for') ||
       message.includes('Warning: ReactDOM.render is no longer supported'))
    ) {
      return;
    }
    originalError(message);
  });

  // Mock console.warn for less critical warnings
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    assign: jest.fn(),
    reload: jest.fn(),
    replace: jest.fn(),
  },
  writable: true,
});

// Mock HTMLElement methods that might not be available in jsdom
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.scrollIntoView = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
  HTMLElement.prototype.hasPointerCapture = jest.fn();
}

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Setup for Material-UI date pickers
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: class MockAdapterDateFns {
    date() {
      return new Date();
    }
    isValid() {
      return true;
    }
    format() {
      return '2024-01-15';
    }
  }
}));

// Mock react-router-dom for integration tests
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
}));

// Global test timeout for integration tests
jest.setTimeout(10000);

// Enhanced error handling for async tests
global.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Helper function for testing async operations
global.waitForLoadingToFinish = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 100);
  });
};

// Mock service worker for integration tests if needed
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'navigator', {
    value: {
      ...window.navigator,
      serviceWorker: {
        register: jest.fn(),
        ready: Promise.resolve({
          unregister: jest.fn(),
        }),
      },
    },
    writable: true,
  });
}

// Setup for file upload testing
Object.defineProperty(global, 'File', {
  value: class MockFile {
    constructor(parts, filename, properties) {
      this.name = filename;
      this.size = parts.reduce((acc, part) => acc + part.length, 0);
      this.type = properties?.type || '';
    }
  },
});

Object.defineProperty(global, 'FileReader', {
  value: class MockFileReader {
    readAsDataURL() {
      this.onload({ target: { result: 'data:image/jpeg;base64,mock-data' } });
    }
  },
});

// Helper to create mock API responses
global.createMockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Helper to create mock API error
global.createMockApiError = (message, status = 500) => ({
  response: {
    status,
    data: { message },
    statusText: status === 500 ? 'Internal Server Error' : 'Error',
  },
  message,
});

// Custom render helper for integration tests
export const renderWithProviders = (ui, options = {}) => {
  const { initialState, ...renderOptions } = options;
  
  const Wrapper = ({ children }) => {
    return (
      <BrowserRouter>
        <AuthProvider initialState={initialState}>
          {children}
        </AuthProvider>
      </BrowserRouter>
    );
  };
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper for testing form validation
export const expectValidationError = async (container, fieldName, errorMessage) => {
  await waitFor(() => {
    const errorElement = container.querySelector(`[data-testid="${fieldName}-error"]`) ||
                        container.querySelector(`[id="${fieldName}-helper-text"]`);
    expect(errorElement).toHaveTextContent(errorMessage);
  });
};

// Helper for testing loading states
export const expectLoadingState = (container) => {
  expect(
    container.querySelector('[data-testid="loading"]') ||
    container.querySelector('.MuiCircularProgress-root') ||
    screen.getByText(/loading/i)
  ).toBeInTheDocument();
};

// Helper for testing error states
export const expectErrorState = (container, errorMessage) => {
  expect(
    container.querySelector('[data-testid="error"]') ||
    screen.getByText(new RegExp(errorMessage, 'i'))
  ).toBeInTheDocument();
};

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset localStorage mock
  if (window.localStorage.clear) {
    window.localStorage.clear();
  }
  
  // Reset any global state
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});