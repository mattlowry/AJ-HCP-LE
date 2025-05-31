import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import ValidatedTextField from './ValidatedTextField';
import { validateForm, commonValidationRules } from '../utils/validation';

const ValidationDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    currency: '',
    duration: '',
    password: '',
    confirmPassword: '',
    priority: 'medium',
    description: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleFieldChange = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: event.target.value
    }));
  };

  const handleValidationChange = (field: string, isValid: boolean, error?: string) => {
    setValidationResults(prev => ({
      ...prev,
      [field]: isValid
    }));

    if (error) {
      setFormErrors(prev => ({
        ...prev,
        [field]: error
      }));
    } else {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    setSubmitAttempted(true);

    const validationRules = {
      customerName: commonValidationRules.customerName,
      email: commonValidationRules.email,
      phone: commonValidationRules.phone,
      address: commonValidationRules.address,
      currency: commonValidationRules.currency,
      duration: commonValidationRules.duration,
      password: commonValidationRules.strongPassword,
      confirmPassword: {
        required: true,
        custom: (value: string) => {
          if (value !== formData.password) {
            return 'Passwords do not match';
          }
          return null;
        }
      },
      description: commonValidationRules.description,
      priority: { required: true }
    };

    const result = validateForm(formData, validationRules);
    setFormErrors(result.errors);

    if (result.isValid) {
      alert('Form is valid! ✅\n\nData:\n' + JSON.stringify(formData, null, 2));
    } else {
      alert('Form has errors! ❌\n\nPlease fix the following:\n' + Object.values(result.errors).join('\n'));
    }
  };

  const getOverallValidation = () => {
    const totalFields = Object.keys(validationResults).length;
    const validFields = Object.values(validationResults).filter(Boolean).length;
    
    return {
      percentage: totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0,
      validCount: validFields,
      totalCount: totalFields
    };
  };

  const validation = getOverallValidation();

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🔍 Form Validation Demo
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        This form demonstrates comprehensive validation patterns including real-time validation, 
        formatting, and error handling. All validation rules are reusable across the application.
      </Typography>

      {/* Validation Summary */}
      <Card sx={{ mb: 3, bgcolor: validation.percentage === 100 ? 'success.light' : 'warning.light' }}>
        <CardContent>
          <Typography variant="h6">
            Validation Status: {validation.validCount}/{validation.totalCount} fields valid ({validation.percentage}%)
          </Typography>
          {submitAttempted && Object.keys(formErrors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {Object.keys(formErrors).length} validation error(s) found. Please check the form below.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Customer Name *"
            value={formData.customerName}
            onChange={handleFieldChange('customerName')}
            validationRules={commonValidationRules.customerName}
            onValidationChange={handleValidationChange}
            fieldName="customerName"
            showValidationIcon
            helperText="Enter customer's full name (2-100 characters)"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Email Address *"
            type="email"
            value={formData.email}
            onChange={handleFieldChange('email')}
            validationRules={commonValidationRules.email}
            onValidationChange={handleValidationChange}
            fieldName="email"
            showValidationIcon
            helperText="Valid email format required"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Phone Number *"
            value={formData.phone}
            onChange={handleFieldChange('phone')}
            validationRules={commonValidationRules.phone}
            onValidationChange={handleValidationChange}
            fieldName="phone"
            formatType="phone"
            showValidationIcon
            helperText="US phone format: (555) 123-4567"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={submitAttempted && !formData.priority}>
            <InputLabel>Priority *</InputLabel>
            <Select
              value={formData.priority}
              label="Priority *"
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="emergency">Emergency</MenuItem>
            </Select>
            {submitAttempted && !formData.priority && (
              <FormHelperText>Priority is required</FormHelperText>
            )}
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <ValidatedTextField
            fullWidth
            label="Address *"
            value={formData.address}
            onChange={handleFieldChange('address')}
            validationRules={commonValidationRules.address}
            onValidationChange={handleValidationChange}
            fieldName="address"
            showValidationIcon
            helperText="Complete street address (minimum 10 characters) - e.g., '123 Main Street'"
          />
        </Grid>

        {/* Financial Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Financial & Time Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Amount *"
            type="number"
            value={formData.currency}
            onChange={handleFieldChange('currency')}
            validationRules={commonValidationRules.currency}
            onValidationChange={handleValidationChange}
            fieldName="currency"
            formatType="currency"
            showValidationIcon
            helperText="Enter amount (minimum $0.00)"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Duration (hours) *"
            type="number"
            value={formData.duration}
            onChange={handleFieldChange('duration')}
            validationRules={commonValidationRules.duration}
            onValidationChange={handleValidationChange}
            fieldName="duration"
            showValidationIcon
            helperText="Duration in hours (0.5 - 24)"
            inputProps={{ min: 0.5, max: 24, step: 0.5 }}
          />
        </Grid>

        {/* Security Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Security Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Password *"
            type="password"
            value={formData.password}
            onChange={handleFieldChange('password')}
            validationRules={commonValidationRules.strongPassword}
            onValidationChange={handleValidationChange}
            fieldName="password"
            showValidationIcon
            helperText="Strong password: 8+ chars, uppercase, lowercase, number, special char"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ValidatedTextField
            fullWidth
            label="Confirm Password *"
            type="password"
            value={formData.confirmPassword}
            onChange={handleFieldChange('confirmPassword')}
            validationRules={{
              required: true,
              custom: (value: string) => {
                if (value !== formData.password) {
                  return 'Passwords do not match';
                }
                return null;
              }
            }}
            onValidationChange={handleValidationChange}
            fieldName="confirmPassword"
            showValidationIcon
            helperText="Must match the password above"
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <ValidatedTextField
            fullWidth
            multiline
            rows={4}
            label="Description *"
            value={formData.description}
            onChange={handleFieldChange('description')}
            validationRules={commonValidationRules.description}
            onValidationChange={handleValidationChange}
            fieldName="description"
            showValidationIcon
            helperText="Detailed description (10-1000 characters)"
          />
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              color={validation.percentage === 100 ? 'success' : 'primary'}
            >
              {validation.percentage === 100 ? '✅ Submit Valid Form' : '🔍 Validate Form'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                setFormData({
                  customerName: '',
                  email: '',
                  phone: '',
                  address: '',
                  currency: '',
                  duration: '',
                  password: '',
                  confirmPassword: '',
                  priority: 'medium',
                  description: ''
                });
                setFormErrors({});
                setValidationResults({});
                setSubmitAttempted(false);
              }}
            >
              🔄 Reset Form
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ValidationDemo;