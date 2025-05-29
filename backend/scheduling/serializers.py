from rest_framework import serializers
from .models import (
    Calendar, TechnicianAvailability, Appointment, ScheduleTemplate,
    ScheduleConflict, ScheduleOptimization
)
from jobs.serializers import TechnicianListSerializer
from customers.serializers import CustomerListSerializer, PropertySerializer


class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendar
        fields = '__all__'


class TechnicianAvailabilitySerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    duration_hours = serializers.SerializerMethodField()

    class Meta:
        model = TechnicianAvailability
        fields = [
            'id', 'technician', 'technician_name', 'date', 'start_time', 'end_time',
            'availability_type', 'notes', 'duration_hours', 'created_at', 'updated_at'
        ]

    def get_duration_hours(self, obj):
        """Get duration in hours as a decimal"""
        duration = obj.duration
        return round(duration.total_seconds() / 3600, 2)


class TechnicianAvailabilityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicianAvailability
        fields = [
            'technician', 'date', 'start_time', 'end_time',
            'availability_type', 'notes'
        ]

    def validate(self, data):
        """Validate that end_time is after start_time"""
        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError("End time must be after start time")
        return data


class AppointmentSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    duration_hours = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'title', 'description', 'appointment_type', 'status',
            'technician', 'technician_name', 'scheduled_date', 'scheduled_start_time',
            'scheduled_end_time', 'location_address', 'location_latitude',
            'location_longitude', 'customer', 'customer_name', 'customer_property',
            'duration_hours', 'created_at', 'updated_at'
        ]

    def get_duration_hours(self, obj):
        """Get duration in hours as a decimal"""
        duration = obj.duration
        return round(duration.total_seconds() / 3600, 2)


class AppointmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            'title', 'description', 'appointment_type', 'status',
            'technician', 'scheduled_date', 'scheduled_start_time',
            'scheduled_end_time', 'location_address', 'location_latitude',
            'location_longitude', 'customer', 'customer_property'
        ]

    def validate(self, data):
        """Validate appointment scheduling constraints"""
        if data['scheduled_end_time'] <= data['scheduled_start_time']:
            raise serializers.ValidationError("End time must be after start time")
        
        # Check for conflicts with existing appointments or jobs
        technician = data['technician']
        date = data['scheduled_date']
        start_time = data['scheduled_start_time']
        end_time = data['scheduled_end_time']
        
        # Get the instance being updated (if any)
        instance = getattr(self, 'instance', None)
        
        # Check for appointment conflicts
        conflicting_appointments = Appointment.objects.filter(
            technician=technician,
            scheduled_date=date,
            scheduled_start_time__lt=end_time,
            scheduled_end_time__gt=start_time
        )
        
        if instance:
            conflicting_appointments = conflicting_appointments.exclude(pk=instance.pk)
        
        if conflicting_appointments.exists():
            raise serializers.ValidationError("This appointment conflicts with existing appointments")
        
        return data


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)

    class Meta:
        model = ScheduleTemplate
        fields = [
            'id', 'name', 'description', 'technician', 'technician_name',
            'monday_start', 'monday_end', 'tuesday_start', 'tuesday_end',
            'wednesday_start', 'wednesday_end', 'thursday_start', 'thursday_end',
            'friday_start', 'friday_end', 'saturday_start', 'saturday_end',
            'sunday_start', 'sunday_end', 'is_default', 'created_at', 'updated_at'
        ]


class ScheduleConflictSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    appointment_title = serializers.CharField(source='appointment.title', read_only=True)

    class Meta:
        model = ScheduleConflict
        fields = [
            'id', 'conflict_type', 'description', 'resolution_status',
            'resolution_notes', 'job', 'job_title', 'job_number',
            'technician', 'technician_name', 'appointment', 'appointment_title',
            'conflict_date', 'conflict_start_time', 'conflict_end_time',
            'detected_at', 'resolved_at', 'resolved_by'
        ]


class ScheduleOptimizationSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    efficiency_rating = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleOptimization
        fields = [
            'id', 'optimization_date', 'target_date', 'technician',
            'technician_name', 'optimization_type', 'jobs_optimized',
            'total_travel_time_minutes', 'total_travel_distance_miles',
            'optimization_score', 'efficiency_rating', 'optimization_notes'
        ]

    def get_efficiency_rating(self, obj):
        """Convert optimization score to efficiency rating"""
        score = float(obj.optimization_score)
        if score >= 90:
            return 'Excellent'
        elif score >= 80:
            return 'Good'
        elif score >= 70:
            return 'Fair'
        elif score >= 60:
            return 'Poor'
        else:
            return 'Very Poor'


# Specialized serializers for schedule views
class TechnicianScheduleOverviewSerializer(serializers.Serializer):
    """Serializer for technician daily schedule overview"""
    technician = TechnicianListSerializer(read_only=True)
    date = serializers.DateField()
    total_jobs = serializers.IntegerField()
    total_appointments = serializers.IntegerField()
    total_work_hours = serializers.DecimalField(max_digits=4, decimal_places=2)
    total_travel_time = serializers.IntegerField()  # in minutes
    total_travel_distance = serializers.DecimalField(max_digits=8, decimal_places=2)
    utilization_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    conflicts_count = serializers.IntegerField()


class DailyScheduleSerializer(serializers.Serializer):
    """Serializer for complete daily schedule data"""
    date = serializers.DateField()
    technicians = TechnicianScheduleOverviewSerializer(many=True)
    total_jobs = serializers.IntegerField()
    total_technicians = serializers.IntegerField()
    average_utilization = serializers.DecimalField(max_digits=5, decimal_places=2)
    unresolved_conflicts = serializers.IntegerField()