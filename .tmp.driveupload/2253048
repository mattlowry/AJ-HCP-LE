import React, { useState, useEffect } from 'react';
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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { jobApi, customerApi } from '../services/api';
import { CustomerListItem } from '../types/customer';
import { LineItem, JobPricing } from '../types/lineItem';
import { v4 as uuidv4 } from 'uuid';

interface CreateJobFormData {
  customer_id: string;
  title: string;
  description: string;
  service_type: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration: number;
  assigned_technician_id: string;
  property_address: string;
  notes: string;
}

const CreateJobForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<CreateJobFormData>({
    customer_id: '',
    title: '',
    description: '',
    service_type: '',
    priority: 'medium',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 2,
    assigned_technician_id: '',
    property_address: '',
    notes: ''
  });

  // Line items and pricing
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [pricing, setPricing] = useState<JobPricing>({
    subtotal: 0,
    tax_rate: 8.25,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0
  });

  // Dropdown data
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  // Line item dialog
  const [openLineItemDialog, setOpenLineItemDialog] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<LineItem | null>(null);
  const [lineItemForm, setLineItemForm] = useState<Partial<LineItem>>({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    category: 'material',
    unit: 'each'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateJobFormData, string>>>({});

  // Service types and technicians (demo data)
  const serviceTypes = [
    'Electrical Repair',
    'Panel Installation',
    'Wiring Installation',
    'Emergency Service',
    'Lighting Installation',
    'Outlet Installation',
    'Circuit Installation',
    'Safety Inspection'
  ];

  const technicians = [
    { id: '1', name: 'Mike Johnson' },
    { id: '2', name: 'Tom Wilson' },
    { id: '3', name: 'Steve Miller' }
  ];

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customerApi.getAll();
        setCustomers(response.data.results || []);
      } catch (err) {
        console.error('Error loading customers:', err);
      }
    };
    loadCustomers();
  }, []);

  // Calculate pricing when line items change
  useEffect(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = pricing.discount_amount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * pricing.tax_rate) / 100;
    const totalAmount = taxableAmount + taxAmount;

    setPricing(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }));
  }, [lineItems, pricing.tax_rate, pricing.discount_amount]);

  const handleInputChange = (field: keyof CreateJobFormData, value: string | number) => {
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
  };

  const handleCustomerChange = (customer: CustomerListItem | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id.toString(),
        property_address: customer.full_address || ''
      }));
    }
  };

  const handleAddLineItem = () => {
    setEditingLineItem(null);
    setLineItemForm({
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      category: 'material',
      unit: 'each'
    });
    setOpenLineItemDialog(true);
  };

  const handleEditLineItem = (item: LineItem) => {
    setEditingLineItem(item);
    setLineItemForm(item);
    setOpenLineItemDialog(true);
  };

  const handleDeleteLineItem = (itemId: string) => {
    setLineItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSaveLineItem = () => {
    if (!lineItemForm.name || !lineItemForm.quantity || !lineItemForm.unit_price) return;

    const totalPrice = (lineItemForm.quantity || 0) * (lineItemForm.unit_price || 0);
    const newItem: LineItem = {
      id: editingLineItem?.id || uuidv4(),
      name: lineItemForm.name || '',
      description: lineItemForm.description || '',
      quantity: lineItemForm.quantity || 1,
      unit_price: lineItemForm.unit_price || 0,
      total_price: totalPrice,
      category: lineItemForm.category || 'material',
      unit: lineItemForm.unit || 'each'
    };

    if (editingLineItem) {
      setLineItems(prev => prev.map(item => item.id === editingLineItem.id ? newItem : item));
    } else {
      setLineItems(prev => [...prev, newItem]);
    }

    setOpenLineItemDialog(false);
    setEditingLineItem(null);
    setLineItemForm({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateJobFormData, string>> = {};
    
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required';
    if (!formData.title.trim()) newErrors.title = 'Job title is required';
    if (!formData.service_type) newErrors.service_type = 'Service type is required';
    if (!formData.scheduled_date) newErrors.scheduled_date = 'Scheduled date is required';
    if (!formData.property_address.trim()) newErrors.property_address = 'Property address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const jobData = {
        ...formData,
        estimated_cost: pricing.total_amount,
        line_items: lineItems,
        pricing: pricing
      };
      
      await jobApi.create(jobData);
      setSuccess('Job created successfully!');
      
      setTimeout(() => {
        navigate('/jobs');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating job:', err);
      setError(err.response?.data?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/jobs');
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
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
          Create New Job
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
          {loading ? 'Creating...' : 'Create Job'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Job Details */}
        <Grid item xs={12} md={6}>
          {/* Customer Selection */}
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
                  <PersonIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Customer & Property</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.full_name} - ${option.full_address}`}
                    value={selectedCustomer}
                    onChange={(_, value) => handleCustomerChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Customer"
                        error={!!errors.customer_id}
                        helperText={errors.customer_id}
                        required
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Property Address"
                    value={formData.property_address}
                    onChange={(e) => handleInputChange('property_address', e.target.value)}
                    error={!!errors.property_address}
                    helperText={errors.property_address}
                    required
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Job Details */}
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
                  <AssignmentIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Job Details</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Job Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.service_type}>
                    <InputLabel>Service Type</InputLabel>
                    <Select
                      value={formData.service_type}
                      label="Service Type"
                      onChange={(e) => handleInputChange('service_type', e.target.value)}
                    >
                      {serviceTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority}
                      label="Priority"
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="emergency">Emergency</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Scheduling */}
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
                  <ScheduleIcon sx={{ color: 'white' }} />
                </Box>
                <Typography variant="h6">Scheduling</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Scheduled Date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.scheduled_date}
                    helperText={errors.scheduled_date}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Scheduled Time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estimated Duration (hours)"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => handleInputChange('estimated_duration', parseFloat(e.target.value))}
                    InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Assigned Technician</InputLabel>
                    <Select
                      value={formData.assigned_technician_id}
                      label="Assigned Technician"
                      onChange={(e) => handleInputChange('assigned_technician_id', e.target.value)}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {technicians.map(tech => (
                        <MenuItem key={tech.id} value={tech.id}>{tech.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Line Items & Pricing */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center">
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
                    <ReceiptIcon sx={{ color: 'white' }} />
                  </Box>
                  <Typography variant="h6">Line Items & Pricing</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddLineItem}
                >
                  Add Item
                </Button>
              </Box>

              {/* Line Items Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.name}
                          </Typography>
                          {item.description && (
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          )}
                          <Box>
                            <Chip
                              label={item.category}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell align="right">
                          ${item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${item.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditLineItem(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteLineItem(item.id!)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {lineItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            No items added yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pricing Summary */}
              <Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography>Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography align="right">${pricing.subtotal.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Discount"
                      type="number"
                      size="small"
                      value={pricing.discount_amount || ''}
                      onChange={(e) => setPricing(prev => ({
                        ...prev,
                        discount_amount: parseFloat(e.target.value) || 0
                      }))}
                      InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography align="right">-${(pricing.discount_amount || 0).toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Tax Rate (%)"
                      type="number"
                      size="small"
                      value={pricing.tax_rate}
                      onChange={(e) => setPricing(prev => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value) || 0
                      }))}
                      InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography align="right">${pricing.tax_amount.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" align="right">
                      ${pricing.total_amount.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Line Item Dialog */}
      <Dialog open={openLineItemDialog} onClose={() => setOpenLineItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLineItem ? 'Edit Line Item' : 'Add Line Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Item Name"
                value={lineItemForm.name || ''}
                onChange={(e) => setLineItemForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={lineItemForm.description || ''}
                onChange={(e) => setLineItemForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={lineItemForm.category || 'material'}
                  label="Category"
                  onChange={(e) => setLineItemForm(prev => ({ ...prev, category: e.target.value as 'material' | 'labor' | 'service' }))}
                >
                  <MenuItem value="material">Material</MenuItem>
                  <MenuItem value="labor">Labor</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Unit"
                value={lineItemForm.unit || ''}
                onChange={(e) => setLineItemForm(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="each, hour, ft, etc."
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={lineItemForm.quantity || ''}
                onChange={(e) => setLineItemForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Unit Price"
                type="number"
                value={lineItemForm.unit_price || ''}
                onChange={(e) => setLineItemForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" align="right">
                Total: ${((lineItemForm.quantity || 0) * (lineItemForm.unit_price || 0)).toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLineItemDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveLineItem}>
            {editingLineItem ? 'Update' : 'Add'} Item
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CreateJobForm;