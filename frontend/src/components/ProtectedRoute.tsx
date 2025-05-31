import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'technician' | 'customer' | 'manager'>;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['admin', 'technician', 'customer', 'manager'],
  requireAuth = true 
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.50"
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if user is authenticated
  if (isAuthenticated && user && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return (
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="400px"
          textAlign="center"
          p={3}
        >
          <Typography variant="h4" color="error" gutterBottom>
            🚫 Access Denied
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            You don't have permission to access this page
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your role: <strong>{user.role}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Required roles: {allowedRoles.join(', ')}
          </Typography>
        </Box>
      );
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;