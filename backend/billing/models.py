from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from customers.models import Customer, Property
from jobs.models import Job, Technician, ServiceType
from decimal import Decimal
from datetime import datetime, date
import uuid


class TaxRate(models.Model):
    """Tax rates for different jurisdictions"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    rate_percentage = models.DecimalField(
        max_digits=5, decimal_places=4,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    jurisdiction = models.CharField(max_length=100, help_text="State, county, city, etc.")
    is_active = models.BooleanField(default=True)
    effective_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.rate_percentage}%)"

    class Meta:
        ordering = ['jurisdiction', 'name']


class Invoice(models.Model):
    """Main invoice model for billing customers"""
    INVOICE_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_TERMS_CHOICES = [
        ('due_on_receipt', 'Due on Receipt'),
        ('net_15', 'Net 15'),
        ('net_30', 'Net 30'),
        ('net_45', 'Net 45'),
        ('net_60', 'Net 60'),
    ]

    # Basic invoice information
    invoice_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    billing_property = models.ForeignKey(Property, on_delete=models.CASCADE, null=True, blank=True, related_name='invoices')
    
    # Job relationship
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    
    # Invoice details
    invoice_date = models.DateField(default=date.today)
    due_date = models.DateField()
    payment_terms = models.CharField(max_length=20, choices=PAYMENT_TERMS_CHOICES, default='net_30')
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='draft')
    
    # Financial fields
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Additional fields
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    
    # Tracking
    sent_date = models.DateTimeField(null=True, blank=True)
    viewed_date = models.DateTimeField(null=True, blank=True)
    paid_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer.full_name}"

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        
        # Calculate totals
        self.calculate_totals()
        
        super().save(*args, **kwargs)

    def generate_invoice_number(self):
        """Generate unique invoice number"""
        year = datetime.now().year
        # Get latest invoice for this year
        latest = Invoice.objects.filter(
            invoice_number__startswith=f"INV-{year}-"
        ).order_by('-invoice_number').first()
        
        if latest:
            try:
                last_num = int(latest.invoice_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"INV-{year}-{next_num:04d}"

    def calculate_totals(self):
        """Calculate invoice totals from line items"""
        line_items = self.line_items.all()
        self.subtotal = sum(item.total_amount for item in line_items)
        
        # Calculate tax
        if hasattr(self, 'tax_rate') and self.tax_rate:
            self.tax_amount = self.subtotal * (self.tax_rate.rate_percentage / 100)
        
        # Calculate total
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount
        self.amount_due = self.total_amount - self.amount_paid

    @property
    def is_overdue(self):
        """Check if invoice is overdue"""
        return self.due_date < date.today() and self.status not in ['paid', 'cancelled', 'refunded']

    @property
    def days_overdue(self):
        """Get number of days overdue"""
        if self.is_overdue:
            return (date.today() - self.due_date).days
        return 0

    def mark_as_sent(self):
        """Mark invoice as sent"""
        self.status = 'sent'
        self.sent_date = datetime.now()
        self.save()

    def mark_as_paid(self, payment_amount=None):
        """Mark invoice as paid"""
        if payment_amount is None:
            payment_amount = self.amount_due
        
        self.amount_paid += payment_amount
        self.amount_due = self.total_amount - self.amount_paid
        
        if self.amount_due <= 0:
            self.status = 'paid'
            self.paid_date = datetime.now()
        else:
            self.status = 'partial'
        
        self.save()


class InvoiceLineItem(models.Model):
    """Individual line items on an invoice"""
    ITEM_TYPE_CHOICES = [
        ('service', 'Service'),
        ('material', 'Material'),
        ('labor', 'Labor'),
        ('travel', 'Travel'),
        ('discount', 'Discount'),
        ('fee', 'Fee'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='service')
    
    # Item details
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Optional references
    service_type = models.ForeignKey(ServiceType, on_delete=models.SET_NULL, null=True, blank=True)
    technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    line_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.description} - ${self.total_amount}"

    class Meta:
        ordering = ['line_number']
        unique_together = ['invoice', 'line_number']

    def save(self, *args, **kwargs):
        # Calculate total amount
        self.total_amount = self.quantity * self.unit_price
        
        # Auto-assign line number if not provided
        if not self.line_number:
            max_line = self.invoice.line_items.aggregate(
                models.Max('line_number')
            )['line_number__max']
            self.line_number = (max_line or 0) + 1
        
        super().save(*args, **kwargs)
        
        # Recalculate invoice totals
        self.invoice.calculate_totals()
        self.invoice.save()


class Payment(models.Model):
    """Payments received from customers"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('online', 'Online Payment'),
        ('other', 'Other'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    # Basic payment information
    payment_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    
    # Payment details
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_date = models.DateTimeField(default=datetime.now)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Payment processor information
    transaction_id = models.CharField(max_length=100, blank=True)
    processor_name = models.CharField(max_length=50, blank=True, help_text="Stripe, Square, etc.")
    processor_fee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Check information (if applicable)
    check_number = models.CharField(max_length=50, blank=True)
    
    # Notes and references
    notes = models.TextField(blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    
    # Metadata
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='processed_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment ${self.amount} for {self.invoice.invoice_number}"

    class Meta:
        ordering = ['-payment_date']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Update invoice payment status if payment is completed
        if self.status == 'completed':
            self.invoice.mark_as_paid(self.amount)


class Estimate(models.Model):
    """Estimates/quotes for potential work"""
    ESTIMATE_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
        ('converted', 'Converted to Invoice'),
    ]

    # Basic estimate information
    estimate_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='estimates')
    estimate_property = models.ForeignKey(Property, on_delete=models.CASCADE, null=True, blank=True, related_name='estimates')
    
    # Estimate details
    estimate_date = models.DateField(default=date.today)
    expiration_date = models.DateField()
    status = models.CharField(max_length=20, choices=ESTIMATE_STATUS_CHOICES, default='draft')
    
    # Financial fields
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Content
    description = models.TextField()
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    
    # Tracking
    sent_date = models.DateTimeField(null=True, blank=True)
    viewed_date = models.DateTimeField(null=True, blank=True)
    accepted_date = models.DateTimeField(null=True, blank=True)
    
    # Converted invoice
    converted_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_estimate')
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_estimates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Estimate {self.estimate_number} - {self.customer.full_name}"

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-generate estimate number if not provided
        if not self.estimate_number:
            self.estimate_number = self.generate_estimate_number()
        
        # Calculate totals
        self.calculate_totals()
        
        super().save(*args, **kwargs)

    def generate_estimate_number(self):
        """Generate unique estimate number"""
        year = datetime.now().year
        # Get latest estimate for this year
        latest = Estimate.objects.filter(
            estimate_number__startswith=f"EST-{year}-"
        ).order_by('-estimate_number').first()
        
        if latest:
            try:
                last_num = int(latest.estimate_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"EST-{year}-{next_num:04d}"

    def calculate_totals(self):
        """Calculate estimate totals from line items"""
        line_items = self.line_items.all()
        self.subtotal = sum(item.total_amount for item in line_items)
        
        # Calculate tax (simplified - could be more complex)
        # Tax rate would be determined by property location
        self.tax_amount = self.subtotal * Decimal('0.08')  # 8% default
        
        # Calculate total
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount

    @property
    def is_expired(self):
        """Check if estimate is expired"""
        return self.expiration_date < date.today() and self.status not in ['accepted', 'declined', 'converted']

    def convert_to_invoice(self, user=None):
        """Convert estimate to invoice"""
        if self.status != 'accepted':
            raise ValueError("Only accepted estimates can be converted to invoices")
        
        # Create invoice
        invoice = Invoice.objects.create(
            customer=self.customer,
            billing_property=self.estimate_property,
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            discount_amount=self.discount_amount,
            total_amount=self.total_amount,
            amount_due=self.total_amount,
            notes=self.notes,
            terms_and_conditions=self.terms_and_conditions,
            created_by=user
        )
        
        # Copy line items
        for estimate_item in self.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                item_type=estimate_item.item_type,
                description=estimate_item.description,
                quantity=estimate_item.quantity,
                unit_price=estimate_item.unit_price,
                total_amount=estimate_item.total_amount,
                service_type=estimate_item.service_type,
                technician=estimate_item.technician,
                line_number=estimate_item.line_number
            )
        
        # Update estimate status
        self.status = 'converted'
        self.converted_invoice = invoice
        self.save()
        
        return invoice


class EstimateLineItem(models.Model):
    """Individual line items on an estimate"""
    ITEM_TYPE_CHOICES = [
        ('service', 'Service'),
        ('material', 'Material'),
        ('labor', 'Labor'),
        ('travel', 'Travel'),
        ('discount', 'Discount'),
        ('fee', 'Fee'),
    ]

    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='line_items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='service')
    
    # Item details
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Optional references
    service_type = models.ForeignKey(ServiceType, on_delete=models.SET_NULL, null=True, blank=True)
    technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    line_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.description} - ${self.total_amount}"

    class Meta:
        ordering = ['line_number']
        unique_together = ['estimate', 'line_number']

    def save(self, *args, **kwargs):
        # Calculate total amount
        self.total_amount = self.quantity * self.unit_price
        
        # Auto-assign line number if not provided
        if not self.line_number:
            max_line = self.estimate.line_items.aggregate(
                models.Max('line_number')
            )['line_number__max']
            self.line_number = (max_line or 0) + 1
        
        super().save(*args, **kwargs)
        
        # Recalculate estimate totals
        self.estimate.calculate_totals()
        self.estimate.save()


class BillingSettings(models.Model):
    """Global billing settings for the company"""
    company_name = models.CharField(max_length=200)
    company_address = models.TextField()
    company_phone = models.CharField(max_length=50)
    company_email = models.EmailField()
    company_website = models.URLField(blank=True)
    
    # Tax settings
    default_tax_rate = models.ForeignKey(TaxRate, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Invoice settings
    invoice_prefix = models.CharField(max_length=10, default='INV')
    estimate_prefix = models.CharField(max_length=10, default='EST')
    default_payment_terms = models.CharField(max_length=20, choices=Invoice.PAYMENT_TERMS_CHOICES, default='net_30')
    
    # Payment settings
    late_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    late_fee_grace_days = models.PositiveIntegerField(default=0)
    
    # Default terms
    default_invoice_terms = models.TextField(blank=True)
    default_estimate_terms = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Billing Settings for {self.company_name}"

    class Meta:
        verbose_name = "Billing Settings"
        verbose_name_plural = "Billing Settings"