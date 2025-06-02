import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Tab,
  Tabs,
  Button,
  IconButton,
  Avatar,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Star as StarIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi, propertyApi } from '../services/api';
import { Customer, Property } from '../types/customer';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Property management state
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyFormData, setPropertyFormData] = useState<Partial<Property>>({});
  const [propertyLoading, setPropertyLoading] = useState(false);

  const fetchCustomer = React.useCallback(async (customerId: number) => {
    try {
      setLoading(true);
      const response = await customerApi.getById(customerId);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id === 'new') {
      setIsCreating(true);
      setIsEditing(true);
      setLoading(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        customer_type: 'residential',
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        company_name: '',
        preferred_contact_method: 'email',
        notes: '',
      });
    } else if (id && id !== 'new') {
      fetchCustomer(parseInt(id));
    } else {
      setLoading(false);
    }
  }, [id, fetchCustomer]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (field: keyof Customer, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError(null);
      
      if (isCreating) {
        const response = await customerApi.create(formData);
        setSuccess('Customer created successfully!');
        navigate(`/customers/${response.data.id}`);
      } else {
        const response = await customerApi.update(customer!.id, formData);
        setCustomer(response.data);
        setSuccess('Customer updated successfully!');
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      setError(error.response?.data?.message || 'Error saving customer');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      navigate('/customers');
    } else {
      setIsEditing(false);
      setFormData({});
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(customer || {});
  };

  // Property management functions
  const handleAddProperty = () => {
    setShowAddProperty(true);
    setEditingProperty(null);
    setPropertyFormData({
      customer: customer?.id,
      property_type: 'single_family',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      has_gfci_outlets: false,
      has_afci_breakers: false,
    });
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowAddProperty(true);
    setPropertyFormData(property);
  };

  const handleDeleteProperty = async (propertyId: number) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    
    try {
      setPropertyLoading(true);
      await propertyApi.delete(propertyId);
      
      // Refresh customer data to update properties list
      if (customer) {
        await fetchCustomer(customer.id);
      }
      setSuccess('Property deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting property:', error);
      setError(error.response?.data?.message || 'Error deleting property');
    } finally {
      setPropertyLoading(false);
    }
  };

  const handlePropertyInputChange = (field: keyof Property, value: any) => {
    setPropertyFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProperty = async () => {
    try {
      setPropertyLoading(true);
      setError(null);
      
      if (editingProperty) {
        // Update existing property
        await propertyApi.update(editingProperty.id, propertyFormData);
        setSuccess('Property updated successfully!');
      } else {
        // Create new property
        await customerApi.addProperty(customer!.id, propertyFormData);
        setSuccess('Property added successfully!');
      }
      
      // Refresh customer data to update properties list
      if (customer) {
        await fetchCustomer(customer.id);
      }
      
      setShowAddProperty(false);
      setEditingProperty(null);
      setPropertyFormData({});
    } catch (error: any) {
      console.error('Error saving property:', error);
      setError(error.response?.data?.message || 'Error saving property');
    } finally {
      setPropertyLoading(false);
    }
  };

  const handleCancelProperty = () => {
    setShowAddProperty(false);
    setEditingProperty(null);
    setPropertyFormData({});
  };

  if (loading) {
    return <Typography>Loading customer details...</Typography>;
  }

  if (!isCreating && !customer) {
    return <Typography>Customer not found</Typography>;
  }

  const averageRating = customer?.reviews?.length 
    ? customer.reviews.reduce((sum, review) => sum + review.rating, 0) / customer.reviews.length
    : 0;

  const displayData = isEditing ? formData : customer;
  const title = isCreating ? 'Add New Customer' : (isEditing ? 'Edit Customer' : customer?.full_name);

  return (
    <Box>
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
        <IconButton onClick={() => navigate('/customers')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        {!isCreating && (
          <Avatar sx={{ mr: 2, bgcolor: displayData?.customer_type === 'commercial' ? 'primary.main' : 'secondary.main' }}>
            {displayData?.customer_type === 'commercial' ? <BusinessIcon /> : <PersonIcon />}
          </Avatar>
        )}
        <Box flexGrow={1}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {!isEditing && !isCreating && (
            <Box display="flex" gap={1} mt={1}>
              <Chip
                label={customer?.customer_type}
                color={customer?.customer_type === 'commercial' ? 'primary' : 'secondary'}
              />
              <Chip
                label={customer?.preferred_contact_method}
                variant="outlined"
              />
            </Box>
          )}
        </Box>
        {isEditing ? (
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveLoading}
            >
              {saveLoading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          !isCreating && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )
        )}
      </Box>

      {/* Basic Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {isEditing ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.first_name || ''}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.last_name || ''}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Customer Type</InputLabel>
                  <Select
                    value={formData.customer_type || 'residential'}
                    label="Customer Type"
                    onChange={(e) => handleInputChange('customer_type', e.target.value)}
                  >
                    <MenuItem value="residential">Residential</MenuItem>
                    <MenuItem value="commercial">Commercial</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Preferred Contact Method</InputLabel>
                  <Select
                    value={formData.preferred_contact_method || 'email'}
                    label="Preferred Contact Method"
                    onChange={(e) => handleInputChange('preferred_contact_method', e.target.value)}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="phone">Phone</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.customer_type === 'commercial' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={formData.company_name || ''}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  value={formData.street_address || ''}
                  onChange={(e) => handleInputChange('street_address', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={formData.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                <Typography>📧 {customer?.email}</Typography>
                <Typography>📞 {customer?.phone}</Typography>
                <Typography>📍 {customer?.full_address}</Typography>
                {customer?.company_name && (
                  <Typography>🏢 {customer.company_name}</Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Summary</Typography>
                <Typography>
                  Properties: {customer?.properties?.length || 0}
                </Typography>
                <Typography>
                  Reviews: {customer?.reviews?.length || 0}
                  {averageRating > 0 && (
                    <Box component="span" display="inline-flex" alignItems="center" ml={1}>
                      <StarIcon fontSize="small" sx={{ color: 'gold' }} />
                      {averageRating.toFixed(1)}
                    </Box>
                  )}
                </Typography>
                <Typography>
                  Customer since: {customer?.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Tabs - only show for existing customers */}
      {!isCreating && !isEditing && (
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Properties (${customer?.properties?.length || 0})`} />
            <Tab label={`Contacts (${customer?.contacts?.length || 0})`} />
            <Tab label={`Reviews (${customer?.reviews?.length || 0})`} />
            <Tab label="Job History" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Properties</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddProperty}
              disabled={propertyLoading}
            >
              Add Property
            </Button>
          </Box>
          
          {customer?.properties?.length ? (
            <Grid container spacing={2}>
              {customer?.properties?.map((property) => (
                <Grid item xs={12} md={6} key={property.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6">
                            {property.property_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditProperty(property)}
                            disabled={propertyLoading}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteProperty(property.id)}
                            disabled={propertyLoading}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography gutterBottom>{property.full_address}</Typography>
                      
                      {(property.square_footage || property.year_built || property.bedrooms || property.bathrooms) && (
                        <Box sx={{ mb: 1 }}>
                          {property.square_footage && (
                            <Chip label={`${property.square_footage} sq ft`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          )}
                          {property.year_built && (
                            <Chip label={`Built ${property.year_built}`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          )}
                          {property.bedrooms && (
                            <Chip label={`${property.bedrooms} bed`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          )}
                          {property.bathrooms && (
                            <Chip label={`${property.bathrooms} bath`} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          )}
                        </Box>
                      )}
                      
                      {property.main_panel_brand && (
                        <Typography variant="body2" color="text.secondary">
                          🔌 Panel: {property.main_panel_brand} ({property.main_panel_amperage}A)
                        </Typography>
                      )}
                      
                      {property.electrical_last_updated && (
                        <Typography variant="body2" color="text.secondary">
                          ⚡ Last Updated: {new Date(property.electrical_last_updated).toLocaleDateString()}
                        </Typography>
                      )}
                      
                      <Box sx={{ mt: 1 }}>
                        {property.has_gfci_outlets && (
                          <Chip label="GFCI Outlets" size="small" color="success" sx={{ mr: 0.5 }} />
                        )}
                        {property.has_afci_breakers && (
                          <Chip label="AFCI Breakers" size="small" color="success" sx={{ mr: 0.5 }} />
                        )}
                      </Box>
                      
                      {property.notes && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          📝 {property.notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" gutterBottom>No properties on file</Typography>
              <Typography variant="body2" color="text.secondary">
                Add a property to track electrical installations and service history
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {customer?.contacts?.length ? (
            <Grid container spacing={2}>
              {customer?.contacts?.map((contact) => (
                <Grid item xs={12} md={6} key={contact.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {contact.first_name} {contact.last_name}
                      </Typography>
                      <Chip label={contact.contact_type} size="small" sx={{ mb: 1 }} />
                      <Typography>📞 {contact.phone}</Typography>
                      {contact.email && <Typography>📧 {contact.email}</Typography>}
                      {contact.relationship && (
                        <Typography variant="body2" color="text.secondary">
                          {contact.relationship}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No additional contacts on file</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {customer?.reviews?.length ? (
            <Grid container spacing={2}>
              {customer?.reviews?.map((review) => (
                <Grid item xs={12} key={review.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box display="flex" mr={2}>
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              fontSize="small"
                              sx={{ color: i < review.rating ? 'gold' : 'lightgray' }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {review.source} • {new Date(review.created_at).toLocaleDateString()}
                        </Typography>
                        {review.sentiment_label && (
                          <Chip
                            label={review.sentiment_label}
                            size="small"
                            color={
                              review.sentiment_label === 'positive' ? 'success' :
                              review.sentiment_label === 'negative' ? 'error' : 'default'
                            }
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                      <Typography>{review.review_text}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No reviews on file</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography color="text.secondary">
            Job history will be available when the jobs module is implemented
          </Typography>
        </TabPanel>
      </Card>
      )}

      {/* Property Form Dialog */}
      <Dialog open={showAddProperty} onClose={handleCancelProperty} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProperty ? 'Edit Property' : 'Add New Property'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Property Type</InputLabel>
                <Select
                  value={propertyFormData.property_type || 'single_family'}
                  label="Property Type"
                  onChange={(e) => handlePropertyInputChange('property_type', e.target.value)}
                >
                  <MenuItem value="single_family">Single Family</MenuItem>
                  <MenuItem value="townhouse">Townhouse</MenuItem>
                  <MenuItem value="condo">Condo</MenuItem>
                  <MenuItem value="apartment">Apartment</MenuItem>
                  <MenuItem value="commercial">Commercial</MenuItem>
                  <MenuItem value="industrial">Industrial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Square Footage"
                type="number"
                value={propertyFormData.square_footage || ''}
                onChange={(e) => handlePropertyInputChange('square_footage', parseInt(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={propertyFormData.street_address || ''}
                onChange={(e) => handlePropertyInputChange('street_address', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={propertyFormData.city || ''}
                onChange={(e) => handlePropertyInputChange('city', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={propertyFormData.state || ''}
                onChange={(e) => handlePropertyInputChange('state', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={propertyFormData.zip_code || ''}
                onChange={(e) => handlePropertyInputChange('zip_code', e.target.value)}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Year Built"
                type="number"
                value={propertyFormData.year_built || ''}
                onChange={(e) => handlePropertyInputChange('year_built', parseInt(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Bedrooms"
                type="number"
                value={propertyFormData.bedrooms || ''}
                onChange={(e) => handlePropertyInputChange('bedrooms', parseInt(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Bathrooms"
                type="number"
                inputProps={{ step: 0.5 }}
                value={propertyFormData.bathrooms || ''}
                onChange={(e) => handlePropertyInputChange('bathrooms', parseFloat(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Electrical Information</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Main Panel Brand"
                value={propertyFormData.main_panel_brand || ''}
                onChange={(e) => handlePropertyInputChange('main_panel_brand', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Panel Amperage"
                type="number"
                value={propertyFormData.main_panel_amperage || ''}
                onChange={(e) => handlePropertyInputChange('main_panel_amperage', parseInt(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Panel Age (years)"
                type="number"
                value={propertyFormData.main_panel_age || ''}
                onChange={(e) => handlePropertyInputChange('main_panel_age', parseInt(e.target.value) || null)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Electrical Last Updated"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={propertyFormData.electrical_last_updated || ''}
                onChange={(e) => handlePropertyInputChange('electrical_last_updated', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={propertyFormData.has_gfci_outlets || false}
                      onChange={(e) => handlePropertyInputChange('has_gfci_outlets', e.target.checked)}
                    />
                  }
                  label="Has GFCI Outlets"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={propertyFormData.has_afci_breakers || false}
                      onChange={(e) => handlePropertyInputChange('has_afci_breakers', e.target.checked)}
                    />
                  }
                  label="Has AFCI Breakers"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Access Information</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Gate Code"
                value={propertyFormData.gate_code || ''}
                onChange={(e) => handlePropertyInputChange('gate_code', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Key Location"
                value={propertyFormData.key_location || ''}
                onChange={(e) => handlePropertyInputChange('key_location', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Instructions"
                multiline
                rows={2}
                value={propertyFormData.access_instructions || ''}
                onChange={(e) => handlePropertyInputChange('access_instructions', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Emergency Contact</Typography>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={propertyFormData.emergency_contact_name || ''}
                onChange={(e) => handlePropertyInputChange('emergency_contact_name', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={propertyFormData.emergency_contact_phone || ''}
                onChange={(e) => handlePropertyInputChange('emergency_contact_phone', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Relationship"
                value={propertyFormData.emergency_contact_relationship || ''}
                onChange={(e) => handlePropertyInputChange('emergency_contact_relationship', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={propertyFormData.notes || ''}
                onChange={(e) => handlePropertyInputChange('notes', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelProperty}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveProperty}
            disabled={propertyLoading}
            startIcon={<SaveIcon />}
          >
            {propertyLoading ? 'Saving...' : (editingProperty ? 'Update Property' : 'Add Property')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDetail;