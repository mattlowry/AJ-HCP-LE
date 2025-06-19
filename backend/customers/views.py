from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Customer, Property, CustomerContact, CustomerReview
from .serializers import (
    CustomerSerializer, CustomerListSerializer, CustomerCreateSerializer,
    PropertySerializer, CustomerContactSerializer, CustomerReviewSerializer
)

# Import cache decorators with error handling
try:
    from fsm_core.cache_decorators import cache_customer_data, cache_model_list, cache_model_detail
    from fsm_core.cache_utils import CacheManager
    CACHE_AVAILABLE = True
except ImportError as e:
    print(f"Cache decorators not available: {e}")
    # Define dummy decorators that do nothing
    def cache_customer_data(func):
        return func
    def cache_model_list(model_name, timeout=None, per_user=False):
        def decorator(func):
            return func
        return decorator
    def cache_model_detail(model_name, timeout=None):
        def decorator(func):
            return func
        return decorator
    CACHE_AVAILABLE = False


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer_type', 'state', 'city']
    search_fields = ['first_name', 'last_name', 'email', 'company_name', 'street_address']
    ordering_fields = ['created_at', 'last_name', 'first_name']
    ordering = ['last_name', 'first_name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        elif self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer
    
    @cache_model_list(model_name='customer', per_user=True)
    def list(self, request, *args, **kwargs):
        """Cached customer list"""
        return super().list(request, *args, **kwargs)
    
    @cache_model_detail()
    def retrieve(self, request, *args, **kwargs):
        """Cached customer detail"""
        return super().retrieve(request, *args, **kwargs)
    
    def get_queryset(self):
        queryset = Customer.objects.prefetch_related('properties', 'contacts', 'reviews')
        
        # Custom filtering
        customer_type = self.request.query_params.get('customer_type', None)
        if customer_type:
            queryset = queryset.filter(customer_type=customer_type)
        
        # Search across multiple fields
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(company_name__icontains=search) |
                Q(street_address__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Invalidate cache when creating customer"""
        customer = serializer.save()
        CacheManager.warm_customer_cache(customer.id)
    
    def perform_update(self, serializer):
        """Invalidate cache when updating customer"""
        customer = serializer.save()
        CacheManager.invalidate_customer_cache(customer.id)
        CacheManager.warm_customer_cache(customer.id)
    
    def perform_destroy(self, instance):
        """Invalidate cache when deleting customer"""
        CacheManager.invalidate_customer_cache(instance.id)
        super().perform_destroy(instance)
    
    @action(detail=True, methods=['get'])
    @cache_customer_data()
    def properties(self, request, pk=None):
        """Get all properties for a customer"""
        customer = self.get_object()
        properties = customer.properties.all()
        serializer = PropertySerializer(properties, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        """Add a new property to a customer"""
        customer = self.get_object()
        serializer = PropertySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=customer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def contacts(self, request, pk=None):
        """Get all contacts for a customer"""
        customer = self.get_object()
        contacts = customer.contacts.all()
        serializer = CustomerContactSerializer(contacts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        """Add a new contact to a customer"""
        customer = self.get_object()
        serializer = CustomerContactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=customer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get all reviews for a customer"""
        customer = self.get_object()
        reviews = customer.reviews.all()
        serializer = CustomerReviewSerializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_review(self, request, pk=None):
        """Add a new review for a customer"""
        customer = self.get_object()
        serializer = CustomerReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(customer=customer)
            # TODO: Add AI sentiment analysis here
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['property_type', 'city', 'state', 'customer']
    search_fields = ['street_address', 'city', 'main_panel_brand']
    
    def get_queryset(self):
        return Property.objects.select_related('customer')


class CustomerContactViewSet(viewsets.ModelViewSet):
    queryset = CustomerContact.objects.all()
    serializer_class = CustomerContactSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contact_type', 'customer']


class CustomerReviewViewSet(viewsets.ModelViewSet):
    queryset = CustomerReview.objects.all()
    serializer_class = CustomerReviewSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rating', 'source', 'sentiment_label', 'customer']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return CustomerReview.objects.select_related('customer')
