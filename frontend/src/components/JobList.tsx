import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobApi, customerApi } from '../services/api';
import { Job, JobListItem } from '../types/job';
import { CustomerListItem } from '../types/customer';
import { validateForm, commonValidationRules } from '../utils/validation';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider,
  CircularProgress
} from '@mui/material';
// Using native datetime-local for better compatibility
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';

// Using Job interface from types/job.ts


interface ServiceType {
  id: number;
  name: string;
}

interface Technician {
  id: number;
  user: {
    first_name: string;
    last_name: string;
  };
  full_name?: string;
}

const JobList: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<JobListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Demo data for dropdowns
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    property_address: '',
    service_type_id: '',
    status: 'pending',
    priority: 'medium',
    scheduled_date: new Date(),
    assigned_technician_id: '',
    description: '',
    estimated_duration: 2,
    total_amount: 0,
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});


  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await jobApi.getAll();
      setJobs(response.data.results || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs. Please check your connection and try again.');
      setJobs([]);
      setLoading(false);
    }
  };
  
  // Load customers, service types, and technicians
  const loadReferenceData = async () => {
    try {
      // Load customers
      const customersResponse = await customerApi.getAll();
      setCustomers(customersResponse.data.results || []);
      
      // Load technicians - using mock data for now
      setTechnicians([
        { id: 1, user: { first_name: 'John', last_name: 'Smith' }, full_name: 'John Smith' },
        { id: 2, user: { first_name: 'Jane', last_name: 'Doe' }, full_name: 'Jane Doe' },
        { id: 3, user: { first_name: 'Mike', last_name: 'Johnson' }, full_name: 'Mike Johnson' }
      ]);
      
      // For service types, we'll use a static list since there might not be an API endpoint
      setServiceTypes([
        { id: 1, name: 'Electrical Repair' },
        { id: 2, name: 'Panel Installation' },
        { id: 3, name: 'Emergency Service' },
        { id: 4, name: 'Wiring Installation' },
        { id: 5, name: 'Lighting Installation' },
        { id: 6, name: 'Circuit Installation' },
        { id: 7, name: 'Outlet Installation' },
        { id: 8, name: 'Switch Installation' },
        { id: 9, name: 'GFCI Installation' },
        { id: 10, name: 'Electrical Inspection' },
      ]);
    } catch (err) {
      console.error('Error loading reference data:', err);
      // Set empty arrays if API calls fail
      setCustomers([]);
      setTechnicians([]);
      setServiceTypes([]);
    }
  };

  useEffect(() => {
    loadJobs();
    loadReferenceData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'scheduled': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'emergency': return 'error';
      default: return 'default';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const customerName = job.customer_name || '';
    const serviceType = job.service_type || job.title || '';
    const matchesSearch = job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || job.status === statusFilter;
    const matchesPriority = priorityFilter === '' || job.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateJob = () => {
    navigate('/jobs/new');
  };

  const handleEditJob = (job: JobListItem) => {
    setEditingJob(job);
    
    // Find the associated customer, service type, and technician IDs
    const customerId = customers.find(c => c.full_name === job.customer_name)?.id.toString() || '';
    const serviceTypeId = serviceTypes.find(s => s.name === job.service_type)?.id.toString() || '';
    
    // Safely handle technician lookup
    let technicianId = '';
    if (job.assigned_technicians && job.assigned_technicians.length > 0) {
      technicianId = technicians.find(t => t.full_name === job.assigned_technicians![0])?.id.toString() || '';
    }
    
    setFormData({
      customer_id: customerId,
      property_address: job.property_address || '',
      service_type_id: serviceTypeId,
      status: job.status,
      priority: job.priority,
      scheduled_date: new Date(job.scheduled_start || job.created_at || new Date()),
      assigned_technician_id: technicianId,
      description: job.description || '',
      estimated_duration: job.estimated_duration || 0,
      total_amount: job.actual_cost || job.estimated_cost,
      notes: job.notes || ''
    });
    
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobApi.delete(jobId);
        // Reload jobs after successful deletion
        await loadJobs();
      } catch (err) {
        console.error('Error deleting job:', err);
        setError('Failed to delete job. Please try again.');
      }
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const validateJobForm = () => {
    const validationRules = {
      customer_id: { required: true },
      property_address: commonValidationRules.address,
      service_type_id: { required: true },
      description: commonValidationRules.description,
      estimated_duration: commonValidationRules.duration,
      total_amount: commonValidationRules.currency
    };
    
    const result = validateForm(formData, validationRules);
    setFormErrors(result.errors);
    return result.isValid;
  };
  
  const handleSaveJob = async () => {
    try {
      if (!validateJobForm()) return;
      setSubmitting(true);
      
      const jobData = {
        customer: parseInt(formData.customer_id),
        property_address: formData.property_address,
        service_type: serviceTypes.find(st => st.id.toString() === formData.service_type_id)?.name || '',
        status: formData.status as Job['status'],
        priority: formData.priority as Job['priority'],
        scheduled_start: formData.scheduled_date.toISOString(),
        assigned_to: formData.assigned_technician_id ? [parseInt(formData.assigned_technician_id)] : [],
        description: formData.description,
        estimated_duration: formData.estimated_duration,
        estimated_cost: formData.total_amount,
        notes: formData.notes
      };

      if (editingJob) {
        await jobApi.update(editingJob.id, jobData);
      } else {
        await jobApi.create(jobData);
      }
      
      // Reload jobs after successful save
      await loadJobs();
      setOpenDialog(false);
      setSubmitting(false);
    } catch (err) {
      console.error('Error saving job:', err);
      setError('Failed to save job. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">Loading jobs...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Jobs & Work Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateJob}
        >
          Create Job
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Jobs</Typography>
              <Typography variant="h4" color="primary">
                {jobs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Pending</Typography>
              <Typography variant="h4" color="warning.main">
                {jobs.filter(j => j.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">In Progress</Typography>
              <Typography variant="h4" color="primary">
                {jobs.filter(j => j.status === 'in_progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Completed</Typography>
              <Typography variant="h4" color="success.main">
                {jobs.filter(j => j.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Priority"
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="emergency">Emergency</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Jobs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Job Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Service Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Scheduled Date</TableCell>
              <TableCell>Technician</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {job.job_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{job.customer_name || 'N/A'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.property_address || 'N/A'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{job.service_type || job.title || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={job.status.replace('_', ' ')}
                    color={getStatusColor(job.status) as any}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.priority}
                    color={getPriorityColor(job.priority) as any}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  {job.scheduled_start ? 
                    new Date(job.scheduled_start).toLocaleDateString() + ' ' +
                    new Date(job.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : 'Not scheduled'
                  }
                </TableCell>
                <TableCell>{(job.assigned_technicians && job.assigned_technicians.length > 0 ? job.assigned_technicians.join(', ') : 'Unassigned')}</TableCell>
                <TableCell>${(job.actual_cost || job.estimated_cost || 0).toFixed(2)}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditJob(job)}
                      color="primary"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditJob(job)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteJob(job.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredJobs.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No jobs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Create your first job to get started'}
          </Typography>
          {!searchTerm && !statusFilter && (
            <Button variant="contained" onClick={handleCreateJob}>
              Create First Job
            </Button>
          )}
        </Box>
      )}

      {/* Job Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingJob ? 'Edit Job' : 'Create New Job'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* Customer Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.customer_id}>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={formData.customer_id}
                    label="Customer"
                    onChange={(e) => handleFormChange('customer_id', e.target.value)}
                  >
                    <MenuItem value=""><em>Select Customer</em></MenuItem>
                    {customers.map(customer => (
                      <MenuItem key={customer.id} value={customer.id.toString()}>
                        {customer.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.customer_id && (
                    <FormHelperText>{formErrors.customer_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {/* Property Address */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Property Address"
                  value={formData.property_address}
                  onChange={(e) => handleFormChange('property_address', e.target.value)}
                  error={!!formErrors.property_address}
                  helperText={formErrors.property_address}
                />
              </Grid>
              
              {/* Service Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!formErrors.service_type_id}>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    value={formData.service_type_id}
                    label="Service Type"
                    onChange={(e) => handleFormChange('service_type_id', e.target.value)}
                  >
                    <MenuItem value=""><em>Select Service Type</em></MenuItem>
                    {serviceTypes.map(type => (
                      <MenuItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.service_type_id && (
                    <FormHelperText>{formErrors.service_type_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {/* Status */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleFormChange('status', e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Priority */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Scheduled Date/Time */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Scheduled Date & Time"
                  type="datetime-local"
                  value={formData.scheduled_date ? 
                    new Date(formData.scheduled_date).toISOString().slice(0, 16) : 
                    ''
                  }
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                    handleFormChange('scheduled_date', dateValue);
                  }}
                  InputLabelProps={{ shrink: true }}
                  helperText="Select date and time for the job"
                />
              </Grid>
              
              {/* Technician */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assigned Technician</InputLabel>
                  <Select
                    value={formData.assigned_technician_id}
                    label="Assigned Technician"
                    onChange={(e) => handleFormChange('assigned_technician_id', e.target.value)}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {technicians.map(tech => (
                      <MenuItem key={tech.id} value={tech.id.toString()}>
                        {tech.full_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Estimated Duration */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Duration (hours)"
                  value={formData.estimated_duration}
                  onChange={(e) => handleFormChange('estimated_duration', e.target.value)}
                  error={!!formErrors.estimated_duration}
                  helperText={formErrors.estimated_duration}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              {/* Total Amount */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Amount ($)"
                  value={formData.total_amount}
                  onChange={(e) => handleFormChange('total_amount', e.target.value)}
                  error={!!formErrors.total_amount}
                  helperText={formErrors.total_amount}
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Job Description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                />
              </Grid>
              
              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveJob}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobList;