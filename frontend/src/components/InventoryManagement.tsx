import React, { useState, useEffect } from 'react';
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
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

interface Item {
  id: number;
  item_code: string;
  name: string;
  description: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  reorder_point: number;
  unit_of_measure: string;
  cost_price: number;
  sell_price: number;
  supplier_name: string;
  warehouse_location: string;
  is_active: boolean;
}

interface StockMovement {
  id: number;
  item_name: string;
  movement_type: string;
  quantity: number;
  movement_date: string;
  reason: string;
  technician_name?: string;
  job_number?: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name: string;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  items_count: number;
}

const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Demo data
  const demoItems: Item[] = [
    {
      id: 1,
      item_code: 'WIRE-12AWG-100',
      name: '12 AWG Wire',
      description: '12 gauge copper wire, 100ft roll',
      category: 'Wiring',
      current_stock: 25,
      minimum_stock: 10,
      maximum_stock: 100,
      reorder_point: 15,
      unit_of_measure: 'roll',
      cost_price: 45.00,
      sell_price: 60.00,
      supplier_name: 'Electrical Supply Co',
      warehouse_location: 'A-1-3',
      is_active: true
    },
    {
      id: 2,
      item_code: 'OUTLET-GFCI-15A',
      name: 'GFCI Outlet 15A',
      description: '15 amp GFCI outlet, white',
      category: 'Outlets',
      current_stock: 5,
      minimum_stock: 20,
      maximum_stock: 50,
      reorder_point: 25,
      unit_of_measure: 'each',
      cost_price: 12.50,
      sell_price: 18.00,
      supplier_name: 'Electric Parts Plus',
      warehouse_location: 'B-2-1',
      is_active: true
    },
    {
      id: 3,
      item_code: 'BREAKER-20A-SP',
      name: '20A Single Pole Breaker',
      description: '20 amp single pole circuit breaker',
      category: 'Breakers',
      current_stock: 50,
      minimum_stock: 10,
      maximum_stock: 100,
      reorder_point: 15,
      unit_of_measure: 'each',
      cost_price: 8.25,
      sell_price: 12.00,
      supplier_name: 'Electrical Supply Co',
      warehouse_location: 'C-1-2',
      is_active: true
    },
    {
      id: 4,
      item_code: 'CONDUIT-PVC-1IN',
      name: '1" PVC Conduit',
      description: '1 inch PVC electrical conduit, 10ft',
      category: 'Conduit',
      current_stock: 2,
      minimum_stock: 15,
      maximum_stock: 50,
      reorder_point: 20,
      unit_of_measure: 'each',
      cost_price: 3.75,
      sell_price: 5.50,
      supplier_name: 'Building Materials Inc',
      warehouse_location: 'D-3-1',
      is_active: true
    }
  ];

  const demoMovements: StockMovement[] = [
    {
      id: 1,
      item_name: '12 AWG Wire',
      movement_type: 'job_use',
      quantity: -2,
      movement_date: '2024-01-15T14:30:00Z',
      reason: 'Used on kitchen repair job',
      technician_name: 'Mike Johnson',
      job_number: 'JOB-2024-0001'
    },
    {
      id: 2,
      item_name: 'GFCI Outlet 15A',
      movement_type: 'purchase',
      quantity: 25,
      movement_date: '2024-01-14T09:00:00Z',
      reason: 'Received purchase order PO-2024-0001'
    },
    {
      id: 3,
      item_name: '20A Single Pole Breaker',
      movement_type: 'job_use',
      quantity: -3,
      movement_date: '2024-01-12T16:15:00Z',
      reason: 'Panel installation',
      technician_name: 'Tom Wilson',
      job_number: 'JOB-2024-0002'
    },
    {
      id: 4,
      item_name: '1" PVC Conduit',
      movement_type: 'adjustment',
      quantity: -5,
      movement_date: '2024-01-10T11:00:00Z',
      reason: 'Inventory count adjustment - damaged items'
    }
  ];

  const demoPurchaseOrders: PurchaseOrder[] = [
    {
      id: 1,
      po_number: 'PO-2024-0001',
      supplier_name: 'Electric Parts Plus',
      status: 'received',
      order_date: '2024-01-10',
      expected_delivery_date: '2024-01-15',
      total_amount: 312.50,
      items_count: 25
    },
    {
      id: 2,
      po_number: 'PO-2024-0002',
      supplier_name: 'Electrical Supply Co',
      status: 'confirmed',
      order_date: '2024-01-16',
      expected_delivery_date: '2024-01-22',
      total_amount: 890.00,
      items_count: 45
    },
    {
      id: 3,
      po_number: 'PO-2024-0003',
      supplier_name: 'Building Materials Inc',
      status: 'draft',
      order_date: '2024-01-17',
      expected_delivery_date: '2024-01-25',
      total_amount: 156.75,
      items_count: 30
    }
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      // For demo, use local data
      setItems(demoItems);
      setMovements(demoMovements);
      setPurchaseOrders(demoPurchaseOrders);
      setLoading(false);
    } catch (err) {
      setError('Failed to load inventory data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStockStatus = (item: Item) => {
    if (item.current_stock <= item.reorder_point) return 'critical';
    if (item.current_stock <= item.minimum_stock) return 'low';
    return 'normal';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'critical': return 'error';
      case 'low': return 'warning';
      case 'normal': return 'success';
      default: return 'default';
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'success';
      case 'job_use': return 'primary';
      case 'adjustment': return 'warning';
      case 'return': return 'info';
      case 'damage': return 'error';
      default: return 'default';
    }
  };

  const getPOStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'confirmed': return 'warning';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    const matchesStock = stockFilter === '' || getStockStatus(item) === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const calculateInventoryStats = () => {
    const totalItems = items.length;
    const lowStockItems = items.filter(item => getStockStatus(item) === 'low').length;
    const criticalStockItems = items.filter(item => getStockStatus(item) === 'critical').length;
    const totalValue = items.reduce((sum, item) => sum + (item.current_stock * item.cost_price), 0);
    
    return { totalItems, lowStockItems, criticalStockItems, totalValue };
  };

  const stats = calculateInventoryStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading inventory data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Inventory Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ShoppingCartIcon />}
            sx={{ mr: 1 }}
          >
            Create PO
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
          >
            Add Item
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
              <Typography variant="h6">Total Items</Typography>
              <Typography variant="h4" color="primary">
                {stats.totalItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">Low Stock</Typography>
              <Typography variant="h4">
                {stats.lowStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">Critical Stock</Typography>
              <Typography variant="h4">
                {stats.criticalStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Value</Typography>
              <Typography variant="h4" color="success.main">
                ${stats.totalValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Critical Stock Alert */}
      {stats.criticalStockItems > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="h6">Critical Stock Alert!</Typography>
          <Typography>
            {stats.criticalStockItems} items are at or below reorder point and need immediate attention.
          </Typography>
        </Alert>
      )}

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Search items..."
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
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            <MenuItem value="Wiring">Wiring</MenuItem>
            <MenuItem value="Outlets">Outlets</MenuItem>
            <MenuItem value="Breakers">Breakers</MenuItem>
            <MenuItem value="Conduit">Conduit</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            label="Stock Status"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="normal">Normal Stock</MenuItem>
            <MenuItem value="low">Low Stock</MenuItem>
            <MenuItem value="critical">Critical Stock</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={`Items (${items.length})`} />
          <Tab label={`Stock Movements (${movements.length})`} />
          <Tab label={`Purchase Orders (${purchaseOrders.length})`} />
        </Tabs>
      </Box>

      {/* Items Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Current Stock</TableCell>
                <TableCell>Stock Level</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Cost Price</TableCell>
                <TableCell>Sell Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                const stockPercentage = (item.current_stock / item.maximum_stock) * 100;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.item_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.current_stock} {item.unit_of_measure}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Min: {item.minimum_stock} | Max: {item.maximum_stock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(stockPercentage, 100)}
                          color={getStockColor(stockStatus) as any}
                          sx={{ width: 60, height: 8 }}
                        />
                        <Chip
                          label={stockStatus}
                          color={getStockColor(stockStatus) as any}
                          size="small"
                          variant="outlined"
                        />
                        {stockStatus === 'critical' && <WarningIcon color="error" fontSize="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>{item.warehouse_location}</TableCell>
                    <TableCell>${item.cost_price.toFixed(2)}</TableCell>
                    <TableCell>${item.sell_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton size="small" color="primary">
                          <ViewIcon />
                        </IconButton>
                        <IconButton size="small" color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="secondary">
                          <InventoryIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stock Movements Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Job/Technician</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    {new Date(movement.movement_date).toLocaleDateString()} {' '}
                    {new Date(movement.movement_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </TableCell>
                  <TableCell>{movement.item_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={movement.movement_type.replace('_', ' ')}
                      color={getMovementTypeColor(movement.movement_type) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      color={movement.quantity > 0 ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell>{movement.reason}</TableCell>
                  <TableCell>
                    {movement.job_number && (
                      <Typography variant="body2">
                        {movement.job_number}
                      </Typography>
                    )}
                    {movement.technician_name && (
                      <Typography variant="caption" color="text.secondary">
                        {movement.technician_name}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PO Number</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Expected Delivery</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {po.po_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{po.supplier_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={po.status}
                      color={getPOStatusColor(po.status) as any}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(po.expected_delivery_date).toLocaleDateString()}</TableCell>
                  <TableCell>{po.items_count} items</TableCell>
                  <TableCell>${po.total_amount.toFixed(2)}</TableCell>
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

export default InventoryManagement;