from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Customer, Property, CustomerContact, CustomerReview
from .serializers import (
    CustomerSerializer, CustomerListSerializer, CustomerCreateSerializer,
    PropertySerializer, CustomerContactSerializer, CustomerReviewSerializer
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
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
    
    @action(detail=True, methods=['get'])
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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['property_type', 'city', 'state', 'customer']
    search_fields = ['street_address', 'city', 'main_panel_brand']
    
    def get_queryset(self):
        return Property.objects.select_related('customer')


class CustomerContactViewSet(viewsets.ModelViewSet):
    queryset = CustomerContact.objects.all()
    serializer_class = CustomerContactSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contact_type', 'customer']


class CustomerReviewViewSet(viewsets.ModelViewSet):
    queryset = CustomerReview.objects.all()
    serializer_class = CustomerReviewSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['rating', 'source', 'sentiment_label', 'customer']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return CustomerReview.objects.select_related('customer')
