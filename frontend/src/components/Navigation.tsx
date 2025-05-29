import React from 'react';
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
  Typography
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  Engineering as EngineeringIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const drawerWidth = 240;

interface NavigationProps {
  open: boolean;
  onClose: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
    { text: 'Scheduling', icon: <ScheduleIcon />, path: '/scheduling' },
    { text: 'Jobs', icon: <WorkIcon />, path: '/jobs' },
    { text: 'Billing', icon: <ReceiptIcon />, path: '/billing' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Technicians', icon: <EngineeringIcon />, path: '/technicians' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
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
    </Box>
  );
};

export default Navigation;