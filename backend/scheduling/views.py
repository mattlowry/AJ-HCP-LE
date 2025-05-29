from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from datetime import datetime, date, timedelta
from django.utils import timezone

from .models import (
    Calendar, TechnicianAvailability, Appointment, ScheduleTemplate,
    ScheduleConflict, ScheduleOptimization
)
from .serializers import (
    CalendarSerializer, TechnicianAvailabilitySerializer, TechnicianAvailabilityCreateSerializer,
    AppointmentSerializer, AppointmentCreateUpdateSerializer, ScheduleTemplateSerializer,
    ScheduleConflictSerializer, ScheduleOptimizationSerializer,
    TechnicianScheduleOverviewSerializer, DailyScheduleSerializer
)
from jobs.models import Technician, Job


class CalendarViewSet(viewsets.ModelViewSet):
    queryset = Calendar.objects.all()
    serializer_class = CalendarSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class TechnicianAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = TechnicianAvailability.objects.select_related('technician__user', 'created_by')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['technician', 'date', 'availability_type']
    ordering_fields = ['date', 'start_time']
    ordering = ['date', 'start_time']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TechnicianAvailabilityCreateSerializer
        return TechnicianAvailabilitySerializer

    @action(detail=False, methods=['get'])
    def by_technician(self, request):
        """Get availability by technician for a date range"""
        technician_id = request.query_params.get('technician_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not technician_id:
            return Response({'error': 'technician_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.queryset.filter(technician_id=technician_id)

        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=date_from)
            except ValueError:
                return Response({'error': 'Invalid date_from format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)

        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=date_to)
            except ValueError:
                return Response({'error': 'Invalid date_to format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def conflicts(self, request):
        """Get availability that conflicts with scheduled jobs"""
        conflicts = []
        availabilities = self.queryset.filter(availability_type__in=['busy', 'off', 'vacation', 'sick'])
        
        for availability in availabilities:
            # Check for job conflicts
            conflicting_jobs = Job.objects.filter(
                assigned_technician=availability.technician,
                scheduled_date=availability.date,
                scheduled_start_time__lt=availability.end_time,
                scheduled_end_time__gt=availability.start_time
            )
            
            if conflicting_jobs.exists():
                conflicts.append({
                    'availability': TechnicianAvailabilitySerializer(availability).data,
                    'conflicting_jobs': [job.job_number for job in conflicting_jobs]
                })
        
        return Response(conflicts)


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related(
        'technician__user', 'customer', 'customer_property', 'created_by'
    )
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['technician', 'scheduled_date', 'appointment_type', 'status']
    search_fields = ['title', 'description', 'location_address']
    ordering_fields = ['scheduled_date', 'scheduled_start_time', 'created_at']
    ordering = ['scheduled_date', 'scheduled_start_time']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AppointmentCreateUpdateSerializer
        return AppointmentSerializer

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's appointments"""
        today_appointments = self.queryset.filter(scheduled_date=date.today())
        serializer = self.get_serializer(today_appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments (next 7 days)"""
        end_date = date.today() + timedelta(days=7)
        upcoming_appointments = self.queryset.filter(
            scheduled_date__gte=date.today(),
            scheduled_date__lte=end_date,
            status__in=['scheduled', 'confirmed']
        )
        serializer = self.get_serializer(upcoming_appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_technician(self, request):
        """Get appointments by technician for a date range"""
        technician_id = request.query_params.get('technician_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not technician_id:
            return Response({'error': 'technician_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.queryset.filter(technician_id=technician_id)

        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(scheduled_date__gte=date_from)
            except ValueError:
                return Response({'error': 'Invalid date_from format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)

        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(scheduled_date__lte=date_to)
            except ValueError:
                return Response({'error': 'Invalid date_to format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    queryset = ScheduleTemplate.objects.select_related('technician__user')
    serializer_class = ScheduleTemplateSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['technician', 'is_default']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['technician', 'name']

    @action(detail=False, methods=['get'])
    def by_technician(self, request):
        """Get templates for a specific technician"""
        technician_id = request.query_params.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'technician_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        templates = self.queryset.filter(technician_id=technician_id)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def apply_to_date_range(self, request, pk=None):
        """Apply schedule template to a date range"""
        template = self.get_object()
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response({'error': 'start_date and end_date are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if end_date <= start_date:
            return Response({'error': 'end_date must be after start_date'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Apply template to each date in range
        current_date = start_date
        created_availability = []
        
        while current_date <= end_date:
            start_time, end_time = template.get_schedule_for_date(current_date)
            
            if start_time and end_time:
                # Check if availability already exists
                existing = TechnicianAvailability.objects.filter(
                    technician=template.technician,
                    date=current_date,
                    start_time=start_time
                ).first()
                
                if not existing:
                    availability = TechnicianAvailability.objects.create(
                        technician=template.technician,
                        date=current_date,
                        start_time=start_time,
                        end_time=end_time,
                        availability_type='available',
                        notes=f'Applied from template: {template.name}',
                        created_by=request.user if request.user.is_authenticated else None
                    )
                    created_availability.append(availability)
            
            current_date += timedelta(days=1)
        
        return Response({
            'message': f'Applied template to {len(created_availability)} dates',
            'created_availability': len(created_availability)
        })


class ScheduleConflictViewSet(viewsets.ModelViewSet):
    queryset = ScheduleConflict.objects.select_related(
        'job', 'technician__user', 'appointment', 'resolved_by'
    )
    serializer_class = ScheduleConflictSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['conflict_type', 'resolution_status', 'technician', 'conflict_date']
    ordering_fields = ['detected_at', 'conflict_date']
    ordering = ['-detected_at']

    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get unresolved conflicts"""
        unresolved = self.queryset.filter(resolution_status='unresolved')
        serializer = self.get_serializer(unresolved, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_technician(self, request):
        """Get conflicts for a specific technician"""
        technician_id = request.query_params.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'technician_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        conflicts = self.queryset.filter(technician_id=technician_id)
        serializer = self.get_serializer(conflicts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark conflict as resolved"""
        conflict = self.get_object()
        notes = request.data.get('notes', '')
        
        conflict.mark_resolved(
            user=request.user if request.user.is_authenticated else None,
            notes=notes
        )
        
        serializer = self.get_serializer(conflict)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def detect_conflicts(self, request):
        """Detect scheduling conflicts for a date range"""
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date:
            start_date = date.today()
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        if not end_date:
            end_date = start_date + timedelta(days=7)
        else:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        # Detect conflicts and create conflict records
        conflicts_created = 0
        
        # Get all jobs in date range
        jobs = Job.objects.filter(
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date,
            assigned_technician__isnull=False
        )
        
        for job in jobs:
            # Check for overlapping jobs
            overlapping_jobs = Job.objects.filter(
                assigned_technician=job.assigned_technician,
                scheduled_date=job.scheduled_date,
                scheduled_start_time__lt=job.scheduled_end_time,
                scheduled_end_time__gt=job.scheduled_start_time
            ).exclude(pk=job.pk)
            
            for overlapping_job in overlapping_jobs:
                # Check if conflict already exists
                existing_conflict = ScheduleConflict.objects.filter(
                    job=job,
                    technician=job.assigned_technician,
                    conflict_type='job_overlap',
                    conflict_date=job.scheduled_date
                ).first()
                
                if not existing_conflict:
                    ScheduleConflict.objects.create(
                        conflict_type='job_overlap',
                        description=f'Job {job.job_number} overlaps with job {overlapping_job.job_number}',
                        job=job,
                        technician=job.assigned_technician,
                        conflict_date=job.scheduled_date,
                        conflict_start_time=job.scheduled_start_time,
                        conflict_end_time=job.scheduled_end_time
                    )
                    conflicts_created += 1
        
        return Response({
            'message': f'Conflict detection completed',
            'conflicts_created': conflicts_created,
            'date_range': f'{start_date} to {end_date}'
        })


class ScheduleOptimizationViewSet(viewsets.ModelViewSet):
    queryset = ScheduleOptimization.objects.select_related('technician__user', 'created_by')
    serializer_class = ScheduleOptimizationSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['technician', 'target_date', 'optimization_type']
    ordering_fields = ['optimization_date', 'target_date', 'optimization_score']
    ordering = ['-optimization_date']

    @action(detail=False, methods=['get'])
    def daily_overview(self, request):
        """Get daily schedule overview for all technicians"""
        target_date = request.query_params.get('date')
        
        if target_date:
            try:
                target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()
        
        # Get all technicians with jobs or appointments on target date
        technicians = Technician.objects.filter(
            Q(assigned_jobs__scheduled_date=target_date) |
            Q(appointments__scheduled_date=target_date)
        ).distinct()
        
        technician_schedules = []
        total_jobs = 0
        
        for technician in technicians:
            # Get jobs for the date
            jobs = Job.objects.filter(
                assigned_technician=technician,
                scheduled_date=target_date
            )
            
            # Get appointments for the date
            appointments = Appointment.objects.filter(
                technician=technician,
                scheduled_date=target_date
            )
            
            # Calculate metrics
            job_count = jobs.count()
            appointment_count = appointments.count()
            total_jobs += job_count
            
            # Calculate work hours (simplified)
            total_work_hours = 0
            for job in jobs:
                if job.scheduled_start_time and job.scheduled_end_time:
                    start_dt = datetime.combine(target_date, job.scheduled_start_time)
                    end_dt = datetime.combine(target_date, job.scheduled_end_time)
                    duration = end_dt - start_dt
                    total_work_hours += duration.total_seconds() / 3600
            
            for appointment in appointments:
                duration = appointment.duration
                total_work_hours += duration.total_seconds() / 3600
            
            # Get conflicts
            conflicts = ScheduleConflict.objects.filter(
                technician=technician,
                conflict_date=target_date,
                resolution_status='unresolved'
            ).count()
            
            technician_schedules.append({
                'technician': {
                    'id': technician.id,
                    'full_name': technician.user.get_full_name(),
                    'employee_id': technician.employee_id
                },
                'date': target_date,
                'total_jobs': job_count,
                'total_appointments': appointment_count,
                'total_work_hours': round(total_work_hours, 2),
                'total_travel_time': 0,  # TODO: Calculate from route optimization
                'total_travel_distance': 0,  # TODO: Calculate from route optimization
                'utilization_percentage': round((total_work_hours / 8) * 100, 2) if total_work_hours > 0 else 0,
                'conflicts_count': conflicts
            })
        
        # Calculate summary metrics
        avg_utilization = 0
        if technician_schedules:
            avg_utilization = sum(t['utilization_percentage'] for t in technician_schedules) / len(technician_schedules)
        
        unresolved_conflicts = ScheduleConflict.objects.filter(
            conflict_date=target_date,
            resolution_status='unresolved'
        ).count()
        
        response_data = {
            'date': target_date,
            'technicians': technician_schedules,
            'total_jobs': total_jobs,
            'total_technicians': len(technician_schedules),
            'average_utilization': round(avg_utilization, 2),
            'unresolved_conflicts': unresolved_conflicts
        }
        
        serializer = DailyScheduleSerializer(response_data)
        return Response(serializer.data)