import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import JobList from '../JobList';
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

const mockJobs = [
  {
    id: 1,
    title: 'Electrical Panel Upgrade',
    description: 'Replace old electrical panel with new 200A panel',
    customer: 'John Doe',
    customerId: 1,
    property: 'Main Residence',
    status: 'pending',
    priority: 'high',
    scheduledDate: '2024-02-20',
    timeSlot: '10:00 AM',
    estimatedDuration: 4,
    assignedTechnician: 'Mike Johnson',
    technicianId: 1,
    amount: 2500.00,
    createdAt: '2024-02-15T09:00:00Z',
    updatedAt: '2024-02-15T09:00:00Z'
  },
  {
    id: 2,
    title: 'Outlet Installation',
    description: 'Install 3 new GFCI outlets in kitchen',
    customer: 'Jane Smith',
    customerId: 2,
    property: 'Kitchen Renovation',
    status: 'in_progress',
    priority: 'medium',
    scheduledDate: '2024-02-18',
    timeSlot: '2:00 PM',
    estimatedDuration: 2,
    assignedTechnician: 'Sarah Wilson',
    technicianId: 2,
    amount: 450.00,
    createdAt: '2024-02-14T11:30:00Z',
    updatedAt: '2024-02-18T14:00:00Z'
  },
  {
    id: 3,
    title: 'Light Fixture Repair',
    description: 'Fix flickering chandelier in dining room',
    customer: 'Bob Johnson',
    customerId: 3,
    property: 'Main House',
    status: 'completed',
    priority: 'low',
    scheduledDate: '2024-02-10',
    timeSlot: '11:00 AM',
    estimatedDuration: 1,
    assignedTechnician: 'Tom Brown',
    technicianId: 3,
    amount: 150.00,
    createdAt: '2024-02-08T16:45:00Z',
    updatedAt: '2024-02-10T12:00:00Z'
  },
  {
    id: 4,
    title: 'Emergency Circuit Breaker Repair',
    description: 'Emergency repair of tripped circuit breaker',
    customer: 'Alice Davis',
    customerId: 4,
    property: 'Office Building',
    status: 'scheduled',
    priority: 'emergency',
    scheduledDate: '2024-02-21',
    timeSlot: '9:00 AM',
    estimatedDuration: 3,
    assignedTechnician: null,
    technicianId: null,
    amount: 800.00,
    createdAt: '2024-02-16T20:15:00Z',
    updatedAt: '2024-02-16T20:15:00Z'
  }
];

const JobListWithRouter = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('JobList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: mockJobs });
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
  });

  test('renders job list component', () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    expect(screen.getByText(/jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('displays list of jobs after loading', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Electrical Panel Upgrade')).toBeInTheDocument();
      expect(screen.getByText('Outlet Installation')).toBeInTheDocument();
      expect(screen.getByText('Light Fixture Repair')).toBeInTheDocument();
      expect(screen.getByText('Emergency Circuit Breaker Repair')).toBeInTheDocument();
    });
  });

  test('shows job details including customer and property', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Main Residence')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument();
    });
  });

  test('displays job status badges with correct styling', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      const pendingBadge = screen.getByText('pending');
      const inProgressBadge = screen.getByText('in_progress');
      const completedBadge = screen.getByText('completed');
      const scheduledBadge = screen.getByText('scheduled');
      
      expect(pendingBadge).toHaveClass('status-pending');
      expect(inProgressBadge).toHaveClass('status-in-progress');
      expect(completedBadge).toHaveClass('status-completed');
      expect(scheduledBadge).toHaveClass('status-scheduled');
    });
  });

  test('shows priority indicators with appropriate styling', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      const highPriority = screen.getByText('high');
      const mediumPriority = screen.getByText('medium');
      const lowPriority = screen.getByText('low');
      const emergencyPriority = screen.getByText('emergency');
      
      expect(highPriority).toHaveClass('priority-high');
      expect(mediumPriority).toHaveClass('priority-medium');
      expect(lowPriority).toHaveClass('priority-low');
      expect(emergencyPriority).toHaveClass('priority-emergency');
    });
  });

  test('displays assigned technician information', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
      expect(screen.getByText('Tom Brown')).toBeInTheDocument();
      expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
    });
  });

  test('shows job amounts and scheduled dates', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
      expect(screen.getByText('$450.00')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('$800.00')).toBeInTheDocument();
      expect(screen.getByText(/feb 20, 2024/i)).toBeInTheDocument();
    });
  });

  test('filters jobs by status', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/status filter/i)).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByLabelText(/status filter/i);
    await user.selectOptions(statusFilter, 'completed');
    
    expect(screen.getByText('Light Fixture Repair')).toBeInTheDocument();
    expect(screen.queryByText('Electrical Panel Upgrade')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlet Installation')).not.toBeInTheDocument();
  });

  test('filters jobs by priority', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/priority filter/i)).toBeInTheDocument();
    });
    
    const priorityFilter = screen.getByLabelText(/priority filter/i);
    await user.selectOptions(priorityFilter, 'emergency');
    
    expect(screen.getByText('Emergency Circuit Breaker Repair')).toBeInTheDocument();
    expect(screen.queryByText('Electrical Panel Upgrade')).not.toBeInTheDocument();
  });

  test('searches jobs by title or customer name', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search jobs/i);
    await user.type(searchInput, 'Outlet');
    
    expect(screen.getByText('Outlet Installation')).toBeInTheDocument();
    expect(screen.queryByText('Electrical Panel Upgrade')).not.toBeInTheDocument();
  });

  test('sorts jobs by date', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });
    
    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'date-desc');
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/jobs/', {
      params: expect.objectContaining({
        ordering: '-scheduledDate'
      })
    });
  });

  test('navigates to job detail page when job is clicked', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Electrical Panel Upgrade')).toBeInTheDocument();
    });
    
    const jobRow = screen.getByText('Electrical Panel Upgrade').closest('tr');
    await user.click(jobRow!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/1');
  });

  test('opens create job dialog', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    const createJobButton = screen.getByRole('button', { name: /new job/i });
    await user.click(createJobButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/new');
  });

  test('assigns technician to job', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValueOnce({ data: mockJobs });
    mockedApi.get.mockResolvedValueOnce({ 
      data: [
        { id: 1, name: 'Mike Johnson' },
        { id: 2, name: 'Sarah Wilson' }
      ]
    });
    
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /assign/i })[0]).toBeInTheDocument();
    });
    
    const assignButton = screen.getAllByRole('button', { name: /assign/i })[0];
    await user.click(assignButton);
    
    expect(screen.getByText(/assign technician/i)).toBeInTheDocument();
    
    const technicianSelect = screen.getByLabelText(/technician/i);
    await user.selectOptions(technicianSelect, '1');
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/jobs/1/', {
      assignedTechnician: '1'
    });
  });

  test('updates job status', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByLabelText(/update status/i)[0]).toBeInTheDocument();
    });
    
    const statusSelect = screen.getAllByLabelText(/update status/i)[0];
    await user.selectOptions(statusSelect, 'in_progress');
    
    expect(mockedApi.put).toHaveBeenCalledWith('/api/jobs/1/', {
      status: 'in_progress'
    });
  });

  test('deletes job with confirmation', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete/i })[0]).toBeInTheDocument();
    });
    
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(deleteButton);
    
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this job?');
    expect(mockedApi.delete).toHaveBeenCalledWith('/api/jobs/1/');
    
    confirmSpy.mockRestore();
  });

  test('exports jobs to CSV', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn();
    
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/jobs/export/', {
      responseType: 'blob'
    });
  });

  test('bulk selects jobs', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });
    
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);
    
    expect(screen.getByRole('button', { name: /bulk update status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk assign/i })).toBeInTheDocument();
  });

  test('shows estimated duration for jobs', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/4 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/2 hours/i)).toBeInTheDocument();
      expect(screen.getByText(/1 hour/i)).toBeInTheDocument();
      expect(screen.getByText(/3 hours/i)).toBeInTheDocument();
    });
  });

  test('displays emergency jobs prominently', async () => {
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      const emergencyJob = screen.getByText('Emergency Circuit Breaker Repair').closest('.job-row');
      expect(emergencyJob).toHaveClass('emergency');
    });
  });

  test('shows job descriptions on hover or expand', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /expand/i })[0]).toBeInTheDocument();
    });
    
    const expandButton = screen.getAllByRole('button', { name: /expand/i })[0];
    await user.click(expandButton);
    
    expect(screen.getByText('Replace old electrical panel with new 200A panel')).toBeInTheDocument();
  });

  test('filters jobs by date range', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });
    
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    
    await user.type(startDateInput, '2024-02-15');
    await user.type(endDateInput, '2024-02-20');
    
    const applyFilterButton = screen.getByRole('button', { name: /apply filter/i });
    await user.click(applyFilterButton);
    
    expect(mockedApi.get).toHaveBeenCalledWith('/api/jobs/', {
      params: expect.objectContaining({
        startDate: '2024-02-15',
        endDate: '2024-02-20'
      })
    });
  });

  test('handles API error gracefully', async () => {
    mockedApi.get.mockRejectedValue(new Error('API Error'));
    
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/error loading jobs/i)).toBeInTheDocument();
    });
  });

  test('shows pagination when many jobs', async () => {
    const manyJobs = Array.from({ length: 25 }, (_, i) => ({
      ...mockJobs[0],
      id: i + 1,
      title: `Job ${i + 1}`
    }));
    
    mockedApi.get.mockResolvedValue({ 
      data: {
        results: manyJobs.slice(0, 20),
        count: 25,
        next: '/api/jobs/?page=2',
        previous: null
      }
    });
    
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });
  });

  test('refreshes job list', async () => {
    const user = userEvent.setup();
    render(
      <JobListWithRouter>
        <JobList />
      </JobListWithRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });
});