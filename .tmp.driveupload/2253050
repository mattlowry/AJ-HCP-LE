import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Box,
  Drawer,
  Toolbar,
  Typography,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import TopNavigation from './TopNavigation';
import { useNavigation } from '../contexts/NavigationContext';

const MainLayout: React.FC = () => {
  const { sidebar } = useNavigation();
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <TopNavigation />
      
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            width: sidebar.show ? `calc(100% - ${sidebar.width}px)` : '100%',
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <Toolbar /> {/* Spacer for fixed AppBar */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Outlet />
          </Box>
        </Box>

        {/* Conditional Sidebar */}
        {sidebar.show && (
          <Drawer
            variant="permanent"
            anchor="right"
            sx={{
              width: sidebar.width,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: sidebar.width,
                boxSizing: 'border-box',
                position: 'relative',
                height: '100%',
                border: 'none',
                borderLeft: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <Toolbar /> {/* Spacer for fixed AppBar */}
            <Paper 
              elevation={0} 
              sx={{ 
                height: '100%', 
                borderRadius: 0,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {sidebar.title && (
                <>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="h6" component="h2">
                      {sidebar.title}
                    </Typography>
                  </Box>
                  <Divider />
                </>
              )}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {sidebar.content}
              </Box>
            </Paper>
          </Drawer>
        )}
      </Box>
    </Box>
  );
};

export default MainLayout;