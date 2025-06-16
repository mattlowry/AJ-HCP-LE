import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tab,
  Tabs,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  Engineering as EngineeringIcon,
  CheckCircle as ValidationIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TopNavigationProps {
  title?: string;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ title = 'AJ Long Electric - Field Service Management' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', value: 0 },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers', value: 1 },
    { text: 'Scheduling', icon: <ScheduleIcon />, path: '/scheduling', value: 2 },
    { text: 'Jobs', icon: <WorkIcon />, path: '/jobs', value: 3 },
    { text: 'Billing', icon: <ReceiptIcon />, path: '/billing', value: 4 },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory', value: 5 },
    { text: 'Technicians', icon: <EngineeringIcon />, path: '/technicians', value: 6 },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', value: 7 },
    { text: 'Validation Demo', icon: <ValidationIcon />, path: '/validation-demo', value: 8 },
  ];

  const getCurrentTabValue = () => {
    const currentItem = menuItems.find(item => {
      if (item.path === '/' && location.pathname === '/') {
        return true;
      }
      return location.pathname.startsWith(item.path) && item.path !== '/';
    });
    return currentItem?.value ?? false;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    const item = menuItems.find(item => item.value === newValue);
    if (item) {
      navigate(item.path);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleUserMenuClose();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'primary';
      case 'technician': return 'success';
      case 'customer': return 'warning';
      default: return 'default';
    }
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {/* Logo/Brand */}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              mr: 4,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            AJ Long Electric
          </Typography>

          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open menu"
              edge="start"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Desktop Navigation Tabs */}
          {!isMobile && (
            <Tabs
              value={getCurrentTabValue()}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{
                flexGrow: 1,
                '& .MuiTab-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-selected': {
                    color: 'white',
                  },
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: theme.palette.secondary.main,
                },
              }}
            >
              {menuItems.map((item) => (
                <Tab
                  key={item.value}
                  label={item.text}
                  value={item.value}
                  sx={{ minWidth: 'auto' }}
                />
              ))}
            </Tabs>
          )}

          {/* Spacer for mobile */}
          {isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* User Profile Section */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={user.role} 
                  size="small" 
                  color={getRoleColor(user.role) as any}
                  sx={{ 
                    textTransform: 'capitalize',
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                  variant="outlined"
                />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {user.first_name} {user.last_name}
                </Typography>
              </Box>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  {user.first_name[0]}{user.last_name[0]}
                </Avatar>
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleMobileNavigation(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(74, 144, 226, 0.1)',
                      borderRight: '3px solid #4A90E2',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {user && (
            <>
              <Divider />
              <Box sx={{ p: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'grey.50' 
                }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {user.first_name[0]}{user.last_name[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {user.first_name} {user.last_name}
                    </Typography>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color={getRoleColor(user.role) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate('/profile')}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default TopNavigation;