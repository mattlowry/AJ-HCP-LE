import React, { useState, useEffect } from 'react';
import { jobApi } from '../services/api';
import { Job } from '../types/job';
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
  Divider
} from '@mui/material';
// Temporarily disabled date picker imports
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';

// Using Job interface from types/job.ts

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
}

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Demo data for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  // Demo data - structured to match Job interface
  const demoJobs: any[] = [
    {
      id: 1,
      job_number: 'JOB-2024-0001',
      title: 'Kitchen Outlet Repair',
      customer_name: 'John Smith',
      property_address: '123 Main St, Anytown, NY 12345',
      service_type: 'Electrical Repair',
      status: 'scheduled' as const,
      priority: 'high' as const,
      scheduled_date: '2024-01-15T09:00:00Z',
      scheduled_start: '2024-01-15T09:00:00Z',
      assigned_technician: 'Mike Johnson',
      assigned_technicians: ['Mike Johnson'],
      description: 'Kitchen outlet not working - needs inspection',
      estimated_duration: 2,
      estimated_cost: 150.00,
      total_amount: 150.00,
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-01-10T08:00:00Z',
      customer: 1,
      property: 1,
      assigned_to: [1]
    },
    {
      id: 2,
      job_number: 'JOB-2024-0002',
      title: 'Panel Installation',
      customer_name: 'Sarah Davis',
      property_address: '456 Oak Ave, Somewhere, NY 12346',
      service_type: 'Panel Installation',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      scheduled_date: '2024-01-14T14:00:00Z',
      scheduled_start: '2024-01-14T14:00:00Z',
      assigned_technician: 'Tom Wilson',
      assigned_technicians: ['Tom Wilson'],
      description: 'Install new 200A electrical panel',
      estimated_duration: 6,
      estimated_cost: 800.00,
      total_amount: 800.00,
      created_at: '2024-01-08T10:30:00Z',
      updated_at: '2024-01-08T10:30:00Z',
      customer: 2,
      property: 2,
      assigned_to: [2]
    },
    {
      id: 3,
      job_number: 'JOB-2024-0003',
      title: 'Emergency Power Restoration',
      customer_name: 'Robert Brown',
      property_address: '789 Pine St, Elsewhere, NY 12347',
      service_type: 'Emergency Service',
      status: 'completed' as const,
      priority: 'emergency' as const,
      scheduled_date: '2024-01-12T16:00:00Z',
      scheduled_start: '2024-01-12T16:00:00Z',
      assigned_technician: 'Mike Johnson',
      assigned_technicians: ['Mike Johnson'],
      description: 'Power outage in entire house',
      estimated_duration: 3,
      estimated_cost: 450.00,
      total_amount: 450.00,
      created_at: '2024-01-12T15:30:00Z',
      updated_at: '2024-01-12T15:30:00Z',
      customer: 3,
      property: 3,
      assigned_to: [1]
    },
    {
      id: 4,
      job_number: 'JOB-2024-0004',
      title: 'Garage Workshop Wiring',
      customer_name: 'Lisa Garcia',
      property_address: '321 Elm Dr, Newtown, NY 12348',
      service_type: 'Wiring Installation',
      status: 'pending' as const,
      priority: 'low' as const,
      scheduled_date: '2024-01-18T11:00:00Z',
      scheduled_start: '2024-01-18T11:00:00Z',
      assigned_technician: 'Tom Wilson',
      assigned_technicians: ['Tom Wilson'],
      description: 'Wire new garage workshop',
      estimated_duration: 8,
      estimated_cost: 1200.00,
      total_amount: 1200.00,
      created_at: '2024-01-09T14:15:00Z',
      updated_at: '2024-01-09T14:15:00Z',
      customer: 4,
      property: 4,
      assigned_to: [2]
    }
  ];

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await jobApi.getAll();
      setJobs(response.data.results);
      setLoading(false);
    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs. Using demo data.');
      // Fallback to demo data if API fails
      setJobs(demoJobs);
      setLoading(false);
    }
  };
  
  // Load demo customers, service types, and technicians
  const loadDemoData = () => {
    setCustomers([
      { id: 1, first_name: 'John', last_name: 'Smith', full_name: 'John Smith' },
      { id: 2, first_name: 'Sarah', last_name: 'Davis', full_name: 'Sarah Davis' },
      { id: 3, first_name: 'Robert', last_name: 'Brown', full_name: 'Robert Brown' },
      { id: 4, first_name: 'Lisa', last_name: 'Garcia', full_name: 'Lisa Garcia' },
    ]);
    
    setServiceTypes([
      { id: 1, name: 'Electrical Repair' },
      { id: 2, name: 'Panel Installation' },
      { id: 3, name: 'Emergency Service' },
      { id: 4, name: 'Wiring Installation' },
      { id: 5, name: 'Lighting Installation' },
    ]);
    
    setTechnicians([
      { id: 1, user: { first_name: 'Mike', last_name: 'Johnson' }, full_name: 'Mike Johnson' },
      { id: 2, user: { first_name: 'Tom', last_name: 'Wilson' }, full_name: 'Tom Wilson' },
      { id: 3, user: { first_name: 'Steve', last_name: 'Miller' }, full_name: 'Steve Miller' },
    ]);
  };

  useEffect(() => {
    loadJobs();
    loadDemoData();
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
    setEditingJob(null);
    // Reset form data
    setFormData({
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
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    
    // Find the associated customer, service type, and technician IDs
    const customerId = customers.find(c => c.full_name === job.customer_name)?.id.toString() || '';
    const serviceTypeId = serviceTypes.find(s => s.name === job.service_type)?.id.toString() || '';
    
    // Safely handle technician lookup
    let technicianId = '';
    if (job.assigned_technician) {
      technicianId = technicians.find(t => t.full_name === job.assigned_technician)?.id.toString() || '';
    }
    
    setFormData({
      customer_id: customerId,
      property_address: job.property_address,
      service_type_id: serviceTypeId,
      status: job.status,
      priority: job.priority,
      scheduled_date: new Date(job.scheduled_date),
      assigned_technician_id: technicianId,
      description: job.description,
      estimated_duration: job.estimated_duration,
      total_amount: job.total_amount,
      notes: job.notes || ''
    });
    
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        // For demo, just remove from local state
        setJobs(jobs.filter(job => job.id !== jobId));
      } catch (err) {
        setError('Failed to delete job');
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
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.customer_id) errors.customer_id = 'Customer is required';
    if (!formData.property_address) errors.property_address = 'Property address is required';
    if (!formData.service_type_id) errors.service_type_id = 'Service type is required';
    if (!formData.description) errors.description = 'Description is required';
    if (formData.estimated_duration <= 0) errors.estimated_duration = 'Duration must be greater than 0';
    if (formData.total_amount < 0) errors.total_amount = 'Amount cannot be negative';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSaveJob = async () => {
    try {
      if (!validateForm()) return;
      
      // Find related objects by ID
      const customer = customers.find(c => c.id.toString() === formData.customer_id);
      const serviceType = serviceTypes.find(s => s.id.toString() === formData.service_type_id);
      const technician = technicians.find(t => t.id.toString() === formData.assigned_technician_id);
      
      if (!customer || !serviceType) {
        setError('Missing required relationship data');
        return;
      }
      
      const jobData = {
        customer_name: customer.full_name,
        property_address: formData.property_address,
        service_type: serviceType.name,
        status: formData.status,
        priority: formData.priority,
        scheduled_date: formData.scheduled_date.toISOString(),
        assigned_technician: technician?.full_name || '',
        description: formData.description,
        estimated_duration: Number(formData.estimated_duration),
        total_amount: Number(formData.total_amount),
        notes: formData.notes
      };
      
      if (editingJob) {
        // Update existing job
        setJobs(jobs.map(job => 
          job.id === editingJob.id ? { ...job, ...jobData } : job
        ));
      } else {
        // Create new job
        const newJob: Job = {
          id: Math.max(...jobs.map(j => j.id), 0) + 1,
          job_number: `JOB-2024-${String(jobs.length + 1).padStart(4, '0')}`,
          created_at: new Date().toISOString(),
          ...jobData
        };
        setJobs([...jobs, newJob]);
      }
      setOpenDialog(false);
    } catch (err) {
      setError('Failed to save job');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading jobs...</Typography>
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
                  {(job.scheduled_date || job.scheduled_start) ? 
                    new Date(job.scheduled_date || job.scheduled_start).toLocaleDateString() + ' ' +
                    new Date(job.scheduled_date || job.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : 'Not scheduled'
                  }
                </TableCell>
                <TableCell>{job.assigned_technician || (job.assigned_technicians && job.assigned_technicians.length > 0 ? job.assigned_technicians.join(', ') : 'Unassigned')}</TableCell>
                <TableCell>${(job.total_amount || job.estimated_cost || 0).toFixed(2)}</TableCell>
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
              
              {/* Scheduled Date/Time - Temporarily using basic input */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Scheduled Date & Time"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => handleFormChange('scheduled_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
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
          <Button variant="contained" onClick={handleSaveJob}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobList;