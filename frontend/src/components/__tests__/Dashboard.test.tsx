import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { api } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock react-router-dom hooks
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

const mockDashboardData = {
  overview: {
    totalJobs: 150,
    pendingJobs: 25,
    inProgressJobs: 15,
    completedJobs: 110,
    totalCustomers: 75,
    totalRevenue: 125000,
    monthlyRevenue: 15000
  },
  recentJobs: [
    {
      id: 1,
      title: 'Electrical Panel Upgrade',
      customer: 'John Doe',
      status: 'in_progress',
      scheduledDate: '2024-02-15',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Outlet Installation',
      customer: 'Jane Smith',
      status: 'pending',
      scheduledDate: '2024-02-16',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Lighting Repair',
      customer: 'Bob Johnson',
      status: 'completed',
      scheduledDate: '2024-02-14',
      priority: 'low'
    }
  ],
  upcomingJobs: [
    {
      id: 4,
      title: 'Generator Installation',
      customer: 'Alice Brown',
      scheduledDate: '2024-02-20',
      timeSlot: '10:00 AM'
    },
    {
      id: 5,
      title: 'HVAC Maintenance',
      customer: 'Charlie Wilson',
      scheduledDate: '2024-02-21',
      timeSlot: '2:00 PM'
    }
  ],
  recentCustomers: [
    {
      id: 1,
      name: 'Sarah Davis',
      email: 'sarah.davis@email.com',
      phone: '+1234567890',
      joinDate: '2024-02-10'
    },
    {
      id: 2,
      name: 'Mike Rogers',
      email: 'mike.rogers@email.com',
      phone: '+1234567891',
      joinDate: '2024-02-12'
    }
  ],
  notifications: [
    {
      id: 1,
      message: 'New job request from John Doe',
      type: 'info',
      timestamp: '2024-02-15T10:30:00Z',
      read: false
    },
    {
      id: 2,
      message: 'Payment received from Jane Smith',
      type: 'success',
      timestamp: '2024-02-15T09:15:00Z',
      read: false
    },
    {
      id: 3,
      message: 'Invoice overdue: INV-001',
      type: 'warning',
      timestamp: '2024-02-14T16:45:00Z',
      read: true
    }
  ],
  jobStatusDistribution: {
    pending: 25,
    in_progress: 15,
    completed: 110
  },
  monthlyStats: [
    { month: 'Jan', jobs: 45, revenue: 22500 },
    { month: 'Feb', jobs: 35, revenue: 18000 },
    { month: 'Mar', jobs: 52, revenue: 28000 },
    { month: 'Apr', jobs: 48, revenue: 25500 }
  ]
};

const DashboardWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockDashboardData });
  });

  test('renders dashboard with loading state', () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays overview statistics after loading', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total jobs
      expect(screen.getByText('75')).toBeInTheDocument(); // Total customers
      expect(screen.getByText('$125,000')).toBeInTheDocument(); // Total revenue
      expect(screen.getByText('$15,000')).toBeInTheDocument(); // Monthly revenue
    });
  });

  test('shows job status breakdown', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/pending jobs/i)).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // Pending
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // In progress
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText('110')).toBeInTheDocument(); // Completed
    });
  });

  test('displays recent jobs list', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/recent jobs/i)).toBeInTheDocument();
      expect(screen.getByText('Electrical Panel Upgrade')).toBeInTheDocument();
      expect(screen.getByText('Outlet Installation')).toBeInTheDocument();
      expect(screen.getByText('Lighting Repair')).toBeInTheDocument();
    });
  });

  test('shows job status badges with correct styling', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      const inProgressBadge = screen.getByText('in_progress');
      const pendingBadge = screen.getByText('pending');
      const completedBadge = screen.getByText('completed');
      
      expect(inProgressBadge).toHaveClass('status-in-progress');
      expect(pendingBadge).toHaveClass('status-pending');
      expect(completedBadge).toHaveClass('status-completed');
    });
  });

  test('displays upcoming jobs schedule', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/upcoming jobs/i)).toBeInTheDocument();
      expect(screen.getByText('Generator Installation')).toBeInTheDocument();
      expect(screen.getByText('HVAC Maintenance')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    });
  });

  test('shows recent customers section', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/recent customers/i)).toBeInTheDocument();
      expect(screen.getByText('Sarah Davis')).toBeInTheDocument();
      expect(screen.getByText('Mike Rogers')).toBeInTheDocument();
      expect(screen.getByText('sarah.davis@email.com')).toBeInTheDocument();
    });
  });

  test('displays notifications panel', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/new job request from john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/payment received from jane smith/i)).toBeInTheDocument();
      expect(screen.getByText(/invoice overdue: inv-001/i)).toBeInTheDocument();
    });
  });

  test('shows unread notification indicator', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      const unreadNotifications = screen.getAllByTestId('unread-notification');
      expect(unreadNotifications).toHaveLength(2); // Two unread notifications
    });
  });

  test('renders charts for data visualization', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });
  });

  test('navigates to jobs page when clicking on job', async () => {
    const user = userEvent.setup();
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Electrical Panel Upgrade')).toBeInTheDocument();
    });
    
    const jobLink = screen.getByText('Electrical Panel Upgrade');
    await user.click(jobLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/1');
  });

  test('navigates to customers page when clicking on customer', async () => {
    const user = userEvent.setup();
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Sarah Davis')).toBeInTheDocument();
    });
    
    const customerLink = screen.getByText('Sarah Davis');
    await user.click(customerLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/customers/1');
  });

  test('quick action buttons navigate correctly', async () => {
    const user = userEvent.setup();
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new job/i })).toBeInTheDocument();
    });
    
    const newJobButton = screen.getByRole('button', { name: /new job/i });
    await user.click(newJobButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/new');
  });

  test('marks notification as read', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /mark as read/i })[0]).toBeInTheDocument();
    });
    
    const markReadButton = screen.getAllByRole('button', { name: /mark as read/i })[0];
    await user.click(markReadButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/notifications/1/', {
      read: true
    });
  });

  test('refreshes dashboard data', async () => {
    const user = userEvent.setup();
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });

  test('displays priority indicators for jobs', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      const highPriority = screen.getByText('high');
      const mediumPriority = screen.getByText('medium');
      const lowPriority = screen.getByText('low');
      
      expect(highPriority).toHaveClass('priority-high');
      expect(mediumPriority).toHaveClass('priority-medium');
      expect(lowPriority).toHaveClass('priority-low');
    });
  });

  test('shows "View All" links for sections', async () => {
    const user = userEvent.setup();
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/view all jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/view all customers/i)).toBeInTheDocument();
    });
    
    const viewAllJobsLink = screen.getByText(/view all jobs/i);
    await user.click(viewAllJobsLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs');
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no data available', async () => {
    mockedApi.get.mockResolvedValue({ 
      data: { 
        ...mockDashboardData,
        recentJobs: [],
        upcomingJobs: [],
        recentCustomers: [],
        notifications: []
      } 
    });
    
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/no recent jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/no upcoming jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/no recent customers/i)).toBeInTheDocument();
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  test('calculates completion percentage correctly', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      // 110 completed out of 150 total = 73.3%
      expect(screen.getByText(/73%/i)).toBeInTheDocument();
    });
  });

  test('shows revenue growth indicator', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/revenue growth/i)).toBeInTheDocument();
      expect(screen.getByTestId('revenue-trend')).toBeInTheDocument();
    });
  });

  test('displays current date and time', async () => {
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('current-datetime')).toBeInTheDocument();
    });
  });

  test('shows weather widget if available', async () => {
    const weatherData = {
      temperature: 75,
      condition: 'sunny',
      location: 'Los Angeles, CA'
    };
    
    mockedApi.get.mockResolvedValue({ 
      data: { ...mockDashboardData, weather: weatherData } 
    });
    
    render(
      <DashboardWithRouter>
        <Dashboard />
      </DashboardWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('75°F')).toBeInTheDocument();
      expect(screen.getByText(/sunny/i)).toBeInTheDocument();
    });
  });
});