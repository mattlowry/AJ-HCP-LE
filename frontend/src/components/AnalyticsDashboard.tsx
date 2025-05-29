import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Build as BuildIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

interface BusinessMetrics {
  totalCustomers: number;
  activeJobs: number;
  monthlyRevenue: number;
  pendingInvoices: number;
  technicianUtilization: number;
  customerSatisfaction: number;
}

interface FinancialData {
  totalRevenue: number;
  totalOutstanding: number;
  averageInvoiceAmount: number;
  paymentProcessingTime: number;
  revenueTrend: Array<{ month: string; revenue: number }>;
  topCustomers: Array<{ id: number; name: string; totalSpent: number }>;
}

interface TechnicianPerformance {
  id: number;
  name: string;
  jobsCompleted: number;
  revenueGenerated: number;
  customerRating: number;
  utilizationRate: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [technicianPerformance, setTechnicianPerformance] = useState<TechnicianPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo data
  const demoBusinessMetrics: BusinessMetrics = {
    totalCustomers: 142,
    activeJobs: 8,
    monthlyRevenue: 12450.00,
    pendingInvoices: 3,
    technicianUtilization: 85.5,
    customerSatisfaction: 4.6
  };

  const demoFinancialData: FinancialData = {
    totalRevenue: 145670.00,
    totalOutstanding: 3240.00,
    averageInvoiceAmount: 485.50,
    paymentProcessingTime: 5.2,
    revenueTrend: [
      { month: '2023-08', revenue: 8200 },
      { month: '2023-09', revenue: 9800 },
      { month: '2023-10', revenue: 11200 },
      { month: '2023-11', revenue: 10500 },
      { month: '2023-12', revenue: 13400 },
      { month: '2024-01', revenue: 12450 }
    ],
    topCustomers: [
      { id: 1, name: 'ABC Corporation', totalSpent: 8900.00 },
      { id: 2, name: 'Smith Family Trust', totalSpent: 4200.00 },
      { id: 3, name: 'Downtown Apartments', totalSpent: 3800.00 },
      { id: 4, name: 'Main Street Mall', totalSpent: 3200.00 },
      { id: 5, name: 'Johnson Residence', totalSpent: 2100.00 }
    ]
  };

  const demoTechnicianPerformance: TechnicianPerformance[] = [
    {
      id: 1,
      name: 'Mike Johnson',
      jobsCompleted: 45,
      revenueGenerated: 28500.00,
      customerRating: 4.8,
      utilizationRate: 92.0
    },
    {
      id: 2,
      name: 'Tom Wilson',
      jobsCompleted: 38,
      revenueGenerated: 24200.00,
      customerRating: 4.6,
      utilizationRate: 87.5
    },
    {
      id: 3,
      name: 'Steve Miller',
      jobsCompleted: 32,
      revenueGenerated: 19800.00,
      customerRating: 4.4,
      utilizationRate: 78.0
    }
  ];

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // For demo, use local data
      setBusinessMetrics(demoBusinessMetrics);
      setFinancialData(demoFinancialData);
      setTechnicianPerformance(demoTechnicianPerformance);
      setLoading(false);
    } catch (err) {
      setError('Failed to load analytics data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value >= threshold) return 'success';
    if (value >= threshold * 0.8) return 'warning';
    return 'error';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculateRevenueGrowth = () => {
    if (!financialData || financialData.revenueTrend.length < 2) return 0;
    const current = financialData.revenueTrend[financialData.revenueTrend.length - 1].revenue;
    const previous = financialData.revenueTrend[financialData.revenueTrend.length - 2].revenue;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading analytics data...</Typography>
      </Box>
    );
  }

  if (!businessMetrics || !financialData) {
    return (
      <Box>
        <Alert severity="error">Failed to load analytics data</Alert>
      </Box>
    );
  }

  const revenueGrowth = calculateRevenueGrowth();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <Button variant="contained" startIcon={<AssessmentIcon />}>
          Generate Report
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Key Performance Indicators */}
      <Typography variant="h5" sx={{ mb: 2 }}>Key Performance Indicators</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Total Customers
                  </Typography>
                  <Typography variant="h4">
                    {businessMetrics.totalCustomers}
                  </Typography>
                </Box>
                <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(businessMetrics.monthlyRevenue)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {revenueGrowth > 0 ? (
                      <TrendingUpIcon color="success" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="error" fontSize="small" />
                    )}
                    <Typography variant="body2" color={revenueGrowth > 0 ? 'success.main' : 'error.main'}>
                      {Math.abs(revenueGrowth).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                <MoneyIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Active Jobs
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {businessMetrics.activeJobs}
                  </Typography>
                </Box>
                <BuildIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Customer Rating
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {businessMetrics.customerSatisfaction.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    out of 5.0
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  {'★'.repeat(Math.floor(businessMetrics.customerSatisfaction))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Overview */}
      <Typography variant="h5" sx={{ mb: 2 }}>Financial Overview</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Revenue Trend (Last 6 Months)</Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 2 }}>
                {financialData.revenueTrend.map((data, index) => {
                  const maxRevenue = Math.max(...financialData.revenueTrend.map(d => d.revenue));
                  const height = (data.revenue / maxRevenue) * 180;
                  return (
                    <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {formatCurrency(data.revenue)}
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          height: `${height}px`,
                          backgroundColor: 'primary.main',
                          borderRadius: 1
                        }}
                      />
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        {new Date(data.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatCurrency(financialData.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Outstanding Amount
              </Typography>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(financialData.totalOutstanding)}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Avg Invoice Amount
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(financialData.averageInvoiceAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Technician Performance */}
      <Typography variant="h5" sx={{ mb: 2 }}>Technician Performance</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Technician</TableCell>
                  <TableCell>Jobs Completed</TableCell>
                  <TableCell>Revenue Generated</TableCell>
                  <TableCell>Customer Rating</TableCell>
                  <TableCell>Utilization Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {technicianPerformance.map((tech) => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {tech.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{tech.jobsCompleted}</TableCell>
                    <TableCell>{formatCurrency(tech.revenueGenerated)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">{tech.customerRating.toFixed(1)}</Typography>
                        <Chip
                          label={tech.customerRating >= 4.5 ? 'Excellent' : tech.customerRating >= 4.0 ? 'Good' : 'Fair'}
                          color={tech.customerRating >= 4.5 ? 'success' : tech.customerRating >= 4.0 ? 'primary' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={tech.utilizationRate}
                          color={getPerformanceColor(tech.utilizationRate, 85) as any}
                          sx={{ width: 60, height: 8 }}
                        />
                        <Typography variant="body2">
                          {tech.utilizationRate.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Top Customers by Revenue</Typography>
              {financialData.topCustomers.map((customer, index) => (
                <Box key={customer.id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      #{index + 1} {customer.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(customer.totalSpent)}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Operational Metrics */}
      <Typography variant="h5" sx={{ mb: 2 }}>Operational Metrics</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Technician Utilization
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={businessMetrics.technicianUtilization}
                  color={getPerformanceColor(businessMetrics.technicianUtilization, 80) as any}
                  sx={{ width: 100, height: 10 }}
                />
                <Typography variant="h5">
                  {businessMetrics.technicianUtilization.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Pending Invoices
              </Typography>
              <Typography variant="h4" color={businessMetrics.pendingInvoices > 5 ? 'warning.main' : 'primary'}>
                {businessMetrics.pendingInvoices}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Avg Payment Time
              </Typography>
              <Typography variant="h4" color="info.main">
                {financialData.paymentProcessingTime.toFixed(1)} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                First-Time Fix Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                92.3%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;