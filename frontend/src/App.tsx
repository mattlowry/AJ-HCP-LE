import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<UserRegistration />} />
              
              {/* Protected Routes with Main Layout */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="customers" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                    <CustomerList />
                  </ProtectedRoute>
                } />
                <Route path="customers/new" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <CustomerDetail />
                  </ProtectedRoute>
                } />
                <Route path="customers/:id" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                    <CustomerDetail />
                  </ProtectedRoute>
                } />
                <Route path="scheduling" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                    <SchedulingCalendar />
                  </ProtectedRoute>
                } />
                <Route path="jobs" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                    <JobList />
                  </ProtectedRoute>
                } />
                <Route path="billing" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <BillingInvoices />
                  </ProtectedRoute>
                } />
                <Route path="inventory" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager', 'technician']}>
                    <InventoryManagement />
                  </ProtectedRoute>
                } />
                <Route path="analytics" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                } />
                <Route path="technicians" element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <TechnicianManagement />
                  </ProtectedRoute>
                } />
                <Route path="validation-demo" element={<ValidationDemo />} />
                <Route path="profile" element={<UserProfile />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
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
