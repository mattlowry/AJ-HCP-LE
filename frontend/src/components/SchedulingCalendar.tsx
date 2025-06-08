import React, { useState, useEffect } from 'react';
import { jobApi, technicianApi, customerApi, inventoryApi } from '../services/api';
import { validateForm, commonValidationRules } from '../utils/validation';
import { Item, Category } from '../types/inventory';
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
  Divider,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Zoom,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewList as ViewListIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
  Delete as DeleteIcon,
  AddShoppingCart as AddItemIcon,
  Inventory as InventoryIcon,
  Email as EmailIcon,
  Assignment as DocumentIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  Work as WorkIcon,
  Emergency as EmergencyIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  PriorityHigh as HighPriorityIcon,
  MoreVert as MoreIcon,
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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('week');
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(new Date());
  const [technicianColors, setTechnicianColors] = useState<Record<string, string>>({});
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([]);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
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
  
  const [showMaterialsCatalog, setShowMaterialsCatalog] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedMaterialQuantity, setSelectedMaterialQuantity] = useState<Record<string, number>>({});
  
  // Inventory-related state
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<Category[]>([]);
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

  const getJobBackgroundColor = (job: Job) => {
    switch (job.status) {
      case 'scheduled': return '#e3f2fd';
      case 'on_the_way': return '#fff3e0';
      case 'in_progress': return '#e8f5e8';
      case 'completed': return '#f3e5f5';
      case 'cancelled': return '#ffebee';
      default: return '#ffffff';
    }
  };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service_type_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
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

  // Fetch inventory items for materials catalog
  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      setError(null);
      
      const itemsResponse = await inventoryApi.getItems({ is_active: true });
      const categoriesResponse = await inventoryApi.getCategories();
      
      setInventoryItems(itemsResponse.data.results);
      setInventoryCategories(categoriesResponse.data);
      
      // Identify low stock items
      const lowStock = itemsResponse.data.results.filter(
        item => item.current_stock <= item.minimum_stock
      );
      setLowStockItems(lowStock);
      
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory. Using fallback materials catalog.');
      
      // Keep existing static materials as fallback
      setInventoryItems([]);
      setInventoryCategories([]);
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
              estimated_cost: 250,
              estimate_status: "sent" as const
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
              estimated_cost: 350,
              estimate_status: "viewed" as const
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
              estimated_cost: 1200,
              estimate_status: "draft" as const
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
    setShowMaterialsCatalog(false);
    setMaterialSearchQuery('');
    setSelectedMaterialQuantity({});
    setSelectedCustomerProperties([]);
    setSelectedPropertyId(null);
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

  // Fallback materials catalog (used when inventory API is unavailable)
  const fallbackMaterialsCatalog = [
    // ===================
    // CIRCUIT BREAKERS - SQUARE D / SCHNEIDER ELECTRIC
    // ===================
    { id: 'sqd-qo115', name: 'Square D QO 15A Single Pole Breaker', category: 'Circuit Breakers - Square D', price: 14.98, unit: 'each' },
    { id: 'sqd-qo120', name: 'Square D QO 20A Single Pole Breaker', category: 'Circuit Breakers - Square D', price: 16.47, unit: 'each' },
    { id: 'sqd-qo130', name: 'Square D QO 30A Single Pole Breaker', category: 'Circuit Breakers - Square D', price: 22.98, unit: 'each' },
    { id: 'sqd-qo240', name: 'Square D QO 40A Double Pole Breaker', category: 'Circuit Breakers - Square D', price: 45.97, unit: 'each' },
    { id: 'sqd-qo250', name: 'Square D QO 50A Double Pole Breaker', category: 'Circuit Breakers - Square D', price: 58.76, unit: 'each' },
    { id: 'sqd-qo2100', name: 'Square D QO 100A Double Pole Breaker', category: 'Circuit Breakers - Square D', price: 125.99, unit: 'each' },
    { id: 'sqd-qo120gfi', name: 'Square D QO 20A GFCI Breaker', category: 'Circuit Breakers - Square D', price: 89.97, unit: 'each' },
    { id: 'sqd-qo115af', name: 'Square D QO 15A AFCI Breaker', category: 'Circuit Breakers - Square D', price: 75.98, unit: 'each' },
    { id: 'sqd-qo120df', name: 'Square D QO 20A Dual Function AFCI/GFCI', category: 'Circuit Breakers - Square D', price: 125.99, unit: 'each' },
    
    // ===================
    // CIRCUIT BREAKERS - SIEMENS
    // ===================
    { id: 'sie-q115', name: 'Siemens Q115 15A Single Pole Breaker', category: 'Circuit Breakers - Siemens', price: 12.48, unit: 'each' },
    { id: 'sie-q120', name: 'Siemens Q120 20A Single Pole Breaker', category: 'Circuit Breakers - Siemens', price: 13.97, unit: 'each' },
    { id: 'sie-q130', name: 'Siemens Q130 30A Single Pole Breaker', category: 'Circuit Breakers - Siemens', price: 19.98, unit: 'each' },
    { id: 'sie-q240', name: 'Siemens Q240 40A Double Pole Breaker', category: 'Circuit Breakers - Siemens', price: 39.97, unit: 'each' },
    { id: 'sie-q250', name: 'Siemens Q250 50A Double Pole Breaker', category: 'Circuit Breakers - Siemens', price: 52.76, unit: 'each' },
    { id: 'sie-q120gfci', name: 'Siemens Q120GFCI 20A GFCI Breaker', category: 'Circuit Breakers - Siemens', price: 79.97, unit: 'each' },
    { id: 'sie-q115af', name: 'Siemens Q115AF 15A AFCI Breaker', category: 'Circuit Breakers - Siemens', price: 69.98, unit: 'each' },

    // ===================
    // CIRCUIT BREAKERS - GENERAL ELECTRIC (GE)
    // ===================
    { id: 'ge-thql115', name: 'GE THQL115 15A Single Pole Breaker', category: 'Circuit Breakers - GE', price: 11.98, unit: 'each' },
    { id: 'ge-thql120', name: 'GE THQL120 20A Single Pole Breaker', category: 'Circuit Breakers - GE', price: 13.47, unit: 'each' },
    { id: 'ge-thql130', name: 'GE THQL130 30A Single Pole Breaker', category: 'Circuit Breakers - GE', price: 18.98, unit: 'each' },
    { id: 'ge-thql240', name: 'GE THQL240 40A Double Pole Breaker', category: 'Circuit Breakers - GE', price: 37.97, unit: 'each' },
    { id: 'ge-thql250', name: 'GE THQL250 50A Double Pole Breaker', category: 'Circuit Breakers - GE', price: 49.76, unit: 'each' },
    { id: 'ge-thql1120gf', name: 'GE THQL1120GF 20A GFCI Breaker', category: 'Circuit Breakers - GE', price: 77.97, unit: 'each' },

    // ===================
    // CIRCUIT BREAKERS - EATON
    // ===================
    { id: 'eat-br115', name: 'Eaton BR115 15A Single Pole Breaker', category: 'Circuit Breakers - Eaton', price: 10.98, unit: 'each' },
    { id: 'eat-br120', name: 'Eaton BR120 20A Single Pole Breaker', category: 'Circuit Breakers - Eaton', price: 12.47, unit: 'each' },
    { id: 'eat-br130', name: 'Eaton BR130 30A Single Pole Breaker', category: 'Circuit Breakers - Eaton', price: 17.98, unit: 'each' },
    { id: 'eat-br240', name: 'Eaton BR240 40A Double Pole Breaker', category: 'Circuit Breakers - Eaton', price: 35.97, unit: 'each' },
    { id: 'eat-br250', name: 'Eaton BR250 50A Double Pole Breaker', category: 'Circuit Breakers - Eaton', price: 47.76, unit: 'each' },
    { id: 'eat-brgf120', name: 'Eaton BRGF120 20A GFCI Breaker', category: 'Circuit Breakers - Eaton', price: 75.97, unit: 'each' },

    // ===================
    // WIRE & CABLE - ROMEX
    // ===================
    { id: 'romex-14-2-wg', name: '14-2 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 0.89, unit: 'foot' },
    { id: 'romex-14-3-wg', name: '14-3 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 1.29, unit: 'foot' },
    { id: 'romex-12-2-wg', name: '12-2 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 1.39, unit: 'foot' },
    { id: 'romex-12-3-wg', name: '12-3 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 1.89, unit: 'foot' },
    { id: 'romex-10-2-wg', name: '10-2 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 2.49, unit: 'foot' },
    { id: 'romex-10-3-wg', name: '10-3 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 3.29, unit: 'foot' },
    { id: 'romex-8-2-wg', name: '8-2 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 3.89, unit: 'foot' },
    { id: 'romex-8-3-wg', name: '8-3 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 4.89, unit: 'foot' },
    { id: 'romex-6-2-wg', name: '6-2 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 5.89, unit: 'foot' },
    { id: 'romex-6-3-wg', name: '6-3 Romex NM-B Cable w/Ground', category: 'Wire & Cable - Romex', price: 7.29, unit: 'foot' },

    // ===================
    // WIRE & CABLE - THHN/THWN
    // ===================
    { id: 'thhn-14-black', name: '14 AWG THHN/THWN Stranded Black', category: 'Wire & Cable - THHN', price: 0.45, unit: 'foot' },
    { id: 'thhn-14-white', name: '14 AWG THHN/THWN Stranded White', category: 'Wire & Cable - THHN', price: 0.45, unit: 'foot' },
    { id: 'thhn-14-red', name: '14 AWG THHN/THWN Stranded Red', category: 'Wire & Cable - THHN', price: 0.45, unit: 'foot' },
    { id: 'thhn-12-black', name: '12 AWG THHN/THWN Stranded Black', category: 'Wire & Cable - THHN', price: 0.65, unit: 'foot' },
    { id: 'thhn-12-white', name: '12 AWG THHN/THWN Stranded White', category: 'Wire & Cable - THHN', price: 0.65, unit: 'foot' },
    { id: 'thhn-12-red', name: '12 AWG THHN/THWN Stranded Red', category: 'Wire & Cable - THHN', price: 0.65, unit: 'foot' },
    { id: 'thhn-10-black', name: '10 AWG THHN/THWN Stranded Black', category: 'Wire & Cable - THHN', price: 0.95, unit: 'foot' },
    { id: 'thhn-10-white', name: '10 AWG THHN/THWN Stranded White', category: 'Wire & Cable - THHN', price: 0.95, unit: 'foot' },
    { id: 'thhn-8-black', name: '8 AWG THHN/THWN Stranded Black', category: 'Wire & Cable - THHN', price: 1.45, unit: 'foot' },
    { id: 'thhn-6-black', name: '6 AWG THHN/THWN Stranded Black', category: 'Wire & Cable - THHN', price: 2.15, unit: 'foot' },

    // ===================
    // OUTLETS & RECEPTACLES
    // ===================
    { id: 'rec-15a-std', name: '15A Standard Duplex Receptacle', category: 'Outlets & Receptacles', price: 1.48, unit: 'each' },
    { id: 'rec-20a-std', name: '20A Standard Duplex Receptacle', category: 'Outlets & Receptacles', price: 2.98, unit: 'each' },
    { id: 'rec-15a-gfci', name: '15A GFCI Receptacle', category: 'Outlets & Receptacles', price: 18.97, unit: 'each' },
    { id: 'rec-20a-gfci', name: '20A GFCI Receptacle', category: 'Outlets & Receptacles', price: 22.97, unit: 'each' },
    { id: 'rec-15a-usb', name: '15A USB-A Duplex Receptacle', category: 'Outlets & Receptacles', price: 24.98, unit: 'each' },
    { id: 'rec-15a-usbc', name: '15A USB-C Duplex Receptacle', category: 'Outlets & Receptacles', price: 34.98, unit: 'each' },
    { id: 'rec-20a-usb', name: '20A USB-A Duplex Receptacle', category: 'Outlets & Receptacles', price: 29.98, unit: 'each' },
    { id: 'rec-gfci-usb', name: '20A GFCI with USB Charging', category: 'Outlets & Receptacles', price: 39.97, unit: 'each' },
    { id: 'rec-smartwifi', name: 'Smart WiFi GFCI Receptacle', category: 'Outlets & Receptacles', price: 49.98, unit: 'each' },
    { id: 'rec-weatherproof', name: 'Weatherproof GFCI Receptacle', category: 'Outlets & Receptacles', price: 26.98, unit: 'each' },

    // ===================
    // SWITCHES
    // ===================
    { id: 'sw-single-toggle', name: 'Single Pole Toggle Switch', category: 'Switches', price: 1.98, unit: 'each' },
    { id: 'sw-single-decora', name: 'Single Pole Decora Switch', category: 'Switches', price: 3.48, unit: 'each' },
    { id: 'sw-3way-toggle', name: '3-Way Toggle Switch', category: 'Switches', price: 3.98, unit: 'each' },
    { id: 'sw-3way-decora', name: '3-Way Decora Switch', category: 'Switches', price: 5.48, unit: 'each' },
    { id: 'sw-4way-toggle', name: '4-Way Toggle Switch', category: 'Switches', price: 12.98, unit: 'each' },
    { id: 'sw-dimmer-led', name: 'LED Dimmer Switch', category: 'Switches', price: 24.98, unit: 'each' },
    { id: 'sw-dimmer-3way', name: '3-Way LED Dimmer Switch', category: 'Switches', price: 34.98, unit: 'each' },
    { id: 'sw-smart-wifi', name: 'Smart WiFi Switch', category: 'Switches', price: 19.98, unit: 'each' },
    { id: 'sw-smart-dimmer', name: 'Smart WiFi Dimmer Switch', category: 'Switches', price: 39.98, unit: 'each' },
    { id: 'sw-motion-sensor', name: 'Motion Sensor Switch', category: 'Switches', price: 29.98, unit: 'each' },
    { id: 'sw-timer', name: 'Programmable Timer Switch', category: 'Switches', price: 22.98, unit: 'each' },

    // ===================
    // ELECTRICAL BOXES
    // ===================
    { id: 'box-1gang-pvc', name: 'Single Gang PVC Old Work Box', category: 'Electrical Boxes', price: 1.48, unit: 'each' },
    { id: 'box-2gang-pvc', name: 'Double Gang PVC Old Work Box', category: 'Electrical Boxes', price: 2.98, unit: 'each' },
    { id: 'box-3gang-pvc', name: 'Triple Gang PVC Old Work Box', category: 'Electrical Boxes', price: 4.98, unit: 'each' },
    { id: 'box-1gang-metal', name: 'Single Gang Metal Box', category: 'Electrical Boxes', price: 2.48, unit: 'each' },
    { id: 'box-2gang-metal', name: 'Double Gang Metal Box', category: 'Electrical Boxes', price: 3.98, unit: 'each' },
    { id: 'box-ceiling-pvc', name: 'Ceiling Fan PVC Box', category: 'Electrical Boxes', price: 3.98, unit: 'each' },
    { id: 'box-ceiling-metal', name: 'Ceiling Fan Metal Box', category: 'Electrical Boxes', price: 5.98, unit: 'each' },
    { id: 'box-4x4-sq', name: '4" x 4" Square Junction Box', category: 'Electrical Boxes', price: 3.48, unit: 'each' },
    { id: 'box-4x4-oct', name: '4" Octagon Ceiling Box', category: 'Electrical Boxes', price: 2.98, unit: 'each' },
    { id: 'box-weatherproof', name: 'Weatherproof Outdoor Box', category: 'Electrical Boxes', price: 8.98, unit: 'each' },

    // ===================
    // CONDUIT & FITTINGS
    // ===================
    { id: 'conduit-emt-12', name: '1/2" EMT Electrical Conduit', category: 'Conduit & Fittings', price: 3.48, unit: 'foot' },
    { id: 'conduit-emt-34', name: '3/4" EMT Electrical Conduit', category: 'Conduit & Fittings', price: 4.98, unit: 'foot' },
    { id: 'conduit-emt-1', name: '1" EMT Electrical Conduit', category: 'Conduit & Fittings', price: 6.98, unit: 'foot' },
    { id: 'conduit-pvc-12', name: '1/2" PVC Schedule 40 Conduit', category: 'Conduit & Fittings', price: 2.48, unit: 'foot' },
    { id: 'conduit-pvc-34', name: '3/4" PVC Schedule 40 Conduit', category: 'Conduit & Fittings', price: 3.48, unit: 'foot' },
    { id: 'conduit-pvc-1', name: '1" PVC Schedule 40 Conduit', category: 'Conduit & Fittings', price: 4.98, unit: 'foot' },
    { id: 'fitting-emt-conn-12', name: '1/2" EMT Connector', category: 'Conduit & Fittings', price: 1.98, unit: 'each' },
    { id: 'fitting-emt-conn-34', name: '3/4" EMT Connector', category: 'Conduit & Fittings', price: 2.98, unit: 'each' },
    { id: 'fitting-emt-coup-12', name: '1/2" EMT Coupling', category: 'Conduit & Fittings', price: 1.48, unit: 'each' },
    { id: 'fitting-90-12', name: '1/2" 90° EMT Elbow', category: 'Conduit & Fittings', price: 2.98, unit: 'each' },

    // ===================
    // ELECTRICAL PANELS
    // ===================
    { id: 'panel-sqd-qo120', name: 'Square D QO 20-Circuit Load Center 120/240V', category: 'Electrical Panels', price: 189.00, unit: 'each' },
    { id: 'panel-sqd-qo140', name: 'Square D QO 40-Circuit Load Center 120/240V', category: 'Electrical Panels', price: 298.00, unit: 'each' },
    { id: 'panel-sqd-qo200', name: 'Square D QO 200A 40-Circuit Main Breaker Panel', category: 'Electrical Panels', price: 445.00, unit: 'each' },
    { id: 'panel-sie-s2040', name: 'Siemens 40-Circuit Load Center 120/240V', category: 'Electrical Panels', price: 185.00, unit: 'each' },
    { id: 'panel-sie-200a', name: 'Siemens 200A 40-Circuit Main Breaker Panel', category: 'Electrical Panels', price: 425.00, unit: 'each' },
    { id: 'panel-ge-load', name: 'GE PowerMark 40-Circuit Load Center', category: 'Electrical Panels', price: 175.00, unit: 'each' },
    { id: 'subpanel-100a', name: '100A Sub Panel Load Center', category: 'Electrical Panels', price: 125.00, unit: 'each' },

    // ===================
    // LIGHTING & FIXTURES
    // ===================
    { id: 'led-recessed-4', name: '4" LED Recessed Downlight', category: 'Lighting & Fixtures', price: 12.98, unit: 'each' },
    { id: 'led-recessed-6', name: '6" LED Recessed Downlight', category: 'Lighting & Fixtures', price: 18.98, unit: 'each' },
    { id: 'led-recessed-adj', name: '6" LED Adjustable Recessed Light', category: 'Lighting & Fixtures', price: 24.98, unit: 'each' },
    { id: 'fixture-flush-led', name: 'LED Flush Mount Ceiling Light', category: 'Lighting & Fixtures', price: 39.98, unit: 'each' },
    { id: 'fixture-pendant', name: 'Mini Pendant Light Fixture', category: 'Lighting & Fixtures', price: 29.98, unit: 'each' },
    { id: 'fixture-chandelier', name: 'Traditional Chandelier 5-Light', category: 'Lighting & Fixtures', price: 129.00, unit: 'each' },
    { id: 'fixture-vanity', name: '3-Light Vanity Bar Fixture', category: 'Lighting & Fixtures', price: 59.98, unit: 'each' },
    { id: 'fixture-outdoor', name: 'Outdoor Wall Lantern', category: 'Lighting & Fixtures', price: 34.98, unit: 'each' },
    { id: 'under-cabinet-led', name: 'Under Cabinet LED Light Strip', category: 'Lighting & Fixtures', price: 24.98, unit: 'each' },

    // ===================
    // SPECIALTY & SAFETY
    // ===================
    { id: 'smoke-detector-battery', name: 'Battery Smoke Detector', category: 'Specialty & Safety', price: 14.98, unit: 'each' },
    { id: 'smoke-detector-hardwired', name: 'Hardwired Smoke Detector', category: 'Specialty & Safety', price: 22.98, unit: 'each' },
    { id: 'co-detector', name: 'Carbon Monoxide Detector', category: 'Specialty & Safety', price: 29.98, unit: 'each' },
    { id: 'smoke-co-combo', name: 'Smoke & CO Combo Detector', category: 'Specialty & Safety', price: 39.98, unit: 'each' },
    { id: 'surge-whole-house', name: 'Whole House Surge Protector', category: 'Specialty & Safety', price: 189.00, unit: 'each' },
    { id: 'surge-strip', name: '8-Outlet Surge Protector Strip', category: 'Specialty & Safety', price: 24.98, unit: 'each' },
    { id: 'doorbell-wired', name: 'Wired Doorbell Kit', category: 'Specialty & Safety', price: 19.98, unit: 'each' },
    { id: 'doorbell-smart', name: 'Smart Video Doorbell', category: 'Specialty & Safety', price: 99.99, unit: 'each' },
    { id: 'exhaust-fan-bath', name: 'Bathroom Exhaust Fan 80 CFM', category: 'Specialty & Safety', price: 29.98, unit: 'each' },
    { id: 'exhaust-fan-quiet', name: 'Ultra-Quiet Bathroom Fan 110 CFM', category: 'Specialty & Safety', price: 79.98, unit: 'each' },

    // ===================
    // EV CHARGING & HIGH-AMP
    // ===================
    { id: 'ev-charger-l2-32a', name: '32A Level 2 EV Charger', category: 'EV Charging', price: 499.00, unit: 'each' },
    { id: 'ev-charger-l2-40a', name: '40A Level 2 EV Charger', category: 'EV Charging', price: 649.00, unit: 'each' },
    { id: 'ev-charger-smart', name: 'Smart WiFi EV Charger 32A', category: 'EV Charging', price: 699.00, unit: 'each' },
    { id: 'nema-6-50', name: 'NEMA 6-50 50A 240V Receptacle', category: 'EV Charging', price: 24.98, unit: 'each' },
    { id: 'nema-14-50', name: 'NEMA 14-50 50A 240V Receptacle', category: 'EV Charging', price: 29.98, unit: 'each' },
    { id: 'dryer-cord-4wire', name: '4-Wire 30A Dryer Cord', category: 'EV Charging', price: 34.98, unit: 'each' },

    // ===================
    // WIRE NUTS & CONNECTORS
    // ===================
    { id: 'wirenut-yellow', name: 'Yellow Wire Nuts (100 pack)', category: 'Wire Nuts & Connectors', price: 12.98, unit: 'pack' },
    { id: 'wirenut-red', name: 'Red Wire Nuts (100 pack)', category: 'Wire Nuts & Connectors', price: 14.98, unit: 'pack' },
    { id: 'wirenut-blue', name: 'Blue Wire Nuts (100 pack)', category: 'Wire Nuts & Connectors', price: 16.98, unit: 'pack' },
    { id: 'wirenut-orange', name: 'Orange Wire Nuts (100 pack)', category: 'Wire Nuts & Connectors', price: 9.98, unit: 'pack' },
    { id: 'wago-221', name: 'WAGO 221 Lever Connectors (25 pack)', category: 'Wire Nuts & Connectors', price: 24.98, unit: 'pack' },
    { id: 'wiremold-splice', name: 'In-Line Splice Kit', category: 'Wire Nuts & Connectors', price: 8.98, unit: 'each' },

    // ===================
    // COVERS & PLATES
    // ===================
    { id: 'plate-1gang-white', name: 'Single Gang Toggle Switch Plate - White', category: 'Covers & Plates', price: 0.98, unit: 'each' },
    { id: 'plate-1gang-almond', name: 'Single Gang Toggle Switch Plate - Almond', category: 'Covers & Plates', price: 1.28, unit: 'each' },
    { id: 'plate-1gang-decora', name: 'Single Gang Decora Switch Plate - White', category: 'Covers & Plates', price: 1.48, unit: 'each' },
    { id: 'plate-2gang-white', name: 'Double Gang Switch Plate - White', category: 'Covers & Plates', price: 1.98, unit: 'each' },
    { id: 'plate-outlet-white', name: 'Duplex Outlet Cover Plate - White', category: 'Covers & Plates', price: 0.78, unit: 'each' },
    { id: 'plate-blank-white', name: 'Blank Cover Plate - White', category: 'Covers & Plates', price: 0.98, unit: 'each' },
    { id: 'plate-gfci-white', name: 'GFCI Outlet Cover Plate - White', category: 'Covers & Plates', price: 1.98, unit: 'each' }
  ];

  // Material pricing markup tiers
  const materialMarkupTiers = [
    { min: 0, max: 25, markup: 0.50 },      // 0-$25: 50% markup
    { min: 25.01, max: 50, markup: 0.40 },  // $25.01-$50: 40% markup  
    { min: 50.01, max: 100, markup: 0.35 }, // $50.01-$100: 35% markup
    { min: 100.01, max: 250, markup: 0.30 }, // $100.01-$250: 30% markup
    { min: 250.01, max: 500, markup: 0.25 }, // $250.01-$500: 25% markup
    { min: 500.01, max: Infinity, markup: 0.20 } // $500+: 20% markup
  ];

  // Function to calculate markup price based on cost tiers
  const calculateMarkupPrice = (costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    if (!tier) return costPrice * 1.35; // Default 35% if no tier matches
    
    return costPrice * (1 + tier.markup);
  };

  // Function to get markup percentage for display
  const getMarkupPercentage = (costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    return tier ? tier.markup * 100 : 35; // Default 35% if no tier matches
  };

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

  // Computed materials catalog that uses inventory data when available
  const materialsCatalog: MaterialCatalogItem[] = React.useMemo(() => {
    if (inventoryItems.length > 0) {
      // Convert inventory items to materials catalog format with markup
      return inventoryItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        category: item.category_name || 'General',
        price: calculateMarkupPrice(item.cost_price || item.unit_price), // Apply markup to cost price
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
    // Fall back to static catalog if no inventory data - apply markup to static prices
    return fallbackMaterialsCatalog.map(item => ({
      ...item,
      price: calculateMarkupPrice(item.price), // Apply markup to fallback prices
      current_stock: undefined,
      minimum_stock: undefined,
      isLowStock: false,
      sku: undefined,
      description: undefined,
      costPrice: item.price, // Original price becomes cost price
      markupPercentage: getMarkupPercentage(item.price)
    }));
  }, [inventoryItems]);

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
      const usageRecord = {
        item_id: itemId,
        quantity_used: quantity,
        usage_type: type,
        timestamp: new Date().toISOString(),
        reference_type: type,
        reference_id: null, // Will be set when estimate/job is saved
      };
      
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
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">Loading scheduling data...</Typography>
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
                  fetchJobs().finally(() => setRefreshing(false));
                }}
                disabled={refreshing}
              >
                <RefreshIcon className={refreshing ? 'animate-spin' : ''} />
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
                  onClick={() => openJobDetails(job)}
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
                {/* Modern Calendar Grid Header */}
                <Box sx={{ 
                  display: 'flex', 
                  borderBottom: '2px solid #e0e0e0', 
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px 8px 0 0',
                }}>
                  <Box sx={{ 
                    width: 100, 
                    p: 2, 
                    borderRight: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="subtitle2" fontWeight="600" color="text.secondary">
                      Time
                    </Typography>
                  </Box>
                  {(viewMode === 'week' ? weekDates : [selectedDate]).map(date => {
                    const isToday = date === new Date().toISOString().split('T')[0];
                    const dayJobs = jobs.filter(j => j.scheduled_date === date);
                    return (
                      <Box 
                        key={date}
                        sx={{ 
                          flex: 1, 
                          p: 2,
                          borderRight: '1px solid #e0e0e0',
                          textAlign: 'center',
                          backgroundColor: isToday ? '#e3f2fd' : 'transparent',
                          minWidth: viewMode === 'week' ? 140 : 300
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight="600" color={isToday ? 'primary.main' : 'text.primary'}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayJobs.length} {dayJobs.length === 1 ? 'job' : 'jobs'}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                
                {/* Modern Time Slots Grid */}
                {timeSlots.map((slot, index) => (
                  <Box 
                    key={slot.time}
                    sx={{ 
                      display: 'flex', 
                      borderBottom: '1px solid #f0f0f0',
                      minHeight: 70,
                      backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
                      '&:hover': { backgroundColor: '#f5f5f5' },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {/* Enhanced Time Column */}
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
                            onClick={() => setShowMaterialsCatalog(true)}
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

      {/* Materials Catalog Dialog */}
      <Dialog
        open={showMaterialsCatalog}
        onClose={() => setShowMaterialsCatalog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          🔧 Electrical Parts & Materials Catalog
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select materials to add to your estimate. Prices include standard markup.
          </Typography>
          
          {/* Low stock warning */}
          {lowStockItems.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Low Stock Alert:</strong> {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low. 
              Items: {lowStockItems.slice(0, 3).map(item => item.name).join(', ')}
              {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}.
            </Alert>
          )}
          
          {/* Inventory loading indicator */}
          {inventoryLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="caption">Loading inventory data...</Typography>
            </Box>
          )}
          
          {/* Search bar */}
          <TextField
            fullWidth
            placeholder="Search materials..."
            value={materialSearchQuery}
            onChange={(e) => setMaterialSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />
          
          {/* Markup tier information */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              📊 Material Markup Tiers
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {materialMarkupTiers.map((tier, index) => (
                <Chip
                  key={index}
                  label={`$${tier.min === 0 ? '0' : tier.min.toFixed(2)}-${tier.max === Infinity ? '∞' : '$' + tier.max.toFixed(2)}: ${(tier.markup * 100).toFixed(0)}%`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '11px' }}
                />
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Prices shown include automatic markup based on material cost
            </Typography>
          </Box>
          
          {/* Group materials by category */}
          {Array.from(new Set(materialsCatalog
            .filter(item => 
              materialSearchQuery === '' || 
              item.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
              item.category.toLowerCase().includes(materialSearchQuery.toLowerCase())
            )
            .map(item => item.category)
          )).map(category => {
            const filteredMaterials = materialsCatalog
              .filter(item => item.category === category)
              .filter(item => 
                materialSearchQuery === '' || 
                item.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(materialSearchQuery.toLowerCase())
              );
            
            if (filteredMaterials.length === 0) return null;
            
            return (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: 'primary.main', 
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  pb: 0.5,
                  mb: 2
                }}>
                  {category}
                </Typography>
                <Grid container spacing={1}>
                  {filteredMaterials.map(material => (
                    <Grid item xs={12} sm={6} md={4} key={material.id}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            transform: 'translateY(-2px)',
                            boxShadow: 3
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="body2" fontWeight="bold" noWrap title={material.name}>
                            {material.name}
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                            ${material.price.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            per {material.unit}
                          </Typography>
                          
                          {/* Cost and markup information */}
                          {material.costPrice && material.markupPercentage && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                Cost: ${material.costPrice.toFixed(2)} • Markup: {material.markupPercentage.toFixed(0)}%
                              </Typography>
                            </Box>
                          )}
                          
                          {/* Stock information for inventory items */}
                          {material.current_stock !== undefined && (
                            <Box sx={{ mt: 1 }}>
                              <Typography 
                                variant="caption" 
                                color={material.isLowStock ? 'error' : 'text.secondary'}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                              >
                                {material.isLowStock && (
                                  <span style={{ color: '#f44336', fontSize: '12px' }}>⚠️</span>
                                )}
                                Stock: {material.current_stock} {material.unit}
                                {material.isLowStock && ' (Low)'}
                              </Typography>
                              {material.sku && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                  SKU: {material.sku}
                                </Typography>
                              )}
                            </Box>
                          )}
                          
                          {/* Quantity selector and add button */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={selectedMaterialQuantity[material.id] || 1}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                const maxQty = material.current_stock !== undefined ? material.current_stock : 999;
                                setSelectedMaterialQuantity(prev => ({
                                  ...prev,
                                  [material.id]: Math.max(1, Math.min(newQty, maxQty))
                                }));
                              }}
                              inputProps={{ 
                                min: 1, 
                                max: material.current_stock !== undefined ? material.current_stock : 999 
                              }}
                              sx={{ width: 60 }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={material.current_stock === 0}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={(e) => {
                                e.stopPropagation();
                                addMaterialToLineItems(material);
                              }}
                              startIcon={<AddItemIcon />}
                              fullWidth
                              disabled={material.current_stock === 0}
                              color={material.isLowStock ? 'warning' : 'primary'}
                            >
                              {material.current_stock === 0 ? 'Out of Stock' : 'Add'}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMaterialsCatalog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulingCalendar;