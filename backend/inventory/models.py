from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from customers.models import Customer
from jobs.models import Job, Technician
from decimal import Decimal
from datetime import datetime, date
import uuid


class Category(models.Model):
    """Categories for organizing inventory items"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent_category = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.parent_category:
            return f"{self.parent_category.name} > {self.name}"
        return self.name

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']


class Supplier(models.Model):
    """Suppliers/vendors for inventory items"""
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='USA')
    
    # Business info
    tax_id = models.CharField(max_length=50, blank=True)
    account_number = models.CharField(max_length=100, blank=True)
    
    # Settings
    default_lead_time_days = models.PositiveIntegerField(default=7)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Item(models.Model):
    """Individual inventory items/parts"""
    ITEM_TYPE_CHOICES = [
        ('part', 'Part'),
        ('tool', 'Tool'),
        ('material', 'Material'),
        ('consumable', 'Consumable'),
        ('equipment', 'Equipment'),
    ]

    UNIT_CHOICES = [
        ('each', 'Each'),
        ('foot', 'Foot'),
        ('meter', 'Meter'),
        ('gallon', 'Gallon'),
        ('liter', 'Liter'),
        ('pound', 'Pound'),
        ('kilogram', 'Kilogram'),
        ('box', 'Box'),
        ('roll', 'Roll'),
        ('sheet', 'Sheet'),
    ]

    # Basic information
    item_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='part')
    
    # Organization
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    
    # Physical attributes
    unit_of_measure = models.CharField(max_length=20, choices=UNIT_CHOICES, default='each')
    weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, help_text="Weight per unit")
    dimensions = models.CharField(max_length=100, blank=True, help_text="Length x Width x Height")
    
    # Pricing
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    sell_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Inventory tracking
    current_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    minimum_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    maximum_stock = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    reorder_point = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    reorder_quantity = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    
    # Location
    warehouse_location = models.CharField(max_length=100, blank=True, help_text="Shelf, bin, etc.")
    
    # Supplier information
    primary_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='primary_items')
    supplier_part_number = models.CharField(max_length=100, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_serialized = models.BooleanField(default=False, help_text="Track individual serial numbers")
    is_taxable = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_items')

    def __str__(self):
        return f"{self.item_code} - {self.name}"

    class Meta:
        ordering = ['item_code']

    def save(self, *args, **kwargs):
        # Auto-calculate markup if cost price changes
        if self.cost_price and self.sell_price:
            if self.cost_price > 0:
                self.markup_percentage = ((self.sell_price - self.cost_price) / self.cost_price) * 100
        
        super().save(*args, **kwargs)

    @property
    def is_low_stock(self):
        """Check if item is below minimum stock level"""
        return self.current_stock <= self.minimum_stock

    @property
    def needs_reorder(self):
        """Check if item is at or below reorder point"""
        return self.current_stock <= self.reorder_point

    @property
    def stock_value(self):
        """Calculate total value of current stock"""
        return self.current_stock * self.cost_price


class StockMovement(models.Model):
    """Track all stock movements (in/out/adjustments)"""
    MOVEMENT_TYPE_CHOICES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('job_use', 'Used on Job'),
        ('return', 'Return'),
        ('adjustment', 'Adjustment'),
        ('transfer', 'Transfer'),
        ('damage', 'Damaged'),
        ('loss', 'Lost'),
        ('found', 'Found'),
    ]

    # Basic information
    movement_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # References
    job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')
    technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')
    purchase_order = models.CharField(max_length=100, blank=True)
    invoice_reference = models.CharField(max_length=100, blank=True)
    
    # Details
    reason = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    # Location information
    from_location = models.CharField(max_length=100, blank=True)
    to_location = models.CharField(max_length=100, blank=True)
    
    # Tracking
    movement_date = models.DateTimeField(default=datetime.now)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='recorded_movements')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.movement_type.title()} - {self.item.name} ({self.quantity})"

    class Meta:
        ordering = ['-movement_date']

    @property
    def total_value(self):
        """Calculate total value of this movement"""
        if self.unit_cost:
            return abs(self.quantity) * self.unit_cost
        return 0


class PurchaseOrder(models.Model):
    """Purchase orders for restocking inventory"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('confirmed', 'Confirmed'),
        ('partial', 'Partially Received'),
        ('received', 'Fully Received'),
        ('cancelled', 'Cancelled'),
    ]

    # Basic information
    po_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Dates
    order_date = models.DateField(default=date.today)
    expected_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    
    # Totals
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Additional information
    shipping_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    terms = models.TextField(blank=True)
    
    # Tracking
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_pos')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PO {self.po_number} - {self.supplier.name}"

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-generate PO number if not provided
        if not self.po_number:
            self.po_number = self.generate_po_number()
        
        # Calculate totals
        self.calculate_totals()
        
        super().save(*args, **kwargs)

    def generate_po_number(self):
        """Generate unique PO number"""
        year = datetime.now().year
        # Get latest PO for this year
        latest = PurchaseOrder.objects.filter(
            po_number__startswith=f"PO-{year}-"
        ).order_by('-po_number').first()
        
        if latest:
            try:
                last_num = int(latest.po_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"PO-{year}-{next_num:04d}"

    def calculate_totals(self):
        """Calculate PO totals from line items"""
        line_items = self.line_items.all()
        self.subtotal = sum(item.total_amount for item in line_items)
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_cost


class PurchaseOrderLineItem(models.Model):
    """Line items for purchase orders"""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='line_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='po_line_items')
    
    # Order details
    quantity_ordered = models.DecimalField(max_digits=10, decimal_places=3)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Additional information
    supplier_part_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    # Tracking
    line_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.item.name} - Qty: {self.quantity_ordered}"

    class Meta:
        ordering = ['line_number']
        unique_together = ['purchase_order', 'line_number']

    def save(self, *args, **kwargs):
        # Calculate total amount
        self.total_amount = self.quantity_ordered * self.unit_cost
        
        # Auto-assign line number if not provided
        if not self.line_number:
            max_line = self.purchase_order.line_items.aggregate(
                models.Max('line_number')
            )['line_number__max']
            self.line_number = (max_line or 0) + 1
        
        super().save(*args, **kwargs)
        
        # Recalculate PO totals
        self.purchase_order.calculate_totals()
        self.purchase_order.save()

    @property
    def quantity_pending(self):
        """Calculate quantity still pending delivery"""
        return self.quantity_ordered - self.quantity_received

    @property
    def is_fully_received(self):
        """Check if line item is fully received"""
        return self.quantity_received >= self.quantity_ordered


class InventoryAdjustment(models.Model):
    """Manual inventory adjustments (for audits, corrections, etc.)"""
    ADJUSTMENT_TYPE_CHOICES = [
        ('audit', 'Audit Adjustment'),
        ('damage', 'Damage'),
        ('theft', 'Theft'),
        ('found', 'Found Items'),
        ('correction', 'Data Correction'),
        ('write_off', 'Write Off'),
    ]

    # Basic information
    adjustment_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    adjustment_type = models.CharField(max_length=20, choices=ADJUSTMENT_TYPE_CHOICES)
    adjustment_date = models.DateField(default=date.today)
    
    # Details
    description = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    
    # Approval
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_adjustments')
    approved_date = models.DateTimeField(null=True, blank=True)
    
    # Tracking
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_adjustments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Adjustment {self.adjustment_id.hex[:8]} - {self.adjustment_type.title()}"

    class Meta:
        ordering = ['-created_at']


class InventoryAdjustmentLineItem(models.Model):
    """Line items for inventory adjustments"""
    adjustment = models.ForeignKey(InventoryAdjustment, on_delete=models.CASCADE, related_name='line_items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='adjustment_line_items')
    
    # Adjustment details
    quantity_before = models.DecimalField(max_digits=10, decimal_places=3)
    quantity_after = models.DecimalField(max_digits=10, decimal_places=3)
    quantity_difference = models.DecimalField(max_digits=10, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Additional information
    reason = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    
    # Tracking
    line_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item.name} - Adj: {self.quantity_difference}"

    class Meta:
        ordering = ['line_number']
        unique_together = ['adjustment', 'line_number']

    def save(self, *args, **kwargs):
        # Calculate quantity difference
        self.quantity_difference = self.quantity_after - self.quantity_before
        
        # Auto-assign line number if not provided
        if not self.line_number:
            max_line = self.adjustment.line_items.aggregate(
                models.Max('line_number')
            )['line_number__max']
            self.line_number = (max_line or 0) + 1
        
        super().save(*args, **kwargs)

    @property
    def total_value_impact(self):
        """Calculate financial impact of this adjustment"""
        return self.quantity_difference * self.unit_cost
