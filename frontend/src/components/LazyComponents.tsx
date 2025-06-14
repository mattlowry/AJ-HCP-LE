/**
 * Lazy-loaded components for performance optimization
 * Implements code splitting to reduce initial bundle size
 */

import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load heavy components
const AnalyticsDashboard = React.lazy(() => import('./AnalyticsDashboard'));
const BillingInvoices = React.lazy(() => import('./BillingInvoices'));
const CustomerDetail = React.lazy(() => import('./CustomerDetail'));
const CustomerList = React.lazy(() => import('./CustomerList'));
const InventoryManagement = React.lazy(() => import('./InventoryManagement'));
const JobList = React.lazy(() => import('./JobList'));
const SchedulingCalendar = React.lazy(() => import('./SchedulingCalendar'));
const TechnicianManagement = React.lazy(() => import('./TechnicianManagement'));
const UserProfile = React.lazy(() => import('./UserProfile'));
const UserRegistration = React.lazy(() => import('./UserRegistration'));

// Wrapper component with loading fallback
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <LoadingSpinner message="Loading component..." /> 
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// Lazy component exports with loading wrappers
export const LazyAnalyticsDashboard: React.FC = () => (
  <LazyWrapper>
    <AnalyticsDashboard />
  </LazyWrapper>
);

export const LazyBillingInvoices: React.FC = () => (
  <LazyWrapper>
    <BillingInvoices />
  </LazyWrapper>
);

export const LazyCustomerDetail: React.FC = () => (
  <LazyWrapper>
    <CustomerDetail />
  </LazyWrapper>
);

export const LazyCustomerList: React.FC = () => (
  <LazyWrapper>
    <CustomerList />
  </LazyWrapper>
);

export const LazyInventoryManagement: React.FC = () => (
  <LazyWrapper>
    <InventoryManagement />
  </LazyWrapper>
);

export const LazyJobList: React.FC = () => (
  <LazyWrapper>
    <JobList />
  </LazyWrapper>
);

export const LazySchedulingCalendar: React.FC = () => (
  <LazyWrapper>
    <SchedulingCalendar />
  </LazyWrapper>
);

export const LazyTechnicianManagement: React.FC = () => (
  <LazyWrapper>
    <TechnicianManagement />
  </LazyWrapper>
);

export const LazyUserProfile: React.FC = () => (
  <LazyWrapper>
    <UserProfile />
  </LazyWrapper>
);

export const LazyUserRegistration: React.FC = () => (
  <LazyWrapper>
    <UserRegistration />
  </LazyWrapper>
);

// Preload function for critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used immediately
  import('./Dashboard');
  import('./CustomerList');
  import('./JobList');
};

// Component map for dynamic imports
export const LAZY_COMPONENT_MAP = {
  'analytics': LazyAnalyticsDashboard,
  'billing': LazyBillingInvoices,
  'customer-detail': LazyCustomerDetail,
  'customers': LazyCustomerList,
  'inventory': LazyInventoryManagement,
  'jobs': LazyJobList,
  'scheduling': LazySchedulingCalendar,
  'technicians': LazyTechnicianManagement,
  'profile': LazyUserProfile,
  'register': LazyUserRegistration,
} as const;

export type LazyComponentKey = keyof typeof LAZY_COMPONENT_MAP;

// Hook for lazy component loading with error boundary
export const useLazyComponent = (componentKey: LazyComponentKey) => {
  const Component = LAZY_COMPONENT_MAP[componentKey];
  
  return React.useMemo(() => {
    const LazyComponentWithErrorBoundary: React.FC = () => (
      <React.Suspense 
        fallback={<LoadingSpinner message={`Loading ${componentKey}...`} />}
      >
        <Component />
      </React.Suspense>
    );
    
    return LazyComponentWithErrorBoundary;
  }, [Component, componentKey]);
};

export default LazyWrapper;