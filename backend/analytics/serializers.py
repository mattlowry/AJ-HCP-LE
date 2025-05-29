from rest_framework import serializers
from .models import Dashboard, Metric, MetricValue, Report, ReportExecution, DataExport, UserActivityLog
from django.contrib.auth.models import User


class DashboardSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = Dashboard
        fields = '__all__'


class MetricSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    latest_value = serializers.SerializerMethodField()
    achievement_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Metric
        fields = '__all__'

    def get_latest_value(self, obj):
        latest = obj.values.first()
        return latest.value if latest else None

    def get_achievement_percentage(self, obj):
        if not obj.target_value:
            return None
        latest = obj.values.first()
        if not latest:
            return None
        return round((latest.value / obj.target_value) * 100, 2)


class MetricValueSerializer(serializers.ModelSerializer):
    metric_name = serializers.CharField(source='metric.name', read_only=True)

    class Meta:
        model = MetricValue
        fields = '__all__'


class ReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    metrics_count = serializers.SerializerMethodField()
    last_execution = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = '__all__'

    def get_metrics_count(self, obj):
        return obj.metrics.count()

    def get_last_execution(self, obj):
        latest = obj.executions.first()
        if latest:
            return {
                'id': latest.id,
                'started_at': latest.started_at,
                'status': latest.status,
                'completed_at': latest.completed_at
            }
        return None


class ReportExecutionSerializer(serializers.ModelSerializer):
    report_name = serializers.CharField(source='report.name', read_only=True)
    triggered_by_name = serializers.CharField(source='triggered_by.get_full_name', read_only=True)

    class Meta:
        model = ReportExecution
        fields = '__all__'


class DataExportSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    file_size_mb = serializers.SerializerMethodField()

    class Meta:
        model = DataExport
        fields = '__all__'

    def get_file_size_mb(self, obj):
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None


class UserActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = UserActivityLog
        fields = '__all__'


# Analytics dashboard serializers
class BusinessOverviewSerializer(serializers.Serializer):
    """Serializer for business overview dashboard data"""
    total_customers = serializers.IntegerField()
    active_jobs = serializers.IntegerField()
    monthly_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_invoices = serializers.IntegerField()
    technician_utilization = serializers.DecimalField(max_digits=5, decimal_places=2)
    customer_satisfaction = serializers.DecimalField(max_digits=3, decimal_places=2)


class FinancialSummarySerializer(serializers.Serializer):
    """Serializer for financial dashboard data"""
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_invoice_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_processing_time = serializers.DecimalField(max_digits=5, decimal_places=2)
    revenue_trend = serializers.ListField(child=serializers.DictField())
    top_customers = serializers.ListField(child=serializers.DictField())


class OperationalMetricsSerializer(serializers.Serializer):
    """Serializer for operational dashboard data"""
    total_jobs_completed = serializers.IntegerField()
    average_job_duration = serializers.DecimalField(max_digits=8, decimal_places=2)
    first_time_fix_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    technician_productivity = serializers.ListField(child=serializers.DictField())
    service_type_distribution = serializers.ListField(child=serializers.DictField())
    geographic_performance = serializers.ListField(child=serializers.DictField())


class CustomerInsightsSerializer(serializers.Serializer):
    """Serializer for customer analytics"""
    total_customers = serializers.IntegerField()
    new_customers_this_month = serializers.IntegerField()
    customer_retention_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    customer_lifetime_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    customer_segments = serializers.ListField(child=serializers.DictField())
    churn_risk_customers = serializers.ListField(child=serializers.DictField())


class InventoryInsightsSerializer(serializers.Serializer):
    """Serializer for inventory analytics"""
    total_items = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    total_inventory_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    inventory_turnover = serializers.DecimalField(max_digits=8, decimal_places=2)
    top_used_items = serializers.ListField(child=serializers.DictField())
    purchasing_recommendations = serializers.ListField(child=serializers.DictField())


class PerformanceTrendSerializer(serializers.Serializer):
    """Serializer for performance trend data"""
    period = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    jobs_completed = serializers.IntegerField()
    new_customers = serializers.IntegerField()
    customer_satisfaction = serializers.DecimalField(max_digits=3, decimal_places=2)
    technician_utilization = serializers.DecimalField(max_digits=5, decimal_places=2)


class TechnicianPerformanceSerializer(serializers.Serializer):
    """Serializer for technician performance data"""
    technician_id = serializers.IntegerField()
    technician_name = serializers.CharField()
    jobs_completed = serializers.IntegerField()
    revenue_generated = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_job_duration = serializers.DecimalField(max_digits=8, decimal_places=2)
    customer_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    first_time_fix_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    utilization_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class CustomerSegmentSerializer(serializers.Serializer):
    """Serializer for customer segment analysis"""
    segment_name = serializers.CharField()
    customer_count = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_job_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    retention_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    growth_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class GeographicPerformanceSerializer(serializers.Serializer):
    """Serializer for geographic performance data"""
    region = serializers.CharField()
    jobs_completed = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    customer_count = serializers.IntegerField()
    average_travel_time = serializers.DecimalField(max_digits=5, decimal_places=2)
    service_coverage = serializers.DecimalField(max_digits=5, decimal_places=2)