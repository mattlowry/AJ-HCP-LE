import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';

interface Technician {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  skill_level: 'apprentice' | 'journeyman' | 'master';
  hourly_rate: number;
  specializations: string[];
  certifications: string[];
  current_jobs: number;
  completed_jobs: number;
  avg_rating: number;
}

interface Availability {
  id: number;
  technician_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'busy' | 'off' | 'vacation';
}

const TechnicianManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  // Demo data
  const technicians: Technician[] = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@ajlongelectric.com',
      phone: '(555) 123-4567',
      employee_id: 'EMP001',
      hire_date: '2020-03-15',
      status: 'active',
      skill_level: 'journeyman',
      hourly_rate: 45.00,
      specializations: ['Residential Wiring', 'Panel Upgrades'],
      certifications: ['Licensed Electrician', 'OSHA 30'],
      current_jobs: 3,
      completed_jobs: 127,
      avg_rating: 4.8,
    },
    {
      id: 2,
      first_name: 'Maria',
      last_name: 'Rodriguez',
      email: 'maria.rodriguez@ajlongelectric.com',
      phone: '(555) 234-5678',
      employee_id: 'EMP002',
      hire_date: '2018-07-20',
      status: 'active',
      skill_level: 'master',
      hourly_rate: 55.00,
      specializations: ['Commercial', 'Industrial Controls'],
      certifications: ['Master Electrician', 'PLC Programming'],
      current_jobs: 2,
      completed_jobs: 203,
      avg_rating: 4.9,
    },
    {
      id: 3,
      first_name: 'David',
      last_name: 'Wilson',
      email: 'david.wilson@ajlongelectric.com',
      phone: '(555) 345-6789',
      employee_id: 'EMP003',
      hire_date: '2022-01-10',
      status: 'active',
      skill_level: 'apprentice',
      hourly_rate: 25.00,
      specializations: ['Basic Wiring', 'Outlet Installation'],
      certifications: ['Electrical Apprentice'],
      current_jobs: 1,
      completed_jobs: 34,
      avg_rating: 4.5,
    },
  ];

  const availability: Availability[] = [
    { id: 1, technician_id: 1, date: '2024-01-15', start_time: '08:00', end_time: '16:00', status: 'available' },
    { id: 2, technician_id: 1, date: '2024-01-16', start_time: '08:00', end_time: '16:00', status: 'busy' },
    { id: 3, technician_id: 2, date: '2024-01-15', start_time: '07:00', end_time: '15:00', status: 'available' },
    { id: 4, technician_id: 3, date: '2024-01-15', start_time: '09:00', end_time: '17:00', status: 'vacation' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on_leave': return 'warning';
      default: return 'default';
    }
  };

  const getSkillColor = (level: string) => {
    switch (level) {
      case 'master': return 'error';
      case 'journeyman': return 'warning';
      case 'apprentice': return 'info';
      default: return 'default';
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'busy': return 'warning';
      case 'off': return 'default';
      case 'vacation': return 'info';
      default: return 'default';
    }
  };

  const handleAddTechnician = () => {
    setSelectedTechnician(null);
    setOpenDialog(true);
  };

  const handleEditTechnician = (technician: Technician) => {
    setSelectedTechnician(technician);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTechnician(null);
  };

  const renderTechniciansTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Team Members</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTechnician}
        >
          Add Technician
        </Button>
      </Box>

      <Grid container spacing={3}>
        {technicians.map((tech) => (
          <Grid item xs={12} md={6} lg={4} key={tech.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="h6">
                      {tech.first_name} {tech.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tech.employee_id}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => handleEditTechnician(tech)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box mb={2}>
                  <Chip 
                    label={tech.status}
                    color={getStatusColor(tech.status) as any}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    label={tech.skill_level}
                    color={getSkillColor(tech.skill_level) as any}
                    size="small"
                  />
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {tech.email}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {tech.phone}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Current Jobs
                    </Typography>
                    <Typography variant="h6">{tech.current_jobs}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Completed
                    </Typography>
                    <Typography variant="h6">{tech.completed_jobs}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Rating
                    </Typography>
                    <Typography variant="h6">{tech.avg_rating}/5.0</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Rate
                    </Typography>
                    <Typography variant="h6">${tech.hourly_rate}/hr</Typography>
                  </Grid>
                </Grid>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Specializations
                  </Typography>
                  <Box mt={1}>
                    {tech.specializations.map((spec, index) => (
                      <Chip
                        key={index}
                        label={spec}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderScheduleTab = () => (
    <Box>
      <Typography variant="h6" mb={3}>Team Schedule & Availability</Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Technician</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availability.map((avail) => {
              const tech = technicians.find(t => t.id === avail.technician_id);
              return (
                <TableRow key={avail.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      {tech ? `${tech.first_name} ${tech.last_name}` : 'Unknown'}
                    </Box>
                  </TableCell>
                  <TableCell>{avail.date}</TableCell>
                  <TableCell>{avail.start_time} - {avail.end_time}</TableCell>
                  <TableCell>
                    <Chip
                      label={avail.status}
                      color={getAvailabilityColor(avail.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderPerformanceTab = () => (
    <Box>
      <Typography variant="h6" mb={3}>Performance Metrics</Typography>
      
      <Grid container spacing={3}>
        {technicians.map((tech) => (
          <Grid item xs={12} md={6} key={tech.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="h6">
                    {tech.first_name} {tech.last_name}
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Jobs Completed
                    </Typography>
                    <Typography variant="h5">{tech.completed_jobs}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Avg Rating
                    </Typography>
                    <Typography variant="h5">{tech.avg_rating}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      Revenue/Month
                    </Typography>
                    <Typography variant="h5">$12.5K</Typography>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" mb={1}>Recent Certifications</Typography>
                {tech.certifications.map((cert, index) => (
                  <Chip
                    key={index}
                    label={cert}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Technician Management
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Team Members" />
        <Tab label="Schedule" />
        <Tab label="Performance" />
      </Tabs>

      {activeTab === 0 && renderTechniciansTab()}
      {activeTab === 1 && renderScheduleTab()}
      {activeTab === 2 && renderPerformanceTab()}

      {/* Add/Edit Technician Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTechnician ? 'Edit Technician' : 'Add New Technician'}
        </DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  defaultValue={selectedTechnician?.first_name || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  defaultValue={selectedTechnician?.last_name || ''}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  defaultValue={selectedTechnician?.email || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  defaultValue={selectedTechnician?.phone || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  defaultValue={selectedTechnician?.employee_id || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Skill Level"
                  select
                  defaultValue={selectedTechnician?.skill_level || 'apprentice'}
                >
                  <MenuItem value="apprentice">Apprentice</MenuItem>
                  <MenuItem value="journeyman">Journeyman</MenuItem>
                  <MenuItem value="master">Master</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Hourly Rate"
                  type="number"
                  InputProps={{ startAdornment: '$' }}
                  defaultValue={selectedTechnician?.hourly_rate || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Hire Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  defaultValue={selectedTechnician?.hire_date || ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Status"
                  select
                  defaultValue={selectedTechnician?.status || 'active'}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="on_leave">On Leave</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleCloseDialog}>
            {selectedTechnician ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnicianManagement;