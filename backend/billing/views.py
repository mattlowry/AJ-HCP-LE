from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Avg, F
from django.db.models.functions import TruncMonth
from datetime import datetime, date, timedelta
from decimal import Decimal

from .models import (
    TaxRate, Invoice, InvoiceLineItem, Payment, Estimate, EstimateLineItem, BillingSettings
)
from .serializers import (
    TaxRateSerializer, InvoiceSerializer, InvoiceCreateUpdateSerializer, InvoiceListSerializer,
    InvoiceLineItemSerializer, InvoiceLineItemCreateSerializer, PaymentSerializer, 
    PaymentCreateUpdateSerializer, EstimateSerializer, EstimateCreateUpdateSerializer, 
    EstimateListSerializer, EstimateLineItemSerializer, EstimateLineItemCreateSerializer,
    BillingSettingsSerializer, BillingSummarySerializer, MonthlyBillingStatsSerializer,
    CustomerBillingHistorySerializer
)
from customers.models import Customer


class TaxRateViewSet(viewsets.ModelViewSet):
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['jurisdiction', 'is_active']
    search_fields = ['name', 'description', 'jurisdiction']
    ordering_fields = ['name', 'rate_percentage', 'effective_date']
    ordering = ['jurisdiction', 'name']

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active tax rates"""
        today = date.today()
        active_rates = self.queryset.filter(
            Q(is_active=True) &
            Q(effective_date__lte=today) &
            (Q(end_date__isnull=True) | Q(end_date__gte=today))
        )
        serializer = self.get_serializer(active_rates, many=True)
        return Response(serializer.data)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('customer', 'billing_property', 'job', 'created_by')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'status', 'payment_terms', 'job']
    search_fields = ['invoice_number', 'customer__first_name', 'customer__last_name', 'notes']
    ordering_fields = ['invoice_date', 'due_date', 'total_amount', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return InvoiceCreateUpdateSerializer
        return InvoiceSerializer

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending invoices"""
        pending_invoices = self.queryset.filter(status__in=['draft', 'sent', 'viewed'])
        serializer = InvoiceListSerializer(pending_invoices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue invoices"""
        today = date.today()
        overdue_invoices = self.queryset.filter(
            due_date__lt=today,
            status__in=['sent', 'viewed', 'partial']
        )
        serializer = InvoiceListSerializer(overdue_invoices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent_payments(self, request):
        """Get invoices with recent payments"""
        days = int(request.query_params.get('days', 30))
        since_date = date.today() - timedelta(days=days)
        
        recent_payment_invoices = self.queryset.filter(
            payments__payment_date__gte=since_date,
            payments__status='completed'
        ).distinct()
        
        serializer = InvoiceListSerializer(recent_payment_invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """Mark invoice as sent"""
        invoice = self.get_object()
        invoice.mark_as_sent()
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        payment_amount = request.data.get('amount')
        
        try:
            if payment_amount:
                payment_amount = Decimal(str(payment_amount))
            invoice.mark_as_paid(payment_amount)
            serializer = self.get_serializer(invoice)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get billing summary statistics"""
        today = date.today()
        
        # Calculate summary statistics
        total_invoices = self.queryset.count()
        total_revenue = self.queryset.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        outstanding_amount = self.queryset.aggregate(Sum('amount_due'))['amount_due__sum'] or 0
        
        overdue_amount = self.queryset.filter(
            due_date__lt=today,
            status__in=['sent', 'viewed', 'partial']
        ).aggregate(Sum('amount_due'))['amount_due__sum'] or 0
        
        paid_invoices = self.queryset.filter(status='paid').count()
        pending_invoices = self.queryset.filter(status__in=['draft', 'sent', 'viewed', 'partial']).count()
        overdue_invoices = self.queryset.filter(
            due_date__lt=today,
            status__in=['sent', 'viewed', 'partial']
        ).count()
        
        average_invoice_value = self.queryset.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
        
        # Calculate collection rate
        collection_rate = 0
        if total_revenue > 0:
            collected_amount = total_revenue - outstanding_amount
            collection_rate = (collected_amount / total_revenue) * 100
        
        summary_data = {
            'total_invoices': total_invoices,
            'total_revenue': total_revenue,
            'outstanding_amount': outstanding_amount,
            'overdue_amount': overdue_amount,
            'paid_invoices': paid_invoices,
            'pending_invoices': pending_invoices,
            'overdue_invoices': overdue_invoices,
            'average_invoice_value': average_invoice_value,
            'collection_rate': collection_rate
        }
        
        serializer = BillingSummarySerializer(summary_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def monthly_stats(self, request):
        """Get monthly billing statistics"""
        months = int(request.query_params.get('months', 12))
        start_date = date.today() - timedelta(days=months * 30)
        
        monthly_data = []
        
        # Get invoices by month
        invoices_by_month = self.queryset.filter(
            created_at__gte=start_date
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            invoices_created=Count('id'),
            total_billed=Sum('total_amount')
        ).order_by('month')
        
        # Get payments by month
        payments_by_month = Payment.objects.filter(
            payment_date__gte=start_date,
            status='completed'
        ).annotate(
            month=TruncMonth('payment_date')
        ).values('month').annotate(
            invoices_paid=Count('invoice', distinct=True),
            total_collected=Sum('amount')
        ).order_by('month')
        
        # Combine data
        for invoice_data in invoices_by_month:
            month_obj = invoice_data['month']
            month_str = month_obj.strftime('%B')
            year = month_obj.year
            
            # Find corresponding payment data
            payment_data = next(
                (p for p in payments_by_month if p['month'] == month_obj),
                {'invoices_paid': 0, 'total_collected': 0}
            )
            
            monthly_data.append({
                'month': month_str,
                'year': year,
                'invoices_created': invoice_data['invoices_created'],
                'invoices_paid': payment_data['invoices_paid'],
                'total_billed': invoice_data['total_billed'],
                'total_collected': payment_data['total_collected'],
                'average_days_to_payment': 30.0  # Simplified calculation
            })
        
        serializer = MonthlyBillingStatsSerializer(monthly_data, many=True)
        return Response(serializer.data)


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceLineItem.objects.select_related('invoice', 'service_type', 'technician__user')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['invoice', 'item_type', 'service_type', 'technician']
    ordering_fields = ['line_number', 'total_amount', 'created_at']
    ordering = ['line_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return InvoiceLineItemCreateSerializer
        return InvoiceLineItemSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice', 'customer', 'processed_by')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['invoice', 'customer', 'payment_method', 'status']
    search_fields = ['transaction_id', 'check_number', 'reference_number', 'notes']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentCreateUpdateSerializer
        return PaymentSerializer

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent payments"""
        days = int(request.query_params.get('days', 30))
        since_date = datetime.now() - timedelta(days=days)
        
        recent_payments = self.queryset.filter(payment_date__gte=since_date)
        serializer = self.get_serializer(recent_payments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_method(self, request):
        """Get payments grouped by payment method"""
        payment_methods = self.queryset.values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('-total_amount')
        
        return Response(payment_methods)

    def perform_create(self, serializer):
        """Set processed_by when creating payment"""
        if self.request.user.is_authenticated:
            serializer.save(processed_by=self.request.user)
        else:
            serializer.save()


class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.select_related('customer', 'estimate_property', 'converted_invoice', 'created_by')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer', 'status']
    search_fields = ['estimate_number', 'customer__first_name', 'customer__last_name', 'description']
    ordering_fields = ['estimate_date', 'expiration_date', 'total_amount', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return EstimateListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return EstimateCreateUpdateSerializer
        return EstimateSerializer

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending estimates"""
        pending_estimates = self.queryset.filter(status__in=['draft', 'sent', 'viewed'])
        serializer = EstimateListSerializer(pending_estimates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get expired estimates"""
        today = date.today()
        expired_estimates = self.queryset.filter(
            expiration_date__lt=today,
            status__in=['sent', 'viewed']
        )
        serializer = EstimateListSerializer(expired_estimates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convert estimate to invoice"""
        estimate = self.get_object()
        
        try:
            user = request.user if request.user.is_authenticated else None
            invoice = estimate.convert_to_invoice(user)
            
            from .serializers import InvoiceSerializer
            invoice_serializer = InvoiceSerializer(invoice)
            return Response({
                'message': 'Estimate converted to invoice successfully',
                'invoice': invoice_serializer.data
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def mark_accepted(self, request, pk=None):
        """Mark estimate as accepted"""
        estimate = self.get_object()
        estimate.status = 'accepted'
        estimate.accepted_date = datetime.now()
        estimate.save()
        
        serializer = self.get_serializer(estimate)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_declined(self, request, pk=None):
        """Mark estimate as declined"""
        estimate = self.get_object()
        estimate.status = 'declined'
        estimate.save()
        
        serializer = self.get_serializer(estimate)
        return Response(serializer.data)


class EstimateLineItemViewSet(viewsets.ModelViewSet):
    queryset = EstimateLineItem.objects.select_related('estimate', 'service_type', 'technician__user')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['estimate', 'item_type', 'service_type', 'technician']
    ordering_fields = ['line_number', 'total_amount', 'created_at']
    ordering = ['line_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EstimateLineItemCreateSerializer
        return EstimateLineItemSerializer


class BillingSettingsViewSet(viewsets.ModelViewSet):
    queryset = BillingSettings.objects.all()
    serializer_class = BillingSettingsSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current billing settings"""
        settings = self.queryset.first()
        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        else:
            return Response({'message': 'No billing settings found'}, status=status.HTTP_404_NOT_FOUND)


class BillingReportsViewSet(viewsets.ViewSet):
    """Additional billing reports and analytics"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def customer_billing_history(self, request):
        """Get billing history for all customers"""
        customers = Customer.objects.prefetch_related('invoices', 'payments').all()
        
        customer_data = []
        for customer in customers:
            invoices = customer.invoices.all()
            payments = customer.payments.filter(status='completed')
            
            total_invoiced = invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            total_paid = payments.aggregate(Sum('amount'))['amount__sum'] or 0
            outstanding_balance = total_invoiced - total_paid
            
            # Calculate average payment days (simplified)
            avg_payment_days = 30.0  # Would need more complex calculation
            
            last_payment = payments.order_by('-payment_date').first()
            last_payment_date = last_payment.payment_date if last_payment else None
            
            overdue_count = invoices.filter(
                due_date__lt=date.today(),
                status__in=['sent', 'viewed', 'partial']
            ).count()
            
            customer_data.append({
                'customer': {
                    'id': customer.id,
                    'full_name': customer.full_name,
                    'email': customer.email,
                    'customer_type': customer.customer_type
                },
                'total_invoiced': total_invoiced,
                'total_paid': total_paid,
                'outstanding_balance': outstanding_balance,
                'average_payment_days': avg_payment_days,
                'last_payment_date': last_payment_date,
                'invoice_count': invoices.count(),
                'overdue_count': overdue_count
            })
        
        serializer = CustomerBillingHistorySerializer(customer_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def aging_report(self, request):
        """Get accounts receivable aging report"""
        today = date.today()
        
        # Define aging buckets
        aging_buckets = {
            'current': {'min': 0, 'max': 0},
            '1_30_days': {'min': 1, 'max': 30},
            '31_60_days': {'min': 31, 'max': 60},
            '61_90_days': {'min': 61, 'max': 90},
            'over_90_days': {'min': 91, 'max': 9999}
        }
        
        aging_data = {}
        
        for bucket_name, bucket_range in aging_buckets.items():
            start_date = today - timedelta(days=bucket_range['max'])
            end_date = today - timedelta(days=bucket_range['min'])
            
            if bucket_name == 'current':
                # Current invoices (not yet due)
                invoices = Invoice.objects.filter(
                    due_date__gte=today,
                    status__in=['sent', 'viewed', 'partial']
                )
            else:
                # Overdue invoices in this bucket
                invoices = Invoice.objects.filter(
                    due_date__range=[start_date, end_date],
                    status__in=['sent', 'viewed', 'partial']
                )
            
            aging_data[bucket_name] = {
                'count': invoices.count(),
                'amount': invoices.aggregate(Sum('amount_due'))['amount_due__sum'] or 0
            }
        
        return Response(aging_data)

    @action(detail=False, methods=['get'])
    def revenue_trends(self, request):
        """Get revenue trends over time"""
        months = int(request.query_params.get('months', 12))
        start_date = date.today() - timedelta(days=months * 30)
        
        # Group invoices by month
        monthly_revenue = Invoice.objects.filter(
            invoice_date__gte=start_date
        ).annotate(
            month=TruncMonth('invoice_date')
        ).values('month').annotate(
            total_revenue=Sum('total_amount'),
            invoice_count=Count('id'),
            average_invoice=Avg('total_amount')
        ).order_by('month')
        
        return Response(list(monthly_revenue))