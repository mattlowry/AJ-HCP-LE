from django.db import models
from django.contrib.auth.models import User
from customers.models import Customer, Property
from jobs.models import Job, Technician, ServiceType
from datetime import datetime, date
from decimal import Decimal


class Dashboard(models.Model):
    """Store dashboard configurations for different users/roles"""
    name = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='dashboards')
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    layout_config = models.JSONField(default=dict, help_text="Dashboard layout configuration")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.user.username if self.user else 'Global'}"

    class Meta:
        ordering = ['name']


class Metric(models.Model):
    """Define custom metrics for tracking KPIs"""
    METRIC_TYPE_CHOICES = [
        ('count', 'Count'),
        ('sum', 'Sum'),
        ('average', 'Average'),
        ('percentage', 'Percentage'),
        ('ratio', 'Ratio'),
        ('custom', 'Custom Query'),
    ]

    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES, default='count')
    calculation_period = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly')
    
    # Query configuration
    model_name = models.CharField(max_length=50, help_text="Model to query (e.g., 'Job', 'Invoice')")
    field_name = models.CharField(max_length=50, blank=True, help_text="Field to aggregate")
    filter_config = models.JSONField(default=dict, help_text="Filters to apply")
    custom_query = models.TextField(blank=True, help_text="Custom SQL query if metric_type is custom")
    
    # Display settings
    display_format = models.CharField(max_length=20, default='number', 
                                    help_text="How to display the metric (number, currency, percentage)")
    target_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True,
                                     help_text="Target value for this metric")
    
    # Settings
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_metrics')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class MetricValue(models.Model):
    """Store calculated metric values over time"""
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='values')
    period_start = models.DateField()
    period_end = models.DateField()
    value = models.DecimalField(max_digits=15, decimal_places=2)
    calculated_at = models.DateTimeField(auto_now_add=True)
    
    # Optional context data
    context_data = models.JSONField(default=dict, blank=True, 
                                  help_text="Additional context about the calculation")

    def __str__(self):
        return f"{self.metric.name}: {self.value} ({self.period_start} to {self.period_end})"

    class Meta:
        ordering = ['-period_start']
        unique_together = ['metric', 'period_start', 'period_end']


class Report(models.Model):
    """Define custom reports"""
    REPORT_TYPE_CHOICES = [
        ('financial', 'Financial Report'),
        ('operational', 'Operational Report'),
        ('customer', 'Customer Report'),
        ('inventory', 'Inventory Report'),
        ('technician', 'Technician Performance'),
        ('custom', 'Custom Report'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    
    # Report configuration
    metrics = models.ManyToManyField(Metric, blank=True, related_name='reports')
    parameters = models.JSONField(default=dict, help_text="Report parameters and filters")
    template = models.TextField(blank=True, help_text="Report template/format")
    
    # Scheduling
    is_scheduled = models.BooleanField(default=False)
    schedule_frequency = models.CharField(max_length=20, blank=True, 
                                        choices=Metric.PERIOD_CHOICES)
    last_generated = models.DateTimeField(null=True, blank=True)
    next_generation = models.DateTimeField(null=True, blank=True)
    
    # Recipients
    email_recipients = models.JSONField(default=list, blank=True,
                                      help_text="Email addresses to send scheduled reports")
    
    # Settings
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class ReportExecution(models.Model):
    """Track report generation history"""
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='executions')
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ], default='running')
    
    # Results
    result_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    file_path = models.CharField(max_length=500, blank=True, help_text="Path to generated report file")
    
    # Context
    parameters_used = models.JSONField(default=dict, blank=True)
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.report.name} - {self.started_at}"

    class Meta:
        ordering = ['-started_at']


class DataExport(models.Model):
    """Track data export requests"""
    EXPORT_TYPE_CHOICES = [
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('pdf', 'PDF'),
        ('json', 'JSON'),
    ]

    name = models.CharField(max_length=100)
    export_type = models.CharField(max_length=20, choices=EXPORT_TYPE_CHOICES, default='csv')
    
    # Export configuration
    model_name = models.CharField(max_length=50)
    fields = models.JSONField(default=list, help_text="Fields to include in export")
    filters = models.JSONField(default=dict, help_text="Filters to apply")
    date_range = models.JSONField(default=dict, help_text="Date range filters")
    
    # Execution details
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Results
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    
    record_count = models.PositiveIntegerField(null=True, blank=True)
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True, help_text="File size in bytes")
    download_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Error handling
    error_message = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.export_type}) - {self.status}"

    class Meta:
        ordering = ['-requested_at']


class UserActivityLog(models.Model):
    """Track user activity for analytics"""
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('view', 'View'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('export', 'Export'),
        ('report', 'Generate Report'),
        ('search', 'Search'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=50, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    description = models.CharField(max_length=200, blank=True)
    
    # Session and request info
    session_key = models.CharField(max_length=40, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True, 
                                            help_text="Duration in milliseconds")
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.action} ({self.timestamp})"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['model_name', 'timestamp']),
        ]
