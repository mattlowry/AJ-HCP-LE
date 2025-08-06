import { useState, useEffect, useCallback } from 'react';
import { customerApi, jobApi, analyticsApi } from '../services/api';
import { useMemoizedCalculation, useAPICache } from './usePerformanceOptimization';

export interface DashboardStats {
  totalCustomers: number;
  activeJobs: number;
  todaySchedule: number;
  monthlyRevenue: number;
}

export const useBusinessMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeJobs: 0,
    todaySchedule: 0,
    monthlyRevenue: 0,
  });

  // API caching for improved performance
  const { get: getCached, set: setCached } = useAPICache<any>();

  // Memoized date calculations
  const dateCalculations = useMemoizedCalculation(() => ({
    today: new Date().toISOString().split('T')[0],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
  }), [], 'DateCalculations');

  // Optimized data processing functions
  const processJobStats = useCallback((jobs: any[]) => {
    const activeJobStatuses = ['pending', 'scheduled', 'in_progress'];
    const activeJobs = jobs.filter(job => activeJobStatuses.includes(job.status)).length;
    
    const todaySchedule = jobs.filter(job => 
      job.scheduled_start && job.scheduled_start.startsWith(dateCalculations.today)
    ).length;

    return { activeJobs, todaySchedule };
  }, [dateCalculations.today]);

  const calculateMonthlyRevenue = useCallback((jobs: any[]) => {
    return jobs
      .filter(job => 
        job.status === 'completed' && 
        job.updated_at &&
        new Date(job.updated_at).getMonth() === dateCalculations.currentMonth &&
        new Date(job.updated_at).getFullYear() === dateCalculations.currentYear
      )
      .reduce((sum, job) => sum + (job.actual_cost || job.estimated_cost || 0), 0);
  }, [dateCalculations.currentMonth, dateCalculations.currentYear]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = `dashboard-${dateCalculations.today}`;
      const cachedStats = getCached(cacheKey);
      if (cachedStats) {
        setStats(cachedStats);
        setLoading(false);
        return;
      }
      
      // Load data in parallel with improved error handling
      const [customersResponse, jobsResponse, analyticsResponse] = await Promise.allSettled([
        customerApi.getAll(),
        jobApi.getAll(),
        analyticsApi.getFinancialSummary(),
      ]);

      // Process responses with fallbacks
      const customers = customersResponse.status === 'fulfilled' 
        ? customersResponse.value.data.results || [] 
        : [];
        
      const jobs = jobsResponse.status === 'fulfilled' 
        ? jobsResponse.value.data.results || [] 
        : [];

      // Calculate job-related stats
      const { activeJobs, todaySchedule } = processJobStats(jobs);

      // Get monthly revenue with fallback calculation
      let monthlyRevenue = 0;
      if (analyticsResponse.status === 'fulfilled') {
        monthlyRevenue = analyticsResponse.value.data.monthly_revenue || 0;
      } else {
        monthlyRevenue = calculateMonthlyRevenue(jobs);
      }

      const newStats: DashboardStats = {
        totalCustomers: customers.length,
        activeJobs,
        todaySchedule,
        monthlyRevenue,
      };

      // Cache the results
      setCached(cacheKey, newStats);
      
      setStats(newStats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateCalculations, getCached, setCached, processJobStats, calculateMonthlyRevenue]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return { 
    loading, 
    stats, 
    error,
    refetch: loadDashboardData
  };
};