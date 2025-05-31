import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import {
  People as PeopleIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const statsCards = [
    {
      title: 'Total Customers',
      value: '0',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Active Jobs',
      value: '0',
      icon: <WorkIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Today\'s Schedule',
      value: '0',
      icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
    },
    {
      title: 'Monthly Revenue',
      value: '$0',
      icon: <MoneyIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Jobs',
      description: 'View and manage all work orders',
      icon: <WorkIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/jobs'),
    },
    {
      title: 'Schedule Calendar',
      description: 'View scheduling calendar',
      icon: <ScheduleIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/scheduling'),
    },
    {
      title: 'Billing & Invoices',
      description: 'Manage invoices and payments',
      icon: <ReceiptIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/billing'),
    },
    {
      title: 'Inventory',
      description: 'Manage parts and supplies',
      icon: <InventoryIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/inventory'),
    },
    {
      title: 'Analytics',
      description: 'Business reports and insights',
      icon: <AnalyticsIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/analytics'),
    },
    {
      title: 'Add Customer',
      description: 'Create new customer profile',
      icon: <PeopleIcon sx={{ fontSize: 30 }} />,
      action: () => navigate('/customers/new'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" component="h2" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={action.action}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box sx={{ color: '#1976d2', mr: 2 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;