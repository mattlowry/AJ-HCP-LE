import React from 'react';
import { Card, CardProps } from '@mui/material';

interface SoftCardProps extends Omit<CardProps, 'variant'> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  glow?: boolean;
  children: React.ReactNode;
}

const SoftCard: React.FC<SoftCardProps> = ({
  variant = 'default',
  glow = false,
  children,
  sx,
  ...props
}) => {
  const getCardStyles = () => {
    const baseStyles = {
      borderRadius: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid rgba(0, 0, 0, 0.04)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': glow ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(116, 185, 255, 0.05) 100%)',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        zIndex: 0,
      } : {},
      '&:hover': {
        transform: 'translateY(-4px)',
        '&::before': glow ? {
          opacity: 1,
        } : {},
      },
      '& > *': {
        position: 'relative',
        zIndex: 1,
      },
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
          '&:hover': {
            ...baseStyles['&:hover'],
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.12)',
          },
        };
      
      case 'glass':
        return {
          ...baseStyles,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.1)',
          },
        };
      
      case 'gradient':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.02) 0%, rgba(116, 185, 255, 0.02) 100%)',
          border: '1px solid rgba(74, 144, 226, 0.1)',
          boxShadow: '0px 4px 20px rgba(74, 144, 226, 0.08)',
          '&:hover': {
            ...baseStyles['&:hover'],
            background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.04) 0%, rgba(116, 185, 255, 0.04) 100%)',
            boxShadow: '0px 8px 30px rgba(74, 144, 226, 0.12)',
          },
        };
      
      default:
        return {
          ...baseStyles,
          background: '#FFFFFF',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            ...baseStyles['&:hover'],
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.10)',
          },
        };
    }
  };

  const cardStyles = getCardStyles();

  return (
    <Card
      sx={[
        cardStyles,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Card>
  );
};

export default SoftCard;