from django.db import models
from django.conf import settings
from customers.models import Customer, Property
from phonenumber_field.modelfields import PhoneNumberField
from django.core.validators import MinValueValidator, MaxValueValidator


class ServiceType(models.Model):
    """Service types offered by AJ Long Electric"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    skill_level_required = models.CharField(max_length=20, choices=[
        ('apprentice', 'Apprentice'),
        ('journeyman', 'Journeyman'),
        ('master', 'Master Electrician')
    ])
    is_emergency_service = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Technician(models.Model):
    """Technician profiles and scheduling information"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    employee_id = models.CharField(max_length=20, unique=True)
    phone = PhoneNumberField()
    skill_level = models.CharField(max_length=20, choices=[
        ('apprentice', 'Apprentice'),
        ('journeyman', 'Journeyman'),
        ('master', 'Master Electrician')
    ])
    specialties = models.ManyToManyField(ServiceType, blank=True)
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2)
    is_available = models.BooleanField(default=True)
    current_location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    work_start_time = models.TimeField(default='08:00:00')
    work_end_time = models.TimeField(default='17:00:00')
    emergency_availability = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"

    class Meta:
        ordering = ['user__last_name', 'user__first_name']


class Job(models.Model):
    """Main job/service request model"""
    JOB_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('on_hold', 'On Hold'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('emergency', 'Emergency'),
    ]

    # Basic job information
    job_number = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='jobs')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='jobs')
    service_type = models.ForeignKey(ServiceType, on_delete=models.SET_NULL, null=True)
    
    # Status and priority
    status = models.CharField(max_length=20, choices=JOB_STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    # Scheduling
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)
    assigned_technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_jobs')
    
    # Actual time tracking
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Financial
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Customer communication
    customer_notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    
    # AI-enhanced fields
    ai_complexity_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)], 
        null=True, blank=True,
        help_text="AI-generated complexity score (1-10)"
    )
    ai_suggested_duration = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    ai_generated_notes = models.TextField(blank=True, help_text="AI-generated job analysis and recommendations")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_jobs')

    def __str__(self):
        return f"{self.job_number} - {self.title}"

    class Meta:
        ordering = ['-created_at']


class JobStatusHistory(models.Model):
    """Track job status changes for audit trail"""
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.job.job_number}: {self.old_status} → {self.new_status}"

    class Meta:
        ordering = ['-changed_at']


class JobPhoto(models.Model):
    """Photos associated with jobs (before/after, documentation)"""
    PHOTO_TYPE_CHOICES = [
        ('before', 'Before Work'),
        ('during', 'During Work'),
        ('after', 'After Work'),
        ('issue', 'Issue Documentation'),
        ('equipment', 'Equipment/Parts'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='photos')
    photo = models.ImageField(upload_to='job_photos/%Y/%m/%d/')
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPE_CHOICES)
    caption = models.CharField(max_length=200, blank=True)
    taken_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    taken_at = models.DateTimeField(auto_now_add=True)
    
    # AI-enhanced fields
    ai_description = models.TextField(blank=True, help_text="AI-generated photo description")
    ai_detected_issues = models.TextField(blank=True, help_text="AI-detected electrical issues")

    def __str__(self):
        return f"{self.job.job_number} - {self.photo_type}"

    class Meta:
        ordering = ['-taken_at']


class JobTimeEntry(models.Model):
    """Time tracking for jobs"""
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='time_entries')
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    break_duration_minutes = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    billable_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.job.job_number} - {self.technician.user.get_full_name()}"

    class Meta:
        ordering = ['-start_time']


class EmergencyCall(models.Model):
    """Emergency service calls requiring immediate dispatch"""
    caller_name = models.CharField(max_length=100)
    caller_phone = PhoneNumberField()
    emergency_description = models.TextField()
    location_address = models.TextField()
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    urgency_level = models.CharField(max_length=20, choices=[
        ('critical', 'Critical - Life Safety'),
        ('urgent', 'Urgent - Major Outage'),
        ('high', 'High Priority'),
        ('moderate', 'Moderate'),
    ], default='urgent')
    
    related_job = models.OneToOneField(Job, on_delete=models.SET_NULL, null=True, blank=True)
    dispatched_technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True)
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    actual_arrival = models.DateTimeField(null=True, blank=True)
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Emergency: {self.caller_name} - {self.urgency_level}"

    class Meta:
        ordering = ['-created_at']