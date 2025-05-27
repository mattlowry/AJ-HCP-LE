from django.contrib import admin
from .models import ServiceType, Technician, Job, JobStatusHistory, JobPhoto, JobTimeEntry, EmergencyCall


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'skill_level_required', 'base_price', 'estimated_duration_hours', 'is_emergency_service']
    list_filter = ['skill_level_required', 'is_emergency_service']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = ['user', 'employee_id', 'skill_level', 'hourly_rate', 'is_available', 'emergency_availability']
    list_filter = ['skill_level', 'is_available', 'emergency_availability']
    search_fields = ['user__first_name', 'user__last_name', 'employee_id']
    filter_horizontal = ['specialties']
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'employee_id', 'phone', 'skill_level')
        }),
        ('Skills & Rates', {
            'fields': ('specialties', 'hourly_rate')
        }),
        ('Availability', {
            'fields': ('is_available', 'work_start_time', 'work_end_time', 'emergency_availability')
        }),
        ('Location', {
            'fields': ('current_location_lat', 'current_location_lng'),
            'classes': ('collapse',)
        })
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_number', 'title', 'customer', 'status', 'priority', 'assigned_technician', 'scheduled_date']
    list_filter = ['status', 'priority', 'service_type', 'assigned_technician']
    search_fields = ['job_number', 'title', 'customer__first_name', 'customer__last_name']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    readonly_fields = ['job_number', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Job Information', {
            'fields': ('job_number', 'title', 'description', 'customer', 'property', 'service_type')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority')
        }),
        ('Scheduling', {
            'fields': ('scheduled_date', 'scheduled_start_time', 'scheduled_end_time', 'assigned_technician')
        }),
        ('Time Tracking', {
            'fields': ('actual_start_time', 'actual_end_time'),
            'classes': ('collapse',)
        }),
        ('Financial', {
            'fields': ('estimated_cost', 'final_cost'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('customer_notes', 'internal_notes')
        }),
        ('AI Enhancement', {
            'fields': ('ai_complexity_score', 'ai_suggested_duration', 'ai_generated_notes'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Only set on creation
            import datetime
            obj.job_number = f"AJ{datetime.datetime.now().strftime('%Y%m%d')}-{Job.objects.count() + 1:04d}"
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(JobStatusHistory)
class JobStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['job', 'old_status', 'new_status', 'changed_by', 'changed_at']
    list_filter = ['old_status', 'new_status', 'changed_at']
    search_fields = ['job__job_number', 'job__title']
    readonly_fields = ['changed_at']
    ordering = ['-changed_at']


@admin.register(JobPhoto)
class JobPhotoAdmin(admin.ModelAdmin):
    list_display = ['job', 'photo_type', 'caption', 'taken_by', 'taken_at']
    list_filter = ['photo_type', 'taken_at']
    search_fields = ['job__job_number', 'caption']
    readonly_fields = ['taken_at']
    ordering = ['-taken_at']


@admin.register(JobTimeEntry)
class JobTimeEntryAdmin(admin.ModelAdmin):
    list_display = ['job', 'technician', 'start_time', 'end_time', 'billable_hours']
    list_filter = ['technician', 'start_time']
    search_fields = ['job__job_number', 'technician__user__first_name', 'technician__user__last_name']
    date_hierarchy = 'start_time'
    ordering = ['-start_time']


@admin.register(EmergencyCall)
class EmergencyCallAdmin(admin.ModelAdmin):
    list_display = ['caller_name', 'urgency_level', 'dispatched_technician', 'created_at', 'resolved_at']
    list_filter = ['urgency_level', 'created_at', 'resolved_at']
    search_fields = ['caller_name', 'emergency_description', 'location_address']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Emergency Details', {
            'fields': ('caller_name', 'caller_phone', 'emergency_description', 'urgency_level')
        }),
        ('Location', {
            'fields': ('location_address', 'location_lat', 'location_lng')
        }),
        ('Dispatch', {
            'fields': ('related_job', 'dispatched_technician', 'estimated_arrival', 'actual_arrival')
        }),
        ('Resolution', {
            'fields': ('resolved_at', 'resolution_notes')
        })
    )