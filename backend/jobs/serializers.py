from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ServiceType, Technician, Job, JobStatusHistory, JobPhoto, JobTimeEntry, EmergencyCall


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class ServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceType
        fields = '__all__'


class TechnicianSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    specialties = ServiceTypeSerializer(many=True, read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Technician
        fields = '__all__'


class TechnicianListSerializer(serializers.ModelSerializer):
    """Simplified technician serializer for lists"""
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Technician
        fields = ['id', 'employee_id', 'full_name', 'skill_level', 'is_available', 'emergency_availability']


class JobPhotoSerializer(serializers.ModelSerializer):
    taken_by_name = serializers.CharField(source='taken_by.get_full_name', read_only=True)
    
    class Meta:
        model = JobPhoto
        fields = '__all__'


class JobTimeEntrySerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = JobTimeEntry
        fields = '__all__'


class JobStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = JobStatusHistory
        fields = '__all__'


class JobSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    property_address = serializers.CharField(source='property.get_full_address', read_only=True)
    assigned_technician_name = serializers.CharField(source='assigned_technician.user.get_full_name', read_only=True)
    service_type_name = serializers.CharField(source='service_type.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Nested related data
    photos = JobPhotoSerializer(many=True, read_only=True)
    time_entries = JobTimeEntrySerializer(many=True, read_only=True)
    status_history = JobStatusHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Job
        fields = '__all__'


class JobListSerializer(serializers.ModelSerializer):
    """Simplified job serializer for lists"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    assigned_technician_name = serializers.CharField(source='assigned_technician.user.get_full_name', read_only=True)
    service_type_name = serializers.CharField(source='service_type.name', read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'title', 'status', 'priority', 
            'scheduled_date', 'scheduled_start_time', 'customer_name',
            'assigned_technician_name', 'service_type_name', 'estimated_cost',
            'created_at'
        ]


class JobCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating jobs"""
    
    class Meta:
        model = Job
        exclude = ['job_number', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Auto-generate job number
        import datetime
        validated_data['job_number'] = f"AJ{datetime.datetime.now().strftime('%Y%m%d')}-{Job.objects.count() + 1:04d}"
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class EmergencyCallSerializer(serializers.ModelSerializer):
    dispatched_technician_name = serializers.CharField(source='dispatched_technician.user.get_full_name', read_only=True)
    related_job_number = serializers.CharField(source='related_job.job_number', read_only=True)
    
    class Meta:
        model = EmergencyCall
        fields = '__all__'


class TechnicianScheduleSerializer(serializers.ModelSerializer):
    """Technician schedule with assigned jobs"""
    assigned_jobs = JobListSerializer(many=True, read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Technician
        fields = [
            'id', 'employee_id', 'full_name', 'skill_level', 'is_available',
            'work_start_time', 'work_end_time', 'current_location_lat',
            'current_location_lng', 'assigned_jobs'
        ]


class JobSchedulingSerializer(serializers.ModelSerializer):
    """Simplified serializer for scheduling operations"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    property_address = serializers.CharField(source='property.get_full_address', read_only=True)
    estimated_duration = serializers.DecimalField(source='service_type.estimated_duration_hours', max_digits=4, decimal_places=2, read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'title', 'status', 'priority', 'customer_name',
            'property_address', 'scheduled_date', 'scheduled_start_time', 
            'scheduled_end_time', 'assigned_technician', 'estimated_duration',
            'ai_complexity_score', 'ai_suggested_duration'
        ]