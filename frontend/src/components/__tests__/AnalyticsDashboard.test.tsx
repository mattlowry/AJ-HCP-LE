import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnalyticsDashboard from '../AnalyticsDashboard';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock Chart.js to avoid canvas rendering issues in tests
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
}));

const mockAnalyticsData = {
  totalJobs: 150,
  completedJobs: 120,
  pendingJobs: 30,
  totalRevenue: 45000,
  monthlyRevenue: [3500, 4200, 3800, 4100, 3900, 4500],
  jobsByStatus: {
    completed: 120,
    pending: 20,
    in_progress: 10,
  },
  customerSatisfaction: 4.7,
  averageJobDuration: 2.5,
  topServices: [
    { name: 'Electrical Repair', count: 45 },
    { name: 'Installation', count: 35 },
    { name: 'Maintenance', count: 25 },
  ],
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockAnalyticsData });
  });

  test('renders analytics dashboard with loading state', () => {
    render(<AnalyticsDashboard />);
    
    expect(screen.getByText(/analytics dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays analytics data after loading', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total jobs
      expect(screen.getByText('120')).toBeInTheDocument(); // Completed jobs
      expect(screen.getByText('$45,000')).toBeInTheDocument(); // Total revenue
    });
  });

  test('displays key performance metrics', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/total jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/completed jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/pending jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
    });
  });

  test('renders charts when data is available', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  test('handles date range filter', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    
    const dateFilter = screen.getByRole('combobox');
    await user.selectOptions(dateFilter, 'last-30-days');
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/analytics/', {
      params: { period: 'last-30-days' }
    });
  });

  test('displays customer satisfaction score', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('4.7')).toBeInTheDocument();
      expect(screen.getByText(/customer satisfaction/i)).toBeInTheDocument();
    });
  });

  test('shows top services list', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Electrical Repair')).toBeInTheDocument();
      expect(screen.getByText('Installation')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading analytics/i)).toBeInTheDocument();
    });
  });

  test('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  test('calculates completion rate correctly', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      // 120 completed out of 150 total = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  test('displays revenue trend information', async () => {
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/revenue trend/i)).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  test('exports analytics data', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    render(<AnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test('applies responsive design classes', () => {
    render(<AnalyticsDashboard />);
    
    const dashboard = screen.getByTestId('analytics-dashboard');
    expect(dashboard).toHaveClass('analytics-dashboard');
  });
});