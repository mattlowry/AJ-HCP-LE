import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  InputAdornment,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { validateForm, validationPatterns } from '../utils/validation';

interface RegistrationFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: 'technician' | 'customer';
  phone?: string;
  companyName?: string;
}

const UserRegistration: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'customer',
    phone: '',
    companyName: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const handleInputChange = (field: keyof RegistrationFormData) => (
    event: React.ChangeEvent<HTMLInputElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value as string;
    setFormData(prev => ({
      ...prev,
      [field]: value
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

  const validateRegistrationForm = () => {
    const validationRules = {
      username: { required: true, minLength: 3 },
      email: { required: true, pattern: validationPatterns.email },
      password: { required: true, minLength: 8 },
      confirmPassword: { required: true, minLength: 8 },
      firstName: { required: true, minLength: 2 },
      lastName: { required: true, minLength: 2 },
      role: { required: true }
    };
    
    const result = validateForm(formData, validationRules);
    
    // Custom validation for password confirmation
    if (formData.password !== formData.confirmPassword) {
      result.errors.confirmPassword = 'Passwords do not match';
      result.isValid = false;
    }
    
    setFormErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateRegistrationForm()) {
      return;
    }

    setSubmitting(true);
    
    try {
      // Simulate API call for registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Registration data:', formData);
      setRegistrationSuccess(true);
      
      // Redirect to login after successful registration
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Registration error:', error);
      setFormErrors({ general: 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (registrationSuccess) {
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
        <Card sx={{ maxWidth: 500, textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              ✅ Registration Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Your account has been created successfully.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to login page...
            </Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </CardContent>
        </Card>
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
          maxWidth: 600, 
          width: '100%',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => navigate('/login')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Create Account
            </Typography>
          </Box>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Join AJ Long Electric Field Service Management
          </Typography>

          {formErrors.general && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formErrors.general}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  error={!!formErrors.firstName}
                  helperText={formErrors.firstName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  error={!!formErrors.lastName}
                  helperText={formErrors.lastName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={!!formErrors.password}
                  helperText={formErrors.password || 'Minimum 8 characters'}
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
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  error={!!formErrors.confirmPassword}
                  helperText={formErrors.confirmPassword}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={formData.role}
                    label="Account Type"
                    onChange={handleInputChange('role')}
                  >
                    <MenuItem value="customer">Customer</MenuItem>
                    <MenuItem value="technician">Technician</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {formData.role === 'customer' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Name (Optional)"
                    value={formData.companyName}
                    onChange={handleInputChange('companyName')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BusinessIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>

            <Typography variant="body2" textAlign="center" color="text.secondary">
              Already have an account?{' '}
              <Button variant="text" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserRegistration;