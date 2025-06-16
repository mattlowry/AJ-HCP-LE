import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jobApi, technicianApi, customerApi, inventoryApi } from '../services/api';
import { validateForm, commonValidationRules } from '../utils/validation';
import { Item } from '../types/inventory';
// Removed unused import: Category
import { CustomerListItem } from '../types/customer';
import { JobListItem } from '../types/job';
import { useNavigation } from '../contexts/NavigationContext';
import MaterialsCatalogSidebar from './MaterialsCatalogSidebar';
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
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Zoom,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewList as ViewListIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  AddShoppingCart as AddItemIcon,
  Inventory as InventoryIcon,
  Email as EmailIcon,
  Assignment as DocumentIcon,
  CheckCircle as ApproveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as RejectIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  ReportProblem as EmergencyIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  // useDroppable, // Removed unused import
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
  estimate_status?: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired';
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

// Helper function to convert API JobListItem to local Job interface
const convertJobListItemToJob = (apiJob: JobListItem): Job => {
  return {
    id: apiJob.id.toString(),
    job_number: apiJob.job_number,
    title: apiJob.title,
    customer_name: apiJob.customer_name,
    status: apiJob.status as Job['status'],
    priority: apiJob.priority as Job['priority'],
    scheduled_date: apiJob.scheduled_start ? apiJob.scheduled_start.split('T')[0] : null,
    scheduled_start_time: apiJob.scheduled_start ? apiJob.scheduled_start.split('T')[1]?.split(':').slice(0, 2).join(':') : null,
    scheduled_end_time: null, // Calculate from start + duration if needed
    assigned_technician: apiJob.assigned_technicians?.[0] || null,
    assigned_technicians: apiJob.assigned_technicians,
    estimated_duration: apiJob.estimated_duration || 2,
    service_type_name: apiJob.service_type || 'General Service',
    job_type: 'job',
    estimated_cost: apiJob.estimated_cost,
    payment_status: undefined
  };
};

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
  const { showSidebar, hideSidebar } = useNavigation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('week');
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  // Commented out unused state for build optimization
  // const [technicianColors, setTechnicianColors] = useState<Record<string, string>>({});
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([]);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Commented out unused filter states for build optimization
  // const [filterStatus, setFilterStatus] = useState<string>('all');
  // const [filterPriority, setFilterPriority] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
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
  
  const [selectedMaterialQuantity, setSelectedMaterialQuantity] = useState<Record<string, number>>({});
  
  // Inventory-related state
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  // Commented out unused inventory categories state for build optimization
  // const [inventoryCategories, setInventoryCategories] = useState<Category[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);

  // Helper functions for modern design
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return '#d32f2f';
      case 'high': return '#ed6c02';
      case 'medium': return '#2e7d32';
      case 'low': return '#757575';
      default: return '#757575';
    }
  };

  // Commented out unused function for build optimization
  // const getJobBackgroundColor = (job: Job) => {
  //   switch (job.status) {
  //     case 'scheduled': return '#e3f2fd';
  //     case 'on_the_way': return '#fff3e0';
  //     case 'in_progress': return '#e8f5e8';
  //     case 'completed': return '#f3e5f5';
  //     case 'cancelled': return '#ffebee';
  //     default: return '#ffffff';
  //   }
  // };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_type_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Simplified filter logic after removing unused filter states
    const matchesStatus = true; // Show all statuses
    const matchesPriority = true; // Show all priorities
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [availableCustomers, setAvailableCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomerProperties, setSelectedCustomerProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
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

  // Commented out unused timeSlots state for build optimization
  // const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(generateTimeSlots());


  const fetchTechnicians = async () => {
    try {
      console.log('👷 Fetching available technicians...');
      const response = await technicianApi.getAvailable();
      setTechnicians(response.data);
      console.log('✅ Successfully loaded technicians from API:', response.data.length);
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
      setError('Failed to load technicians from server');
      setTechnicians([]);
    }
  };

  // Fetch inventory items for materials catalog
  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      setError(null);
      
      const itemsResponse = await inventoryApi.getItems({ is_active: true });
      // const categoriesResponse = await inventoryApi.getCategories(); // Commented out unused call
      
      setInventoryItems(itemsResponse.data.results);
      // setInventoryCategories(categoriesResponse.data); // Commented out for build optimization
      
      // Identify low stock items
      const lowStock = itemsResponse.data.results.filter(
        item => item.current_stock <= item.minimum_stock
      );
      setLowStockItems(lowStock);
      
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory from server');
      
      // Clear inventory data when API fails
      setInventoryItems([]);
      setLowStockItems([]);
    } finally {
      setInventoryLoading(false);
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
    
    // setTechnicianColors(colorMap); // Commented out for build optimization
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
    
    console.log('📅 Week dates updated:', dates);
    setWeekDates(dates);
  }, [weekStart]);
  
  const fetchJobsCallback = React.useCallback(async () => {
    try {
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
    
    console.log('📅 Fetching jobs for date range:', { dateFrom, dateTo, viewMode });
    
    // Fetch scheduled jobs - try API first, fallback to demo data
    try {
      const scheduledResponse = await jobApi.getAll({
        date_from: dateFrom,
        date_to: dateTo,
        status: 'scheduled'
      });
      const convertedJobs = scheduledResponse.data.results.map(convertJobListItemToJob);
      setJobs(convertedJobs);
      console.log('✅ Successfully loaded jobs from API:', convertedJobs.length);
    } catch (scheduledError) {
      console.error('Failed to fetch scheduled jobs:', scheduledError);
      setError('Failed to load scheduled jobs from server');
      setJobs([]);
    }
    
    // Fetch unscheduled jobs
    try {
      const unscheduledResponse = await jobApi.getAll({
        status: 'pending'
      });
      const convertedUnscheduledJobs = unscheduledResponse.data.results.map(convertJobListItemToJob);
      setUnscheduledJobs(convertedUnscheduledJobs);
      console.log('✅ Successfully loaded unscheduled jobs from API:', convertedUnscheduledJobs.length);
    } catch (unscheduledError) {
      console.error('Failed to fetch unscheduled jobs:', unscheduledError);
      setError('Failed to load unscheduled jobs from server');
      setUnscheduledJobs([]);
    }
    } catch (error) {
      console.error('Error in fetchJobsCallback:', error);
      setError('Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, viewMode, weekDates]); // Include proper dependencies for re-fetching

  useEffect(() => {
    console.log('🔄 SchedulingCalendar: Initial data fetch triggered');
    fetchJobsCallback();
    fetchTechnicians();
    fetchInventoryItems();
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
    
    // setTimeSlots(newTimeSlots); // Commented out for build optimization
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

  const getJobTypeIcon = (jobType?: 'job' | 'estimate') => {
    return jobType === 'estimate' ? '📋' : '🔧';
  };

  const getEstimateStatusColor = (status?: Job['estimate_status']) => {
    switch (status) {
      case 'draft': return '#9e9e9e';
      case 'sent': return '#2196f3';
      case 'viewed': return '#ff9800';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'expired': return '#795548';
      default: return '#e0e0e0';
    }
  };

  const getEstimateStatusText = (status?: Job['estimate_status']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'viewed': return 'Viewed';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return 'Draft';
    }
  };

  const getJobTypeBorder = (jobType?: 'job' | 'estimate') => {
    return jobType === 'estimate' ? '2px dashed' : '2px solid';
  };

  // Commented out unused function for build optimization
  // const getJobCardStyling = (job: Job) => {
  //   // Get all assigned technicians
  //   const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
  //   const primaryTechColor = getTechnicianColor(allTechnicians[0] || null);
  //   
  //   // For multiple technicians, create a gradient background
  //   const getMultiTechBackground = () => {
  //     if (allTechnicians.length <= 1) {
  //       return primaryTechColor;
  //     }
  //     
  //     const colors = allTechnicians.map(techId => getTechnicianColor(techId));
  //     const gradientStops = colors.map((color, index) => 
  //       `${color} ${(index * 100) / colors.length}%, ${color} ${((index + 1) * 100) / colors.length}%`
  //     ).join(', ');
  //     
  //     return `linear-gradient(135deg, ${gradientStops})`;
  //   };
  //   
  //   // Payment status takes precedence for completed jobs
  //   if (job.status === 'completed') {
  //     if (job.payment_status === 'paid') {
  //       return {
  //         backgroundColor: '#9e9e9e', // Grey for paid
  //         border: '2px solid transparent',
  //         backgroundImage: 'none'
  //       };
  //     } else if (job.payment_status === 'due') {
  //       return {
  //         background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
  //         border: '3px solid #f44336', // Red border for payment due
  //         backgroundImage: 'none'
  //       };
  //     }
  //   }
  //   
  //   // Status-based styling
  //   switch (job.status) {
  //     case 'on_the_way':
  //       return {
  //         background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
  //         border: '2px solid transparent',
  //         backgroundImage: `repeating-linear-gradient(
  //           45deg,
  //           transparent,
  //           transparent 10px,
  //           rgba(255,255,255,0.3) 10px,
  //           rgba(255,255,255,0.3) 20px
  //         )`
  //       };
  //     
  //     case 'in_progress':
  //       return {
  //         backgroundColor: 'rgba(255,255,255,0.9)',
  //         border: `3px solid ${primaryTechColor}`,
  //         backgroundImage: 'none'
  //       };
  //     
  //     case 'scheduled':
  //     default:
  //       return {
  //         background: allTechnicians.length > 1 ? getMultiTechBackground() : primaryTechColor,
  //         border: '2px solid transparent',
  //         backgroundImage: 'none'
  //       };
  //   }
  // };

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
                label={getEstimateStatusText(job.estimate_status)}
                size="small"
                sx={{
                  backgroundColor: getEstimateStatusColor(job.estimate_status),
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

  // Commented out unused component for build optimization
  // const DroppableTimeSlot: React.FC<{
  //   technicianId: string;
  //   timeSlot: string;
  //   date?: string;
  //   children: React.ReactNode;
  // }> = ({ technicianId, timeSlot, date, children }) => {
  //   const dropId = date 
  //     ? `technician-${technicianId}-time-${timeSlot}-date-${date}`
  //     : `technician-${technicianId}-time-${timeSlot}`;
  //   
  //   const { setNodeRef, isOver } = useDroppable({
  //     id: dropId,
  //   });
  //   
  //   return (
  //     <Box
  //       ref={setNodeRef}
  //       sx={{
  //         minHeight: 40,
  //         border: '1px solid #e0e0e0',
  //         borderRadius: 1,
  //         margin: '2px 0',
  //         padding: 1,
  //         display: 'flex',
  //         alignItems: 'center',
  //         position: 'relative',
  //         backgroundColor: isOver ? '#e3f2fd' : 'transparent',
  //         '&:hover': {
  //           backgroundColor: isOver ? '#e3f2fd' : '#f5f5f5'
  //         }
  //       }}
  //     >
  //       {children}
  //     </Box>
  //   );
  // };

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
  
  // Commented out unused function for build optimization
  // const getTechnicianColor = (techId: string | null) => {
  //   if (!techId || !technicianColors[techId]) return '#9e9e9e';
  //   return technicianColors[techId];
  // };

  const getTechnicianNames = (job: Job) => {
    const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
    
    if (allTechnicians.length === 0) return 'Unassigned';
    
    const names = allTechnicians.map(techId => {
      const tech = technicians.find(t => t.id === techId);
      return tech ? tech.full_name : 'Unknown';
    });
    
    return names.join(', ');
  };

  // Commented out unused function for build optimization
  // const getTechnicianDisplayIndicator = (job: Job) => {
  //   const allTechnicians = job.assigned_technicians || (job.assigned_technician ? [job.assigned_technician] : []);
  //   
  //   if (allTechnicians.length === 0) return '';
  //   if (allTechnicians.length === 1) return '👤';
  //   return `👥${allTechnicians.length}`;
  // };

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
        { id: 1, full_name: 'John Smith', email: 'john@example.com', phone: '+12025551234', customer_type: 'residential', full_address: '123 Main St, Arlington, VA 22201', property_count: 1, created_at: new Date().toISOString() },
        { id: 2, full_name: 'Sarah Davis', email: 'sarah@example.com', phone: '+12025551235', customer_type: 'commercial', full_address: '456 Oak Ave, Arlington, VA 22202', property_count: 2, created_at: new Date().toISOString() },
        { id: 3, full_name: 'Mike Johnson', email: 'mike@example.com', phone: '+12025551236', customer_type: 'residential', full_address: '789 Pine Dr, Arlington, VA 22203', property_count: 1, created_at: new Date().toISOString() },
      ]);
    }
  };

  const handleCustomerSelect = async (customer: any) => {
    setNewJobData({
      ...newJobData,
      customer_id: customer.id,
      customer_name: customer.full_name
    });
    setCustomerSearchQuery(customer.full_name);
    setShowCustomerForm(false);
    
    // Fetch customer properties
    await fetchCustomerProperties(customer.id);
  };

  const fetchCustomerProperties = async (customerId: number) => {
    try {
      const response = await customerApi.getProperties(customerId);
      setSelectedCustomerProperties(response.data || []);
      
      // Auto-select if only one property
      if (response.data && response.data.length === 1) {
        setSelectedPropertyId(response.data[0].id);
      } else {
        setSelectedPropertyId(null);
      }
    } catch (error) {
      console.error('Error fetching customer properties:', error);
      // Fallback to demo properties
      const demoProperties = [
        {
          id: 1,
          property_type: 'single_family',
          street_address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62701',
          full_address: '123 Main St, Springfield, IL 62701'
        },
        {
          id: 2,
          property_type: 'commercial',
          street_address: '456 Business Ave',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62702',
          full_address: '456 Business Ave, Springfield, IL 62702'
        }
      ];
      setSelectedCustomerProperties(demoProperties);
      setSelectedPropertyId(null);
    }
  };

  const handleCreateNewCustomer = async () => {
    try {
      const response = await customerApi.create(newCustomerData);
      const newCustomer = response.data;
      
      // Transform Customer to CustomerListItem format
      const customerListItem: CustomerListItem = {
        id: newCustomer.id,
        full_name: newCustomer.full_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        customer_type: newCustomer.customer_type,
        full_address: newCustomer.full_address,
        property_count: newCustomer.properties?.length || 0,
        created_at: newCustomer.created_at
      };
      
      // Add to available customers
      setAvailableCustomers(prev => [customerListItem, ...prev]);
      
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

  // Commented out unused function for build optimization
  // const resetJobForm = () => {
  //   setNewJobData({
  //     title: '',
  //     customer_name: '',
  //     service_type_name: '',
  //     priority: 'medium',
  //     estimated_duration: 2,
  //     description: '',
  //     customer_id: null,
  //     job_type: 'job',
  //     labor_rate: 125,
  //     material_markup: 20,
  //     subtotal: 0,
  //     tax_rate: 8.25,
  //     total_cost: 0
  //   });
  //   setLineItems([]);
  //   setNewLineItem({
  //     description: '',
  //     quantity: 1,
  //     unit_price: 0,
  //     type: 'labor'
  //   });
  //   setCustomerSearchQuery('');
  //   setShowCustomerForm(false);
  //   setShowMaterialsCatalog(false);
  //   setMaterialSearchQuery('');
  //   setSelectedMaterialQuantity({});
  //   setSelectedCustomerProperties([]);
  //   setSelectedPropertyId(null);
  // };

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

  const calculateEstimateTotals = useCallback((items: typeof lineItems) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * newJobData.tax_rate) / 100;
    const total = subtotal + taxAmount;
    
    setNewJobData(prev => ({
      ...prev,
      subtotal,
      total_cost: total
    }));
  }, [newJobData.tax_rate]);

  // Update totals when tax rate changes
  React.useEffect(() => {
    calculateEstimateTotals(lineItems);
  }, [calculateEstimateTotals, lineItems]);


  // Material pricing markup tiers
  const materialMarkupTiers = useMemo(() => [
    { min: 0, max: 25, markup: 0.50 },      // 0-$25: 50% markup
    { min: 25.01, max: 50, markup: 0.40 },  // $25.01-$50: 40% markup  
    { min: 50.01, max: 100, markup: 0.35 }, // $50.01-$100: 35% markup
    { min: 100.01, max: 250, markup: 0.30 }, // $100.01-$250: 30% markup
    { min: 250.01, max: 500, markup: 0.25 }, // $250.01-$500: 25% markup
    { min: 500.01, max: Infinity, markup: 0.20 } // $500+: 20% markup
  ], []);

  // Function to calculate markup price based on cost tiers
  const calculateMarkupPrice = useCallback((costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    if (!tier) return costPrice * 1.35; // Default 35% if no tier matches
    
    return costPrice * (1 + tier.markup);
  }, [materialMarkupTiers]);

  // Function to get markup percentage for display
  const getMarkupPercentage = useCallback((costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    return tier ? tier.markup * 100 : 35; // Default 35% if no tier matches
  }, [materialMarkupTiers]);

  // Material catalog item type
  type MaterialCatalogItem = {
    id: string;
    name: string;
    category: string;
    price: number; // Customer price (with markup)
    unit: string;
    sku?: string;
    current_stock?: number;
    minimum_stock?: number;
    isLowStock?: boolean;
    description?: string;
    costPrice?: number; // Base cost price
    markupPercentage?: number; // Markup percentage applied
  };

  // Computed materials catalog that uses inventory data from API
  const materialsCatalog: MaterialCatalogItem[] = React.useMemo(() => {
    if (inventoryItems.length > 0) {
      // Convert inventory items to materials catalog format with markup
      return inventoryItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        category: item.category_name || 'General',
        price: calculateMarkupPrice(item.cost_price || item.unit_price),
        unit: item.unit_of_measure,
        sku: item.sku,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        isLowStock: item.current_stock <= item.minimum_stock,
        description: item.description,
        costPrice: item.cost_price || item.unit_price,
        markupPercentage: getMarkupPercentage(item.cost_price || item.unit_price)
      }));
    }
    // Return empty array if no inventory data from API
    return [];
  }, [inventoryItems, calculateMarkupPrice, getMarkupPercentage]);

  const addMaterialToLineItems = (material: MaterialCatalogItem, quantity?: number) => {
    const qty = quantity || selectedMaterialQuantity[material.id] || 1;
    
    // Check stock availability for inventory items
    if (material.current_stock !== undefined && qty > material.current_stock) {
      alert(`Only ${material.current_stock} ${material.unit} available in stock. Please adjust quantity.`);
      return;
    }
    
    const lineItem = {
      id: Date.now().toString(),
      description: material.name,
      quantity: qty,
      unit_price: material.price,
      total: qty * material.price,
      type: 'material' as const,
      // Add inventory tracking fields
      inventory_item_id: material.current_stock !== undefined ? parseInt(material.id) : null,
      sku: material.sku || null
    };

    setLineItems(prev => [...prev, lineItem]);
    calculateEstimateTotals([...lineItems, lineItem]);
    
    // Track material usage for inventory items
    if (material.current_stock !== undefined) {
      trackMaterialUsage(parseInt(material.id), qty, 'estimate');
    }
    
    // Reset quantity for this material
    setSelectedMaterialQuantity(prev => ({ ...prev, [material.id]: 1 }));
  };

  // Track material usage in estimates/jobs
  const trackMaterialUsage = async (itemId: number, quantity: number, type: 'estimate' | 'job') => {
    try {
      // Log material usage for tracking purposes
      console.log(`Material usage tracked: Item ${itemId}, Quantity ${quantity}, Type: ${type}`);
      
      // In production, this would call an API to record material usage
      // For now, we'll track it locally and optionally sync later
      // Commented out unused variable for build optimization
      // const usageRecord = {
      //   item_id: itemId,
      //   quantity_used: quantity,
      //   usage_type: type,
      //   timestamp: new Date().toISOString(),
      //   reference_type: type,
      //   reference_id: null, // Will be set when estimate/job is saved
      // };
      
      // Update local inventory items to reflect pending usage
      setInventoryItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              pending_usage: ((item as any).pending_usage || 0) + quantity,
              available_stock: item.current_stock - (((item as any).pending_usage || 0) + quantity)
            } as Item & { pending_usage?: number; available_stock?: number }
          : item
      ));
      
    } catch (error) {
      console.error('Error tracking material usage:', error);
      // Don't block the user workflow for tracking errors
    }
  };

  // Update inventory quantities when materials are consumed
  const updateInventoryQuantities = async (lineItems: any[], jobId: string, type: 'job_created' | 'estimate_approved') => {
    try {
      const materialLineItems = lineItems.filter(item => 
        item.type === 'material' && item.inventory_item_id
      );
      
      if (materialLineItems.length === 0) return;
      
      console.log(`Updating inventory for ${materialLineItems.length} items (${type})`);
      
      // Process each material line item
      for (const lineItem of materialLineItems) {
        try {
          // Create stock movement record via API
          // await inventoryApi.adjustStock(
          //   lineItem.inventory_item_id,
          //   -lineItem.quantity, // Negative to reduce stock
          //   `Used in ${type === 'job_created' ? 'job' : 'approved estimate'} ${jobId}`
          // );
          
          // For now, update local state to simulate the API call
          setInventoryItems(prev => prev.map(item => {
            if (item.id === lineItem.inventory_item_id) {
              const newStock = Math.max(0, item.current_stock - lineItem.quantity);
              console.log(`Updating item ${item.name}: ${item.current_stock} -> ${newStock}`);
              
              return {
                ...item,
                current_stock: newStock,
                pending_usage: Math.max(0, ((item as any).pending_usage || 0) - lineItem.quantity)
              } as Item & { pending_usage?: number };
            }
            return item;
          }));
          
          // Refresh low stock items
          setLowStockItems(prev => {
            const updatedItems = inventoryItems.map(item => {
              if (item.id === lineItem.inventory_item_id) {
                const newStock = Math.max(0, item.current_stock - lineItem.quantity);
                return { ...item, current_stock: newStock };
              }
              return item;
            });
            return updatedItems.filter(item => item.current_stock <= item.minimum_stock);
          });
          
        } catch (itemError) {
          console.error(`Error updating inventory for item ${lineItem.inventory_item_id}:`, itemError);
          // Continue with other items even if one fails
        }
      }
      
    } catch (error) {
      console.error('Error updating inventory quantities:', error);
      // Don't block the main workflow for inventory errors
    }
  };

  // Sidebar toggle functions
  const showMaterialsCatalogSidebar = useCallback(() => {
    const sidebarContent = (
      <MaterialsCatalogSidebar
        materialsCatalog={materialsCatalog}
        lowStockItems={lowStockItems}
        inventoryLoading={inventoryLoading}
        materialMarkupTiers={materialMarkupTiers}
        selectedMaterialQuantity={selectedMaterialQuantity}
        setSelectedMaterialQuantity={setSelectedMaterialQuantity}
        onAddMaterial={addMaterialToLineItems}
      />
    );
    showSidebar('Materials Catalog', sidebarContent, 350);
  }, [materialsCatalog, lowStockItems, inventoryLoading, materialMarkupTiers, selectedMaterialQuantity, setSelectedMaterialQuantity, addMaterialToLineItems, showSidebar]);

  // Show sidebar on mount, hide on unmount
  useEffect(() => {
    showMaterialsCatalogSidebar();
    
    return () => {
      hideSidebar();
    };
  }, [hideSidebar, showMaterialsCatalogSidebar]);

  // Estimate approval workflow functions
  const handleEstimateStatusUpdate = async (jobId: string, newStatus: NonNullable<Job['estimate_status']>) => {
    try {
      console.log(`Updating estimate ${jobId} status to ${newStatus}`);
      
      // Update estimate status locally (in production, would call API)
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, estimate_status: newStatus } : job
      ));
      
      setUnscheduledJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, estimate_status: newStatus } : job
      ));
      
      // Update selected job if it's the one being modified
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob({ ...selectedJob, estimate_status: newStatus });
      }
      
      // Show status-specific messages
      const statusMessages = {
        'draft': 'Estimate saved as draft',
        'sent': 'Estimate sent to customer via email',
        'viewed': 'Customer has viewed the estimate',
        'approved': 'Estimate approved by customer!',
        'rejected': 'Estimate rejected by customer',
        'expired': 'Estimate has expired'
      };
      
      if (statusMessages[newStatus]) {
        alert(statusMessages[newStatus]);
      }
      
      // Update inventory when estimate is approved
      if (newStatus === 'approved') {
        const estimate = jobs.find(j => j.id === jobId) || unscheduledJobs.find(j => j.id === jobId);
        if (estimate && (estimate as any).line_items) {
          await updateInventoryQuantities((estimate as any).line_items, jobId, 'estimate_approved');
        }
      }
      
    } catch (error) {
      console.error('Error updating estimate status:', error);
      alert('Error updating estimate status');
    }
  };

  const convertEstimateToJob = async (estimateId: string) => {
    try {
      const estimate = jobs.find(j => j.id === estimateId) || unscheduledJobs.find(j => j.id === estimateId);
      if (!estimate || estimate.job_type !== 'estimate') {
        throw new Error('Estimate not found');
      }

      console.log(`Converting estimate ${estimateId} to job`);
      
      // Create new job from estimate
      const newJob = {
        ...estimate,
        id: `job-${Date.now()}`,
        job_number: estimate.job_number.replace('EST-', 'JOB-'),
        job_type: 'job' as const,
        status: 'pending' as const,
        estimate_status: undefined
      };

      // Add new job to unscheduled jobs
      setUnscheduledJobs(prev => [newJob, ...prev]);
      
      // Update inventory quantities when converting to job
      if ((estimate as any).line_items) {
        await updateInventoryQuantities((estimate as any).line_items, newJob.id, 'job_created');
      }
      
      // Update original estimate status to indicate it's been converted
      handleEstimateStatusUpdate(estimateId, 'approved');
      
      alert(`Estimate converted to Job ${newJob.job_number}`);
      setOpenJobDialog(false);
      setSelectedJob(null);
      
    } catch (error) {
      console.error('Error converting estimate to job:', error);
      alert('Error converting estimate to job');
    }
  };

  const sendEstimateToCustomer = async (estimateId: string) => {
    try {
      const estimate = jobs.find(j => j.id === estimateId) || unscheduledJobs.find(j => j.id === estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      console.log(`Sending estimate ${estimateId} to customer`);
      
      // Simulate sending estimate via email
      const emailMessage = `Dear ${estimate.customer_name},

Thank you for choosing AJ Long Electric for your electrical needs.

Please find your estimate attached:
- Estimate #: ${estimate.job_number}
- Service: ${estimate.title}
- Total Cost: $${estimate.estimated_cost?.toFixed(2) || '0.00'}

This estimate is valid for 30 days from the date of issue.

To approve this estimate, please reply to this email or call us at (555) 123-4567.

Best regards,
AJ Long Electric Team`;

      alert(`Email sent to ${estimate.customer_name}:\n\n${emailMessage}`);
      
      // Update status to 'sent'
      handleEstimateStatusUpdate(estimateId, 'sent');
      
    } catch (error) {
      console.error('Error sending estimate:', error);
      alert('Error sending estimate');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', p: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="600" color="text.primary" gutterBottom>
            Schedule Manager
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Loading scheduling data...
          </Typography>
        </Box>
        
        {/* Loading Skeleton */}
        <Grid container spacing={3}>
          {/* Header skeleton */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3].map(i => (
                    <Box key={i} sx={{ width: 80, height: 32, bgcolor: 'grey.200', borderRadius: 1 }} />
                  ))}
                </Box>
                <Box sx={{ width: 200, height: 32, bgcolor: 'grey.200', borderRadius: 1 }} />
              </Box>
            </Card>
          </Grid>
          
          {/* Calendar skeleton */}
          <Grid item xs={8}>
            <Card sx={{ p: 3 }}>
              <Grid container spacing={1}>
                {Array.from({ length: 35 }).map((_, i) => (
                  <Grid item xs={12/7} key={i}>
                    <Box sx={{ height: 80, bgcolor: 'grey.100', borderRadius: 1, mb: 1 }} />
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
          
          {/* Sidebar skeleton */}
          <Grid item xs={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Unscheduled Jobs</Typography>
              {[1, 2, 3, 4].map(i => (
                <Box key={i} sx={{ height: 60, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }} />
              ))}
            </Card>
          </Grid>
        </Grid>
        
        <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
          <CircularProgress size={40} sx={{ mr: 2 }} />
          <Typography variant="body1" color="textSecondary">
            Loading jobs, technicians, and scheduling data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Schedule Loading Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={() => {
            setError(null);
            fetchJobsCallback();
          }}
        >
          Retry Loading
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', p: 3 }}>
      
      {/* Modern Header with Stats */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="600" color="text.primary" gutterBottom>
              Schedule Manager
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage jobs, schedules, and technician assignments
            </Typography>
          </Box>
          
          {/* Quick Stats */}
          <Grid container spacing={2} sx={{ width: 'auto', minWidth: 400 }}>
            <Grid item>
              <Card sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 32, height: 32 }}>
                    <WorkIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h6" fontWeight="600">{jobs.length}</Typography>
                <Typography variant="caption" color="text.secondary">Total Jobs</Typography>
              </Card>
            </Grid>
            <Grid item>
              <Card sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#fff3e0', color: '#ed6c02', width: 32, height: 32 }}>
                    <ScheduleIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h6" fontWeight="600">{unscheduledJobs.length}</Typography>
                <Typography variant="caption" color="text.secondary">Unscheduled</Typography>
              </Card>
            </Grid>
            <Grid item>
              <Card sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#ffebee', color: '#d32f2f', width: 32, height: 32 }}>
                    <EmergencyIcon fontSize="small" />
                  </Avatar>
                </Box>
                <Typography variant="h6" fontWeight="600">
                  {jobs.filter(j => j.priority === 'emergency').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">Emergency</Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Modern Control Bar */}
        <Card sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="day" aria-label="day view">
                  <ViewDayIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>Day</Typography>
                </ToggleButton>
                <ToggleButton value="week" aria-label="week view">
                  <ViewWeekIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>Week</Typography>
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>List</Typography>
                </ToggleButton>
              </ToggleButtonGroup>

              <Divider orientation="vertical" flexItem />

              {/* Date Navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton size="small" onClick={navigatePreviousWeek}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h6" fontWeight="500" sx={{ minWidth: 200, textAlign: 'center' }}>
                  {viewMode === 'week' 
                    ? `Week of ${formatDate(weekDates[0] || selectedDate)}`
                    : formatDate(selectedDate)
                  }
                </Typography>
                <IconButton size="small" onClick={navigateNextWeek}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>

              <Button variant="outlined" size="small" onClick={goToToday} startIcon={<TodayIcon />}>
                Today
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Search and Filters */}
              <TextField
                size="small"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ width: 200 }}
              />

              <IconButton 
                size="small" 
                onClick={() => {
                  setRefreshing(true);
                  setError(null);
                  fetchJobsCallback().finally(() => setRefreshing(false));
                }}
                disabled={refreshing || loading}
                title="Refresh schedule data"
              >
                {refreshing ? (
                  <CircularProgress size={20} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedJob(null);
                  setIsCreatingJob(true);
                  setNewJobData(prev => ({...prev, job_type: 'job'}));
                  setOpenJobDialog(true);
                }}
              >
                New Job
              </Button>

              <Button
                variant="contained"
                startIcon={<DocumentIcon />}
                onClick={() => {
                  setSelectedJob(null);
                  setIsCreatingJob(true);
                  setNewJobData(prev => ({...prev, job_type: 'estimate'}));
                  setOpenJobDialog(true);
                }}
              >
                New Estimate
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>


      {/* Render Content Based on View Mode */}
      {viewMode === 'list' ? (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>All Jobs</Typography>
          <Grid container spacing={2}>
            {filteredJobs.map((job) => (
              <Grid item xs={12} md={6} lg={4} key={job.id}>
                <Card 
                  sx={{ 
                    p: 2,
                    borderLeft: `4px solid ${getPriorityColor(job.priority)}`,
                    cursor: 'pointer',
                    '&:hover': { elevation: 4 }
                  }}
                  onClick={() => {
                    setSelectedJob(job);
                    setOpenJobDialog(true);
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="600">
                      {job.title}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={job.priority} 
                      color={job.priority === 'emergency' ? 'error' : job.priority === 'high' ? 'warning' : 'default'}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {job.customer_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {job.scheduled_date ? formatDate(job.scheduled_date) : 'Unscheduled'}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Grid container spacing={3}>
            {/* Sidebar - Unscheduled Jobs */}
            <Grid item xs={12} lg={3}>
              <Card sx={{ height: 'fit-content' }}>
                <CardHeader 
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon color="warning" />
                      <Typography variant="h6">Unscheduled Jobs</Typography>
                      <Badge badgeContent={unscheduledJobs.length} color="warning" />
                    </Box>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  <SortableContext items={unscheduledJobs.map(job => job.id)} strategy={verticalListSortingStrategy}>
                    <Stack spacing={1} sx={{ minHeight: 200 }}>
                      {unscheduledJobs.map((job) => (
                        <SortableJobCard key={job.id} job={job} />
                      ))}
                      {unscheduledJobs.length === 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          py: 4,
                          color: 'text.secondary'
                        }}>
                          <CheckCircleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                          <Typography variant="body2">All jobs scheduled!</Typography>
                        </Box>
                      )}
                    </Stack>
                  </SortableContext>
                </CardContent>
              </Card>
            </Grid>

            {/* Main Calendar View */}
            <Grid item xs={12} lg={9}>
              <Card sx={{ overflow: 'hidden' }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon color="primary" />
                      <Typography variant="h6">
                        {viewMode === 'week' ? 'Weekly Schedule' : 'Daily Schedule'}
                      </Typography>
                    </Box>
                  }
                  action={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        size="small" 
                        label={`${jobs.filter(j => j.scheduled_date === selectedDate).length} jobs today`}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                />
                <CardContent sx={{ p: 0 }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Paper sx={{ overflow: 'auto', maxHeight: '70vh' }}>
                      <Box sx={{ minWidth: viewMode === 'week' ? 1000 : 400 }}>
                        {/* Calendar content will go here */}
                        <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                          Calendar view will be rendered here
                        </Typography>
                      </Box>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <DragOverlay>
            {activeJob ? (
              <Card sx={{ borderLeft: `4px solid ${getPriorityColor(activeJob.priority)}`, opacity: 0.8 }}>
                <CardContent>
                  <Typography variant="subtitle2">{activeJob.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{activeJob.customer_name}</Typography>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Floating Action Button for Quick Job Creation */}
      <Zoom in={true}>
        <Fab
          color="primary"
          aria-label="add job"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000
          }}
          onClick={() => {
            setSelectedJob(null);
            setIsCreatingJob(true);
            setNewJobData(prev => ({...prev, job_type: 'job'}));
            setOpenJobDialog(true);
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

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

              {/* Property Selection */}
              {newJobData.customer_id && selectedCustomerProperties.length > 0 && (
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Property</InputLabel>
                    <Select
                      value={selectedPropertyId || ''}
                      label="Select Property"
                      onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
                    >
                      {selectedCustomerProperties.map((property) => (
                        <MenuItem key={property.id} value={property.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {property.full_address || `${property.street_address}, ${property.city}, ${property.state} ${property.zip_code}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {property.property_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              {property.square_footage && ` • ${property.square_footage.toLocaleString()} sq ft`}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedCustomerProperties.length > 1 && !selectedPropertyId && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      Please select a property for this job
                    </Typography>
                  )}
                </Grid>
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
                        <Grid item xs={6} sm={1.5}>
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
                        <Grid item xs={6} sm={1.5}>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={showMaterialsCatalogSidebar}
                            startIcon={<InventoryIcon />}
                            size="small"
                          >
                            Parts
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
              {selectedJob.job_type === 'estimate' && (
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Estimate Status:</strong>{' '}
                    <Chip
                      label={getEstimateStatusText(selectedJob.estimate_status)}
                      size="small"
                      sx={{
                        backgroundColor: getEstimateStatusColor(selectedJob.estimate_status),
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20,
                        ml: 1
                      }}
                    />
                  </Typography>
                </Grid>
              )}
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
                    property: selectedPropertyId || 1,
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
                      total_cost: newJobData.total_cost,
                      estimate_status: 'draft' as const
                    })
                  };

                  // Create a new job via the backend API
                  await jobApi.create(jobPayload);
                  
                  // Update inventory quantities for jobs (not estimates - they update when approved)
                  if (newJobData.job_type === 'job') {
                    const jobId = `job-${Date.now()}`;
                    await updateInventoryQuantities(lineItems, jobId, 'job_created');
                  }
                  
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
                       (newJobData.job_type === 'estimate' && lineItems.length === 0) ||
                       (selectedCustomerProperties.length > 1 && !selectedPropertyId)}
            >
              Create {newJobData.job_type === 'estimate' ? 'Estimate' : 'Job'}
            </Button>
          ) : selectedJob ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Estimate workflow buttons */}
              {selectedJob.job_type === 'estimate' && (
                <>
                  {selectedJob.estimate_status === 'draft' && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => sendEstimateToCustomer(selectedJob.id)}
                      startIcon={<EmailIcon />}
                    >
                      📧 Send Estimate
                    </Button>
                  )}
                  
                  {(selectedJob.estimate_status === 'sent' || selectedJob.estimate_status === 'viewed') && (
                    <>
                      <Button 
                        variant="contained" 
                        color="success"
                        onClick={() => handleEstimateStatusUpdate(selectedJob.id, 'approved')}
                        startIcon={<ApproveIcon />}
                      >
                        ✅ Mark Approved
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error"
                        onClick={() => handleEstimateStatusUpdate(selectedJob.id, 'rejected')}
                        startIcon={<RejectIcon />}
                      >
                        ❌ Mark Rejected
                      </Button>
                    </>
                  )}
                  
                  {selectedJob.estimate_status === 'approved' && (
                    <Button 
                      variant="contained" 
                      color="secondary"
                      onClick={() => convertEstimateToJob(selectedJob.id)}
                      startIcon={<DocumentIcon />}
                    >
                      🔄 Convert to Job
                    </Button>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    color="warning"
                    onClick={() => handleEstimateStatusUpdate(selectedJob.id, 'expired')}
                  >
                    ⏰ Mark Expired
                  </Button>
                </>
              )}
              
              {/* Job workflow buttons based on status */}
              {selectedJob.job_type === 'job' && selectedJob.status === 'scheduled' && (
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'on_the_way')}
                  sx={{ backgroundColor: '#ff9800' }}
                >
                  📱 On The Way
                </Button>
              )}
              
              {selectedJob.job_type === 'job' && selectedJob.status === 'on_the_way' && (
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'in_progress')}
                >
                  ▶️ Start Job
                </Button>
              )}
              
              {selectedJob.job_type === 'job' && selectedJob.status === 'in_progress' && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleStatusUpdate(selectedJob.id, 'completed')}
                >
                  ✅ Finish Job
                </Button>
              )}
              
              {selectedJob.job_type === 'job' && selectedJob.status === 'completed' && selectedJob.payment_status !== 'paid' && (
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
