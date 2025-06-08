import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Enhanced stats with trends
  const statsCards = [
    {
      title: 'Total Customers',
      value: '127',
      change: '+12%',
      trend: 'up',
      icon: <PeopleIcon />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
    },
    {
      title: 'Active Jobs',
      value: '23',
      change: '+8%',
      trend: 'up',
      icon: <WorkIcon />,
      color: '#2e7d32',
      bgColor: '#e8f5e8',
    },
    {
      title: 'Today\'s Schedule',
      value: '6',
      change: '2 pending',
      trend: 'neutral',
      icon: <ScheduleIcon />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
    },
    {
      title: 'Monthly Revenue',
      value: '$18,420',
      change: '+15%',
      trend: 'up',
      icon: <MoneyIcon />,
      color: '#9c27b0',
      bgColor: '#f3e5f5',
    },
  ];

  const recentJobs = [
    {
      id: 1,
      title: 'Kitchen Outlet Repair',
      customer: 'John Smith',
      status: 'in_progress',
      priority: 'high',
      scheduled: '2024-01-15T09:00:00Z'
    },
    {
      id: 2,
      title: 'Panel Installation',
      customer: 'Sarah Davis',
      status: 'scheduled',
      priority: 'medium',
      scheduled: '2024-01-15T14:00:00Z'
    },
    {
      id: 3,
      title: 'Emergency Service',
      customer: 'Robert Brown',
      status: 'completed',
      priority: 'emergency',
      scheduled: '2024-01-14T16:00:00Z'
    }
  ];

  const quickActions = [
    {
      title: 'Create Job',
      description: 'Schedule new work order',
      icon: <AddIcon />,
      action: () => navigate('/jobs/new'),
      color: '#1976d2',
      primary: true
    },
    {
      title: 'Add Customer',
      description: 'Create customer profile',
      icon: <PeopleIcon />,
      action: () => navigate('/customers/new'),
      color: '#2e7d32',
      primary: true
    },
    {
      title: 'View Schedule',
      description: 'Today\'s appointments',
      icon: <ScheduleIcon />,
      action: () => navigate('/scheduling'),
      color: '#ed6c02'
    },
    {
      title: 'Manage Jobs',
      description: 'All work orders',
      icon: <WorkIcon />,
      action: () => navigate('/jobs'),
      color: '#1976d2'
    },
    {
      title: 'View Analytics',
      description: 'Business insights',
      icon: <AnalyticsIcon />,
      action: () => navigate('/analytics'),
      color: '#9c27b0'
    },
    {
      title: 'Inventory',
      description: 'Parts and supplies',
      icon: <InventoryIcon />,
      action: () => navigate('/inventory'),
      color: '#1976d2'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'scheduled': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" data-testid="welcome-message">
            Welcome back! Here's what's happening with your business today.
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/jobs/new')}
            data-testid="action-create-job"
          >
            Create Job
          </Button>
          <Button
            variant="outlined"
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/customers/new')}
            data-testid="action-add-customer"
          >
            Add Customer
          </Button>
        </Box>
      </Box>
      
      {/* Enhanced Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }} data-testid="metrics-container">
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}
              data-testid={`metric-${card.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      backgroundColor: card.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.color
                    }}
                  >
                    {card.icon}
                  </Box>
                  {card.trend === 'up' && (
                    <Chip
                      icon={<TrendingUpIcon />}
                      label={card.change}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                  {card.trend === 'neutral' && (
                    <Chip
                      label={card.change}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="h4" component="h2" fontWeight="bold" mb={1}>
                  {card.value}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Quick Actions</Typography>
              </Box>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        height: '100%',
                        '&:hover': {
                          borderColor: action.color,
                          boxShadow: 1,
                          transform: 'translateY(-2px)'
                        },
                      }}
                      onClick={action.action}
                    >
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: action.primary ? action.color : 'transparent',
                            color: action.primary ? 'white' : action.color,
                            mr: 1
                          }}
                        >
                          {action.icon}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {action.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Jobs */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Recent Jobs</Typography>
                <IconButton onClick={() => navigate('/jobs')} size="small">
                  <ArrowForwardIcon />
                </IconButton>
              </Box>
              <Box>
                {recentJobs.map((job, index) => (
                  <Box key={job.id}>
                    <Box
                      sx={{
                        py: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1
                      }}
                      onClick={() => navigate('/jobs')}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2" fontWeight="medium" noWrap>
                          {job.title}
                        </Typography>
                        <Chip
                          label={job.status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(job.status) as any}
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {job.customer}
                      </Typography>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Chip
                          label={job.priority}
                          size="small"
                          color={getPriorityColor(job.priority) as any}
                          variant="filled"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(job.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                    {index < recentJobs.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
              <Box mt={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/jobs')}
                  endIcon={<ArrowForwardIcon />}
                >
                  View All Jobs
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;