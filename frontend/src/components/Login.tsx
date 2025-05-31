import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { validateForm, commonValidationRules } from '../utils/validation';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateLoginForm = () => {
    const validationRules = {
      username: { required: true, minLength: 3 },
      password: { required: true, minLength: 6 }
    };
    
    const result = validateForm(formData, validationRules);
    setFormErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }

    setSubmitting(true);
    
    try {
      const success = await login(formData.username, formData.password);
      
      if (success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = (username: string) => {
    setFormData({
      username: username,
      password: `${username}123`
    });
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="grey.100"
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper 
        elevation={10}
        sx={{ 
          maxWidth: 900, 
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Grid container>
          {/* Left Side - Branding */}
          <Grid 
            item 
            xs={12} 
            md={6} 
            sx={{
              background: 'linear-gradient(45deg, #1565c0 0%, #1976d2 100%)',
              color: 'white',
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <BusinessIcon sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
            <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
              AJ Long Electric
            </Typography>
            <Typography variant="h6" textAlign="center" sx={{ opacity: 0.9 }}>
              Field Service Management
            </Typography>
            <Typography variant="body1" textAlign="center" sx={{ mt: 2, opacity: 0.8 }}>
              Streamline your electrical service operations with our comprehensive management platform
            </Typography>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Sign in to access your dashboard
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Demo Accounts
                </Typography>
              </Divider>

              {/* Demo Account Cards */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { boxShadow: 3 },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    onClick={() => handleDemoLogin('admin')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                        Admin
                      </Typography>
                      <Typography variant="caption" display="block">
                        Full Access
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { boxShadow: 3 },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    onClick={() => handleDemoLogin('manager')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                        Manager
                      </Typography>
                      <Typography variant="caption" display="block">
                        Management
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { boxShadow: 3 },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    onClick={() => handleDemoLogin('technician')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                        Technician
                      </Typography>
                      <Typography variant="caption" display="block">
                        Field Work
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      '&:hover': { boxShadow: 3 },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    onClick={() => handleDemoLogin('customer')}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="warning.main">
                        Customer
                      </Typography>
                      <Typography variant="caption" display="block">
                        Limited View
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 2 }}>
                Click any demo account card to auto-fill credentials
              </Typography>

              <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ mt: 3 }}>
                Don't have an account?{' '}
                <Button variant="text" onClick={() => navigate('/register')}>
                  Create Account
                </Button>
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Login;