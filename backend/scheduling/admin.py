from django.contrib import admin
from .models import (
    Calendar, TechnicianAvailability, Appointment, ScheduleTemplate,
    ScheduleConflict, ScheduleOptimization
)


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ['name', 'default_start_time', 'default_end_time', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(TechnicianAvailability)
class TechnicianAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['technician', 'date', 'start_time', 'end_time', 'availability_type', 'created_at']
    list_filter = ['availability_type', 'date', 'technician']
    search_fields = ['technician__user__first_name', 'technician__user__last_name', 'notes']
    date_hierarchy = 'date'
    ordering = ['-date', 'start_time']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('technician__user')


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'technician', 'appointment_type', 'status', 'scheduled_date', 
        'scheduled_start_time', 'customer', 'created_at'
    ]
    list_filter = ['appointment_type', 'status', 'scheduled_date', 'technician']
    search_fields = [
        'title', 'description', 'location_address',
        'technician__user__first_name', 'technician__user__last_name',
        'customer__first_name', 'customer__last_name'
    ]
    date_hierarchy = 'scheduled_date'
    ordering = ['-scheduled_date', 'scheduled_start_time']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'appointment_type', 'status')
        }),
        ('Scheduling', {
            'fields': ('technician', 'scheduled_date', 'scheduled_start_time', 'scheduled_end_time')
        }),
        ('Location', {
            'fields': ('location_address', 'location_latitude', 'location_longitude'),
            'classes': ('collapse',)
        }),
        ('Related', {
            'fields': ('customer', 'customer_property'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('technician__user', 'customer', 'customer_property')


@admin.register(ScheduleTemplate)
class ScheduleTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'technician', 'is_default', 'created_at']
    list_filter = ['is_default', 'technician']
    search_fields = ['name', 'description', 'technician__user__first_name', 'technician__user__last_name']
    ordering = ['technician', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'technician', 'is_default')
        }),
        ('Monday', {
            'fields': ('monday_start', 'monday_end'),
            'classes': ('collapse',)
        }),
        ('Tuesday', {
            'fields': ('tuesday_start', 'tuesday_end'),
            'classes': ('collapse',)
        }),
        ('Wednesday', {
            'fields': ('wednesday_start', 'wednesday_end'),
            'classes': ('collapse',)
        }),
        ('Thursday', {
            'fields': ('thursday_start', 'thursday_end'),
            'classes': ('collapse',)
        }),
        ('Friday', {
            'fields': ('friday_start', 'friday_end'),
            'classes': ('collapse',)
        }),
        ('Saturday', {
            'fields': ('saturday_start', 'saturday_end'),
            'classes': ('collapse',)
        }),
        ('Sunday', {
            'fields': ('sunday_start', 'sunday_end'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('technician__user')


@admin.register(ScheduleConflict)
class ScheduleConflictAdmin(admin.ModelAdmin):
    list_display = [
        'conflict_type', 'job', 'technician', 'conflict_date', 
        'resolution_status', 'detected_at', 'resolved_at'
    ]
    list_filter = ['conflict_type', 'resolution_status', 'conflict_date', 'technician']
    search_fields = [
        'description', 'resolution_notes',
        'job__job_number', 'job__title',
        'technician__user__first_name', 'technician__user__last_name'
    ]
    date_hierarchy = 'conflict_date'
    ordering = ['-detected_at']
    readonly_fields = ['detected_at']
    
    fieldsets = (
        ('Conflict Information', {
            'fields': ('conflict_type', 'description', 'job', 'technician', 'appointment')
        }),
        ('Timing', {
            'fields': ('conflict_date', 'conflict_start_time', 'conflict_end_time')
        }),
        ('Resolution', {
            'fields': ('resolution_status', 'resolution_notes', 'resolved_by', 'resolved_at')
        }),
        ('Metadata', {
            'fields': ('detected_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'job', 'technician__user', 'appointment', 'resolved_by'
        )
    
    actions = ['mark_resolved', 'mark_ignored']
    
    def mark_resolved(self, request, queryset):
        updated = queryset.update(resolution_status='resolved', resolved_by=request.user)
        self.message_user(request, f'{updated} conflicts marked as resolved.')
    mark_resolved.short_description = "Mark selected conflicts as resolved"
    
    def mark_ignored(self, request, queryset):
        updated = queryset.update(resolution_status='ignored', resolved_by=request.user)
        self.message_user(request, f'{updated} conflicts marked as ignored.')
    mark_ignored.short_description = "Mark selected conflicts as ignored"


@admin.register(ScheduleOptimization)
class ScheduleOptimizationAdmin(admin.ModelAdmin):
    list_display = [
        'technician', 'target_date', 'optimization_type', 'jobs_optimized',
        'optimization_score', 'total_travel_time_minutes', 'optimization_date'
    ]
    list_filter = ['optimization_type', 'target_date', 'technician']
    search_fields = [
        'technician__user__first_name', 'technician__user__last_name',
        'optimization_notes'
    ]
    date_hierarchy = 'target_date'
    ordering = ['-optimization_date']
    readonly_fields = ['optimization_date']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('technician', 'target_date', 'optimization_type', 'optimization_date')
        }),
        ('Results', {
            'fields': (
                'jobs_optimized', 'total_travel_time_minutes', 'total_travel_distance_miles',
                'optimization_score'
            )
        }),
        ('Notes', {
            'fields': ('optimization_notes',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('technician__user', 'created_by')