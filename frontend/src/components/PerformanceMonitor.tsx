import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from '@mui/material';
import { ExpandMore, Speed, Memory, Wifi } from '@mui/icons-material';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  resourceLoadTimes: Array<{
    name: string;
    duration: number;
    size?: number;
    type: string;
  }>;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('performance-monitor') === 'true';
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    const collectMetrics = () => {
      if (typeof window === 'undefined' || !('performance' in window)) {
        return;
      }

      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const resourceEntries = performance.getEntriesByType('resource');

      // Web Vitals
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Get LCP from observer
      let lcp = 0;
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // Observer not supported
        }
      }

      // Memory usage (Chrome only)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
      } : undefined;

      // Network information
      const connection = (navigator as any).connection;
      const networkInfo = connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      } : undefined;

      // Resource load times
      const resources = resourceEntries.map(resource => ({
        name: resource.name.split('/').pop() || resource.name,
        duration: resource.duration,
        size: (resource as any).transferSize,
        type: resource.initiatorType
      })).sort((a, b) => b.duration - a.duration).slice(0, 10);

      const metrics: PerformanceMetrics = {
        loadTime: navigation?.loadEventEnd - navigation?.navigationStart || 0,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        cumulativeLayoutShift: 0, // Would need CLS observer
        firstInputDelay: 0, // Would need FID observer
        memoryUsage,
        networkInfo,
        resourceLoadTimes: resources
      };

      setMetrics(metrics);
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(collectMetrics, 1000);
      });
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceScore = (metric: number, thresholds: [number, number]): 'good' | 'needs-improvement' | 'poor' => {
    if (metric <= thresholds[0]) return 'good';
    if (metric <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score: string): 'success' | 'warning' | 'error' => {
    switch (score) {
      case 'good': return 'success';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'error';
      default: return 'success';
    }
  };

  if (!isVisible || !metrics) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 400,
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 9999,
        backgroundColor: 'background.paper',
        boxShadow: 3,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Speed color="primary" />
          <Typography variant="h6">Performance Monitor</Typography>
          <Chip
            label="DEV"
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Core Web Vitals */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Core Web Vitals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">First Contentful Paint</Typography>
              <Chip
                label={formatTime(metrics.firstContentfulPaint)}
                size="small"
                color={getScoreColor(getPerformanceScore(metrics.firstContentfulPaint, [1800, 3000]))}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Largest Contentful Paint</Typography>
              <Chip
                label={formatTime(metrics.largestContentfulPaint)}
                size="small"
                color={getScoreColor(getPerformanceScore(metrics.largestContentfulPaint, [2500, 4000]))}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">Load Time</Typography>
              <Chip
                label={formatTime(metrics.loadTime)}
                size="small"
                color={getScoreColor(getPerformanceScore(metrics.loadTime, [3000, 5000]))}
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">DOM Content Loaded</Typography>
              <Chip
                label={formatTime(metrics.domContentLoaded)}
                size="small"
                color={getScoreColor(getPerformanceScore(metrics.domContentLoaded, [1500, 2500]))}
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Memory Usage */}
      {metrics.memoryUsage && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Memory fontSize="small" />
              <Typography variant="subtitle1">Memory Usage</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Used: {formatBytes(metrics.memoryUsage.usedJSHeapSize)} / 
                  {formatBytes(metrics.memoryUsage.totalJSHeapSize)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.totalJSHeapSize) * 100}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Heap Limit: {formatBytes(metrics.memoryUsage.jsHeapSizeLimit)}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Network Information */}
      {metrics.networkInfo && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Wifi fontSize="small" />
              <Typography variant="subtitle1">Network</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Connection Type</Typography>
                <Chip
                  label={metrics.networkInfo.effectiveType}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Downlink</Typography>
                <Typography variant="body2">{metrics.networkInfo.downlink} Mbps</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">RTT</Typography>
                <Typography variant="body2">{metrics.networkInfo.rtt}ms</Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Resource Load Times */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1">Slowest Resources</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Resource</TableCell>
                  <TableCell align="right">Time</TableCell>
                  <TableCell align="right">Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.resourceLoadTimes.slice(0, 5).map((resource, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                        {resource.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {formatTime(resource.duration)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption">
                        {resource.size ? formatBytes(resource.size) : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default PerformanceMonitor;