from rest_framework import serializers
from .models import Customer, Property, CustomerContact, CustomerReview
import phonenumbers
from phonenumbers import PhoneNumberFormat


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
    phone = serializers.CharField()
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def validate_phone(self, value):
        """Custom phone validation that's more lenient"""
        try:
            # Try to parse as US number if no country code
            if not value.startswith('+'):
                # Remove any formatting and add US country code
                cleaned = ''.join(filter(str.isdigit, value))
                if len(cleaned) == 10:
                    value = f'+1{cleaned}'
                elif len(cleaned) == 11 and cleaned.startswith('1'):
                    value = f'+{cleaned}'
            
            # Parse and validate
            parsed = phonenumbers.parse(value, 'US')
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
            else:
                raise serializers.ValidationError("Invalid phone number format")
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Invalid phone number format")
        return value


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
11

class CustomerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating customers with nested data"""
    properties = PropertySerializer(many=True, required=False)
    contacts = CustomerContactSerializer(many=True, required=False)
    phone = serializers.CharField()
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
    
    def validate_phone(self, value):
        """Custom phone validation that's more lenient"""
        try:
            # Try to parse as US number if no country code
            if not value.startswith('+'):
                # Remove any formatting and add US country code
                cleaned = ''.join(filter(str.isdigit, value))
                if len(cleaned) == 10:
                    value = f'+1{cleaned}'
                elif len(cleaned) == 11 and cleaned.startswith('1'):
                    value = f'+{cleaned}'
            
            # Parse and validate
            parsed = phonenumbers.parse(value, 'US')
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
            else:
                raise serializers.ValidationError("Invalid phone number format")
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError("Invalid phone number format")
        return value
    
    def create(self, validated_data):
        properties_data = validated_data.pop('properties', [])
        contacts_data = validated_data.pop('contacts', [])
        
        customer = Customer.objects.create(**validated_data)
        
        for property_data in properties_data:
            Property.objects.create(customer=customer, **property_data)
        
        for contact_data in contacts_data:
            CustomerContact.objects.create(customer=customer, **contact_data)
        
        return customer