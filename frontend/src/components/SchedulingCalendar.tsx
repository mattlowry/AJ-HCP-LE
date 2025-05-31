import React, { useState, useEffect } from 'react';
import { jobApi, technicianApi, customerApi } from '../services/api';
import { validateForm, commonValidationRules } from '../utils/validation';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
  Delete as DeleteIcon,
  AddShoppingCart as AddItemIcon
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Job {
  id: string;
  job_number: string;
  title: string;
  customer_name: string;
  status: 'pending' | 'scheduled' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  assigned_technician: string | null; // Primary technician for backwards compatibility
  assigned_technicians?: string[]; // Multiple technicians
  estimated_duration: number;
  service_type_name: string;
  job_type?: 'job' | 'estimate';
  estimated_cost?: number;
  payment_status?: 'paid' | 'due' | 'pending';
}

interface Technician {
  id: string;
  full_name: string;
  skill_level: string;
  is_available: boolean;
  employee_id: string;
}

interface TimeSlot {
  time: string;
  jobs: Job[];
}

const SchedulingCalendar: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  const [technicianColors, setTechnicianColors] = useState<Record<string, string>>({});
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([]);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [newJobData, setNewJobData] = useState({
    title: '',
    customer_name: '',
    service_type_name: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    estimated_duration: 2,
    description: '',
    customer_id: null as number | null,
    job_type: 'job' as 'job' | 'estimate',
    labor_rate: 125,
    material_markup: 20,
    subtotal: 0,
    tax_rate: 8.25,
    total_cost: 0
  });
  
  const [lineItems, setLineItems] = useState<Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    type: 'labor' | 'material' | 'service';
  }>>([]);
  
  const [newLineItem, setNewLineItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    type: 'labor' as 'labor' | 'material' | 'service'
  });
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [newCustomerData, setNewCustomerData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    customer_type: 'residential' as 'residential' | 'commercial'
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate time slots with 30-minute increments (7 AM to 7 PM)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 7; hour <= 19; hour++) {
      // Add hour:00 slot
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        jobs: []
      });
      // Add hour:30 slot (except for the last hour)
      if (hour < 19) {
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:30`,
          jobs: []
        });
      }
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(generateTimeSlots());


  const fetchTechnicians = async () => {
    try {
      setError(null);
      const response = await technicianApi.getAvailable();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      setError('Failed to load technicians');
      
      // Fallback to demo data only if API completely fails
      const demoTechnicians = [
        {
          id: "1",
          full_name: "Mike Johnson",
          skill_level: "Senior",
          is_available: true,
          employee_id: "T-101"
        },
        {
          id: "2",
          full_name: "Tom Wilson",
          skill_level: "Journeyman",
          is_available: true,
          employee_id: "T-102"
        },
        {
          id: "3",
          full_name: "Steve Miller",
          skill_level: "Apprentice",
          is_available: true,
          employee_id: "T-103"
        }
      ];
      
      setTechnicians(demoTechnicians);
    }
  };

  // Generate color map for technicians
  useEffect(() => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffc107', '#ff9800', '#ff5722'
    ];
    
    const colorMap: Record<string, string> = {};
    technicians.forEach((tech, index) => {
      colorMap[tech.id] = colors[index % colors.length];
    });
    
    setTechnicianColors(colorMap);
  }, [technicians]);
  
  // Generate array of dates for the week view
  useEffect(() => {
    const dates: string[] = [];
    const currentDate = new Date(weekStart);
    
    // Set to the beginning of the week (Sunday)
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Generate 7 days (Sunday to Saturday)
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    setWeekDates(dates);
  }, [weekStart]);
  
  const fetchJobsCallback = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let dateFrom, dateTo;
    
    if (viewMode === 'week' && weekDates.length > 0) {
      dateFrom = weekDates[0];
      dateTo = weekDates[6];
    } else {
      dateFrom = selectedDate;
      dateTo = selectedDate;
    }
    
    // Fetch scheduled jobs
    try {
      // TODO: Re-enable API calls when interface is fixed
      // const scheduledResponse = await jobApi.getAll({
      //   date_from: dateFrom,
      //   date_to: dateTo,
      //   status: 'scheduled'
      // });
      // setJobs(scheduledResponse.data.results);
      
      // Use demo data instead
      throw new Error('Using demo data');
    } catch (scheduledError) {
      console.error('Error fetching scheduled jobs:', scheduledError);
          // Demo data for testing when API is not available
          const today = new Date();
          const generateDate = (dayOffset: number) => {
            const date = new Date(today);
            date.setDate(date.getDate() + dayOffset);
            return date.toISOString().split('T')[0];
          };
          
          // Generate some sample jobs spread across the week
          const demoJobs = [
            {
              id: "101",
              job_number: "JOB-2024-0101",
              title: "Panel Replacement",
              customer_name: "John Smith",
              status: "scheduled" as const,
              priority: "high" as const,
              scheduled_date: generateDate(0),
              scheduled_start_time: "09:00",
              scheduled_end_time: "12:00",
              assigned_technician: "1",
              estimated_duration: 3,
              service_type_name: "Panel Installation",
              job_type: "job" as const,
              estimated_cost: 3500
            },
            {
              id: "102",
              job_number: "EST-2024-0102",
              title: "Outlet Repair",
              customer_name: "Sarah Davis",
              status: "on_the_way" as const,
              priority: "medium" as const,
              scheduled_date: generateDate(0),
              scheduled_start_time: "14:00",
              scheduled_end_time: "15:30",
              assigned_technician: "2",
              estimated_duration: 1.5,
              service_type_name: "Electrical Repair",
              job_type: "estimate" as const,
              estimated_cost: 250
            },
            {
              id: "103",
              job_number: "JOB-2024-0103",
              title: "Emergency Power Outage",
              customer_name: "Robert Brown",
              status: "in_progress" as const,
              priority: "emergency" as const,
              scheduled_date: generateDate(1),
              scheduled_start_time: "10:00",
              scheduled_end_time: "13:00",
              assigned_technician: "1",
              estimated_duration: 3,
              service_type_name: "Emergency Service",
              job_type: "job" as const,
              estimated_cost: 500
            },
            {
              id: "104",
              job_number: "JOB-2024-0104",
              title: "Lighting Installation",
              customer_name: "Lisa Garcia",
              status: "scheduled" as const,
              priority: "low" as const,
              scheduled_date: generateDate(1),
              scheduled_start_time: "15:00",
              scheduled_end_time: "17:00",
              assigned_technician: "3",
              estimated_duration: 2,
              service_type_name: "Lighting Installation"
            },
            {
              id: "105",
              job_number: "JOB-2024-0105",
              title: "Ceiling Fan Installation",
              customer_name: "Mark Johnson",
              status: "scheduled" as const,
              priority: "medium" as const,
              scheduled_date: generateDate(2),
              scheduled_start_time: "09:00",
              scheduled_end_time: "11:00",
              assigned_technician: "2",
              estimated_duration: 2,
              service_type_name: "Installation"
            },
            {
              id: "106",
              job_number: "JOB-2024-0106",
              title: "Wiring Upgrade",
              customer_name: "Jennifer Wilson",
              status: "scheduled" as const,
              priority: "high" as const,
              scheduled_date: generateDate(3),
              scheduled_start_time: "13:00",
              scheduled_end_time: "17:00",
              assigned_technician: "1",
              assigned_technicians: ["1", "2"], // Multi-person job
              estimated_duration: 4,
              service_type_name: "Wiring Installation",
              job_type: "job" as const,
              estimated_cost: 2800
            },
            {
              id: "107",
              job_number: "JOB-2024-0107",
              title: "Security Light Install",
              customer_name: "David Miller",
              status: "completed" as const,
              priority: "medium" as const,
              scheduled_date: generateDate(4),
              scheduled_start_time: "10:00",
              scheduled_end_time: "12:00",
              assigned_technician: "3",
              estimated_duration: 2,
              service_type_name: "Lighting Installation",
              job_type: "job" as const,
              estimated_cost: 800,
              payment_status: "paid" as const
            },
            {
              id: "108",
              job_number: "JOB-2024-0108",
              title: "Breaker Replacement",
              customer_name: "Anna Garcia",
              status: "completed" as const,
              priority: "high" as const,
              scheduled_date: generateDate(3),
              scheduled_start_time: "11:00",
              scheduled_end_time: "12:30",
              assigned_technician: "2",
              estimated_duration: 1.5,
              service_type_name: "Electrical Repair",
              job_type: "job" as const,
              estimated_cost: 450,
              payment_status: "due" as const
            }
          ];
          
      setJobs(demoJobs);
    }
    
    // Fetch unscheduled jobs
    try {
      // TODO: Re-enable API calls when interface is fixed
      // const unscheduledResponse = await jobApi.getAll({
      //   status: 'pending'
      // });
      // setUnscheduledJobs(unscheduledResponse.data.results);
      
      // Use demo data instead
      throw new Error('Using demo data');
    } catch (unscheduledError) {
      console.error('Error fetching unscheduled jobs:', unscheduledError);
      
      // Demo unscheduled jobs as fallback
      const demoUnscheduledJobs = [
            {
              id: "201",
              job_number: "JOB-2024-0201",
              title: "Electric Vehicle Charger",
              customer_name: "Thomas Edwards",
              status: "pending" as const,
              priority: "high" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 4,
              service_type_name: "Installation",
              job_type: "job" as const,
              estimated_cost: 2500
            },
            {
              id: "202",
              job_number: "EST-2024-0202",
              title: "Flickering Lights",
              customer_name: "Emily Parker",
              status: "pending" as const,
              priority: "medium" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 1,
              service_type_name: "Electrical Repair",
              job_type: "estimate" as const,
              estimated_cost: 350
            },
            {
              id: "203",
              job_number: "EST-2024-0203",
              title: "Hot Tub Wiring",
              customer_name: "Kevin Thompson",
              status: "pending" as const,
              priority: "low" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 5,
              service_type_name: "Wiring Installation",
              job_type: "estimate" as const,
              estimated_cost: 1200
            },
            {
              id: "204",
              job_number: "JOB-2024-0204",
              title: "Main Panel Upgrade",
              customer_name: "Michelle Davis",
              status: "pending" as const,
              priority: "high" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: "1",
              assigned_technicians: ["1", "3"], // Multi-person job
              estimated_duration: 6,
              service_type_name: "Panel Installation",
              job_type: "job" as const,
              estimated_cost: 4500
            }
          ];
          
      setUnscheduledJobs(demoUnscheduledJobs);
    }
    
    setLoading(false);
  }, [selectedDate, viewMode, weekDates]);

  useEffect(() => {
    fetchJobsCallback();
    fetchTechnicians();
  }, [fetchJobsCallback]);

  // Organize jobs into time slots
  useEffect(() => {
    const newTimeSlots = generateTimeSlots();
    
    jobs.forEach(job => {
      if (job.scheduled_start_time) {
        const [hourStr, minuteStr] = job.scheduled_start_time.split(':');
        const hour = parseInt(hourStr);
        const minute = parseInt(minuteStr);
        
        // Find the correct slot index for this time
        const slotIndex = newTimeSlots.findIndex(slot => slot.time === job.scheduled_start_time);
        
        if (slotIndex >= 0) {
          newTimeSlots[slotIndex].jobs.push(job);
        } else {
          // If exact time not found, find closest time slot
          const timeValue = hour * 60 + minute; // Convert to minutes
          let closestIndex = 0;
          let closestDiff = Infinity;
          
          newTimeSlots.forEach((slot, index) => {
            const [slotHour, slotMinute] = slot.time.split(':').map(Number);
            const slotValue = slotHour * 60 + slotMinute;
            const diff = Math.abs(timeValue - slotValue);
            
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIndex = index;
            }
          });
          
          newTimeSlots[closestIndex].jobs.push(job);
        }
      }
    });
    
    setTimeSlots(newTimeSlots);
  }, [jobs]);

  const handleDragStart = (event: DragStartEvent) => {
    const job = unscheduledJobs.find(j => j.id === event.active.id) || 
                jobs.find(j => j.id === event.active.id);
    setActiveJob(job || null);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveJob(null);
    
    if (!over) return;
    
    // Handle dropping job onto calendar time slot
    if (over.id.toString().startsWith('technician-')) {
      const overId = over.id.toString();
      
      // Parse the drop zone ID: technician-{id}-time-{time}-date-{date}
      const parts = overId.split('-');
      const technicianIdIndex = parts.indexOf('technician') + 1;
      const timeIndex = parts.indexOf('time') + 1;
      const dateIndex = parts.indexOf('date') + 1;
      
      const technicianId = parts[technicianIdIndex];
      const timeSlot = parts[timeIndex];
      let scheduleDate = selectedDate;
      
      // If date is in the drop zone ID, use that
      if (dateIndex > 0 && parts[dateIndex]) {
        scheduleDate = parts[dateIndex];
      }
      
      try {
        // Update the job in the backend
        const jobId = parseInt(active.id.toString());
        
        // For the new week view, we'll assign to first available technician if "any"
        let assignedTechnician = technicianId;
        if (technicianId === 'any' && technicians.length > 0) {
          assignedTechnician = technicians[0].id;
        }
        
        const updateData = {
          assigned_to: [parseInt(assignedTechnician)],
          scheduled_start: `${scheduleDate}T${timeSlot}:00`,
          status: 'scheduled' as const
        };
        
        // Try to update via API
        await jobApi.update(jobId, updateData);
        
        console.log('Job assignment successful:', {
          jobId: active.id,
          technicianId: assignedTechnician,
          scheduleDate,
          timeSlot
        });
        
        // Refresh data to get updated job information
        await fetchJobsCallback();
        
      } catch (error) {
        console.error('Error assigning job:', error);
        
        // Fallback: Update locally for demo purposes
        console.log('Using demo mode - updating local state');
        
        // Update the job locally
        const draggedJob = unscheduledJobs.find(j => j.id === active.id.toString()) ||
                          jobs.find(j => j.id === active.id.toString());
        
        if (draggedJob) {
          let assignedTechnician = technicianId;
          if (technicianId === 'any' && technicians.length > 0) {
            assignedTechnician = technicians[0].id;
          }
          
          const updatedJob = {
            ...draggedJob,
            assigned_technician: assignedTechnician,
            scheduled_date: scheduleDate,
            scheduled_start_time: timeSlot,
            status: 'scheduled' as const
          };
          
          // Remove from unscheduled jobs
          setUnscheduledJobs(prev => prev.filter(j => j.id !== active.id.toString()));
          
          // Add to scheduled jobs
          setJobs(prev => {
            const filtered = prev.filter(j => j.id !== active.id.toString());
            return [...filtered, updatedJob];
          });
        }
      }
    }
  };
  

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getJobTypeIcon = (jobType?: 'job' | 'estimate') => {
    return jobType === 'estimate' ? '📋' : '🔧';
  };

  const getJobTypeBorder = (jobType?: 'job' | 'estimate') => {
    return jobType === 'estimate' ? '2px dashed' : '2px solid';
  };

  const getJobCardStyling = (job: Job) => {
    // Get all assigned technicians
    const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
    const primaryTechColor = getTechnicianColor(allTechnicians[0] || null);
    
    // For multiple technicians, create a gradient background
    const getMultiTechBackground = () => {
      if (allTechnicians.length <= 1) {
        return primaryTechColor;
      }
      
      const colors = allTechnicians.map(techId => getTechnicianColor(techId));
      const gradientStops = colors.map((color, index) => 
        `${color} ${(index * 100) / colors.length}%, ${color} ${((index + 1) * 100) / colors.length}%`
      ).join(', ');
      
      return `linear-gradient(135deg, ${gradientStops})`;
    };
    
    // Payment status takes precedence for completed jobs
    if (job.status === 'completed') {
      if (job.payment_status === 'paid') {
        return {
          backgroundColor: '#9e9e9e', // Grey for paid
          border: '2px solid transparent',
          backgroundImage: 'none'
        };
      } else if (job.payment_status === 'due') {
        return {
          background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
          border: '3px solid #f44336', // Red border for payment due
          backgroundImage: 'none'
        };
      }
    }
    
    // Status-based styling
    switch (job.status) {
      case 'on_the_way':
        return {
          background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
          border: '2px solid transparent',
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.3) 10px,
            rgba(255,255,255,0.3) 20px
          )`
        };
      
      case 'in_progress':
        return {
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: `3px solid ${primaryTechColor}`,
          backgroundImage: 'none'
        };
      
      case 'scheduled':
      default:
        return {
          background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
          border: '2px solid transparent',
          backgroundImage: 'none'
        };
    }
  };

  const SortableJobCard: React.FC<{ job: Job }> = ({ job }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: job.id });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    
    return (
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        sx={{
          margin: 1,
          cursor: 'grab',
          borderLeft: `4px solid ${getPriorityColor(job.priority)}`,
          border: getJobTypeBorder(job.job_type),
          borderColor: job.job_type === 'estimate' ? '#ff9800' : 'transparent',
          '&:hover': { boxShadow: 3 }
        }}
        onClick={() => {
          setSelectedJob(job);
          setIsCreatingJob(false);
          setOpenJobDialog(true);
        }}
      >
        <CardContent sx={{ padding: '8px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {getJobTypeIcon(job.job_type)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {job.job_number}
            </Typography>
            {job.job_type === 'estimate' && (
              <Chip
                label="EST"
                size="small"
                sx={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  fontSize: '0.6rem',
                  height: 16
                }}
              />
            )}
          </Box>
          <Typography variant="body2" fontWeight="bold">
            {job.title}
          </Typography>
          <Typography variant="caption">
            {job.customer_name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            <Chip
              label={job.priority}
              size="small"
              sx={{
                backgroundColor: getPriorityColor(job.priority),
                color: 'white',
                fontSize: '0.7rem',
                height: 20
              }}
            />
            {job.service_type_name && (
              <Chip
                label={job.service_type_name}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const DroppableTimeSlot: React.FC<{
    technicianId: string;
    timeSlot: string;
    date?: string;
    children: React.ReactNode;
  }> = ({ technicianId, timeSlot, date, children }) => {
    const dropId = date 
      ? `technician-${technicianId}-time-${timeSlot}-date-${date}`
      : `technician-${technicianId}-time-${timeSlot}`;
    
    const { setNodeRef, isOver } = useDroppable({
      id: dropId,
    });
    
    return (
      <Box
        ref={setNodeRef}
        sx={{
          minHeight: 40,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          margin: '2px 0',
          padding: 1,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          backgroundColor: isOver ? '#e3f2fd' : 'transparent',
          '&:hover': {
            backgroundColor: isOver ? '#e3f2fd' : '#f5f5f5'
          }
        }}
      >
        {children}
      </Box>
    );
  };

  // Navigate to previous/next week
  const navigatePreviousWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setWeekStart(newWeekStart);
  };
  
  const navigateNextWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setWeekStart(newWeekStart);
  };
  
  // Set today as selected date and adjust week view
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
    setWeekStart(today);
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  // Get technician color
  const getTechnicianColor = (techId: string | null) => {
    if (!techId || !technicianColors[techId]) return '#9e9e9e';
    return technicianColors[techId];
  };

  const getTechnicianNames = (job: Job) => {
    const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
    
    if (allTechnicians.length === 0) return 'Unassigned';
    
    const names = allTechnicians.map(techId => {
      const tech = technicians.find(t => t.id === techId);
      return tech ? tech.full_name : 'Unknown';
    });
    
    return names.join(', ');
  };

  const getTechnicianDisplayIndicator = (job: Job) => {
    const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
    
    if (allTechnicians.length === 0) return '';
    if (allTechnicians.length === 1) return '👤';
    return `👥${allTechnicians.length}`;
  };

  const handleStatusUpdate = async (jobId: string, newStatus: Job['status']) => {
    try {
      console.log(`Updating job ${jobId} status to ${newStatus}`);
      
      // Special handling for "On The Way" button
      if (newStatus === 'on_the_way') {
        await handleOnTheWay(jobId);
      }
      
      // Update job status locally (in production, would call API)
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
      
      // Update selected job
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, status: newStatus });
      }
      
      // Close dialog after status update
      setOpenJobDialog(false);
      setSelectedJob(null);
      
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Error updating job status');
    }
  };

  const handleOnTheWay = async (jobId: string) => {
    try {
      // Get the job details
      const job = jobs.find(j => j.id === jobId) || selectedJob;
      if (!job) {
        throw new Error('Job not found');
      }

      // Get technician name
      const technicianName = getTechnicianNames(job).split(',')[0].trim(); // First technician
      
      // Simulate Google Maps API call for travel time
      const estimatedTravelTime = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
      const minTime = estimatedTravelTime - 2;
      const maxTime = estimatedTravelTime + 8; // Add 10 min buffer
      
      // Simulate sending SMS
      const message = `${technicianName} from AJ Long Electric is on the way to your home, and should arrive in ${minTime}-${maxTime} mins.`;
      
      console.log('SMS Message:', message);
      console.log('Sending to customer:', job.customer_name);
      
      alert(`SMS sent to ${job.customer_name}:\n\n"${message}"`);
      
    } catch (error) {
      console.error('Error sending on-the-way notification:', error);
      alert('Error sending notification');
    }
  };

  const handleSendInvoice = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId) || selectedJob;
      if (!job) return;
      
      console.log(`Sending invoice for job ${jobId}`);
      alert(`Invoice sent to ${job.customer_name} for $${job.estimated_cost}`);
      
      // Update payment status
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, payment_status: 'due' as const } : j
      ));
      
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, payment_status: 'due' });
      }
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Error sending invoice');
    }
  };

  const handleCollectPayment = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId) || selectedJob;
      if (!job) return;
      
      console.log(`Collecting payment for job ${jobId}`);
      alert(`Payment of $${job.estimated_cost} collected from ${job.customer_name}`);
      
      // Update payment status
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, payment_status: 'paid' as const } : j
      ));
      
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, payment_status: 'paid' });
      }
      
    } catch (error) {
      console.error('Error collecting payment:', error);
      alert('Error collecting payment');
    }
  };

  const fetchCustomers = async (search = '') => {
    try {
      const response = await customerApi.getAll(search ? { search } : {});
      setAvailableCustomers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Fallback demo customers
      setAvailableCustomers([
        { id: 1, full_name: 'John Smith', email: 'john@example.com', phone: '+12025551234' },
        { id: 2, full_name: 'Sarah Davis', email: 'sarah@example.com', phone: '+12025551235' },
        { id: 3, full_name: 'Mike Johnson', email: 'mike@example.com', phone: '+12025551236' },
      ]);
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setNewJobData({
      ...newJobData,
      customer_id: customer.id,
      customer_name: customer.full_name
    });
    setCustomerSearchQuery(customer.full_name);
    setShowCustomerForm(false);
  };

  const handleCreateNewCustomer = async () => {
    try {
      const response = await customerApi.create(newCustomerData);
      const newCustomer = response.data;
      
      // Add to available customers
      setAvailableCustomers(prev => [newCustomer, ...prev]);
      
      // Select the new customer
      handleCustomerSelect(newCustomer);
      
      // Reset form
      setNewCustomerData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        street_address: '',
        city: '',
        state: '',
        zip_code: '',
        customer_type: 'residential' as 'residential' | 'commercial'
      });
      
      alert('Customer created successfully!');
      
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    }
  };

  const resetJobForm = () => {
    setNewJobData({
      title: '',
      customer_name: '',
      service_type_name: '',
      priority: 'medium',
      estimated_duration: 2,
      description: '',
      customer_id: null,
      job_type: 'job',
      labor_rate: 125,
      material_markup: 20,
      subtotal: 0,
      tax_rate: 8.25,
      total_cost: 0
    });
    setLineItems([]);
    setNewLineItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      type: 'labor'
    });
    setCustomerSearchQuery('');
    setShowCustomerForm(false);
  };

  // Line item management functions
  const addLineItem = () => {
    if (!newLineItem.description || newLineItem.unit_price <= 0) {
      alert('Please enter a description and valid unit price');
      return;
    }

    const lineItem = {
      id: Date.now().toString(),
      description: newLineItem.description,
      quantity: newLineItem.quantity,
      unit_price: newLineItem.unit_price,
      total: newLineItem.quantity * newLineItem.unit_price,
      type: newLineItem.type
    };

    setLineItems(prev => [...prev, lineItem]);
    setNewLineItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      type: 'labor'
    });
    
    // Update totals
    calculateEstimateTotals([...lineItems, lineItem]);
  };

  const removeLineItem = (id: string) => {
    const updatedItems = lineItems.filter(item => item.id !== id);
    setLineItems(updatedItems);
    calculateEstimateTotals(updatedItems);
  };

  const calculateEstimateTotals = (items: typeof lineItems) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * newJobData.tax_rate) / 100;
    const total = subtotal + taxAmount;
    
    setNewJobData(prev => ({
      ...prev,
      subtotal,
      total_cost: total
    }));
  };

  // Update totals when tax rate changes
  React.useEffect(() => {
    calculateEstimateTotals(lineItems);
  }, [newJobData.tax_rate]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">Loading scheduling data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        📅 Job Scheduling Calendar
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Week navigation controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Week of {formatDate(weekDates[0] || selectedDate)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={navigatePreviousWeek}>
              <ChevronLeftIcon />
            </IconButton>
            
            <Button 
              variant="outlined" 
              size="small"
              onClick={goToToday}
            >
              Today
            </Button>
            
            <IconButton onClick={navigateNextWeek}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setIsCreatingJob(true);
              setSelectedJob(null);
              resetJobForm();
              setNewJobData(prev => ({ ...prev, job_type: 'job' }));
              fetchCustomers();
              setOpenJobDialog(true);
            }}
          >
            Create Job
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setIsCreatingJob(true);
              setSelectedJob(null);
              resetJobForm();
              setNewJobData(prev => ({ ...prev, job_type: 'estimate' }));
              fetchCustomers();
              setOpenJobDialog(true);
            }}
          >
            Create Estimate
          </Button>
        </Box>
      </Box>

      {/* Status Legend */}
      <Card sx={{ mb: 2, p: 2 }}>
        <Typography variant="h6" gutterBottom>Job Status Legend</Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              backgroundColor: '#2196f3', 
              borderRadius: 1 
            }} />
            <Typography variant="caption">Scheduled</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              backgroundColor: '#2196f3',
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #2196f3,
                #2196f3 5px,
                rgba(255,255,255,0.3) 5px,
                rgba(255,255,255,0.3) 10px
              )`,
              borderRadius: 1 
            }} />
            <Typography variant="caption">On The Way</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              backgroundColor: 'rgba(255,255,255,0.9)',
              border: '2px solid #2196f3',
              borderRadius: 1 
            }} />
            <Typography variant="caption">In Progress</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              backgroundColor: '#9e9e9e',
              borderRadius: 1 
            }} />
            <Typography variant="caption">Completed (Paid)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              backgroundColor: '#2196f3',
              border: '2px solid #f44336',
              borderRadius: 1 
            }} />
            <Typography variant="caption">Payment Due</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 30, 
              height: 20, 
              background: 'linear-gradient(135deg, #2196f3 0%, #2196f3 50%, #ff9800 50%, #ff9800 100%)',
              borderRadius: 1 
            }} />
            <Typography variant="caption">Multi-Technician 👥</Typography>
          </Box>
        </Box>
      </Card>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={2}>
          {/* Unscheduled Jobs Panel */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader
                title="📋 Unscheduled Jobs"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <SortableContext
                  items={unscheduledJobs.map(job => job.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Box sx={{ minHeight: 200 }}>
                    {unscheduledJobs.map((job) => (
                      <SortableJobCard key={job.id} job={job} />
                    ))}
                  </Box>
                </SortableContext>
              </CardContent>
            </Card>
          </Grid>

          {/* Week Calendar View */}
          <Grid item xs={12} md={9}>
            <Paper elevation={2} sx={{ p: 1, overflow: 'auto' }}>
              <Box sx={{ minWidth: 1200 }}>
                {/* Header row with days of the week */}
                <Box sx={{ display: 'flex', borderBottom: '2px solid #e0e0e0', pb: 1, mb: 1 }}>
                  <Box sx={{ width: 80, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ textAlign: 'center', pt: 1 }}>
                      Time
                    </Typography>
                  </Box>
                  {weekDates.map(date => (
                    <Box 
                      key={date}
                      sx={{ 
                        flex: 1, 
                        textAlign: 'center', 
                        px: 1,
                        borderLeft: '1px solid #e0e0e0',
                        minWidth: 140
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold">
                        {formatDate(date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {date === new Date().toISOString().split('T')[0] ? 'Today' : ''}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                {/* Time slots grid */}
                {timeSlots.map((slot) => (
                  <Box 
                    key={slot.time}
                    sx={{ 
                      display: 'flex', 
                      borderBottom: '1px solid #f0f0f0',
                      minHeight: 60,
                      '&:hover': { backgroundColor: '#f9f9f9' }
                    }}
                  >
                    {/* Time column */}
                    <Box 
                      sx={{ 
                        width: 80, 
                        py: 1, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #e0e0e0',
                        flexShrink: 0,
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {slot.time}
                      </Typography>
                    </Box>
                    
                    {/* Day columns */}
                    {weekDates.map(date => {
                      // Filter jobs for this date and time slot
                      const dayJobs = jobs.filter(job => 
                        job.scheduled_date === date && 
                        job.scheduled_start_time === slot.time
                      );
                      
                      return (
                        <DroppableTimeSlot
                          key={`${date}-${slot.time}`}
                          technicianId="any"
                          timeSlot={slot.time}
                          date={date}
                        >
                          <Box 
                            sx={{ 
                              flex: 1,
                              borderLeft: '1px solid #e0e0e0',
                              p: 0.5,
                              position: 'relative',
                              minHeight: 50,
                              minWidth: 140
                            }}
                          >
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: 0.5,
                              height: '100%'
                            }}>
                              {dayJobs.map((job, index) => {
                                // Calculate job card height based on number of jobs
                                const jobHeight = Math.max(40, 50 / Math.max(dayJobs.length, 1));
                                
                                return (
                                  <Tooltip 
                                    key={job.id} 
                                    title={`${job.customer_name} - ${job.service_type_name || 'Service'} - ${getTechnicianNames(job)} - Status: ${job.status}`}
                                  >
                                    <Box
                                      sx={{
                                        borderRadius: 2,
                                        p: 0.5,
                                        ...getJobCardStyling(job),
                                        // Override border for estimates
                                        ...(job.job_type === 'estimate' && {
                                          border: `${getJobTypeBorder(job.job_type)} ${getPriorityColor(job.priority)}`
                                        }),
                                        cursor: 'pointer',
                                        '&:hover': { opacity: 0.8, transform: 'scale(1.02)' },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        height: `${jobHeight}px`,
                                        minHeight: '35px',
                                        position: 'relative',
                                        color: job.status === 'in_progress' ? '#333' : 'white',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                      }}
                                      onClick={() => {
                                        setSelectedJob(job);
                                        setIsCreatingJob(false);
                                        setOpenJobDialog(true);
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.7rem' }}>
                                          {getJobTypeIcon(job.job_type)}
                                        </Typography>
                                        <Typography 
                                          variant="caption" 
                                          fontWeight="bold" 
                                          noWrap
                                          sx={{ fontSize: '0.7rem', flex: 1 }}
                                        >
                                          {job.customer_name}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.6rem' }}>
                                          {getTechnicianDisplayIndicator(job)}
                                        </Typography>
                                      </Box>
                                      <Typography 
                                        variant="caption" 
                                        noWrap
                                        sx={{ 
                                          fontSize: '0.6rem',
                                          opacity: 0.9
                                        }}
                                      >
                                        {job.title}
                                      </Typography>
                                      {job.estimated_cost && (
                                        <Typography 
                                          variant="caption" 
                                          noWrap
                                          sx={{ 
                                            fontSize: '0.6rem',
                                            opacity: 0.9
                                          }}
                                        >
                                          ${job.estimated_cost}
                                        </Typography>
                                      )}
                                      <Box sx={{ position: 'absolute', right: 2, top: 2 }}>
                                        {job.job_type === 'estimate' ? (
                                          <Box
                                            sx={{
                                              fontSize: '0.6rem',
                                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                              borderRadius: 1,
                                              px: 0.5,
                                              py: 0.2
                                            }}
                                          >
                                            EST
                                          </Box>
                                        ) : (
                                          <Box
                                            sx={{
                                              width: 8,
                                              height: 8,
                                              borderRadius: '50%',
                                              backgroundColor: getPriorityColor(job.priority),
                                              border: '1px solid white'
                                            }}
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          </Box>
                        </DroppableTimeSlot>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        <DragOverlay>
          {activeJob ? (
            <Card
              sx={{
                borderLeft: `4px solid ${getPriorityColor(activeJob.priority)}`,
                opacity: 0.8
              }}
            >
              <CardContent sx={{ padding: '8px !important' }}>
                <Typography variant="caption" color="textSecondary">
                  {activeJob.job_number}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {activeJob.title}
                </Typography>
                <Typography variant="caption">
                  {activeJob.customer_name}
                </Typography>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Job Details Dialog */}
      <Dialog
        open={openJobDialog}
        onClose={() => {
          setOpenJobDialog(false);
          setIsCreatingJob(false);
          setSelectedJob(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isCreatingJob ? `Create New ${newJobData.job_type === 'estimate' ? 'Estimate' : 'Job'}` : selectedJob ? `Job Details: ${selectedJob.job_number}` : 'Job Details'}
        </DialogTitle>
        <DialogContent>
          {isCreatingJob ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={`${newJobData.job_type === 'estimate' ? 'Estimate' : 'Job'} Title`}
                  value={newJobData.title}
                  onChange={(e) => setNewJobData({...newJobData, title: e.target.value})}
                  required
                />
              </Grid>
              
              {/* Customer Selection */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    label="Search Customer"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      if (e.target.value.length > 2) {
                        fetchCustomers(e.target.value);
                      }
                    }}
                    placeholder="Type customer name..."
                    helperText={newJobData.customer_id ? "Customer selected" : "Search existing customers or add new"}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => setShowCustomerForm(true)}
                    sx={{ mb: 2.5, minWidth: 'auto', px: 2 }}
                  >
                    + New
                  </Button>
                </Box>
                
                {/* Customer Search Results */}
                {customerSearchQuery && availableCustomers.length > 0 && !newJobData.customer_id && (
                  <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                    {availableCustomers
                      .filter(customer => 
                        customer.full_name.toLowerCase().includes(customerSearchQuery.toLowerCase())
                      )
                      .map(customer => (
                        <Box
                          key={customer.id}
                          sx={{
                            p: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            mb: 0.5,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {customer.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.email} • {customer.phone}
                          </Typography>
                        </Box>
                      ))
                    }
                  </Box>
                )}
              </Grid>

              {/* Inline Customer Creation Form */}
              {showCustomerForm && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      👤 Add New Customer
                      <Button size="small" onClick={() => setShowCustomerForm(false)}>Cancel</Button>
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={newCustomerData.first_name}
                      onChange={(e) => setNewCustomerData({...newCustomerData, first_name: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={newCustomerData.last_name}
                      onChange={(e) => setNewCustomerData({...newCustomerData, last_name: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={newCustomerData.street_address}
                      onChange={(e) => setNewCustomerData({...newCustomerData, street_address: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="City"
                      value={newCustomerData.city}
                      onChange={(e) => setNewCustomerData({...newCustomerData, city: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="State"
                      value={newCustomerData.state}
                      onChange={(e) => setNewCustomerData({...newCustomerData, state: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={newCustomerData.zip_code}
                      onChange={(e) => setNewCustomerData({...newCustomerData, zip_code: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleCreateNewCustomer}
                      disabled={!newCustomerData.first_name || !newCustomerData.last_name || !newCustomerData.email}
                      fullWidth
                    >
                      Create Customer & Select
                    </Button>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Service Type"
                  value={newJobData.service_type_name}
                  onChange={(e) => setNewJobData({...newJobData, service_type_name: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={newJobData.priority}
                    label="Priority"
                    onChange={(e) => setNewJobData({...newJobData, priority: e.target.value as any})}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Estimated Duration (hours)"
                  type="number"
                  value={newJobData.estimated_duration}
                  onChange={(e) => setNewJobData({...newJobData, estimated_duration: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 0.5, max: 12, step: 0.5 }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={newJobData.description}
                  onChange={(e) => setNewJobData({...newJobData, description: e.target.value})}
                />
              </Grid>
              
              {/* Estimate-specific pricing section */}
              {newJobData.job_type === 'estimate' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      💰 Estimate Pricing & Line Items
                    </Typography>
                  </Grid>
                  
                  {/* Labor rate and markup settings */}
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Labor Rate ($/hour)"
                      type="number"
                      value={newJobData.labor_rate}
                      onChange={(e) => setNewJobData({...newJobData, labor_rate: parseFloat(e.target.value) || 0})}
                      inputProps={{ min: 0, step: 5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      type="number"
                      value={newJobData.tax_rate}
                      onChange={(e) => setNewJobData({...newJobData, tax_rate: parseFloat(e.target.value) || 0})}
                      inputProps={{ min: 0, max: 15, step: 0.25 }}
                    />
                  </Grid>
                  
                  {/* Line item entry form */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Add Line Item
                      </Typography>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Description"
                            value={newLineItem.description}
                            onChange={(e) => setNewLineItem({...newLineItem, description: e.target.value})}
                            placeholder="e.g., Electrical outlet installation"
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={newLineItem.type}
                              label="Type"
                              onChange={(e) => setNewLineItem({...newLineItem, type: e.target.value as any})}
                            >
                              <MenuItem value="labor">Labor</MenuItem>
                              <MenuItem value="material">Material</MenuItem>
                              <MenuItem value="service">Service</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Quantity"
                            type="number"
                            value={newLineItem.quantity}
                            onChange={(e) => setNewLineItem({...newLineItem, quantity: parseInt(e.target.value) || 1})}
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Unit Price ($)"
                            type="number"
                            value={newLineItem.unit_price}
                            onChange={(e) => setNewLineItem({...newLineItem, unit_price: parseFloat(e.target.value) || 0})}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={addLineItem}
                            startIcon={<AddItemIcon />}
                            disabled={!newLineItem.description || newLineItem.unit_price <= 0}
                          >
                            Add
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                  
                  {/* Line items list */}
                  {lineItems.length > 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Line Items
                        </Typography>
                        {lineItems.map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              p: 1,
                              border: '1px solid #e0e0e0',
                              borderRadius: 1,
                              mb: 1,
                              bgcolor: item.type === 'labor' ? '#e3f2fd' : 
                                      item.type === 'material' ? '#f3e5f5' : '#e8f5e8'
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {item.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • 
                                Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                ${item.total.toFixed(2)}
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeLineItem(item.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        ))}
                        
                        {/* Totals */}
                        <Box sx={{ mt: 2, pt: 2, borderTop: '2px solid #e0e0e0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Subtotal:</Typography>
                            <Typography variant="body2">${newJobData.subtotal.toFixed(2)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Tax ({newJobData.tax_rate}%):</Typography>
                            <Typography variant="body2">${((newJobData.subtotal * newJobData.tax_rate) / 100).toFixed(2)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="h6" fontWeight="bold">Total:</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              ${newJobData.total_cost.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          ) : selectedJob ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedJob.title}</Typography>
                <Typography color="textSecondary">
                  Customer: {selectedJob.customer_name}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Status:</strong> {selectedJob.status}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Priority:</strong> {selectedJob.priority}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Service:</strong> {selectedJob.service_type_name}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Duration:</strong> {selectedJob.estimated_duration}h
                </Typography>
              </Grid>
              {selectedJob.scheduled_date && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Date:</strong> {selectedJob.scheduled_date}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Time:</strong> {selectedJob.scheduled_start_time} - {selectedJob.scheduled_end_time}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenJobDialog(false);
            setIsCreatingJob(false);
            setSelectedJob(null);
          }}>Cancel</Button>
          {isCreatingJob ? (
            <Button 
              variant="contained" 
              color="primary"
              onClick={async () => {
                try {
                  // Validate form data
                  const validationRules = {
                    title: { required: true, minLength: 3, maxLength: 100 },
                    customer_name: commonValidationRules.customerName,
                    service_type_name: { required: true, minLength: 2 },
                    estimated_duration: commonValidationRules.duration,
                    description: { required: true, minLength: 5, maxLength: 500 }
                  };

                  const validation = validateForm(newJobData, validationRules);
                  if (!validation.isValid) {
                    alert('Please fix the following errors:\n' + Object.values(validation.errors).join('\n'));
                    return;
                  }

                  // Create job/estimate with pricing data
                  const jobPrefix = newJobData.job_type === 'estimate' ? 'EST' : 'JOB';
                  const estimatedCost = newJobData.job_type === 'estimate' ? 
                    newJobData.total_cost : 
                    newJobData.estimated_duration * newJobData.labor_rate;

                  const jobPayload = {
                    job_number: `${jobPrefix}-${Date.now()}`,
                    title: newJobData.title,
                    description: newJobData.description,
                    customer: newJobData.customer_id || 1,
                    property: 1,
                    service_type: newJobData.service_type_name || 'General Service',
                    priority: newJobData.priority as 'low' | 'medium' | 'high' | 'emergency',
                    status: 'pending' as const,
                    estimated_duration: newJobData.estimated_duration,
                    estimated_cost: estimatedCost,
                    assigned_to: [],
                    // Include estimate-specific data if applicable
                    ...(newJobData.job_type === 'estimate' && {
                      job_type: 'estimate',
                      labor_rate: newJobData.labor_rate,
                      tax_rate: newJobData.tax_rate,
                      line_items: lineItems,
                      subtotal: newJobData.subtotal,
                      total_cost: newJobData.total_cost
                    })
                  };

                  // Create a new job via the backend API
                  await jobApi.create(jobPayload);
                  
                  const successMessage = newJobData.job_type === 'estimate' ? 
                    `Estimate created successfully! Total: $${newJobData.total_cost.toFixed(2)}` :
                    'Job created successfully!';
                  alert(successMessage);
                  fetchJobsCallback(); // Refresh the job list
                  
                  setOpenJobDialog(false);
                  setIsCreatingJob(false);
                } catch (error) {
                  console.error('Error creating job:', error);
                  alert('Error creating job. Check console for details.');
                }
              }}
              disabled={!newJobData.title || !newJobData.customer_name || !newJobData.service_type_name || 
                       (newJobData.job_type === 'estimate' && lineItems.length === 0)}
            >
              Create {newJobData.job_type === 'estimate' ? 'Estimate' : 'Job'}
            </Button>
          ) : selectedJob ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Job workflow buttons based on status */}
              {selectedJob.status === 'scheduled' && (
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'on_the_way')}
                  sx={{ backgroundColor: '#ff9800' }}
                >
                  📱 On The Way
                </Button>
              )}
              
              {selectedJob.status === 'on_the_way' && (
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'in_progress')}
                >
                  ▶️ Start Job
                </Button>
              )}
              
              {selectedJob.status === 'in_progress' && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'completed')}
                >
                  ✅ Finish Job
                </Button>
              )}
              
              {selectedJob.status === 'completed' && selectedJob.payment_status !== 'paid' && (
                <>
                  <Button 
                    variant="contained" 
                    color="secondary"
                    onClick={() => handleSendInvoice(selectedJob.id)}
                  >
                    💰 Send Invoice
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => handleCollectPayment(selectedJob.id)}
                  >
                    💳 Collect Payment
                  </Button>
                </>
              )}
              
              <Button variant="outlined" color="inherit">
                Edit Job
              </Button>
            </Box>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulingCalendar;