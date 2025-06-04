import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  variant?: 'page' | 'component' | 'inline';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 40,
  variant = 'page'
}) => {
  const getContainerStyles = (): any => {
    switch (variant) {
      case 'page':
        return {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          p: 3
        };
      case 'component':
        return {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          minHeight: '200px'
        };
      case 'inline':
        return {
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1
        };
      default:
        return {};
    }
  };

  return (
    <Box sx={getContainerStyles()}>
      <CircularProgress 
        size={size} 
        data-testid="loading-spinner"
        sx={{ mb: variant === 'inline' ? 0 : 2 }}
      />
      {message && (
        <Typography 
          variant={variant === 'inline' ? 'body2' : 'body1'} 
          color="text.secondary"
          align="center"
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;