import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import { Search, Person, Phone, Email, LocationOn } from '@mui/icons-material';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import VirtualizedList from './VirtualizedList';
import LoadingSpinner from './LoadingSpinner';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  properties_count?: number;
  jobs_count?: number;
}

interface OptimizedCustomerListProps {
  customers: Customer[];
  onCustomerClick: (customer: Customer) => void;
  onLoadMore?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  totalCount?: number;
}

/**
 * Optimized customer list with virtualization, infinite scroll, and search debouncing
 * Handles large datasets efficiently
 */
const OptimizedCustomerList: React.FC<OptimizedCustomerListProps> = ({
  customers,
  onCustomerClick,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  totalCount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'jobs'>('name');
  
  // Debounce search to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Infinite scroll setup
  const { triggerRef, isFetchingNextPage } = useInfiniteScroll({
    hasNextPage,
    fetchNextPage: onLoadMore || (() => {}),
    threshold: 0.8,
    rootMargin: '200px',
    isLoading
  });

  // Debounced search handler
  const handleSearchChange = useDebouncedCallback(
    (value: string) => {
      setSearchTerm(value);
    },
    200
  );

  // Memoized filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Apply search filter
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(term) ||
        customer.last_name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        (customer.city && customer.city.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'jobs':
          return (b.jobs_count || 0) - (a.jobs_count || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [customers, debouncedSearchTerm, sortBy]);

  // Memoized customer renderer
  const renderCustomer = useCallback((customer: Customer, index: number) => (
    <CustomerListItem
      key={customer.id}
      customer={customer}
      onClick={() => onCustomerClick(customer)}
      isLast={index === filteredCustomers.length - 1}
    />
  ), [onCustomerClick, filteredCustomers.length]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with search and filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search customers..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['name', 'created', 'jobs'] as const).map((sort) => (
              <Chip
                key={sort}
                label={sort === 'name' ? 'Name' : sort === 'created' ? 'Recent' : 'Jobs'}
                onClick={() => setSortBy(sort)}
                variant={sortBy === sort ? 'filled' : 'outlined'}
                color={sortBy === sort ? 'primary' : 'default'}
              />
            ))}
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {debouncedSearchTerm ? (
            <>Showing {filteredCustomers.length} results for "{debouncedSearchTerm}"</>
          ) : (
            <>Showing {filteredCustomers.length} of {totalCount || customers.length} customers</>
          )}
        </Typography>
      </Paper>

      {/* Virtualized customer list */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {filteredCustomers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              {debouncedSearchTerm ? 'No customers found' : 'No customers yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {debouncedSearchTerm ? 'Try adjusting your search' : 'Start by adding your first customer'}
            </Typography>
          </Box>
        ) : (
          <VirtualizedList
            items={filteredCustomers}
            itemHeight={120}
            containerHeight={600}
            renderItem={renderCustomer}
            overscan={5}
          />
        )}

        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <div
            ref={triggerRef}
            style={{
              height: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {isFetchingNextPage && <LoadingSpinner variant="inline" size={24} />}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && filteredCustomers.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1
            }}
          >
            <LoadingSpinner message="Loading customers..." />
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Memoized customer list item component
const CustomerListItem = React.memo<{
  customer: Customer;
  onClick: () => void;
  isLast: boolean;
}>(({ customer, onClick, isLast }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatLocation = () => {
    const parts = [customer.city, customer.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : customer.address || 'No location';
  };

  return (
    <Card
      sx={{
        mb: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        },
        ...(isLast && { mb: 0 })
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getInitials(customer.first_name, customer.last_name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {customer.first_name} {customer.last_name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary" noWrap>
                  {customer.email}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {customer.phone}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {formatLocation()}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            {customer.properties_count !== undefined && (
              <Chip
                label={`${customer.properties_count} properties`}
                size="small"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            )}
            {customer.jobs_count !== undefined && (
              <Chip
                label={`${customer.jobs_count} jobs`}
                size="small"
                color={customer.jobs_count > 0 ? 'primary' : 'default'}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

CustomerListItem.displayName = 'CustomerListItem';

export default OptimizedCustomerList;