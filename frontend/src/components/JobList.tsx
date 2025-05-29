import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';

interface Job {
  id: number;
  job_number: string;
  customer_name: string;
  property_address: string;
  service_type: string;
  status: string;
  priority: string;
  scheduled_date: string;
  assigned_technician: string;
  description: string;
  estimated_duration: number;
  total_amount: number;
  created_at: string;
}

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
}

const JobList: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Demo data
  const demoJobs: Job[] = [
    {
      id: 1,
      job_number: 'JOB-2024-0001',
      customer_name: 'John Smith',
      property_address: '123 Main St, Anytown, NY 12345',
      service_type: 'Electrical Repair',
      status: 'scheduled',
      priority: 'high',
      scheduled_date: '2024-01-15T09:00:00Z',
      assigned_technician: 'Mike Johnson',
      description: 'Kitchen outlet not working - needs inspection',
      estimated_duration: 2,
      total_amount: 150.00,
      created_at: '2024-01-10T08:00:00Z'
    },
    {
      id: 2,
      job_number: 'JOB-2024-0002',
      customer_name: 'Sarah Davis',
      property_address: '456 Oak Ave, Somewhere, NY 12346',
      service_type: 'Panel Installation',
      status: 'in_progress',
      priority: 'medium',
      scheduled_date: '2024-01-14T14:00:00Z',
      assigned_technician: 'Tom Wilson',
      description: 'Install new 200A electrical panel',
      estimated_duration: 6,
      total_amount: 800.00,
      created_at: '2024-01-08T10:30:00Z'
    },
    {
      id: 3,
      job_number: 'JOB-2024-0003',
      customer_name: 'Robert Brown',
      property_address: '789 Pine St, Elsewhere, NY 12347',
      service_type: 'Emergency Service',
      status: 'completed',
      priority: 'critical',
      scheduled_date: '2024-01-12T16:00:00Z',
      assigned_technician: 'Mike Johnson',
      description: 'Power outage in entire house',
      estimated_duration: 3,
      total_amount: 450.00,
      created_at: '2024-01-12T15:30:00Z'
    },
    {
      id: 4,
      job_number: 'JOB-2024-0004',
      customer_name: 'Lisa Garcia',
      property_address: '321 Elm Dr, Newtown, NY 12348',
      service_type: 'Wiring Installation',
      status: 'pending',
      priority: 'low',
      scheduled_date: '2024-01-18T11:00:00Z',
      assigned_technician: 'Tom Wilson',
      description: 'Wire new garage workshop',
      estimated_duration: 8,
      total_amount: 1200.00,
      created_at: '2024-01-09T14:15:00Z'
    }
  ];

  const loadJobs = async () => {
    try {
      setLoading(true);
      // For demo, use local data
      setJobs(demoJobs);
      setLoading(false);
    } catch (err) {
      setError('Failed to load jobs');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
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
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateJob = () => {
    setEditingJob(null);
    setOpenDialog(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
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

  const handleSaveJob = async (jobData: any) => {
    try {
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
                    <Typography variant="body2">{job.customer_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.property_address}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{job.service_type}</TableCell>
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
                  {new Date(job.scheduled_date).toLocaleDateString()} {' '}
                  {new Date(job.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </TableCell>
                <TableCell>{job.assigned_technician}</TableCell>
                <TableCell>${job.total_amount.toFixed(2)}</TableCell>
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

      {/* Job Dialog - Placeholder for now */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingJob ? 'Edit Job' : 'Create New Job'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Job creation/editing form will be implemented here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobList;