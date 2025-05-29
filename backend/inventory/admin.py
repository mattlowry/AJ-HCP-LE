from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    Category, Supplier, Item, StockMovement, PurchaseOrder, 
    PurchaseOrderLineItem, InventoryAdjustment, InventoryAdjustmentLineItem
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent_category', 'items_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'parent_category', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'parent_category', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Items'


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'city', 'state', 'is_active']
    list_filter = ['is_active', 'country', 'state', 'created_at']
    search_fields = ['name', 'contact_person', 'email', 'phone', 'city']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'contact_person', 'email', 'phone', 'website')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country')
        }),
        ('Business Information', {
            'fields': ('tax_id', 'account_number', 'default_lead_time_days')
        }),
        ('Settings', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['item_code', 'name', 'item_type', 'category', 'current_stock', 'unit_of_measure', 'cost_price', 'sell_price', 'stock_status', 'is_active']
    list_filter = ['item_type', 'category', 'primary_supplier', 'is_active', 'is_serialized', 'created_at']
    search_fields = ['item_code', 'name', 'description', 'supplier_part_number']
    readonly_fields = ['markup_percentage', 'created_at', 'updated_at']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('item_code', 'name', 'description', 'item_type', 'category')
        }),
        ('Physical Attributes', {
            'fields': ('unit_of_measure', 'weight', 'dimensions'),
            'classes': ('collapse',)
        }),
        ('Pricing', {
            'fields': ('cost_price', 'sell_price', 'markup_percentage')
        }),
        ('Inventory Tracking', {
            'fields': ('current_stock', 'minimum_stock', 'maximum_stock', 'reorder_point', 'reorder_quantity', 'warehouse_location')
        }),
        ('Supplier Information', {
            'fields': ('primary_supplier', 'supplier_part_number'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('is_active', 'is_serialized', 'is_taxable')
        }),
        ('Timestamps', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def stock_status(self, obj):
        if obj.needs_reorder:
            return format_html('<span style="color: red;">Needs Reorder</span>')
        elif obj.is_low_stock:
            return format_html('<span style="color: orange;">Low Stock</span>')
        else:
            return format_html('<span style="color: green;">Normal</span>')
    stock_status.short_description = 'Stock Status'
    
    actions = ['mark_as_low_stock_alert', 'deactivate_items']
    
    def mark_as_low_stock_alert(self, request, queryset):
        # This would typically send alerts, for now just update a flag
        count = queryset.update(minimum_stock=queryset[0].current_stock + 1)
        self.message_user(request, f'{count} items marked for low stock alert.')
    mark_as_low_stock_alert.short_description = "Mark selected items for low stock alert"
    
    def deactivate_items(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} items deactivated.')
    deactivate_items.short_description = "Deactivate selected items"


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['movement_id_short', 'item_link', 'movement_type', 'quantity', 'unit_cost', 'movement_date', 'recorded_by']
    list_filter = ['movement_type', 'movement_date', 'created_at']
    search_fields = ['item__name', 'item__item_code', 'reason', 'notes']
    readonly_fields = ['movement_id', 'total_value', 'created_at']
    date_hierarchy = 'movement_date'
    
    fieldsets = (
        ('Movement Information', {
            'fields': ('movement_id', 'item', 'movement_type', 'quantity', 'unit_cost', 'movement_date')
        }),
        ('References', {
            'fields': ('job', 'technician', 'purchase_order', 'invoice_reference'),
            'classes': ('collapse',)
        }),
        ('Details', {
            'fields': ('reason', 'notes'),
            'classes': ('collapse',)
        }),
        ('Location', {
            'fields': ('from_location', 'to_location'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('recorded_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def movement_id_short(self, obj):
        return obj.movement_id.hex[:8]
    movement_id_short.short_description = 'Movement ID'
    
    def item_link(self, obj):
        url = reverse('admin:inventory_item_change', args=[obj.item.pk])
        return format_html('<a href="{}">{}</a>', url, obj.item.name)
    item_link.short_description = 'Item'


class PurchaseOrderLineItemInline(admin.TabularInline):
    model = PurchaseOrderLineItem
    extra = 1
    fields = ['item', 'quantity_ordered', 'quantity_received', 'unit_cost', 'total_amount']
    readonly_fields = ['total_amount']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['po_number', 'supplier', 'status', 'order_date', 'expected_delivery_date', 'total_amount', 'items_count']
    list_filter = ['status', 'order_date', 'expected_delivery_date', 'created_at']
    search_fields = ['po_number', 'supplier__name', 'notes']
    readonly_fields = ['po_number', 'subtotal', 'total_amount', 'created_at', 'updated_at']
    inlines = [PurchaseOrderLineItemInline]
    date_hierarchy = 'order_date'
    
    fieldsets = (
        ('Purchase Order Information', {
            'fields': ('po_number', 'supplier', 'status')
        }),
        ('Dates', {
            'fields': ('order_date', 'expected_delivery_date', 'actual_delivery_date')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax_amount', 'shipping_cost', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('shipping_address', 'notes', 'terms'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def items_count(self, obj):
        return obj.line_items.count()
    items_count.short_description = 'Items'
    
    actions = ['mark_as_sent', 'mark_as_confirmed', 'mark_as_received']
    
    def mark_as_sent(self, request, queryset):
        count = queryset.update(status='sent')
        self.message_user(request, f'{count} purchase orders marked as sent.')
    mark_as_sent.short_description = "Mark selected POs as sent"
    
    def mark_as_confirmed(self, request, queryset):
        count = queryset.update(status='confirmed')
        self.message_user(request, f'{count} purchase orders marked as confirmed.')
    mark_as_confirmed.short_description = "Mark selected POs as confirmed"
    
    def mark_as_received(self, request, queryset):
        count = queryset.update(status='received')
        self.message_user(request, f'{count} purchase orders marked as received.')
    mark_as_received.short_description = "Mark selected POs as received"


class InventoryAdjustmentLineItemInline(admin.TabularInline):
    model = InventoryAdjustmentLineItem
    extra = 1
    fields = ['item', 'quantity_before', 'quantity_after', 'quantity_difference', 'unit_cost', 'reason']
    readonly_fields = ['quantity_difference']


@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['adjustment_id_short', 'adjustment_type', 'description', 'adjustment_date', 'approved', 'created_by']
    list_filter = ['adjustment_type', 'approved', 'adjustment_date', 'created_at']
    search_fields = ['description', 'notes']
    readonly_fields = ['adjustment_id', 'total_value_impact', 'created_at', 'updated_at']
    inlines = [InventoryAdjustmentLineItemInline]
    date_hierarchy = 'adjustment_date'
    
    fieldsets = (
        ('Adjustment Information', {
            'fields': ('adjustment_id', 'adjustment_type', 'adjustment_date', 'description')
        }),
        ('Details', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Approval', {
            'fields': ('approved', 'approved_by', 'approved_date')
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def adjustment_id_short(self, obj):
        return obj.adjustment_id.hex[:8]
    adjustment_id_short.short_description = 'Adjustment ID'
    
    def total_value_impact(self, obj):
        return sum(item.total_value_impact for item in obj.line_items.all())
    total_value_impact.short_description = 'Total Value Impact'
    
    actions = ['approve_adjustments']
    
    def approve_adjustments(self, request, queryset):
        approved_count = 0
        for adjustment in queryset.filter(approved=False):
            # Apply adjustments to item stocks
            for line_item in adjustment.line_items.all():
                line_item.item.current_stock = line_item.quantity_after
                line_item.item.save()
            
            # Mark as approved
            adjustment.approved = True
            adjustment.approved_by = request.user
            adjustment.save()
            approved_count += 1
        
        self.message_user(request, f'{approved_count} adjustments approved and applied.')
    approve_adjustments.short_description = "Approve and apply selected adjustments"
