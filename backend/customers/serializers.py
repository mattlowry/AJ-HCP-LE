from rest_framework import serializers
from .models import Customer, Property, CustomerContact, CustomerReview


class CustomerContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerContact
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CustomerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerReview
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'sentiment_score', 'sentiment_label')


class PropertySerializer(serializers.ModelSerializer):
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    full_address = serializers.ReadOnlyField()
    properties = PropertySerializer(many=True, read_only=True)
    contacts = CustomerContactSerializer(many=True, read_only=True)
    reviews = CustomerReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CustomerListSerializer(serializers.ModelSerializer):
    """Simplified serializer for customer list views"""
    full_name = serializers.ReadOnlyField()
    full_address = serializers.ReadOnlyField()
    property_count = serializers.SerializerMethodField()
    last_job_date = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'email', 'phone', 'customer_type', 
                 'full_address', 'property_count', 'last_job_date', 'created_at']
    
    def get_property_count(self, obj):
        return obj.properties.count()
    
    def get_last_job_date(self, obj):
        # This will be implemented when we create the jobs app
        return None


class CustomerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating customers with nested data"""
    properties = PropertySerializer(many=True, required=False)
    contacts = CustomerContactSerializer(many=True, required=False)
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def create(self, validated_data):
        properties_data = validated_data.pop('properties', [])
        contacts_data = validated_data.pop('contacts', [])
        
        customer = Customer.objects.create(**validated_data)
        
        for property_data in properties_data:
            Property.objects.create(customer=customer, **property_data)
        
        for contact_data in contacts_data:
            CustomerContact.objects.create(customer=customer, **contact_data)
        
        return customer