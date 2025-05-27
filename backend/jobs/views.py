from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg
from datetime import datetime, date, timedelta
from .models import ServiceType, Technician, Job, JobStatusHistory, JobPhoto, JobTimeEntry, EmergencyCall
from .utils import RouteOptimizer, SchedulingAssistant
from .serializers import (
    ServiceTypeSerializer, TechnicianSerializer, TechnicianListSerializer,
    JobSerializer, JobListSerializer, JobCreateUpdateSerializer,
    JobPhotoSerializer, JobTimeEntrySerializer, JobStatusHistorySerializer,
    EmergencyCallSerializer, TechnicianScheduleSerializer, JobSchedulingSerializer
)


class ServiceTypeViewSet(viewsets.ModelViewSet):
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['skill_level_required', 'is_emergency_service']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'base_price', 'estimated_duration_hours']
    ordering = ['name']


class TechnicianViewSet(viewsets.ModelViewSet):
    queryset = Technician.objects.select_related('user').prefetch_related('specialties')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['skill_level', 'is_available', 'emergency_availability']
    search_fields = ['user__first_name', 'user__last_name', 'employee_id']
    ordering_fields = ['user__last_name', 'skill_level', 'hourly_rate']
    ordering = ['user__last_name', 'user__first_name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TechnicianListSerializer
        elif self.action == 'schedule':
            return TechnicianScheduleSerializer
        return TechnicianSerializer
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available technicians"""
        available_techs = self.queryset.filter(is_available=True)
        serializer = TechnicianListSerializer(available_techs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def emergency_available(self, request):
        """Get technicians available for emergency calls"""
        emergency_techs = self.queryset.filter(is_available=True, emergency_availability=True)
        serializer = TechnicianListSerializer(emergency_techs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Get technician's schedule with assigned jobs"""
        technician = self.get_object()
        date_param = request.query_params.get('date')
        
        if date_param:
            try:
                target_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()
        
        # Get jobs for the specified date
        jobs = Job.objects.filter(
            assigned_technician=technician,
            scheduled_date=target_date
        ).select_related('customer', 'property', 'service_type')
        
        serializer = self.get_serializer(technician)
        data = serializer.data
        data['assigned_jobs'] = JobListSerializer(jobs, many=True).data
        data['schedule_date'] = target_date
        
        return Response(data)


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related(
        'customer', 'property', 'service_type', 'assigned_technician__user', 'created_by'
    ).prefetch_related('photos', 'time_entries', 'status_history')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'assigned_technician', 'service_type', 'scheduled_date']
    search_fields = ['job_number', 'title', 'customer__first_name', 'customer__last_name']
    ordering_fields = ['created_at', 'scheduled_date', 'priority']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return JobListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return JobCreateUpdateSerializer
        elif self.action == 'scheduling':
            return JobSchedulingSerializer
        return JobSerializer
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending jobs"""
        pending_jobs = self.queryset.filter(status='pending')
        serializer = JobListSerializer(pending_jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def emergency(self, request):
        """Get emergency priority jobs"""
        emergency_jobs = self.queryset.filter(priority='emergency')
        serializer = JobListSerializer(emergency_jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unscheduled(self, request):
        """Get jobs that need scheduling"""
        unscheduled = self.queryset.filter(
            status__in=['pending', 'scheduled'],
            scheduled_date__isnull=True
        )
        serializer = JobListSerializer(unscheduled, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's jobs"""
        today_jobs = self.queryset.filter(scheduled_date=date.today())
        serializer = JobListSerializer(today_jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def scheduling(self, request):
        """Get jobs formatted for scheduling interface"""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        jobs = self.queryset.filter(status__in=['pending', 'scheduled'])
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                jobs = jobs.filter(scheduled_date__gte=date_from)
            except ValueError:
                pass
                
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                jobs = jobs.filter(scheduled_date__lte=date_to)
            except ValueError:
                pass
        
        serializer = JobSchedulingSerializer(jobs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_technician(self, request, pk=None):
        """Assign a technician to a job"""
        job = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'technician_id is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            technician = Technician.objects.get(id=technician_id)
        except Technician.DoesNotExist:
            return Response({'error': 'Technician not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Create status history entry
        if job.assigned_technician != technician:
            JobStatusHistory.objects.create(
                job=job,
                old_status=job.status,
                new_status='scheduled' if job.status == 'pending' else job.status,
                changed_by=request.user,
                notes=f"Assigned to {technician.user.get_full_name()}"
            )
            
            job.assigned_technician = technician
            if job.status == 'pending':
                job.status = 'scheduled'
            job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update job status with history tracking"""
        job = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if not new_status:
            return Response({'error': 'status is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        valid_statuses = [choice[0] for choice in Job.JOB_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status. Must be one of: {valid_statuses}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if job.status != new_status:
            JobStatusHistory.objects.create(
                job=job,
                old_status=job.status,
                new_status=new_status,
                changed_by=request.user,
                notes=notes
            )
            
            old_status = job.status
            job.status = new_status
            
            # Auto-set timestamps
            if new_status == 'in_progress' and not job.actual_start_time:
                job.actual_start_time = datetime.now()
            elif new_status == 'completed' and not job.actual_end_time:
                job.actual_end_time = datetime.now()
            
            job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def suggest_technicians(self, request, pk=None):
        """Get suggested technicians for a job"""
        job = self.get_object()
        suggested_techs = SchedulingAssistant.suggest_technician_for_job(job)
        serializer = TechnicianListSerializer(suggested_techs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def estimate_complexity(self, request, pk=None):
        """Generate AI complexity estimate for a job"""
        job = self.get_object()
        complexity = SchedulingAssistant.estimate_job_complexity(job)
        
        job.ai_complexity_score = complexity
        job.save()
        
        serializer = self.get_serializer(job)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def route_optimization(self, request):
        """Get optimized routes for all technicians"""
        target_date = request.query_params.get('date')
        
        if target_date:
            try:
                target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()
        
        optimizer = RouteOptimizer()
        routes = {}
        
        # Get all technicians with jobs on the target date
        technicians_with_jobs = Technician.objects.filter(
            assigned_jobs__scheduled_date=target_date
        ).distinct()
        
        for technician in technicians_with_jobs:
            optimized_jobs = optimizer.optimize_technician_route(technician, target_date)
            
            if optimized_jobs:
                start_lat = technician.current_location_lat or 39.9526  # Philadelphia default
                start_lng = technician.current_location_lng or -75.1652
                
                metrics = optimizer.calculate_route_metrics(optimized_jobs, start_lat, start_lng)
                
                routes[technician.id] = {
                    'technician': TechnicianListSerializer(technician).data,
                    'optimized_jobs': JobListSerializer(optimized_jobs, many=True).data,
                    'metrics': metrics
                }
        
        return Response(routes)


class EmergencyCallViewSet(viewsets.ModelViewSet):
    queryset = EmergencyCall.objects.select_related('related_job', 'dispatched_technician__user')
    serializer_class = EmergencyCallSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['urgency_level', 'dispatched_technician']
    search_fields = ['caller_name', 'emergency_description', 'location_address']
    ordering_fields = ['created_at', 'urgency_level']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active emergency calls (not resolved)"""
        active_calls = self.queryset.filter(resolved_at__isnull=True)
        serializer = self.get_serializer(active_calls, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def dispatch(self, request, pk=None):
        """Dispatch technician to emergency call"""
        emergency_call = self.get_object()
        technician_id = request.data.get('technician_id')
        estimated_arrival = request.data.get('estimated_arrival')
        
        if not technician_id:
            return Response({'error': 'technician_id is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            technician = Technician.objects.get(id=technician_id)
        except Technician.DoesNotExist:
            return Response({'error': 'Technician not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        emergency_call.dispatched_technician = technician
        if estimated_arrival:
            try:
                emergency_call.estimated_arrival = datetime.fromisoformat(estimated_arrival)
            except ValueError:
                return Response({'error': 'Invalid estimated_arrival format'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        emergency_call.save()
        
        # Optionally create a related job
        if not emergency_call.related_job:
            # This could be expanded to auto-create a job from the emergency call
            pass
        
        serializer = self.get_serializer(emergency_call)
        return Response(serializer.data)


class JobPhotoViewSet(viewsets.ModelViewSet):
    queryset = JobPhoto.objects.select_related('job', 'taken_by')
    serializer_class = JobPhotoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['job', 'photo_type']
    ordering = ['-taken_at']


class JobTimeEntryViewSet(viewsets.ModelViewSet):
    queryset = JobTimeEntry.objects.select_related('job', 'technician__user')
    serializer_class = JobTimeEntrySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['job', 'technician']
    ordering = ['-start_time']
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active time entries (no end time)"""
        active_entries = self.queryset.filter(end_time__isnull=True)
        serializer = self.get_serializer(active_entries, many=True)
        return Response(serializer.data)