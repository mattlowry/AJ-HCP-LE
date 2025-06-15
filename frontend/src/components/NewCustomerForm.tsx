import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  // Divider, // Removed unused import
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  // Phone as PhoneIcon, // Removed unused import
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services/api';
import { GoogleMapsProvider, Map, Marker, searchAddress } from '../services/GoogleMapsService';

interface NewCustomerFormData {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  mobile_phone: string;
  home_phone: string;
  work_phone: string;
  company: string;
  role: 'homeowner' | 'business';
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  address_notes: string;
  notes: string;
  send_notifications: boolean;
  do_not_service: boolean;
}

const NewCustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Map state
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [markerPosition, setMarkerPosition] = useState({ lat: 40.7128, lng: -74.0060 });
  
  const [formData, setFormData] = useState<NewCustomerFormData>({
    first_name: '',
    last_name: '',
    display_name: '',
    email: '',
    mobile_phone: '',
    home_phone: '',
    work_phone: '',
    company: '',
    role: 'homeowner',
    street: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
    address_notes: '',
    notes: '',
    send_notifications: true,
    do_not_service: false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewCustomerFormData, string>>>({});

  const handleInputChange = (field: keyof NewCustomerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Auto-update display name
    if (field === 'first_name' || field === 'last_name') {
      const firstName = field === 'first_name' ? value as string : formData.first_name;
      const lastName = field === 'last_name' ? value as string : formData.last_name;
      setFormData(prev => ({
        ...prev,
        display_name: `${firstName} ${lastName}`.trim()
      }));
    }
  };

  const handleAddressSearch = useCallback(async () => {
    const fullAddress = `${formData.street} ${formData.unit}, ${formData.city}, ${formData.state} ${formData.zip}`.trim();
    if (fullAddress.length > 5) {
      const coordinates = await searchAddress(fullAddress);
      if (coordinates) {
        setMapCenter(coordinates);
        setMarkerPosition(coordinates);
      }
    }
  }, [formData.street, formData.unit, formData.city, formData.state, formData.zip]);

  const handleMapAddressSelect = (address: string, coordinates: google.maps.LatLngLiteral) => {
    // Parse the address and update form fields
    const parts = address.split(', ');
    if (parts.length >= 3) {
      const streetPart = parts[0];
      const cityPart = parts[parts.length - 3];
      const stateZipPart = parts[parts.length - 2];
      
      const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(-\d{4})?)$/);
      
      setFormData(prev => ({
        ...prev,
        street: streetPart,
        city: cityPart,
        state: stateZipMatch ? stateZipMatch[1] : '',
        zip: stateZipMatch ? stateZipMatch[2] : ''
      }));
    }
    
    setMarkerPosition(coordinates);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewCustomerFormData, string>> = {};
    
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.mobile_phone.trim() && !formData.home_phone.trim() && !formData.work_phone.trim()) {
      newErrors.mobile_phone = 'At least one phone number is required';
    }
    if (!formData.street.trim()) newErrors.street = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zip.trim()) newErrors.zip = 'ZIP code is required';
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Transform data to match backend API
      const customerData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.mobile_phone || formData.home_phone || formData.work_phone,
        customer_type: formData.role === 'business' ? 'commercial' as const : 'residential' as const,
        street_address: `${formData.street}${formData.unit ? ` ${formData.unit}` : ''}`,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip,
        company_name: formData.role === 'business' ? formData.company : '',
        preferred_contact_method: 'email' as const,
        notes: formData.notes
      };
      
      const response = await customerApi.create(customerData);
      setSuccess('Customer created successfully!');
      
      // Navigate to customer detail page after short delay
      setTimeout(() => {
        navigate(`/customers/${response.data.id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating customer:', err);
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  React.useEffect(() => {
    // Search address when relevant fields change
    const timeoutId = setTimeout(() => {
      if (formData.street && formData.city && formData.state) {
        handleAddressSearch();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [formData.street, formData.city, formData.state, formData.zip, handleAddressSearch]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={handleCancel} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Add new customer
        </Typography>
        <Button
          variant="outlined"
          onClick={handleCancel}
          sx={{ mr: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Form Fields */}
        <Grid item xs={12} md={8}>
          {/* Contact Info Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  <EmailIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Contact info</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    error={!!errors.first_name}
                    helperText={errors.first_name}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    error={!!errors.last_name}
                    helperText={errors.last_name}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Mobile phone"
                    value={formData.mobile_phone}
                    onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                    error={!!errors.mobile_phone}
                    helperText={errors.mobile_phone}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Display name (shown on invoices)"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Home phone"
                    value={formData.home_phone}
                    onChange={(e) => handleInputChange('home_phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Role</Typography>
                    <RadioGroup
                      row
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value as 'homeowner' | 'business')}
                    >
                      <FormControlLabel value="homeowner" control={<Radio />} label="Homeowner" />
                      <FormControlLabel value="business" control={<Radio />} label="Business" />
                    </RadioGroup>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Work phone"
                    value={formData.work_phone}
                    onChange={(e) => handleInputChange('work_phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ pt: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.do_not_service}
                          onChange={(e) => handleInputChange('do_not_service', e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Mark as "Do not service"</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Notifications will be turned off and it won't be possible to schedule a job or estimate.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button startIcon={<AddIcon />} size="small">
                  Email
                </Button>
                <Button startIcon={<AddIcon />} size="small" sx={{ ml: 2 }}>
                  Phone
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  <LocationIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Address</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    error={!!errors.street}
                    helperText={errors.street}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    error={!!errors.city}
                    helperText={errors.city}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth error={!!errors.state}>
                    <InputLabel>State</InputLabel>
                    <Select
                      value={formData.state}
                      label="State"
                      onChange={(e) => handleInputChange('state', e.target.value)}
                    >
                      <MenuItem value="NY">NY</MenuItem>
                      <MenuItem value="NJ">NJ</MenuItem>
                      <MenuItem value="CT">CT</MenuItem>
                      <MenuItem value="PA">PA</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label="Zip"
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    error={!!errors.zip}
                    helperText={errors.zip}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address Notes"
                    multiline
                    rows={2}
                    value={formData.address_notes}
                    onChange={(e) => handleInputChange('address_notes', e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button startIcon={<AddIcon />} size="small">
                  Address
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  <NotesIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Notes</Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add notes about this customer..."
              />

              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.send_notifications}
                      onChange={(e) => handleInputChange('send_notifications', e.target.checked)}
                    />
                  }
                  label="Send notifications"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Map */}
        <Grid item xs={12} md={4}>
          <Box sx={{ position: 'sticky', top: 20 }}>
            <Paper sx={{ p: 2, height: 400 }}>
              <GoogleMapsProvider>
                <Map
                  center={mapCenter}
                  zoom={15}
                  onAddressSelect={handleMapAddressSelect}
                >
                  <Marker position={markerPosition} />
                </Map>
              </GoogleMapsProvider>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NewCustomerForm;