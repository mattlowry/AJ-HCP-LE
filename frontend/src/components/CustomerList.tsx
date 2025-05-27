import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
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

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, [search, customerType]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (customerType !== 'all') params.customer_type = customerType;
      
      const response = await customerApi.getAll(params);
      setCustomers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      // In a real app, you'd show an error message to the user
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/customers/new')}
        >
          Add Customer
        </Button>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Search customers"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 300 }}
        />
        <TextField
          select
          label="Customer Type"
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="residential">Residential</MenuItem>
          <MenuItem value="commercial">Commercial</MenuItem>
        </TextField>
      </Box>

      {/* Customer Grid */}
      {loading ? (
        <Typography>Loading customers...</Typography>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" align="center" color="text.secondary">
              No customers found
            </Typography>
            <Typography align="center" color="text.secondary" sx={{ mt: 1 }}>
              {search || customerType !== 'all' 
                ? 'Try adjusting your search filters'
                : 'Add your first customer to get started'
              }
            </Typography>
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/customers/new')}
              >
                Add First Customer
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {customers.map((customer) => (
            <Grid item xs={12} sm={6} md={4} key={customer.id} component="div">
              <Card sx={{ height: '100%', cursor: 'pointer' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, bgcolor: customer.customer_type === 'commercial' ? 'primary.main' : 'secondary.main' }}>
                      {customer.customer_type === 'commercial' ? <BusinessIcon /> : <PersonIcon />}
                    </Avatar>
                    <Box flexGrow={1}>
                      <Typography variant="h6" component="div" noWrap>
                        {customer.full_name}
                      </Typography>
                      <Chip
                        label={customer.customer_type}
                        size="small"
                        color={customer.customer_type === 'commercial' ? 'primary' : 'secondary'}
                      />
                    </Box>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomerClick(customer.id);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" noWrap>
                    📧 {customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    📞 {customer.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    📍 {customer.full_address}
                  </Typography>
                  
                  <Box display="flex" justifyContent="between" alignItems="center" mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      {customer.property_count} {customer.property_count === 1 ? 'property' : 'properties'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Added {new Date(customer.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CustomerList;