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
const NewCustomerForm = lazy(() => import('./components/NewCustomerForm'));
const SchedulingCalendar = lazy(() => import('./components/SchedulingCalendar'));
const JobList = lazy(() => import('./components/JobList'));
const CreateJobForm = lazy(() => import('./components/CreateJobForm'));
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
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
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
                        <NewCustomerForm />
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
                    path="jobs/new" 
                    element={
                      <RouteWrapper 
                        pageName="Create Job"
                        roles={['admin', 'manager']}
                      >
                        <CreateJobForm />
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