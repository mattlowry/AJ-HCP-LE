import React from 'react';
import { Button, ButtonProps } from '@mui/material';

interface SoftButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'success' | 'warning' | 'danger';
  pill?: boolean;
  glow?: boolean;
}

const SoftButton: React.FC<SoftButtonProps> = ({
  variant = 'primary',
  pill = true,
  glow = false,
  children,
  sx,
  ...props
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      borderRadius: pill ? '32px' : '16px',
      padding: '12px 24px',
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '0.02em',
      textTransform: 'none' as const,
      boxShadow: 'none',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': glow ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'inherit',
        filter: 'blur(8px)',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        zIndex: -1,
      } : {},
      '&:hover': {
        transform: 'translateY(-2px)',
        '&::before': glow ? {
          opacity: 0.6,
        } : {},
      },
      '&:active': {
        transform: 'translateY(0px)',
      },
      '&:disabled': {
        transform: 'none',
        opacity: 0.6,
      },
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, #5A9FE6 0%, #4589CC 100%)',
            boxShadow: '0px 8px 25px rgba(74, 144, 226, 0.4)',
          },
        };
      
      case 'secondary':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, #FF7979 0%, #F66363 100%)',
            boxShadow: '0px 8px 25px rgba(255, 107, 107, 0.4)',
          },
        };
      
      case 'soft':
        return {
          ...baseStyles,
          background: 'rgba(74, 144, 226, 0.1)',
          color: '#2E5A8A',
          border: '1px solid rgba(74, 144, 226, 0.2)',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'rgba(74, 144, 226, 0.15)',
            border: '1px solid rgba(74, 144, 226, 0.3)',
            boxShadow: '0px 6px 20px rgba(74, 144, 226, 0.15)',
          },
        };
      
      case 'ghost':
        return {
          ...baseStyles,
          background: 'transparent',
          color: '#4A90E2',
          border: '1.5px solid rgba(74, 144, 226, 0.3)',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'rgba(74, 144, 226, 0.05)',
            border: '1.5px solid #4A90E2',
            boxShadow: '0px 4px 15px rgba(74, 144, 226, 0.1)',
          },
        };
      
      case 'success':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #51C878 0%, #3A9B5C 100%)',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, #61D888 0%, #4AAB6C 100%)',
            boxShadow: '0px 8px 25px rgba(81, 200, 120, 0.4)',
          },
        };
      
      case 'warning':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #FFD93D 0%, #E6C234 100%)',
          color: '#8B6914',
          border: 'none',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, #FFE066 0%, #F0CC44 100%)',
            boxShadow: '0px 8px 25px rgba(255, 217, 61, 0.4)',
          },
        };
      
      case 'danger':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #FF4757 0%, #E84355 100%)',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, #FF5E6C 0%, #F25865 100%)',
            boxShadow: '0px 8px 25px rgba(255, 71, 87, 0.4)',
          },
        };
      
      default:
        return baseStyles;
    }
  };

  const buttonStyles = getButtonStyles();

  return (
    <Button
      sx={[
        buttonStyles,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Button>
  );
};

export default SoftButton;