from django.db import models
from django.conf import settings
from phonenumber_field.modelfields import PhoneNumberField


class Customer(models.Model):
    CUSTOMER_TYPE_CHOICES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
    ]
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = PhoneNumberField()
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='residential')
    
    # Address
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    
    # Business info (for commercial customers)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    # Preferences
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=[('email', 'Email'), ('phone', 'Phone'), ('text', 'Text')],
        default='phone'
    )
    
    class Meta:
        ordering = ['last_name', 'first_name']
        
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_address(self):
        return f"{self.street_address}, {self.city}, {self.state} {self.zip_code}"


class Property(models.Model):
    PROPERTY_TYPE_CHOICES = [
        ('single_family', 'Single Family Home'),
        ('townhouse', 'Townhouse'),
        ('condo', 'Condominium'),
        ('apartment', 'Apartment'),
        ('commercial', 'Commercial Building'),
        ('industrial', 'Industrial'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='properties')
    
    # Property details
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPE_CHOICES)
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    
    # Location coordinates (for routing optimization)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Property specifications
    square_footage = models.PositiveIntegerField(null=True, blank=True)
    year_built = models.PositiveIntegerField(null=True, blank=True)
    bedrooms = models.PositiveIntegerField(null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    
    # Electrical system info
    main_panel_brand = models.CharField(max_length=100, blank=True)
    main_panel_amperage = models.PositiveIntegerField(null=True, blank=True)
    main_panel_age = models.PositiveIntegerField(null=True, blank=True, help_text="Age in years")
    has_gfci_outlets = models.BooleanField(default=False)
    has_afci_breakers = models.BooleanField(default=False)
    electrical_last_updated = models.DateField(null=True, blank=True)
    
    # Access info
    gate_code = models.CharField(max_length=50, blank=True)
    access_instructions = models.TextField(blank=True)
    key_location = models.CharField(max_length=200, blank=True)
    
    # Emergency contacts
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = PhoneNumberField(blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Properties"
        ordering = ['street_address']
        
    def __str__(self):
        return f"{self.street_address} - {self.customer.full_name}"
    
    @property
    def full_address(self):
        return f"{self.street_address}, {self.city}, {self.state} {self.zip_code}"


class CustomerContact(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('primary', 'Primary Contact'),
        ('secondary', 'Secondary Contact'),
        ('emergency', 'Emergency Contact'),
        ('billing', 'Billing Contact'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='contacts')
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPE_CHOICES)
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = PhoneNumberField()
    relationship = models.CharField(max_length=100, blank=True, help_text="Relationship to customer")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['customer', 'contact_type']
        
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.contact_type})"


class CustomerReview(models.Model):
    RATING_CHOICES = [
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    review_text = models.TextField()
    source = models.CharField(max_length=100, default='Internal')  # Google, Yelp, etc.
    
    # Sentiment analysis (AI-powered)
    sentiment_score = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    sentiment_label = models.CharField(
        max_length=20,
        choices=[('positive', 'Positive'), ('neutral', 'Neutral'), ('negative', 'Negative')],
        null=True, blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.customer.full_name} - {self.rating} stars"
