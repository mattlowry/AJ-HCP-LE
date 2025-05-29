from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg, Q, F
from datetime import datetime, timedelta, date
from decimal import Decimal

from .models import Dashboard, Metric, MetricValue, Report, ReportExecution, DataExport, UserActivityLog
from .serializers import (
    DashboardSerializer, MetricSerializer, MetricValueSerializer, ReportSerializer,
    ReportExecutionSerializer, DataExportSerializer, UserActivityLogSerializer,
    BusinessOverviewSerializer, FinancialSummarySerializer, OperationalMetricsSerializer,
    CustomerInsightsSerializer, InventoryInsightsSerializer
)

# Import models from other apps for analytics
from customers.models import Customer, Property
from jobs.models import Job, Technician, ServiceType, EmergencyCall
from billing.models import Invoice, Payment
from inventory.models import Item, StockMovement


class DashboardViewSet(viewsets.ModelViewSet):
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'is_default', 'is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class MetricViewSet(viewsets.ModelViewSet):
    queryset = Metric.objects.all()
    serializer_class = MetricSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['metric_type', 'calculation_period', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """Calculate metric value for current period"""
        metric = self.get_object()
        
        today = date.today()
        
        if metric.calculation_period == 'monthly':
            period_start = today.replace(day=1)
            next_month = period_start.replace(month=period_start.month + 1) if period_start.month < 12 else period_start.replace(year=period_start.year + 1, month=1)
            period_end = next_month - timedelta(days=1)
        elif metric.calculation_period == 'weekly':
            period_start = today - timedelta(days=today.weekday())
            period_end = period_start + timedelta(days=6)
        else:  # daily
            period_start = period_end = today
        
        # Calculate value based on metric type and model
        value = self._calculate_metric_value(metric, period_start, period_end)
        
        # Store the calculated value
        metric_value, created = MetricValue.objects.get_or_create(
            metric=metric,
            period_start=period_start,
            period_end=period_end,
            defaults={'value': value}
        )
        
        if not created:
            metric_value.value = value
            metric_value.save()
        
        return Response({
            'metric_id': metric.id,
            'period_start': period_start,
            'period_end': period_end,
            'value': value,
            'created': created
        })
    
    def _calculate_metric_value(self, metric, period_start, period_end):
        """Calculate metric value based on configuration"""
        if metric.model_name.lower() == 'job':
            if metric.metric_type == 'count':
                return Job.objects.filter(created_at__date__range=[period_start, period_end]).count()
            elif metric.metric_type == 'sum' and metric.field_name:
                return Job.objects.filter(created_at__date__range=[period_start, period_end]).aggregate(
                    total=Sum(metric.field_name)
                )['total'] or 0
        
        elif metric.model_name.lower() == 'invoice':
            if metric.metric_type == 'count':
                return Invoice.objects.filter(invoice_date__range=[period_start, period_end]).count()
            elif metric.metric_type == 'sum' and metric.field_name == 'total_amount':
                return Invoice.objects.filter(invoice_date__range=[period_start, period_end]).aggregate(
                    total=Sum('total_amount')
                )['total'] or 0
        
        elif metric.model_name.lower() == 'customer':
            if metric.metric_type == 'count':
                return Customer.objects.filter(created_at__date__range=[period_start, period_end]).count()
        
        return 0


class MetricValueViewSet(viewsets.ModelViewSet):
    queryset = MetricValue.objects.all()
    serializer_class = MetricValueSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['metric']
    ordering_fields = ['period_start', 'calculated_at']
    ordering = ['-period_start']


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'is_active', 'is_scheduled']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate report"""
        report = self.get_object()
        
        execution = ReportExecution.objects.create(
            report=report,
            started_at=datetime.now(),
            triggered_by=request.user if request.user.is_authenticated else None,
            parameters_used=request.data.get('parameters', {})
        )
        
        try:
            report_data = self._generate_report_data(report, execution.parameters_used)
            
            execution.result_data = report_data
            execution.status = 'completed'
            execution.completed_at = datetime.now()
            execution.save()
            
            return Response({
                'execution_id': execution.id,
                'status': 'completed',
                'data': report_data
            })
            
        except Exception as e:
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = datetime.now()
            execution.save()
            
            return Response({
                'execution_id': execution.id,
                'status': 'failed',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_report_data(self, report, parameters):
        """Generate report data based on report type"""
        if report.report_type == 'financial':
            return self._generate_financial_report(parameters)
        elif report.report_type == 'operational':
            return self._generate_operational_report(parameters)
        elif report.report_type == 'customer':
            return self._generate_customer_report(parameters)
        elif report.report_type == 'inventory':
            return self._generate_inventory_report(parameters)
        elif report.report_type == 'technician':
            return self._generate_technician_report(parameters)
        else:
            return {'message': 'Custom report generation not implemented'}
    
    def _generate_financial_report(self, parameters):
        """Generate financial report data"""
        start_date = parameters.get('start_date', date.today() - timedelta(days=30))
        end_date = parameters.get('end_date', date.today())
        
        invoices = Invoice.objects.filter(invoice_date__range=[start_date, end_date])
        
        return {
            'period': f"{start_date} to {end_date}",
            'total_invoices': invoices.count(),
            'total_revenue': invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'average_invoice': invoices.aggregate(Avg('total_amount'))['total_amount__avg'] or 0,
            'paid_invoices': invoices.filter(status='paid').count(),
            'outstanding_amount': invoices.exclude(status='paid').aggregate(Sum('amount_due'))['amount_due__sum'] or 0,
        }
    
    def _generate_operational_report(self, parameters):
        """Generate operational report data"""
        start_date = parameters.get('start_date', date.today() - timedelta(days=30))
        end_date = parameters.get('end_date', date.today())
        
        jobs = Job.objects.filter(created_at__date__range=[start_date, end_date])
        
        return {
            'period': f"{start_date} to {end_date}",
            'total_jobs': jobs.count(),
            'completed_jobs': jobs.filter(status='completed').count(),
            'emergency_calls': EmergencyCall.objects.filter(call_time__date__range=[start_date, end_date]).count(),
            'customer_satisfaction': 4.5,  # Placeholder - would come from reviews system
        }
    
    def _generate_customer_report(self, parameters):
        """Generate customer report data"""
        start_date = parameters.get('start_date', date.today() - timedelta(days=30))
        end_date = parameters.get('end_date', date.today())
        
        customers = Customer.objects.filter(created_at__date__range=[start_date, end_date])
        
        return {
            'period': f"{start_date} to {end_date}",
            'new_customers': customers.count(),
            'total_customers': Customer.objects.count(),
            'top_customers': list(
                Customer.objects.annotate(
                    total_spent=Sum('invoices__total_amount')
                ).order_by('-total_spent')[:10].values('id', 'first_name', 'last_name', 'total_spent')
            )
        }
    
    def _generate_inventory_report(self, parameters):
        """Generate inventory report data"""
        items = Item.objects.filter(is_active=True)
        
        return {
            'total_items': items.count(),
            'low_stock_items': items.filter(current_stock__lte=F('minimum_stock')).count(),
            'total_value': sum(item.stock_value for item in items),
            'top_used_items': list(
                Item.objects.annotate(
                    usage_count=Count('stock_movements')
                ).order_by('-usage_count')[:10].values('id', 'name', 'usage_count')
            )
        }
    
    def _generate_technician_report(self, parameters):
        """Generate technician performance report"""
        start_date = parameters.get('start_date', date.today() - timedelta(days=30))
        end_date = parameters.get('end_date', date.today())
        
        technicians = Technician.objects.annotate(
            job_count=Count('jobs', filter=Q(jobs__created_at__date__range=[start_date, end_date])),
            revenue=Sum('jobs__invoices__total_amount', filter=Q(jobs__created_at__date__range=[start_date, end_date]))
        ).values('id', 'user__first_name', 'user__last_name', 'job_count', 'revenue')
        
        return {
            'period': f"{start_date} to {end_date}",
            'technician_performance': list(technicians)
        }


class DataExportViewSet(viewsets.ModelViewSet):
    queryset = DataExport.objects.all()
    serializer_class = DataExportSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['export_type', 'status', 'model_name']
    search_fields = ['name']
    ordering_fields = ['requested_at', 'completed_at']
    ordering = ['-requested_at']


class UserActivityLogViewSet(viewsets.ModelViewSet):
    queryset = UserActivityLog.objects.all()
    serializer_class = UserActivityLogSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'model_name']
    search_fields = ['description', 'user__username']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']


class AnalyticsViewSet(viewsets.ViewSet):
    """Main analytics endpoints for dashboard data"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def business_overview(self, request):
        """Get high-level business metrics"""
        today = date.today()
        
        data = {
            'total_customers': Customer.objects.count(),
            'active_jobs': Job.objects.filter(status__in=['scheduled', 'in_progress']).count(),
            'monthly_revenue': Invoice.objects.filter(
                invoice_date__gte=today.replace(day=1)
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'pending_invoices': Invoice.objects.filter(status__in=['draft', 'sent']).count(),
            'technician_utilization': 85.5,
            'customer_satisfaction': 4.5,  # Placeholder - would come from reviews system
        }
        
        serializer = BusinessOverviewSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Get financial dashboard data"""
        today = date.today()
        
        # Revenue trend (last 6 months)
        revenue_trend = []
        for i in range(6):
            month_start = (today.replace(day=1) - timedelta(days=30*i)).replace(day=1)
            if i < 5:
                month_end = (month_start.replace(month=month_start.month + 1) if month_start.month < 12 
                           else month_start.replace(year=month_start.year + 1, month=1)) - timedelta(days=1)
            else:
                month_end = today
            
            revenue = Invoice.objects.filter(
                invoice_date__range=[month_start, month_end]
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            
            revenue_trend.append({
                'month': month_start.strftime('%Y-%m'),
                'revenue': revenue
            })
        
        data = {
            'total_revenue': Invoice.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'total_outstanding': Invoice.objects.exclude(status='paid').aggregate(Sum('amount_due'))['amount_due__sum'] or 0,
            'average_invoice_amount': Invoice.objects.aggregate(Avg('total_amount'))['total_amount__avg'] or 0,
            'payment_processing_time': 5.2,
            'revenue_trend': revenue_trend,
            'top_customers': list(
                Customer.objects.annotate(
                    total_spent=Sum('invoices__total_amount')
                ).order_by('-total_spent')[:5].values('id', 'first_name', 'last_name', 'total_spent')
            )
        }
        
        serializer = FinancialSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def operational_metrics(self, request):
        """Get operational dashboard data"""
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        
        completed_jobs = Job.objects.filter(
            status='completed',
            created_at__date__gte=thirty_days_ago
        )
        
        data = {
            'total_jobs_completed': completed_jobs.count(),
            'average_job_duration': 2.5,
            'first_time_fix_rate': 92.3,
            'technician_productivity': list(
                Technician.objects.annotate(
                    job_count=Count('jobs', filter=Q(jobs__created_at__date__gte=thirty_days_ago))
                ).values('id', 'user__first_name', 'user__last_name', 'job_count')[:10]
            ),
            'service_type_distribution': list(
                ServiceType.objects.annotate(
                    job_count=Count('jobs', filter=Q(jobs__created_at__date__gte=thirty_days_ago))
                ).values('name', 'job_count')
            ),
            'geographic_performance': []
        }
        
        serializer = OperationalMetricsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def customer_insights(self, request):
        """Get customer analytics"""
        today = date.today()
        this_month = today.replace(day=1)
        
        data = {
            'total_customers': Customer.objects.count(),
            'new_customers_this_month': Customer.objects.filter(created_at__date__gte=this_month).count(),
            'customer_retention_rate': 94.5,
            'customer_lifetime_value': 1250.00,
            'customer_segments': [
                {'segment': 'Residential', 'count': Customer.objects.filter(customer_type='residential').count()},
                {'segment': 'Commercial', 'count': Customer.objects.filter(customer_type='commercial').count()},
                {'segment': 'Industrial', 'count': Customer.objects.filter(customer_type='industrial').count()},
            ],
            'churn_risk_customers': []
        }
        
        serializer = CustomerInsightsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def inventory_insights(self, request):
        """Get inventory analytics"""
        items = Item.objects.filter(is_active=True)
        
        data = {
            'total_items': items.count(),
            'low_stock_items': items.filter(current_stock__lte=F('minimum_stock')).count(),
            'total_inventory_value': sum(item.stock_value for item in items),
            'inventory_turnover': 4.2,
            'top_used_items': list(
                Item.objects.annotate(
                    usage_count=Count('stock_movements')
                ).order_by('-usage_count')[:10].values('id', 'name', 'usage_count')
            ),
            'purchasing_recommendations': []
        }
        
        serializer = InventoryInsightsSerializer(data)
        return Response(serializer.data)
