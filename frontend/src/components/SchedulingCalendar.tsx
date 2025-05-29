import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon
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
  priority: 'low' | 'normal' | 'high' | 'emergency';
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
  const [unscheduledJobs, setUnscheduledJobs] = useState<Job[]>([]);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [newJobData, setNewJobData] = useState({
    title: '',
    customer_name: '',
    service_type_name: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'emergency',
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
      const response = await fetch('http://localhost:8000/jobs/api/technicians/available/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchJobsCallback = React.useCallback(async () => {
    try {
      // Fetch scheduled jobs for the selected date
      const scheduledResponse = await fetch(
        `http://localhost:8000/jobs/api/jobs/scheduling/?date_from=${selectedDate}&date_to=${selectedDate}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (scheduledResponse.ok) {
        const scheduledData = await scheduledResponse.json();
        setJobs(scheduledData);
      }

      // Fetch unscheduled jobs
      const unscheduledResponse = await fetch('http://localhost:8000/jobs/api/jobs/unscheduled/', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (unscheduledResponse.ok) {
        const unscheduledData = await unscheduledResponse.json();
        setUnscheduledJobs(unscheduledData);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }, [selectedDate]);

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
      
      try {
        await fetch(`http://localhost:8000/jobs/api/jobs/${active.id}/assign_technician/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            technician_id: technicianId,
            scheduled_date: selectedDate,
            scheduled_start_time: timeSlot,
          }),
        });
        
        fetchJobsCallback(); // Refresh data
      } catch (error) {
        console.error('Error assigning job:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return '#f44336';
      case 'high': return '#ff9800';
      case 'normal': return '#2196f3';
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

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        📅 Job Scheduling Calendar
      </Typography>
      
      {/* Date Selector */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          type="date"
          label="Schedule Date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
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
              priority: 'normal',
              estimated_duration: 2,
              description: ''
            });
            setOpenJobDialog(true);
          }}
        >
          Create Job
        </Button>
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
                    <MenuItem value="normal">Normal</MenuItem>
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
                  const response = await fetch('http://localhost:8000/jobs/api/jobs/', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      job_number: `JOB-${Date.now()}`,
                      title: newJobData.title,
                      description: newJobData.description,
                      customer: 1, // Default to first customer for demo
                      property: 1, // Default to first property for demo
                      service_type: 1, // Default to first service type for demo
                      priority: newJobData.priority,
                      status: 'pending'
                    }),
                  });
                  
                  if (response.ok) {
                    alert('Job created successfully!');
                    fetchJobsCallback(); // Refresh the job list
                  } else {
                    alert('Error creating job. Using demo mode.');
                    console.log('Demo job created:', newJobData);
                  }
                  
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