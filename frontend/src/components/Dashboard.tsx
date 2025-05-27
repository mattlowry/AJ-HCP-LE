import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
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
      title: 'Add New Customer',
      description: 'Create a new customer profile',
      action: () => navigate('/customers'),
    },
    {
      title: 'Schedule Job',
      description: 'Schedule a new service appointment',
      action: () => console.log('Schedule job - not implemented yet'),
    },
    {
      title: 'View Today\'s Jobs',
      description: 'See all jobs scheduled for today',
      action: () => console.log('View jobs - not implemented yet'),
    },
    {
      title: 'Generate Report',
      description: 'Create business analytics report',
      action: () => console.log('Generate report - not implemented yet'),
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
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {action.description}
                </Typography>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={action.action}
                >
                  {action.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;