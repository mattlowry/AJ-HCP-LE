import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  IconButton
} from '@mui/material';
import { AccountCircle, Logout } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  Engineering as EngineeringIcon,
  Settings as SettingsIcon,
  CheckCircle as ValidationIcon
} from '@mui/icons-material';

const drawerWidth = 240;

interface NavigationProps {
  open: boolean;
  onClose: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
    { text: 'Scheduling', icon: <ScheduleIcon />, path: '/scheduling' },
    { text: 'Jobs', icon: <WorkIcon />, path: '/jobs' },
    { text: 'Billing', icon: <ReceiptIcon />, path: '/billing' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Technicians', icon: <EngineeringIcon />, path: '/technicians' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Validation Demo', icon: <ValidationIcon />, path: '/validation-demo' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
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

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          AJ Long Electric
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      
      {/* User Profile Section */}
      {user && (
        <Box sx={{ p: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              p: 1,
              borderRadius: 1,
              bgcolor: 'grey.50',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'grey.100' }
            }}
            onClick={handleUserMenuOpen}
          >
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
            <IconButton size="small">
              <AccountCircle />
            </IconButton>
          </Box>
        </Box>
      )}
      
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
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
    </Box>
  );
};

export default Navigation;