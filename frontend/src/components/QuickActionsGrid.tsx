import React from 'react';
import { 
  Grid, 
  CardContent, 
  Typography, 
  Box, 
  Avatar 
} from '@mui/material';
import { 
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SoftCard from './SoftCard';

const QuickActionsGrid: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Manage Jobs',
      description: 'View and manage all work orders',
      icon: <WorkIcon />,
      action: () => navigate('/jobs'),
    },
    {
      title: 'Schedule Calendar',
      description: 'View scheduling calendar',
      icon: <ScheduleIcon />,
      action: () => navigate('/scheduling'),
    },
    {
      title: 'Billing & Invoices',
      description: 'Manage invoices and payments',
      icon: <ReceiptIcon />,
      action: () => navigate('/billing'),
    },
    {
      title: 'Inventory',
      description: 'Manage parts and supplies',
      icon: <InventoryIcon />,
      action: () => navigate('/inventory'),
    },
    {
      title: 'Analytics',
      description: 'Business reports and insights',
      icon: <AnalyticsIcon />,
      action: () => navigate('/analytics'),
    },
    {
      title: 'Add Customer',
      description: 'Create new customer profile',
      icon: <PeopleIcon />,
      action: () => navigate('/customers/new'),
    },
  ];

  return (
    <Grid container spacing={3}>
      {quickActions.map((action, index) => (
        <Grid item xs={12} sm={6} lg={4} key={index}>
          <SoftCard 
            variant="glass" 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { 
                transform: 'translateY(-6px) scale(1.02)',
                boxShadow: '0px 12px 40px rgba(74, 144, 226, 0.15)',
              }
            }} 
            onClick={action.action}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2.5}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
                    mr: 2,
                    boxShadow: '0px 4px 12px rgba(74, 144, 226, 0.3)',
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography 
                  variant="h6" 
                  component="div"
                  sx={{ 
                    fontWeight: 600,
                    color: '#202124',
                  }}
                >
                  {action.title}
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                }}
              >
                {action.description}
              </Typography>
            </CardContent>
          </SoftCard>
        </Grid>
      ))}
    </Grid>
  );
};

export default QuickActionsGrid;