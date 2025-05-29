from rest_framework import serializers
from .models import (
    TaxRate, Invoice, InvoiceLineItem, Payment, Estimate, EstimateLineItem, BillingSettings
)
from customers.serializers import CustomerListSerializer, PropertySerializer
from jobs.serializers import JobListSerializer, TechnicianListSerializer, ServiceTypeSerializer


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = '__all__'


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source='service_type.name', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = [
            'id', 'item_type', 'description', 'quantity', 'unit_price', 
            'total_amount', 'service_type', 'service_type_name', 
            'technician', 'technician_name', 'line_number', 'created_at'
        ]
        read_only_fields = ['total_amount']


class InvoiceLineItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = [
            'invoice', 'item_type', 'description', 'quantity', 'unit_price',
            'service_type', 'technician', 'line_number'
        ]

    def validate(self, data):
        if data['quantity'] <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        if data['unit_price'] < 0:
            raise serializers.ValidationError("Unit price cannot be negative")
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'customer_email',
            'billing_property', 'job', 'job_number', 'invoice_date', 'due_date',
            'payment_terms', 'status', 'subtotal', 'tax_amount', 'discount_amount',
            'total_amount', 'amount_paid', 'amount_due', 'notes', 'terms_and_conditions',
            'internal_notes', 'sent_date', 'viewed_date', 'paid_date', 'line_items',
            'is_overdue', 'days_overdue', 'created_at', 'updated_at'
        ]
        read_only_fields = ['invoice_number', 'subtotal', 'total_amount', 'amount_due']


class InvoiceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'customer', 'billing_property', 'job', 'due_date', 'payment_terms',
            'tax_amount', 'discount_amount', 'notes', 'terms_and_conditions',
            'internal_notes'
        ]

    def validate(self, data):
        if data.get('due_date') and data['due_date'] < data.get('invoice_date', data.get('invoice_date')):
            raise serializers.ValidationError("Due date cannot be before invoice date")
        return data


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 'job_number', 'invoice_date',
            'due_date', 'status', 'total_amount', 'amount_paid', 'amount_due',
            'is_overdue', 'days_overdue', 'created_at'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'invoice', 'invoice_number', 'customer', 'customer_name',
            'amount', 'payment_method', 'payment_date', 'status', 'transaction_id',
            'processor_name', 'processor_fee', 'check_number', 'notes', 'reference_number',
            'processed_by', 'processed_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['payment_id']


class PaymentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'invoice', 'customer', 'amount', 'payment_method', 'payment_date',
            'status', 'transaction_id', 'processor_name', 'processor_fee',
            'check_number', 'notes', 'reference_number'
        ]

    def validate(self, data):
        if data['amount'] <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        
        # Validate that payment doesn't exceed remaining amount due
        invoice = data['invoice']
        if data['amount'] > invoice.amount_due:
            raise serializers.ValidationError(
                f"Payment amount (${data['amount']}) cannot exceed amount due (${invoice.amount_due})"
            )
        
        return data


class EstimateLineItemSerializer(serializers.ModelSerializer):
    service_type_name = serializers.CharField(source='service_type.name', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)

    class Meta:
        model = EstimateLineItem
        fields = [
            'id', 'item_type', 'description', 'quantity', 'unit_price', 
            'total_amount', 'service_type', 'service_type_name', 
            'technician', 'technician_name', 'line_number', 'created_at'
        ]
        read_only_fields = ['total_amount']


class EstimateLineItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateLineItem
        fields = [
            'estimate', 'item_type', 'description', 'quantity', 'unit_price',
            'service_type', 'technician', 'line_number'
        ]

    def validate(self, data):
        if data['quantity'] <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        if data['unit_price'] < 0:
            raise serializers.ValidationError("Unit price cannot be negative")
        return data


class EstimateSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    line_items = EstimateLineItemSerializer(many=True, read_only=True)
    is_expired = serializers.ReadOnlyField()
    converted_invoice_number = serializers.CharField(source='converted_invoice.invoice_number', read_only=True)

    class Meta:
        model = Estimate
        fields = [
            'id', 'estimate_number', 'customer', 'customer_name', 'customer_email',
            'estimate_property', 'estimate_date', 'expiration_date', 'status',
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'description', 'notes', 'terms_and_conditions', 'sent_date',
            'viewed_date', 'accepted_date', 'converted_invoice', 'converted_invoice_number',
            'line_items', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['estimate_number', 'subtotal', 'total_amount']


class EstimateCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estimate
        fields = [
            'customer', 'estimate_property', 'expiration_date', 'description',
            'tax_amount', 'discount_amount', 'notes', 'terms_and_conditions'
        ]

    def validate(self, data):
        if data.get('expiration_date') and data['expiration_date'] < data.get('estimate_date'):
            raise serializers.ValidationError("Expiration date cannot be before estimate date")
        return data


class EstimateListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = Estimate
        fields = [
            'id', 'estimate_number', 'customer_name', 'estimate_date',
            'expiration_date', 'status', 'total_amount', 'is_expired', 'created_at'
        ]


class BillingSettingsSerializer(serializers.ModelSerializer):
    default_tax_rate_name = serializers.CharField(source='default_tax_rate.name', read_only=True)

    class Meta:
        model = BillingSettings
        fields = [
            'id', 'company_name', 'company_address', 'company_phone', 'company_email',
            'company_website', 'default_tax_rate', 'default_tax_rate_name', 'invoice_prefix',
            'estimate_prefix', 'default_payment_terms', 'late_fee_percentage',
            'late_fee_grace_days', 'default_invoice_terms', 'default_estimate_terms',
            'created_at', 'updated_at'
        ]


# Summary serializers for dashboard/reporting
class BillingSummarySerializer(serializers.Serializer):
    """Billing summary for dashboard"""
    total_invoices = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_invoices = serializers.IntegerField()
    pending_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()
    average_invoice_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    collection_rate = serializers.DecimalField(max_digits=5, decimal_places=2)


class MonthlyBillingStatsSerializer(serializers.Serializer):
    """Monthly billing statistics"""
    month = serializers.CharField()
    year = serializers.IntegerField()
    invoices_created = serializers.IntegerField()
    invoices_paid = serializers.IntegerField()
    total_billed = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_days_to_payment = serializers.DecimalField(max_digits=5, decimal_places=1)


class CustomerBillingHistorySerializer(serializers.Serializer):
    """Customer billing history summary"""
    customer = CustomerListSerializer()
    total_invoiced = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_payment_days = serializers.DecimalField(max_digits=5, decimal_places=1)
    last_payment_date = serializers.DateTimeField()
    invoice_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()