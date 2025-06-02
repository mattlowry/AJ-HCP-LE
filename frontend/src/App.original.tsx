import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary, { PageErrorBoundary } from './components/ErrorBoundary';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import SchedulingCalendar from './components/SchedulingCalendar';
import JobList from './components/JobList';
import BillingInvoices from './components/BillingInvoices';
import InventoryManagement from './components/InventoryManagement';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TechnicianManagement from './components/TechnicianManagement';
import ValidationDemo from './components/ValidationDemo';
import Login from './components/Login';
import UserRegistration from './components/UserRegistration';
import UserProfile from './components/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

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
                <Route path="/login" element={
                  <PageErrorBoundary pageName="Login">
                    <Login />
                  </PageErrorBoundary>
                } />
                <Route path="/register" element={
                  <PageErrorBoundary pageName="Registration">
                    <UserRegistration />
                  </PageErrorBoundary>
                } />
                
                {/* Protected Routes with Main Layout */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <ErrorBoundary component="MainLayout">
                      <MainLayout />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <PageErrorBoundary pageName="Dashboard">
                      <Dashboard />
                    </PageErrorBoundary>
                  } />
                  <Route path="customers" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <PageErrorBoundary pageName="Customer List">
                        <CustomerList />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="customers/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <PageErrorBoundary pageName="New Customer">
                        <CustomerDetail />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="customers/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <PageErrorBoundary pageName="Customer Details">
                        <CustomerDetail />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="scheduling" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <PageErrorBoundary pageName="Scheduling">
                        <SchedulingCalendar />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="jobs" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <PageErrorBoundary pageName="Jobs">
                        <JobList />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="billing" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <PageErrorBoundary pageName="Billing">
                        <BillingInvoices />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="inventory" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                      <PageErrorBoundary pageName="Inventory">
                        <InventoryManagement />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <PageErrorBoundary pageName="Analytics">
                        <AnalyticsDashboard />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="technicians" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <PageErrorBoundary pageName="Technicians">
                        <TechnicianManagement />
                      </PageErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="validation-demo" element={
                    <PageErrorBoundary pageName="Validation Demo">
                      <ValidationDemo />
                    </PageErrorBoundary>
                  } />
                  <Route path="profile" element={
                    <PageErrorBoundary pageName="Profile">
                      <UserProfile />
                    </PageErrorBoundary>
                  } />
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
