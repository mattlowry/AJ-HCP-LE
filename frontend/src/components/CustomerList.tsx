import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../services/api';
import { CustomerListItem } from '../types/customer';
import SoftCard from './SoftCard';
import SoftButton from './SoftButton';
import LoadingSpinner from './LoadingSpinner';

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('all');

  const fetchCustomersCallback = React.useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (customerType !== 'all') params.customer_type = customerType;
      
      const response = await customerApi.getAll(params);
      setCustomers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, customerType]);

  useEffect(() => {
    fetchCustomersCallback();
  }, [fetchCustomersCallback]);


  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2E5A8A 0%, #4A90E2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Customers
        </Typography>
        <SoftButton
          variant="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/customers/new')}
          glow
        >
          Add Customer
        </SoftButton>
      </Box>

      {/* Filters */}
      <SoftCard variant="glass" sx={{ p: 3, mb: 4 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            label="Search customers"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ 
              minWidth: 300,
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
              }
            }}
            placeholder="Search by name, email, or phone..."
          />
          <TextField
            select
            label="Customer Type"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            sx={{ 
              minWidth: 180,
              '& .MuiOutlinedInput-root': {
                borderRadius: '16px',
              }
            }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="residential">Residential</MenuItem>
            <MenuItem value="commercial">Commercial</MenuItem>
          </TextField>
        </Box>
      </SoftCard>

      {/* Customer Grid */}
      {loading ? (
        <LoadingSpinner 
          variant="component" 
          message="Loading customers..." 
          size={50}
        />
      ) : customers.length === 0 ? (
        <SoftCard variant="gradient" sx={{ textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              No customers found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
              {search || customerType !== 'all' 
                ? 'Try adjusting your search filters or add a new customer'
                : 'Add your first customer to get started with managing your business'
              }
            </Typography>
            <SoftButton
              variant="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/customers/new')}
              size="large"
              glow
            >
              Add First Customer
            </SoftButton>
          </CardContent>
        </SoftCard>
      ) : (
        <Grid container spacing={3}>
          {customers.map((customer) => (
            <Grid item xs={12} sm={6} lg={4} key={customer.id}>
              <SoftCard 
                variant="elevated" 
                glow
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                  }
                }}
                onClick={() => handleCustomerClick(customer.id)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2.5}>
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        width: 48, 
                        height: 48,
                        background: customer.customer_type === 'commercial' 
                          ? 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)' 
                          : 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {customer.customer_type === 'commercial' ? <BusinessIcon /> : <PersonIcon />}
                    </Avatar>
                    <Box flexGrow={1}>
                      <Typography 
                        variant="h6" 
                        component="div" 
                        noWrap
                        sx={{ fontWeight: 600, mb: 0.5 }}
                      >
                        {customer.full_name}
                      </Typography>
                      <Chip
                        label={customer.customer_type}
                        size="small"
                        sx={{
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: customer.customer_type === 'commercial' 
                            ? 'rgba(74, 144, 226, 0.1)' 
                            : 'rgba(255, 107, 107, 0.1)',
                          color: customer.customer_type === 'commercial' 
                            ? '#2E5A8A' 
                            : '#C53030',
                          border: `1px solid ${customer.customer_type === 'commercial' 
                            ? 'rgba(74, 144, 226, 0.2)' 
                            : 'rgba(255, 107, 107, 0.2)'}`,
                        }}
                      />
                    </Box>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomerClick(customer.id);
                      }}
                      sx={{
                        borderRadius: '12px',
                        backgroundColor: 'rgba(74, 144, 226, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(74, 144, 226, 0.15)',
                          transform: 'scale(1.1)',
                        }
                      }}
                    >
                      <ViewIcon sx={{ color: 'primary.main' }} />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ space: 1.5 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      noWrap
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      <Box component="span" sx={{ mr: 1, fontSize: '1rem' }}>📧</Box>
                      {customer.email}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      noWrap
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      <Box component="span" sx={{ mr: 1, fontSize: '1rem' }}>📞</Box>
                      {customer.phone}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      noWrap
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 2,
                        fontSize: '0.875rem',
                      }}
                    >
                      <Box component="span" sx={{ mr: 1, fontSize: '1rem' }}>📍</Box>
                      {customer.full_address}
                    </Typography>
                  </Box>
                  
                  <Box 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    sx={{
                      pt: 2,
                      borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'primary.main',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    >
                      {customer.property_count} {customer.property_count === 1 ? 'property' : 'properties'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {new Date(customer.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </SoftCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CustomerList;