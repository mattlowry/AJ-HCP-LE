from django.contrib import admin
from .models import Customer, Property, CustomerContact, CustomerReview


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone', 'customer_type', 'city', 'state', 'created_at']
    list_filter = ['customer_type', 'state', 'preferred_contact_method', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'company_name', 'street_address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'customer_type')
        }),
        ('Address', {
            'fields': ('street_address', 'city', 'state', 'zip_code')
        }),
        ('Business Info', {
            'fields': ('company_name',),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('preferred_contact_method', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['full_address', 'customer', 'property_type', 'main_panel_brand', 'main_panel_amperage']
    list_filter = ['property_type', 'state', 'main_panel_brand', 'has_gfci_outlets', 'has_afci_breakers']
    search_fields = ['street_address', 'city', 'customer__first_name', 'customer__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Property Details', {
            'fields': ('customer', 'property_type', 'street_address', 'city', 'state', 'zip_code')
        }),
        ('Specifications', {
            'fields': ('square_footage', 'year_built', 'bedrooms', 'bathrooms')
        }),
        ('Electrical System', {
            'fields': ('main_panel_brand', 'main_panel_amperage', 'main_panel_age', 
                      'has_gfci_outlets', 'has_afci_breakers', 'electrical_last_updated')
        }),
        ('Access Information', {
            'fields': ('gate_code', 'access_instructions', 'key_location'),
            'classes': ('collapse',)
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'),
            'classes': ('collapse',)
        }),
        ('Notes & Metadata', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(CustomerContact)
class CustomerContactAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'customer', 'contact_type', 'phone', 'email']
    list_filter = ['contact_type', 'created_at']
    search_fields = ['first_name', 'last_name', 'customer__first_name', 'customer__last_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CustomerReview)
class CustomerReviewAdmin(admin.ModelAdmin):
    list_display = ['customer', 'rating', 'source', 'sentiment_label', 'created_at']
    list_filter = ['rating', 'source', 'sentiment_label', 'created_at']
    search_fields = ['customer__first_name', 'customer__last_name', 'review_text']
    readonly_fields = ['created_at', 'updated_at', 'sentiment_score', 'sentiment_label']
    
    fieldsets = (
        ('Review Information', {
            'fields': ('customer', 'rating', 'review_text', 'source')
        }),
        ('AI Analysis', {
            'fields': ('sentiment_score', 'sentiment_label'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
