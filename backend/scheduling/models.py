from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from jobs.models import Technician, Job
from customers.models import Customer, Property
from datetime import datetime, date, time, timedelta


class Calendar(models.Model):
    """Base calendar configuration for the system"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    default_start_time = models.TimeField(default=time(8, 0))
    default_end_time = models.TimeField(default=time(17, 0))
    default_duration = models.DurationField(default=timedelta(hours=1))
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class TechnicianAvailability(models.Model):
    """Technician availability for specific dates/times"""
    AVAILABILITY_TYPE_CHOICES = [
        ('available', 'Available'),
        ('busy', 'Busy'),
        ('off', 'Off Duty'),
        ('vacation', 'Vacation'),
        ('sick', 'Sick Leave'),
        ('training', 'Training'),
    ]

    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='availability')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    availability_type = models.CharField(max_length=20, choices=AVAILABILITY_TYPE_CHOICES, default='available')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['technician', 'date', 'start_time']
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.technician.user.get_full_name()} - {self.date} {self.start_time}-{self.end_time}"

    @property
    def duration(self):
        """Calculate duration of availability slot"""
        start_datetime = datetime.combine(self.date, self.start_time)
        end_datetime = datetime.combine(self.date, self.end_time)
        return end_datetime - start_datetime

    def conflicts_with_job(self, job):
        """Check if this availability conflicts with a job"""
        if not job.scheduled_date or not job.scheduled_start_time or not job.scheduled_end_time:
            return False
        
        if job.scheduled_date != self.date:
            return False
            
        job_start = job.scheduled_start_time
        job_end = job.scheduled_end_time
        
        return not (job_end <= self.start_time or job_start >= self.end_time)


class Appointment(models.Model):
    """Scheduled appointments for non-job activities"""
    APPOINTMENT_TYPE_CHOICES = [
        ('meeting', 'Meeting'),
        ('training', 'Training'),
        ('maintenance', 'Equipment Maintenance'),
        ('personal', 'Personal Time'),
        ('travel', 'Travel Time'),
        ('break', 'Break'),
        ('lunch', 'Lunch'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    appointment_type = models.CharField(max_length=20, choices=APPOINTMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    # Scheduling details
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='appointments')
    scheduled_date = models.DateField()
    scheduled_start_time = models.TimeField()
    scheduled_end_time = models.TimeField()
    
    # Optional location (if not at office)
    location_address = models.CharField(max_length=500, blank=True)
    location_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Related entities
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True, blank=True, related_name='appointments')
    customer_property = models.ForeignKey(Property, on_delete=models.CASCADE, null=True, blank=True, related_name='appointments')
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.technician.user.get_full_name()} ({self.scheduled_date})"

    class Meta:
        ordering = ['scheduled_date', 'scheduled_start_time']

    @property
    def duration(self):
        """Calculate appointment duration"""
        start_datetime = datetime.combine(self.scheduled_date, self.scheduled_start_time)
        end_datetime = datetime.combine(self.scheduled_date, self.scheduled_end_time)
        return end_datetime - start_datetime

    def conflicts_with_job(self, job):
        """Check if this appointment conflicts with a job"""
        if not job.scheduled_date or not job.scheduled_start_time or not job.scheduled_end_time:
            return False
        
        if job.scheduled_date != self.scheduled_date:
            return False
            
        job_start = job.scheduled_start_time
        job_end = job.scheduled_end_time
        
        return not (job_end <= self.scheduled_start_time or job_start >= self.scheduled_end_time)


class ScheduleTemplate(models.Model):
    """Reusable schedule templates for technicians"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='schedule_templates')
    
    # Weekly schedule
    monday_start = models.TimeField(null=True, blank=True)
    monday_end = models.TimeField(null=True, blank=True)
    tuesday_start = models.TimeField(null=True, blank=True)
    tuesday_end = models.TimeField(null=True, blank=True)
    wednesday_start = models.TimeField(null=True, blank=True)
    wednesday_end = models.TimeField(null=True, blank=True)
    thursday_start = models.TimeField(null=True, blank=True)
    thursday_end = models.TimeField(null=True, blank=True)
    friday_start = models.TimeField(null=True, blank=True)
    friday_end = models.TimeField(null=True, blank=True)
    saturday_start = models.TimeField(null=True, blank=True)
    saturday_end = models.TimeField(null=True, blank=True)
    sunday_start = models.TimeField(null=True, blank=True)
    sunday_end = models.TimeField(null=True, blank=True)
    
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.technician.user.get_full_name()}"

    class Meta:
        ordering = ['technician', 'name']

    def get_schedule_for_date(self, target_date):
        """Get start/end times for a specific date"""
        weekday = target_date.weekday()  # 0=Monday, 6=Sunday
        
        schedule_map = {
            0: (self.monday_start, self.monday_end),
            1: (self.tuesday_start, self.tuesday_end),
            2: (self.wednesday_start, self.wednesday_end),
            3: (self.thursday_start, self.thursday_end),
            4: (self.friday_start, self.friday_end),
            5: (self.saturday_start, self.saturday_end),
            6: (self.sunday_start, self.sunday_end),
        }
        
        return schedule_map.get(weekday, (None, None))


class ScheduleConflict(models.Model):
    """Track and manage scheduling conflicts"""
    CONFLICT_TYPE_CHOICES = [
        ('job_overlap', 'Job Time Overlap'),
        ('availability', 'Technician Unavailable'),
        ('travel_time', 'Insufficient Travel Time'),
        ('skill_mismatch', 'Skill Requirements Not Met'),
        ('equipment', 'Equipment Conflict'),
        ('customer_preference', 'Customer Time Preference'),
    ]

    RESOLUTION_STATUS_CHOICES = [
        ('unresolved', 'Unresolved'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
        ('escalated', 'Escalated'),
    ]

    conflict_type = models.CharField(max_length=30, choices=CONFLICT_TYPE_CHOICES)
    description = models.TextField()
    resolution_status = models.CharField(max_length=20, choices=RESOLUTION_STATUS_CHOICES, default='unresolved')
    resolution_notes = models.TextField(blank=True)
    
    # Related entities
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='schedule_conflicts')
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='schedule_conflicts')
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, null=True, blank=True, related_name='conflicts')
    
    # Conflict details
    conflict_date = models.DateField()
    conflict_start_time = models.TimeField()
    conflict_end_time = models.TimeField()
    
    # Resolution tracking
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.get_conflict_type_display()} - {self.job.job_number}"

    class Meta:
        ordering = ['-detected_at']

    def mark_resolved(self, user, notes=""):
        """Mark conflict as resolved"""
        self.resolution_status = 'resolved'
        self.resolved_at = datetime.now()
        self.resolved_by = user
        if notes:
            self.resolution_notes = notes
        self.save()


class ScheduleOptimization(models.Model):
    """Track schedule optimization runs and results"""
    optimization_date = models.DateTimeField(auto_now_add=True)
    target_date = models.DateField()
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='optimizations')
    
    # Optimization parameters
    optimization_type = models.CharField(max_length=50, choices=[
        ('route', 'Route Optimization'),
        ('time', 'Time Optimization'),
        ('skill', 'Skill-based Optimization'),
        ('priority', 'Priority-based Optimization'),
    ])
    
    # Results
    jobs_optimized = models.PositiveIntegerField(default=0)
    total_travel_time_minutes = models.PositiveIntegerField(default=0)
    total_travel_distance_miles = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    optimization_score = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                           validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    # Metadata
    optimization_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Optimization {self.optimization_date} - {self.technician.user.get_full_name()}"

    class Meta:
        ordering = ['-optimization_date']