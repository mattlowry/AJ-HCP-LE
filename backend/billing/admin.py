from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import TaxRate, Invoice, InvoiceLineItem, Payment, Estimate, EstimateLineItem, BillingSettings


@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = ['name', 'rate_percentage', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'rate_percentage', 'jurisdiction', 'is_active')
        }),
        ('Dates', {
            'fields': ('effective_date', 'end_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    fields = ['description', 'quantity', 'unit_price', 'tax_rate', 'total_amount']
    readonly_fields = ['total_amount']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_link', 'status', 'total_amount', 'invoice_date', 'due_date']
    list_filter = ['status', 'invoice_date', 'due_date', 'created_at']
    search_fields = ['invoice_number', 'customer__first_name', 'customer__last_name', 'customer__email']
    readonly_fields = ['invoice_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    inlines = [InvoiceLineItemInline]
    date_hierarchy = 'invoice_date'
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'customer', 'job', 'status')
        }),
        ('Dates', {
            'fields': ('invoice_date', 'due_date', 'payment_terms')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax_amount', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_link(self, obj):
        if obj.customer:
            url = reverse('admin:customers_customer_change', args=[obj.customer.pk])
            return format_html('<a href="{}">{}</a>', url, obj.customer)
        return '-'
    customer_link.short_description = 'Customer'
    
    actions = ['mark_as_sent', 'mark_as_paid', 'mark_as_overdue']
    
    def mark_as_sent(self, request, queryset):
        queryset.update(status='sent')
    mark_as_sent.short_description = "Mark selected invoices as sent"
    
    def mark_as_paid(self, request, queryset):
        queryset.update(status='paid')
    mark_as_paid.short_description = "Mark selected invoices as paid"
    
    def mark_as_overdue(self, request, queryset):
        queryset.update(status='overdue')
    mark_as_overdue.short_description = "Mark selected invoices as overdue"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'invoice_link', 'amount', 'payment_method', 'payment_date', 'status']
    list_filter = ['payment_method', 'status', 'payment_date', 'created_at']
    search_fields = ['reference_number', 'invoice__invoice_number', 'transaction_id']
    readonly_fields = ['reference_number', 'created_at', 'updated_at']
    date_hierarchy = 'payment_date'
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('reference_number', 'invoice', 'amount', 'payment_method', 'payment_date', 'status')
        }),
        ('Transaction Details', {
            'fields': ('transaction_id', 'gateway_response'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def invoice_link(self, obj):
        if obj.invoice:
            url = reverse('admin:billing_invoice_change', args=[obj.invoice.pk])
            return format_html('<a href="{}">{}</a>', url, obj.invoice.invoice_number)
        return '-'
    invoice_link.short_description = 'Invoice'


class EstimateLineItemInline(admin.TabularInline):
    model = EstimateLineItem
    extra = 1
    fields = ['description', 'quantity', 'unit_price', 'tax_rate', 'total_amount']
    readonly_fields = ['total_amount']


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ['estimate_number', 'customer_link', 'status', 'total_amount', 'estimate_date', 'expiration_date']
    list_filter = ['status', 'estimate_date', 'expiration_date', 'created_at']
    search_fields = ['estimate_number', 'customer__first_name', 'customer__last_name', 'customer__email']
    readonly_fields = ['estimate_number', 'subtotal', 'tax_amount', 'total_amount', 'created_at', 'updated_at']
    inlines = [EstimateLineItemInline]
    date_hierarchy = 'estimate_date'
    
    fieldsets = (
        ('Estimate Information', {
            'fields': ('estimate_number', 'customer', 'status')
        }),
        ('Dates', {
            'fields': ('estimate_date', 'expiration_date')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax_amount', 'total_amount'),
            'classes': ('collapse',)
        }),
        ('Content', {
            'fields': ('description', 'notes', 'terms_and_conditions'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_link(self, obj):
        if obj.customer:
            url = reverse('admin:customers_customer_change', args=[obj.customer.pk])
            return format_html('<a href="{}">{}</a>', url, obj.customer)
        return '-'
    customer_link.short_description = 'Customer'
    
    actions = ['mark_as_sent', 'mark_as_accepted', 'mark_as_declined', 'convert_to_invoice']
    
    def mark_as_sent(self, request, queryset):
        queryset.update(status='sent')
    mark_as_sent.short_description = "Mark selected estimates as sent"
    
    def mark_as_accepted(self, request, queryset):
        queryset.update(status='accepted')
    mark_as_accepted.short_description = "Mark selected estimates as accepted"
    
    def mark_as_declined(self, request, queryset):
        queryset.update(status='declined')
    mark_as_declined.short_description = "Mark selected estimates as declined"
    
    def convert_to_invoice(self, request, queryset):
        converted_count = 0
        for estimate in queryset.filter(status='accepted'):
            estimate.convert_to_invoice()
            converted_count += 1
        self.message_user(request, f'{converted_count} estimates converted to invoices.')
    convert_to_invoice.short_description = "Convert accepted estimates to invoices"


@admin.register(BillingSettings)
class BillingSettingsAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'default_payment_terms', 'default_tax_rate', 'created_at']
    list_filter = ['default_payment_terms', 'created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('company_name', 'company_address', 'company_phone', 'company_email', 'company_website')
        }),
        ('Invoice Settings', {
            'fields': ('invoice_prefix', 'estimate_prefix', 'default_payment_terms')
        }),
        ('Tax Settings', {
            'fields': ('default_tax_rate',)
        }),
        ('Payment Settings', {
            'fields': ('late_fee_percentage', 'late_fee_grace_days'),
            'classes': ('collapse',)
        }),
        ('Default Terms', {
            'fields': ('default_invoice_terms', 'default_estimate_terms'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
