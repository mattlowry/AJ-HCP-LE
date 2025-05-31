import React, { useState, useEffect } from 'react';
import { billingApi } from '../services/api';
import { validateForm, commonValidationRules, validationPatterns, formatCurrency } from '../utils/validation';
import { Invoice, Estimate, Payment } from '../types/billing';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Print as PrintIcon
} from '@mui/icons-material';

interface LocalInvoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  job_number?: string;
  status: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
}

interface LocalEstimate {
  id: number;
  estimate_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  estimate_date: string;
  expiration_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
}

interface LocalPayment {
  id: number;
  reference_number: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
}

const BillingInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [invoices, setInvoices] = useState<LocalInvoice[]>([]);
  const [estimates, setEstimates] = useState<LocalEstimate[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Demo data
  const demoInvoices: LocalInvoice[] = [
    {
      id: 1,
      invoice_number: 'INV-2024-0001',
      customer_name: 'John Smith',
      customer_email: 'john.smith@email.com',
      job_number: 'JOB-2024-0001',
      status: 'sent',
      invoice_date: '2024-01-15',
      due_date: '2024-02-14',
      subtotal: 150.00,
      tax_amount: 12.00,
      total_amount: 162.00,
      amount_paid: 0.00,
      amount_due: 162.00,
      created_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      invoice_number: 'INV-2024-0002',
      customer_name: 'Sarah Davis',
      customer_email: 'sarah.davis@email.com',
      job_number: 'JOB-2024-0002',
      status: 'paid',
      invoice_date: '2024-01-12',
      due_date: '2024-02-11',
      subtotal: 800.00,
      tax_amount: 64.00,
      total_amount: 864.00,
      amount_paid: 864.00,
      amount_due: 0.00,
      created_at: '2024-01-12T14:30:00Z'
    },
    {
      id: 3,
      invoice_number: 'INV-2024-0003',
      customer_name: 'Robert Brown',
      customer_email: 'robert.brown@email.com',
      job_number: 'JOB-2024-0003',
      status: 'overdue',
      invoice_date: '2024-01-05',
      due_date: '2024-01-20',
      subtotal: 450.00,
      tax_amount: 36.00,
      total_amount: 486.00,
      amount_paid: 0.00,
      amount_due: 486.00,
      created_at: '2024-01-05T09:15:00Z'
    }
  ];

  const demoEstimates: LocalEstimate[] = [
    {
      id: 1,
      estimate_number: 'EST-2024-0001',
      customer_name: 'Lisa Garcia',
      customer_email: 'lisa.garcia@email.com',
      status: 'sent',
      estimate_date: '2024-01-10',
      expiration_date: '2024-02-10',
      subtotal: 1200.00,
      tax_amount: 96.00,
      total_amount: 1296.00,
      created_at: '2024-01-10T11:00:00Z'
    },
    {
      id: 2,
      estimate_number: 'EST-2024-0002',
      customer_name: 'Mark Wilson',
      customer_email: 'mark.wilson@email.com',
      status: 'accepted',
      estimate_date: '2024-01-08',
      expiration_date: '2024-02-08',
      subtotal: 300.00,
      tax_amount: 24.00,
      total_amount: 324.00,
      created_at: '2024-01-08T16:20:00Z'
    }
  ];

  const demoPayments: LocalPayment[] = [
    {
      id: 1,
      reference_number: 'PAY-2024-0001',
      invoice_number: 'INV-2024-0002',
      customer_name: 'Sarah Davis',
      amount: 864.00,
      payment_method: 'credit_card',
      payment_date: '2024-01-14',
      status: 'completed'
    },
    {
      id: 2,
      reference_number: 'PAY-2024-0002',
      invoice_number: 'INV-2024-0001',
      customer_name: 'John Smith',
      amount: 100.00,
      payment_method: 'check',
      payment_date: '2024-01-16',
      status: 'pending'
    }
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // For demo purposes, use demo data directly
      // TODO: Uncomment API calls when backend is fully integrated
      /*
      const [invoicesResponse, estimatesResponse, paymentsResponse] = await Promise.all([
        billingApi.getInvoices(),
        billingApi.getEstimates(),
        billingApi.getPayments()
      ]);
      
      setInvoices(invoicesResponse.data.results);
      setEstimates(estimatesResponse.data.results);
      setPayments(paymentsResponse.data.results);
      */
      
      // Using demo data
      setInvoices(demoInvoices);
      setEstimates(demoEstimates);
      setPayments(demoPayments);
      setLoading(false);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing data. Using demo data.');
      // Fallback to demo data if API fails
      setInvoices(demoInvoices);
      setEstimates(demoEstimates);
      setPayments(demoPayments);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'viewed': return 'warning';
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'expired': return 'error';
      case 'completed': return 'success';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredEstimates = estimates.filter(estimate => {
    const matchesSearch = estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         estimate.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || estimate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const calculateTotals = () => {
    const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
    const outstandingAmount = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.amount_due, 0);
    const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount_due, 0);
    const pendingEstimates = estimates.filter(est => est.status === 'sent').reduce((sum, est) => sum + est.total_amount, 0);

    return { totalRevenue, outstandingAmount, overdueAmount, pendingEstimates };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">Loading billing data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Billing & Invoicing
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ReceiptIcon />}
            sx={{ mr: 1 }}
          >
            New Estimate
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
          >
            New Invoice
          </Button>
        </Box>
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
              <Typography variant="h6" color="success.main">Total Revenue</Typography>
              <Typography variant="h4">
                ${totals.totalRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">Outstanding</Typography>
              <Typography variant="h4">
                ${totals.outstandingAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">Overdue</Typography>
              <Typography variant="h4">
                ${totals.overdueAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">Pending Estimates</Typography>
              <Typography variant="h4">
                ${totals.pendingEstimates.toFixed(2)}
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
            label="Search..."
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
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="declined">Declined</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`Invoices (${invoices.length})`} />
          <Tab label={`Estimates (${estimates.length})`} />
          <Tab label={`Payments (${payments.length})`} />
        </Tabs>
      </Box>

      {/* Invoices Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Job #</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invoice Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Amount Due</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {invoice.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{invoice.customer_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.customer_email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{invoice.job_number || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={getStatusColor(invoice.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>${invoice.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography 
                      color={invoice.amount_due > 0 ? 'error.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      ${invoice.amount_due.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="info">
                        <SendIcon />
                      </IconButton>
                      <IconButton size="small" color="secondary">
                        <PrintIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Estimates Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estimate #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estimate Date</TableCell>
                <TableCell>Expiration Date</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEstimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {estimate.estimate_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{estimate.customer_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {estimate.customer_email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={estimate.status}
                      color={getStatusColor(estimate.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(estimate.estimate_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(estimate.expiration_date).toLocaleDateString()}</TableCell>
                  <TableCell>${estimate.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="info">
                        <SendIcon />
                      </IconButton>
                      <IconButton size="small" color="secondary">
                        <PrintIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Payments Tab */}
      {activeTab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Payment #</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {payment.reference_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{payment.invoice_number}</TableCell>
                  <TableCell>{payment.customer_name}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>
                    {payment.payment_method.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BillingInvoices;