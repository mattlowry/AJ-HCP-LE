import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Tab,
  Tabs,
  Button,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../services/api';
import { Customer } from '../types/customer';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (id) {
      fetchCustomer(parseInt(id));
    }
  }, [id]);

  const fetchCustomer = async (customerId: number) => {
    try {
      setLoading(true);
      const response = await customerApi.getById(customerId);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return <Typography>Loading customer details...</Typography>;
  }

  if (!customer) {
    return <Typography>Customer not found</Typography>;
  }

  const averageRating = customer.reviews?.length 
    ? customer.reviews.reduce((sum, review) => sum + review.rating, 0) / customer.reviews.length
    : 0;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/customers')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ mr: 2, bgcolor: customer.customer_type === 'commercial' ? 'primary.main' : 'secondary.main' }}>
          {customer.customer_type === 'commercial' ? <BusinessIcon /> : <PersonIcon />}
        </Avatar>
        <Box flexGrow={1}>
          <Typography variant="h4" component="h1">
            {customer.full_name}
          </Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip
              label={customer.customer_type}
              color={customer.customer_type === 'commercial' ? 'primary' : 'secondary'}
            />
            <Chip
              label={customer.preferred_contact_method}
              variant="outlined"
            />
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/customers/${customer.id}/edit`)}
        >
          Edit
        </Button>
      </Box>

      {/* Basic Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Contact Information</Typography>
              <Typography>📧 {customer.email}</Typography>
              <Typography>📞 {customer.phone}</Typography>
              <Typography>📍 {customer.full_address}</Typography>
              {customer.company_name && (
                <Typography>🏢 {customer.company_name}</Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Summary</Typography>
              <Typography>
                Properties: {customer.properties?.length || 0}
              </Typography>
              <Typography>
                Reviews: {customer.reviews?.length || 0}
                {averageRating > 0 && (
                  <Box component="span" display="inline-flex" alignItems="center" ml={1}>
                    <StarIcon fontSize="small" sx={{ color: 'gold' }} />
                    {averageRating.toFixed(1)}
                  </Box>
                )}
              </Typography>
              <Typography>
                Customer since: {new Date(customer.created_at).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Properties (${customer.properties?.length || 0})`} />
            <Tab label={`Contacts (${customer.contacts?.length || 0})`} />
            <Tab label={`Reviews (${customer.reviews?.length || 0})`} />
            <Tab label="Job History" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {customer.properties?.length ? (
            <Grid container spacing={2}>
              {customer.properties.map((property) => (
                <Grid item xs={12} md={6} key={property.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {property.property_type.replace('_', ' ')}
                      </Typography>
                      <Typography>{property.full_address}</Typography>
                      {property.main_panel_brand && (
                        <Typography variant="body2" color="text.secondary">
                          Panel: {property.main_panel_brand} ({property.main_panel_amperage}A)
                        </Typography>
                      )}
                      {property.square_footage && (
                        <Typography variant="body2" color="text.secondary">
                          {property.square_footage} sq ft
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No properties on file</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {customer.contacts?.length ? (
            <Grid container spacing={2}>
              {customer.contacts.map((contact) => (
                <Grid item xs={12} md={6} key={contact.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {contact.first_name} {contact.last_name}
                      </Typography>
                      <Chip label={contact.contact_type} size="small" sx={{ mb: 1 }} />
                      <Typography>📞 {contact.phone}</Typography>
                      {contact.email && <Typography>📧 {contact.email}</Typography>}
                      {contact.relationship && (
                        <Typography variant="body2" color="text.secondary">
                          {contact.relationship}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No additional contacts on file</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {customer.reviews?.length ? (
            <Grid container spacing={2}>
              {customer.reviews.map((review) => (
                <Grid item xs={12} key={review.id} component="div">
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box display="flex" mr={2}>
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              fontSize="small"
                              sx={{ color: i < review.rating ? 'gold' : 'lightgray' }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {review.source} • {new Date(review.created_at).toLocaleDateString()}
                        </Typography>
                        {review.sentiment_label && (
                          <Chip
                            label={review.sentiment_label}
                            size="small"
                            color={
                              review.sentiment_label === 'positive' ? 'success' :
                              review.sentiment_label === 'negative' ? 'error' : 'default'
                            }
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                      <Typography>{review.review_text}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No reviews on file</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography color="text.secondary">
            Job history will be available when the jobs module is implemented
          </Typography>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default CustomerDetail;