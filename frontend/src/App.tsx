import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import SchedulingCalendar from './components/SchedulingCalendar';
import JobList from './components/JobList';
import BillingInvoices from './components/BillingInvoices';
import InventoryManagement from './components/InventoryManagement';
import AnalyticsDashboard from './components/AnalyticsDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  try {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex' }}>
            <AppBar
              position="fixed"
              sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { sm: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  AJ Long Electric - Field Service Management
                </Typography>
              </Toolbar>
            </AppBar>

            <Navigation 
              open={mobileOpen} 
              onClose={handleDrawerToggle}
            />

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                width: { sm: `calc(100% - ${drawerWidth}px)` },
              }}
            >
              <Toolbar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/new" element={<CustomerDetail />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/scheduling" element={<SchedulingCalendar />} />
                <Route path="/jobs" element={<JobList />} />
                <Route path="/billing" element={<BillingInvoices />} />
                <Route path="/inventory" element={<InventoryManagement />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>AJ Long Electric FSM</h1>
        <p>Application loading error. Please check the console for details.</p>
        <p>Error: {String(error)}</p>
      </div>
    );
  }
}

export default App;
