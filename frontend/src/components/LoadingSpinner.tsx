import React from 'react';
import { Box, CircularProgress, Typography, keyframes } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  variant?: 'page' | 'component' | 'inline';
}

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 40,
  variant = 'page'
}) => {
  const getContainerStyles = () => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };

    switch (variant) {
      case 'page':
        return {
          ...baseStyles,
          minHeight: '50vh',
          p: 3,
          background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.02) 0%, rgba(116, 185, 255, 0.02) 100%)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
        };
      case 'component':
        return {
          ...baseStyles,
          p: 3,
          minHeight: '200px',
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(74, 144, 226, 0.1)',
        };
      case 'inline':
        return {
          display: 'flex' as const,
          alignItems: 'center' as const,
          gap: 1.5,
          p: 1,
        };
      default:
        return baseStyles;
    }
  };

  return (
    <Box sx={getContainerStyles()}>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: variant === 'inline' ? 0 : 2,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: size + 20,
            height: size + 20,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(116, 185, 255, 0.1) 100%)',
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
        <CircularProgress 
          size={size} 
          data-testid="loading-spinner"
          sx={{ 
            color: 'primary.main',
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
      </Box>
      {message && (
        <Typography 
          variant={variant === 'inline' ? 'body2' : 'body1'} 
          color="text.secondary"
          align="center"
          sx={{
            fontWeight: 500,
            letterSpacing: '0.02em',
            animation: variant !== 'inline' ? `${pulse} 2s ease-in-out infinite 0.5s` : 'none',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;