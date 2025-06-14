import React, { useState, useEffect } from 'react';
import {
  Grid,
  CardContent,
  Typography,
  Box,
  Avatar,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customerApi, jobApi, analyticsApi } from '../services/api';
import SoftCard from './SoftCard';
import LoadingSpinner from './LoadingSpinner';

interface DashboardStats {
  totalCustomers: number;
  activeJobs: number;
  todaySchedule: number;
  monthlyRevenue: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeJobs: 0,
    todaySchedule: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel
      const [customersResponse, jobsResponse] = await Promise.allSettled([
        customerApi.getAll(),
        jobApi.getAll(),
      ]);

      const customers = customersResponse.status === 'fulfilled' ? customersResponse.value.data.results || [] : [];
      const jobs = jobsResponse.status === 'fulfilled' ? jobsResponse.value.data.results || [] : [];

      // Calculate stats
      const activeJobs = jobs.filter(job => ['pending', 'scheduled', 'in_progress'].includes(job.status)).length;
      
      // Today's schedule - jobs scheduled for today
      const today = new Date().toISOString().split('T')[0];
      const todaySchedule = jobs.filter(job => 
        job.scheduled_start && job.scheduled_start.startsWith(today)
      ).length;

      // Try to get analytics data, fall back to basic calculation if not available
      let monthlyRevenue = 0;
      try {
        const analyticsResponse = await analyticsApi.getFinancialSummary();
        monthlyRevenue = analyticsResponse.data.monthly_revenue || 0;
      } catch (error) {
        // Fallback: calculate from completed jobs this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        monthlyRevenue = jobs
          .filter(job => 
            job.status === 'completed' && 
            job.updated_at &&
            new Date(job.updated_at).getMonth() === currentMonth &&
            new Date(job.updated_at).getFullYear() === currentYear
          )
          .reduce((sum, job) => sum + (job.actual_cost || job.estimated_cost || 0), 0);
      }

      setStats({
        totalCustomers: customers.length,
        activeJobs,
        todaySchedule,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Total Customers',
      value: '0',
      change: '+12%',
      icon: <PeopleIcon />,
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
      bgColor: 'rgba(74, 144, 226, 0.1)',
    },
    {
      title: 'Active Jobs',
      value: '0',
      change: '+8%',
      icon: <WorkIcon />,
      gradient: 'linear-gradient(135deg, #51C878 0%, #3A9B5C 100%)',
      bgColor: 'rgba(81, 200, 120, 0.1)',
    },
    {
      title: 'Today\'s Schedule',
      value: '0',
      change: '+5%',
      icon: <ScheduleIcon />,
      gradient: 'linear-gradient(135deg, #FFD93D 0%, #E6C234 100%)',
      bgColor: 'rgba(255, 217, 61, 0.1)',
    },
    {
      title: 'Monthly Revenue',
      value: '$0',
      change: '+18%',
      icon: <MoneyIcon />,
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
      bgColor: 'rgba(255, 107, 107, 0.1)',
    },
  ];

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

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2E5A8A 0%, #4A90E2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ fontWeight: 400 }}
        >
          Welcome back! Here's what's happening with your business today.
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <SoftCard 
              variant="elevated" 
              glow
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${card.bgColor} 0%, rgba(255, 255, 255, 0.8) 100%)`,
                '&:hover': {
                  transform: 'translateY(-4px) scale(1.02)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      background: card.gradient,
                      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    sx={{ 
                      color: '#51C878',
                      backgroundColor: 'rgba(81, 200, 120, 0.1)',
                      borderRadius: '12px',
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {card.change}
                    </Typography>
                  </Box>
                </Box>
                <Typography 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 1,
                  }}
                >
                  {card.title}
                </Typography>
                <Typography 
                  variant="h4" 
                  component="div"
                  sx={{ 
                    fontWeight: 700,
                    color: '#202124',
                  }}
                >
                  {card.value}
                </Typography>
              </CardContent>
            </SoftCard>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Typography 
        variant="h5" 
        component="h2" 
        sx={{ 
          fontWeight: 600,
          mb: 3,
          color: '#202124',
        }}
      >
        Quick Actions
      </Typography>
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
    </Box>
  );
};

export default Dashboard;