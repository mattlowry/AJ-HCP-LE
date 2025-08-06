import React from 'react';
import { 
  Grid, 
  CardContent, 
  Typography, 
  Box, 
  Avatar 
} from '@mui/material';
import { 
  People as PeopleIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import SoftCard from './SoftCard';
import { formatCurrency } from '../utils/formatters';

interface DashboardStats {
  totalCustomers: number;
  activeJobs: number;
  todaySchedule: number;
  monthlyRevenue: number;
}

const StatsCardGrid: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const statsCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toString(),
      change: '+12%',
      icon: <PeopleIcon />,
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
      bgColor: 'rgba(74, 144, 226, 0.1)',
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs.toString(),
      change: '+8%',
      icon: <WorkIcon />,
      gradient: 'linear-gradient(135deg, #51C878 0%, #3A9B5C 100%)',
      bgColor: 'rgba(81, 200, 120, 0.1)',
    },
    {
      title: 'Today\'s Schedule',
      value: stats.todaySchedule.toString(),
      change: '+5%',
      icon: <ScheduleIcon />,
      gradient: 'linear-gradient(135deg, #FFD93D 0%, #E6C234 100%)',
      bgColor: 'rgba(255, 217, 61, 0.1)',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      change: '+18%',
      icon: <MoneyIcon />,
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
      bgColor: 'rgba(255, 107, 107, 0.1)',
    },
  ];

  return (
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
  );
};

export default StatsCardGrid;