import React, { useState, useEffect } from 'react';
import { jobApi, schedulingApi, technicianApi } from '../services/api';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
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
  status: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  assigned_technician: string | null;
  estimated_duration: number;
  service_type_name: string;
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
    description: ''
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate time slots for the day (8 AM to 6 PM)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        jobs: []
      });
    }
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(generateTimeSlots());


  const fetchTechnicians = async () => {
    try {
      const response = await technicianApi.getAvailable();
      setTechnicians(response.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      
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
    try {
      let dateFrom, dateTo;
      
      if (viewMode === 'week' && weekDates.length > 0) {
        dateFrom = weekDates[0];
        dateTo = weekDates[6];
      } else {
        dateFrom = selectedDate;
        dateTo = selectedDate;
      }
      
      // Try to fetch scheduled jobs for the selected date range
      try {
        const scheduledResponse = await jobApi.getAll({
          date_from: dateFrom,
          date_to: dateTo,
          status: 'scheduled'
        });
        
        setJobs(scheduledResponse.data.results);
      } catch (apiError) {
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
              status: "scheduled",
              priority: "high" as const,
              scheduled_date: generateDate(0),
              scheduled_start_time: "09:00",
              scheduled_end_time: "12:00",
              assigned_technician: "1",
              estimated_duration: 3,
              service_type_name: "Panel Installation"
            },
            {
              id: "102",
              job_number: "JOB-2024-0102",
              title: "Outlet Repair",
              customer_name: "Sarah Davis",
              status: "scheduled",
              priority: "medium" as const,
              scheduled_date: generateDate(0),
              scheduled_start_time: "14:00",
              scheduled_end_time: "15:30",
              assigned_technician: "2",
              estimated_duration: 1.5,
              service_type_name: "Electrical Repair"
            },
            {
              id: "103",
              job_number: "JOB-2024-0103",
              title: "Emergency Power Outage",
              customer_name: "Robert Brown",
              status: "scheduled",
              priority: "emergency" as const,
              scheduled_date: generateDate(1),
              scheduled_start_time: "10:00",
              scheduled_end_time: "13:00",
              assigned_technician: "1",
              estimated_duration: 3,
              service_type_name: "Emergency Service"
            },
            {
              id: "104",
              job_number: "JOB-2024-0104",
              title: "Lighting Installation",
              customer_name: "Lisa Garcia",
              status: "scheduled",
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
              status: "scheduled",
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
              status: "scheduled",
              priority: "high" as const,
              scheduled_date: generateDate(3),
              scheduled_start_time: "13:00",
              scheduled_end_time: "17:00",
              assigned_technician: "1",
              estimated_duration: 4,
              service_type_name: "Wiring Installation"
            },
            {
              id: "107",
              job_number: "JOB-2024-0107",
              title: "Security Light Install",
              customer_name: "David Miller",
              status: "scheduled",
              priority: "medium" as const,
              scheduled_date: generateDate(4),
              scheduled_start_time: "10:00",
              scheduled_end_time: "12:00",
              assigned_technician: "3",
              estimated_duration: 2,
              service_type_name: "Lighting Installation"
            }
          ];
          
          setJobs(demoJobs);
        }
      } catch (error) {
        console.error('Error fetching scheduled jobs:', error);
        // Fallback to demo data
      }

      // Try to fetch unscheduled jobs
      try {
        const unscheduledResponse = await jobApi.getAll({
          status: 'pending'
        });
        
        setUnscheduledJobs(unscheduledResponse.data.results);
      } catch (unscheduledError) {
          // Demo unscheduled jobs
          const demoUnscheduledJobs = [
            {
              id: "201",
              job_number: "JOB-2024-0201",
              title: "Electric Vehicle Charger",
              customer_name: "Thomas Edwards",
              status: "pending",
              priority: "high" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 4,
              service_type_name: "Installation"
            },
            {
              id: "202",
              job_number: "JOB-2024-0202",
              title: "Flickering Lights",
              customer_name: "Emily Parker",
              status: "pending",
              priority: "medium" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 1,
              service_type_name: "Electrical Repair"
            },
            {
              id: "203",
              job_number: "JOB-2024-0203",
              title: "Hot Tub Wiring",
              customer_name: "Kevin Thompson",
              status: "pending",
              priority: "low" as const,
              scheduled_date: null,
              scheduled_start_time: null,
              scheduled_end_time: null,
              assigned_technician: null,
              estimated_duration: 5,
              service_type_name: "Wiring Installation"
            }
          ];
          
          setUnscheduledJobs(demoUnscheduledJobs);
        }
      } catch (error) {
        console.error('Error fetching unscheduled jobs:', error);
        // Handle error
      }
    } catch (error) {
      console.error('Error in job fetching process:', error);
    }
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
        const hour = parseInt(job.scheduled_start_time.split(':')[0]);
        const slotIndex = hour - 8; // 8 AM is index 0
        
        if (slotIndex >= 0 && slotIndex < newTimeSlots.length) {
          newTimeSlots[slotIndex].jobs.push(job);
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
    
    // Handle dropping job onto technician schedule
    if (over.id.toString().startsWith('technician-')) {
      const overId = over.id.toString();
      const technicianId = overId.replace('technician-', '').split('-time-')[0];
      const timeSlot = overId.includes('-time-') 
        ? overId.split('-time-')[1] 
        : '09:00';
      
      // Determine which date to use (selected date or a date from the week view)
      let scheduleDate = selectedDate;
      
      // For week view, check if the container has a date attribute
      if (viewMode === 'week') {
        // Extract date from the over.id if available, otherwise use selected date
        const dateMatch = overId.match(/date-(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1]) {
          scheduleDate = dateMatch[1];
        }
      }
      
      try {
        // Update job with scheduling information
        await jobApi.update(parseInt(active.id), {
          assigned_to: [parseInt(technicianId)],
          scheduled_start: `${scheduleDate}T${timeSlot}:00`,
          status: 'scheduled'
        });
        
        // Refresh data to get updated job information
        fetchJobsCallback();
      } catch (error) {
        console.error('Error assigning job:', error);
      }
    }
  };
  
  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, durationHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHours = hours + Math.floor(durationHours);
    const endMinutes = minutes + Math.round((durationHours % 1) * 60);
    
    if (endMinutes >= 60) {
      endHours += 1;
    }
    
    const formattedHours = String(endHours % 24).padStart(2, '0');
    const formattedMinutes = String(endMinutes % 60).padStart(2, '0');
    
    return `${formattedHours}:${formattedMinutes}`;
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
          '&:hover': { boxShadow: 3 }
        }}
        onClick={() => {
          setSelectedJob(job);
          setIsCreatingJob(false);
          setOpenJobDialog(true);
        }}
      >
        <CardContent sx={{ padding: '8px !important' }}>
          <Typography variant="caption" color="textSecondary">
            {job.job_number}
          </Typography>
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

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        📅 Job Scheduling Calendar
      </Typography>
      
      {/* View selector and date controls */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tabs 
              value={viewMode} 
              onChange={(_, newValue) => setViewMode(newValue)}
              sx={{ minHeight: 'auto' }}
            >
              <Tab 
                icon={<TodayIcon />} 
                label="Day" 
                value="day" 
                sx={{ minHeight: 'auto', py: 1 }} 
              />
              <Tab 
                icon={<ViewWeekIcon />} 
                label="Week" 
                value="week" 
                sx={{ minHeight: 'auto', py: 1 }} 
              />
            </Tabs>
          </Box>
          
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
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setIsCreatingJob(true);
              setSelectedJob(null);
              setNewJobData({
                title: '',
                customer_name: '',
                service_type_name: '',
                priority: 'medium',
                estimated_duration: 2,
                description: ''
              });
              setOpenJobDialog(true);
            }}
          >
            Create Job
          </Button>
        </Box>
        
        {viewMode === 'day' ? (
          <TextField
            type="date"
            label="Schedule Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            {weekDates.map((date) => (
              <Box 
                key={date} 
                sx={{ 
                  textAlign: 'center',
                  flex: 1,
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: date === selectedDate ? 'primary.light' : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: date === selectedDate ? 'primary.light' : 'action.hover' }
                }}
                onClick={() => setSelectedDate(date)}
              >
                <Typography variant="body2" fontWeight={date === selectedDate ? 'bold' : 'normal'}>
                  {formatDate(date)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

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

          {/* Technician Schedules */}
          <Grid item xs={12} md={9}>
            {viewMode === 'day' ? (
              <Grid container spacing={1}>
                {technicians.map((technician) => (
                  <Grid item xs={12} sm={6} md={4} key={technician.id}>
                    <Card>
                      <CardHeader
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon fontSize="small" />
                            <Typography variant="subtitle1">
                              {technician.full_name}
                            </Typography>
                          </Box>
                        }
                        subheader={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={technician.skill_level}
                              size="small"
                              color="primary"
                              sx={{ backgroundColor: getTechnicianColor(technician.id) }}
                            />
                            <Chip
                              label={technician.employee_id}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                      <CardContent sx={{ padding: '8px !important' }}>
                        {timeSlots.map((slot, slotIndex) => (
                          <Box
                            key={`${technician.id}-${slot.time}`}
                            id={`technician-${technician.id}-time-${slot.time}`}
                            sx={{
                              minHeight: 40,
                              border: '1px solid #e0e0e0',
                              borderRadius: 1,
                              margin: '2px 0',
                              padding: 1,
                              display: 'flex',
                              alignItems: 'center',
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: '#f5f5f5'
                              }
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                left: 4,
                                top: 2,
                                fontSize: '0.7rem',
                                color: 'text.secondary'
                              }}
                            >
                              {slot.time}
                            </Typography>
                            
                            <Box sx={{ ml: 6, width: '100%' }}>
                              {slot.jobs
                                .filter(job => job.assigned_technician === technician.id)
                                .map((job) => (
                                  <SortableJobCard key={job.id} job={job} />
                                ))}
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              // Week view
              <Paper elevation={2} sx={{ p: 2, overflow: 'auto' }}>
                <Box sx={{ minWidth: 900 }}>
                  {/* Header row with technicians */}
                  <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', pb: 1, mb: 1 }}>
                    <Box sx={{ width: 80, flexShrink: 0 }}>
                      <TimeIcon color="action" sx={{ mt: 1 }} />
                    </Box>
                    {technicians.map(technician => (
                      <Box 
                        key={technician.id}
                        sx={{ 
                          flex: 1, 
                          textAlign: 'center', 
                          px: 1,
                          borderLeft: '1px solid #e0e0e0',
                        }}
                      >
                        <Tooltip title={technician.skill_level}>
                          <Chip
                            label={technician.full_name}
                            size="small"
                            sx={{ 
                              backgroundColor: getTechnicianColor(technician.id),
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                  
                  {/* Time slots */}
                  {timeSlots.map((slot) => (
                    <Box 
                      key={slot.time}
                      sx={{ 
                        display: 'flex', 
                        borderBottom: '1px solid #f0f0f0',
                        minHeight: 80,
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
                          flexShrink: 0
                        }}
                      >
                        <Typography variant="body2">{slot.time}</Typography>
                      </Box>
                      
                      {/* Technician slots */}
                      {technicians.map(technician => {
                        // Filter jobs for this technician in this time slot across all week days
                        const techJobs = jobs.filter(job => 
                          job.assigned_technician === technician.id && 
                          job.scheduled_start_time === slot.time
                        );
                        
                        return (
                          <Box 
                            key={`${technician.id}-${slot.time}`}
                            id={`technician-${technician.id}-time-${slot.time}`}
                            sx={{ 
                              flex: 1,
                              borderLeft: '1px solid #e0e0e0',
                              p: 1,
                              position: 'relative'
                            }}
                          >
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {techJobs.map(job => {
                                // Check if this job is for the current selected date or another day in the week
                                const isSelectedDate = job.scheduled_date === selectedDate;
                                
                                return (
                                  <Tooltip 
                                    key={job.id} 
                                    title={`${job.customer_name} - ${formatDate(job.scheduled_date || '')}`}
                                  >
                                    <Box
                                      sx={{
                                        borderRadius: 1,
                                        p: 0.5,
                                        backgroundColor: isSelectedDate ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                                        border: `2px solid ${getPriorityColor(job.priority)}`,
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.2)' },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        width: 'calc(100% - 4px)',
                                        position: 'relative'
                                      }}
                                      onClick={() => {
                                        setSelectedJob(job);
                                        setIsCreatingJob(false);
                                        setOpenJobDialog(true);
                                      }}
                                    >
                                      <Typography variant="caption" fontWeight="bold" noWrap>
                                        {job.title}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" noWrap>
                                        {job.customer_name}
                                      </Typography>
                                      <Box sx={{ position: 'absolute', right: 2, top: 2 }}>
                                        <Chip 
                                          label={job.priority} 
                                          size="small" 
                                          sx={{ 
                                            height: 16, 
                                            fontSize: '0.6rem',
                                            backgroundColor: getPriorityColor(job.priority),
                                            color: 'white'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
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
          {isCreatingJob ? 'Create New Job' : selectedJob ? `Job Details: ${selectedJob.job_number}` : 'Job Details'}
        </DialogTitle>
        <DialogContent>
          {isCreatingJob ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Job Title"
                  value={newJobData.title}
                  onChange={(e) => setNewJobData({...newJobData, title: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={newJobData.customer_name}
                  onChange={(e) => setNewJobData({...newJobData, customer_name: e.target.value})}
                  required
                />
              </Grid>
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
                  // Create a new job via the backend API
                  const newJob = await jobApi.create({
                    job_number: `JOB-${Date.now()}`,
                    title: newJobData.title,
                    description: newJobData.description,
                    customer: 1, // Default to first customer - should be dynamic in production
                    property: 1, // Default to first property - should be dynamic in production
                    service_type: newJobData.service_type_name || 'General Service',
                    priority: newJobData.priority as 'low' | 'medium' | 'high' | 'emergency',
                    status: 'pending',
                    estimated_duration: 2,
                    estimated_cost: 100,
                    assigned_to: []
                  });
                  
                  alert('Job created successfully!');
                  fetchJobsCallback(); // Refresh the job list
                  
                  setOpenJobDialog(false);
                  setIsCreatingJob(false);
                } catch (error) {
                  console.error('Error creating job:', error);
                  alert('Error creating job. Check console for details.');
                }
              }}
              disabled={!newJobData.title || !newJobData.customer_name || !newJobData.service_type_name}
            >
              Create Job
            </Button>
          ) : selectedJob ? (
            <Button variant="contained" color="primary">
              Edit Job
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulingCalendar;