import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary, { PageErrorBoundary } from './components/ErrorBoundary';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const CustomerList = lazy(() => import('./components/CustomerList'));
const CustomerDetail = lazy(() => import('./components/CustomerDetail'));
const SchedulingCalendar = lazy(() => import('./components/SchedulingCalendar'));
const JobList = lazy(() => import('./components/JobList'));
const BillingInvoices = lazy(() => import('./components/BillingInvoices'));
const InventoryManagement = lazy(() => import('./components/InventoryManagement'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const TechnicianManagement = lazy(() => import('./components/TechnicianManagement'));
const ValidationDemo = lazy(() => import('./components/ValidationDemo'));
const Login = lazy(() => import('./components/Login'));
const UserRegistration = lazy(() => import('./components/UserRegistration'));
const UserProfile = lazy(() => import('./components/UserProfile'));

// Preload critical components
const preloadCriticalComponents = () => {
  // Preload dashboard and navigation components that users will likely need first
  import('./components/Dashboard');
  import('./components/CustomerList');
  import('./components/JobList');
};

// Start preloading on app initialization
if (typeof window !== 'undefined') {
  // Preload after a short delay to not impact initial load
  setTimeout(preloadCriticalComponents, 100);
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#4A90E2',
      light: '#7BB3E8',
      dark: '#2E5A8A',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#FF6B6B',
      light: '#FF9999',
      dark: '#E55555',
      contrastText: '#ffffff',
    },
    success: {
      main: '#51C878',
      light: '#7ED199',
      dark: '#3A9B5C',
    },
    warning: {
      main: '#FFD93D',
      light: '#FFE066',
      dark: '#E6C234',
    },
    info: {
      main: '#74B9FF',
      light: '#A8D1FF',
      dark: '#5A9FE6',
    },
    background: {
      default: '#FAFBFC',
      paper: '#FFFFFF',
    },
    grey: {
      50: '#F8F9FA',
      100: '#F1F3F4',
      200: '#E8EAED',
      300: '#DADCE0',
      400: '#BDC1C6',
      500: '#9AA0A6',
      600: '#80868B',
      700: '#5F6368',
      800: '#3C4043',
      900: '#202124',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 2px 8px rgba(0, 0, 0, 0.04)',
    '0px 4px 12px rgba(0, 0, 0, 0.06)',
    '0px 6px 16px rgba(0, 0, 0, 0.08)',
    '0px 8px 20px rgba(0, 0, 0, 0.10)',
    '0px 10px 24px rgba(0, 0, 0, 0.12)',
    '0px 12px 28px rgba(0, 0, 0, 0.14)',
    '0px 14px 32px rgba(0, 0, 0, 0.16)',
    '0px 16px 36px rgba(0, 0, 0, 0.18)',
    '0px 18px 40px rgba(0, 0, 0, 0.20)',
    '0px 20px 44px rgba(0, 0, 0, 0.22)',
    '0px 22px 48px rgba(0, 0, 0, 0.24)',
    '0px 24px 52px rgba(0, 0, 0, 0.26)',
    '0px 26px 56px rgba(0, 0, 0, 0.28)',
    '0px 28px 60px rgba(0, 0, 0, 0.30)',
    '0px 30px 64px rgba(0, 0, 0, 0.32)',
    '0px 32px 68px rgba(0, 0, 0, 0.34)',
    '0px 34px 72px rgba(0, 0, 0, 0.36)',
    '0px 36px 76px rgba(0, 0, 0, 0.38)',
    '0px 38px 80px rgba(0, 0, 0, 0.40)',
    '0px 40px 84px rgba(0, 0, 0, 0.42)',
    '0px 42px 88px rgba(0, 0, 0, 0.44)',
    '0px 44px 92px rgba(0, 0, 0, 0.46)',
    '0px 46px 96px rgba(0, 0, 0, 0.48)',
    '0px 48px 100px rgba(0, 0, 0, 0.50)',
  ],
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
  },
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '12px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.12)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5A9FE6 0%, #4589CC 100%)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(74, 144, 226, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FAFBFC',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#F5F7FA',
            },
            '&.Mui-focused': {
              backgroundColor: '#FFFFFF',
              boxShadow: '0px 0px 0px 3px rgba(74, 144, 226, 0.1)',
            },
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.08)',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(74, 144, 226, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4A90E2',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '4px 8px',
        },
        filled: {
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          color: '#2E5A8A',
          border: '1px solid rgba(74, 144, 226, 0.2)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F8F9FA',
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#5F6368',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          padding: '16px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#202124',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: '#FAFBFC',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: 'rgba(74, 144, 226, 0.06)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            borderLeft: '3px solid #4A90E2',
            '&:hover': {
              backgroundColor: 'rgba(74, 144, 226, 0.12)',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(74, 144, 226, 0.08)',
            transform: 'scale(1.05)',
          },
        },
      },
    },
  },
});

// Optimized Suspense wrapper with consistent loading UI
const SuspenseWrapper: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <Suspense fallback={fallback || <LoadingSpinner />}>
    {children}
  </Suspense>
);

// Route wrapper with error boundary and suspense
const RouteWrapper: React.FC<{
  children: React.ReactNode;
  pageName: string;
  roles?: Array<'admin' | 'technician' | 'customer' | 'manager'>;
}> = ({ children, pageName, roles }) => (
  <SuspenseWrapper>
    <PageErrorBoundary pageName={pageName}>
      {roles ? (
        <ProtectedRoute allowedRoles={roles}>
          {children}
        </ProtectedRoute>
      ) : (
        children
      )}
    </PageErrorBoundary>
  </SuspenseWrapper>
);

function App() {
  try {
    return (
      <ErrorBoundary component="App">
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/login" 
                  element={
                    <RouteWrapper pageName="Login">
                      <Login />
                    </RouteWrapper>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <RouteWrapper pageName="Registration">
                      <UserRegistration />
                    </RouteWrapper>
                  } 
                />
                
                {/* Protected Routes with Main Layout */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary component="MainLayout">
                        <MainLayout />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                >
                  <Route 
                    index 
                    element={
                      <RouteWrapper pageName="Dashboard">
                        <Dashboard />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="customers" 
                    element={
                      <RouteWrapper 
                        pageName="Customer List"
                        roles={['admin', 'manager', 'technician']}
                      >
                        <CustomerList />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="customers/new" 
                    element={
                      <RouteWrapper 
                        pageName="New Customer"
                        roles={['admin', 'manager']}
                      >
                        <CustomerDetail />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="customers/:id" 
                    element={
                      <RouteWrapper 
                        pageName="Customer Details"
                        roles={['admin', 'manager', 'technician']}
                      >
                        <CustomerDetail />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="scheduling" 
                    element={
                      <RouteWrapper 
                        pageName="Scheduling"
                        roles={['admin', 'manager', 'technician']}
                      >
                        <SchedulingCalendar />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="jobs" 
                    element={
                      <RouteWrapper 
                        pageName="Jobs"
                        roles={['admin', 'manager', 'technician']}
                      >
                        <JobList />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="billing" 
                    element={
                      <RouteWrapper 
                        pageName="Billing"
                        roles={['admin', 'manager']}
                      >
                        <BillingInvoices />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="inventory" 
                    element={
                      <RouteWrapper 
                        pageName="Inventory"
                        roles={['admin', 'manager', 'technician']}
                      >
                        <InventoryManagement />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="analytics" 
                    element={
                      <RouteWrapper 
                        pageName="Analytics"
                        roles={['admin', 'manager']}
                      >
                        <AnalyticsDashboard />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="technicians" 
                    element={
                      <RouteWrapper 
                        pageName="Technicians"
                        roles={['admin', 'manager']}
                      >
                        <TechnicianManagement />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="validation-demo" 
                    element={
                      <RouteWrapper pageName="Validation Demo">
                        <ValidationDemo />
                      </RouteWrapper>
                    } 
                  />
                  
                  <Route 
                    path="profile" 
                    element={
                      <RouteWrapper pageName="Profile">
                        <UserProfile />
                      </RouteWrapper>
                    } 
                  />
                </Route>
              </Routes>
            </Router>
            <GlobalErrorHandler />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>AJ Long Electric FSM</h1>
        <p>Application loading error. Please check the console for details.</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  }
}

export default App;