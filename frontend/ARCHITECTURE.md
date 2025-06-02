# AJ Long Electric FSM - Architecture Documentation

This document provides a comprehensive overview of the Field Service Management system architecture, design patterns, and technical decisions.

## System Overview

The AJ Long Electric FSM is a full-stack web application designed to manage electrical service operations, customer relationships, job scheduling, inventory, and billing. The system follows a modern, scalable architecture with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   React/TS      │◄──►│  Django/Python  │◄──►│  PostgreSQL     │
│   Material-UI   │    │   REST API      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   File Storage  │    │   Cache Layer   │
│   (CloudFront)  │    │     (S3/Local)  │    │    (Redis)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context API + Custom Hooks
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Build Tool**: Create React App (CRA)
- **Testing**: Jest + React Testing Library

### Directory Structure

```
frontend/src/
├── components/           # Reusable UI components
│   ├── forms/           # Form-specific components
│   ├── layout/          # Layout components
│   └── common/          # Common/shared components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── services/            # API and external service integrations
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and helpers
├── __tests__/           # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
└── assets/             # Static assets (images, icons, etc.)
```

### Component Architecture

#### Component Hierarchy

```
App
├── ErrorBoundary
├── ThemeProvider
├── AuthProvider
└── Router
    ├── PublicRoutes
    │   ├── Login
    │   └── Registration
    └── ProtectedRoutes
        ├── MainLayout
        │   ├── Navigation
        │   ├── Header
        │   └── Outlet (Page Components)
        ├── Dashboard
        ├── CustomerManagement
        │   ├── CustomerList
        │   └── CustomerDetail
        ├── JobManagement
        │   ├── JobList
        │   ├── SchedulingCalendar
        │   └── JobDetail
        ├── InventoryManagement
        ├── BillingManagement
        └── Analytics
```

#### Component Design Patterns

1. **Container/Presentation Pattern**
   ```typescript
   // Container Component (handles logic)
   const CustomerListContainer: React.FC = () => {
     const [customers, setCustomers] = useState<Customer[]>([]);
     const [loading, setLoading] = useState(true);
     
     // Business logic here
     
     return (
       <CustomerListPresentation 
         customers={customers}
         loading={loading}
         onCustomerSelect={handleCustomerSelect}
       />
     );
   };
   
   // Presentation Component (handles UI)
   const CustomerListPresentation: React.FC<Props> = ({
     customers,
     loading,
     onCustomerSelect
   }) => {
     // Pure UI rendering
   };
   ```

2. **Compound Components Pattern**
   ```typescript
   // Usage
   <DataTable>
     <DataTable.Header>
       <DataTable.HeaderCell>Name</DataTable.HeaderCell>
       <DataTable.HeaderCell>Email</DataTable.HeaderCell>
     </DataTable.Header>
     <DataTable.Body>
       {data.map(item => (
         <DataTable.Row key={item.id}>
           <DataTable.Cell>{item.name}</DataTable.Cell>
           <DataTable.Cell>{item.email}</DataTable.Cell>
         </DataTable.Row>
       ))}
     </DataTable.Body>
   </DataTable>
   ```

3. **Render Props Pattern**
   ```typescript
   <DataFetcher
     url="/api/customers"
     render={({ data, loading, error }) => (
       loading ? <Spinner /> : <CustomerList customers={data} />
     )}
   />
   ```

### State Management Strategy

#### Context + Reducer Pattern

```typescript
// AuthContext.tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: true, 
        loading: false 
      };
    // ... other cases
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  const value = useMemo(() => ({
    ...state,
    login: (credentials: LoginCredentials) => {
      dispatch({ type: 'LOGIN_START' });
      // API call logic
    },
    logout: () => dispatch({ type: 'LOGOUT' })
  }), [state]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Custom Hooks for Business Logic

```typescript
// useCustomers.ts
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchCustomers = useCallback(async (params?: FetchParams) => {
    setLoading(true);
    try {
      const response = await customerApi.getAll(params);
      setCustomers(response.data.results);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  return {
    customers,
    loading,
    error,
    refetch: fetchCustomers,
    addCustomer: async (customer: CreateCustomerData) => {
      const response = await customerApi.create(customer);
      setCustomers(prev => [response.data, ...prev]);
    }
  };
};
```

### Performance Optimizations

1. **Code Splitting & Lazy Loading**
   ```typescript
   const CustomerDetail = lazy(() => import('./components/CustomerDetail'));
   const JobList = lazy(() => import('./components/JobList'));
   
   // Route-level splitting
   <Route 
     path="/customers/:id" 
     element={
       <Suspense fallback={<LoadingSpinner />}>
         <CustomerDetail />
       </Suspense>
     } 
   />
   ```

2. **Memoization Strategies**
   ```typescript
   // Component memoization
   const CustomerCard = React.memo<CustomerCardProps>(({ customer, onClick }) => {
     return (
       <Card onClick={() => onClick(customer.id)}>
         {/* Component content */}
       </Card>
     );
   });
   
   // Expensive calculations
   const expensiveValue = useMemo(() => {
     return customers.reduce((acc, customer) => {
       return acc + customer.totalJobs;
     }, 0);
   }, [customers]);
   
   // Callback memoization
   const handleCustomerClick = useCallback((customerId: number) => {
     navigate(`/customers/${customerId}`);
   }, [navigate]);
   ```

3. **Virtual Scrolling for Large Lists**
   ```typescript
   const VirtualizedCustomerList: React.FC = () => {
     const { virtualItems, totalSize } = useVirtualization({
       itemCount: customers.length,
       itemHeight: 120,
       containerHeight: 600
     });
     
     return (
       <div style={{ height: 600, overflow: 'auto' }}>
         <div style={{ height: totalSize }}>
           {virtualItems.map(({ index, start, size }) => (
             <CustomerCard
               key={customers[index].id}
               customer={customers[index]}
               style={{
                 position: 'absolute',
                 top: start,
                 height: size,
                 width: '100%'
               }}
             />
           ))}
         </div>
       </div>
     );
   };
   ```

## Backend Architecture

### Technology Stack

- **Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL 14+
- **Cache**: Redis
- **Task Queue**: Celery (for async tasks)
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 or local filesystem
- **Testing**: pytest + Factory Boy

### Django Project Structure

```
backend/
├── fsm_core/              # Main Django project
│   ├── settings/         # Split settings (dev, prod, test)
│   ├── urls.py          # Root URL configuration
│   └── wsgi.py          # WSGI application
├── apps/                 # Django applications
│   ├── customers/       # Customer management
│   ├── jobs/           # Job and scheduling
│   ├── inventory/      # Inventory management
│   ├── billing/        # Billing and invoicing
│   ├── analytics/      # Analytics and reporting
│   └── users/          # User management
├── common/              # Shared utilities
│   ├── models.py       # Abstract base models
│   ├── permissions.py  # Custom permissions
│   ├── serializers.py  # Base serializers
│   └── utils.py        # Utility functions
├── fixtures/           # Sample data
├── static/            # Static files
├── media/             # User uploads
└── requirements/      # Dependencies (base, dev, prod)
```

### Model Architecture

#### Base Models

```python
# common/models.py
class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = SoftDeleteManager()
    all_objects = models.Manager()
    
    class Meta:
        abstract = True
    
    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()
```

#### Domain Models

```python
# customers/models.py
class Customer(TimestampedModel, SoftDeleteModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    
    # Address information
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    
    # Business fields
    customer_type = models.CharField(
        max_length=20,
        choices=CustomerType.choices,
        default=CustomerType.RESIDENTIAL
    )
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=ContactMethod.choices,
        default=ContactMethod.PHONE
    )
    
    # Relationships
    properties = models.ManyToManyField('Property', related_name='customers')
    
    class Meta:
        db_table = 'customers'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['customer_type']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_active_jobs(self):
        return self.jobs.filter(
            status__in=[JobStatus.SCHEDULED, JobStatus.IN_PROGRESS]
        )
```

### API Design

#### RESTful API Structure

```python
# customers/urls.py
urlpatterns = [
    path('', CustomerListCreateView.as_view(), name='customer-list-create'),
    path('<int:pk>/', CustomerDetailView.as_view(), name='customer-detail'),
    path('<int:pk>/properties/', PropertyListView.as_view(), name='customer-properties'),
    path('<int:pk>/jobs/', CustomerJobListView.as_view(), name='customer-jobs'),
    path('<int:pk>/add_property/', AddPropertyView.as_view(), name='add-property'),
]
```

#### ViewSet Implementation

```python
# customers/views.py
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related().prefetch_related('properties')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, CustomerPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'last_name', 'customer_type']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Apply user-specific filtering
        if self.request.user.role == UserRole.TECHNICIAN:
            queryset = queryset.filter(
                jobs__assigned_technicians=self.request.user
            ).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CustomerWriteSerializer
        return CustomerReadSerializer
    
    @action(detail=True, methods=['post'])
    def add_property(self, request, pk=None):
        customer = self.get_object()
        serializer = PropertySerializer(data=request.data)
        
        if serializer.is_valid():
            property_obj = serializer.save()
            customer.properties.add(property_obj)
            return Response(
                PropertySerializer(property_obj).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

#### Serializer Design

```python
# customers/serializers.py
class CustomerReadSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    properties_count = serializers.SerializerMethodField()
    active_jobs_count = serializers.SerializerMethodField()
    recent_jobs = JobSummarySerializer(many=True, read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 'phone',
            'address', 'city', 'state', 'zip_code', 'customer_type',
            'properties_count', 'active_jobs_count', 'recent_jobs',
            'created_at', 'updated_at'
        ]
    
    def get_properties_count(self, obj):
        return obj.properties.count()
    
    def get_active_jobs_count(self, obj):
        return obj.get_active_jobs().count()

class CustomerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'address', 'city', 'state', 'zip_code', 'customer_type',
            'preferred_contact_method'
        ]
    
    def validate_email(self, value):
        if Customer.objects.filter(email=value).exists():
            raise serializers.ValidationError("Customer with this email already exists.")
        return value
```

### Authentication & Authorization

#### JWT Authentication

```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Custom user model
class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    phone = models.CharField(max_length=20, blank=True)
    is_active_technician = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
```

#### Role-Based Permissions

```python
# common/permissions.py
class RoleBasedPermission(BasePermission):
    required_roles = []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        return request.user.role in self.required_roles

class CustomerPermission(RoleBasedPermission):
    def has_permission(self, request, view):
        # All authenticated users can view customers
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        
        # Only admin and managers can modify
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]

class JobPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Technicians can only access their assigned jobs
        if request.user.role == UserRole.TECHNICIAN:
            return request.user in obj.assigned_technicians.all()
        
        # Admin and managers can access all jobs
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]
```

## Database Design

### Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Users     │    │  Customers  │    │ Properties  │
│             │    │             │    │             │
│ - id        │    │ - id        │    │ - id        │
│ - email     │◄──►│ - email     │◄──►│ - address   │
│ - role      │    │ - name      │    │ - type      │
│ - phone     │    │ - phone     │    │ - notes     │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Jobs     │    │  Materials  │    │ Inventory   │
│             │    │             │    │             │
│ - id        │    │ - id        │    │ - id        │
│ - title     │◄──►│ - name      │◄──►│ - quantity  │
│ - status    │    │ - cost      │    │ - location  │
│ - scheduled │    │ - markup    │    │ - alerts    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐    ┌─────────────┐
│  Invoices   │    │   Reports   │
│             │    │             │
│ - id        │    │ - id        │
│ - amount    │    │ - type      │
│ - status    │    │ - data      │
│ - due_date  │    │ - generated │
└─────────────┘    └─────────────┘
```

### Database Optimization

#### Indexing Strategy

```python
# Strategic indexes for performance
class Customer(models.Model):
    class Meta:
        indexes = [
            # Search optimization
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['email']),
            
            # Filtering optimization
            models.Index(fields=['customer_type', 'created_at']),
            models.Index(fields=['city', 'state']),
            
            # Composite indexes for common queries
            models.Index(
                fields=['customer_type', 'is_deleted', 'created_at'],
                name='customer_active_by_type_date'
            ),
        ]

class Job(models.Model):
    class Meta:
        indexes = [
            # Status and date queries
            models.Index(fields=['status', 'scheduled_date']),
            models.Index(fields=['customer', 'status']),
            
            # Technician assignment queries
            models.Index(fields=['assigned_technicians', 'scheduled_date']),
            
            # Date range queries
            models.Index(fields=['scheduled_date', 'status']),
            models.Index(fields=['created_at', 'customer']),
        ]
```

#### Query Optimization

```python
# Optimized querysets with select_related and prefetch_related
class CustomerViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Customer.objects.select_related(
            'primary_contact'
        ).prefetch_related(
            'properties',
            'jobs__assigned_technicians',
            'jobs__materials'
        ).annotate(
            jobs_count=Count('jobs'),
            active_jobs_count=Count(
                'jobs',
                filter=Q(jobs__status__in=['scheduled', 'in_progress'])
            ),
            total_revenue=Sum('jobs__invoices__amount')
        )

# Custom managers for common queries
class JobManager(models.Manager):
    def with_related(self):
        return self.select_related(
            'customer',
            'property',
            'created_by'
        ).prefetch_related(
            'assigned_technicians',
            'materials',
            'invoices'
        )
    
    def scheduled_for_date(self, date):
        return self.filter(
            scheduled_date__date=date,
            status__in=['scheduled', 'in_progress']
        ).with_related()
    
    def for_technician(self, technician):
        return self.filter(
            assigned_technicians=technician
        ).with_related()
```

## Integration Architecture

### API Integration Points

#### External Services

1. **Email Service (SendGrid/AWS SES)**
   ```python
   # common/services/email.py
   class EmailService:
       def __init__(self):
           self.client = sendgrid.SendGridAPIClient(
               api_key=settings.SENDGRID_API_KEY
           )
       
       def send_job_notification(self, job, recipient):
           template_data = {
               'customer_name': job.customer.full_name,
               'job_title': job.title,
               'scheduled_date': job.scheduled_date.strftime('%Y-%m-%d'),
               'technician_name': job.primary_technician.full_name
           }
           
           message = Mail(
               from_email=settings.DEFAULT_FROM_EMAIL,
               to_emails=recipient,
               subject=f"Job Scheduled: {job.title}",
               html_content=render_to_string(
                   'emails/job_notification.html',
                   template_data
               )
           )
           
           self.client.send(message)
   ```

2. **SMS Service (Twilio)**
   ```python
   # common/services/sms.py
   class SMSService:
       def __init__(self):
           self.client = Client(
               settings.TWILIO_ACCOUNT_SID,
               settings.TWILIO_AUTH_TOKEN
           )
       
       def send_job_reminder(self, job, phone_number):
           message = self.client.messages.create(
               body=f"Reminder: You have a job scheduled tomorrow - {job.title}",
               from_=settings.TWILIO_PHONE_NUMBER,
               to=phone_number
           )
           return message.sid
   ```

3. **Maps Integration (Google Maps)**
   ```typescript
   // services/maps.ts
   export class MapsService {
     private apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
     
     async geocodeAddress(address: string): Promise<Coordinates> {
       const response = await fetch(
         `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
       );
       const data = await response.json();
       
       if (data.results.length > 0) {
         const { lat, lng } = data.results[0].geometry.location;
         return { latitude: lat, longitude: lng };
       }
       
       throw new Error('Address not found');
     }
     
     calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteInfo> {
       // Implementation for route calculation
     }
   }
   ```

### Webhook Architecture

```python
# webhooks/views.py
class WebhookView(APIView):
    authentication_classes = []
    permission_classes = []
    
    def post(self, request, webhook_type):
        # Verify webhook signature
        if not self.verify_signature(request):
            return Response(
                {'error': 'Invalid signature'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Process webhook based on type
        handler = self.get_webhook_handler(webhook_type)
        if handler:
            handler.process(request.data)
            return Response({'status': 'processed'})
        
        return Response(
            {'error': 'Unknown webhook type'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def verify_signature(self, request):
        # Implement signature verification
        pass
    
    def get_webhook_handler(self, webhook_type):
        handlers = {
            'payment_completed': PaymentWebhookHandler(),
            'email_delivered': EmailWebhookHandler(),
            'sms_delivered': SMSWebhookHandler(),
        }
        return handlers.get(webhook_type)
```

## Testing Architecture

### Testing Strategy

1. **Unit Tests**: Individual components and functions
2. **Integration Tests**: Component interactions and API endpoints
3. **End-to-End Tests**: Complete user workflows
4. **Performance Tests**: Load testing and performance benchmarks

### Frontend Testing

```typescript
// __tests__/unit/useCustomers.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCustomers } from '../../hooks/useCustomers';
import { customerApi } from '../../services/api';

jest.mock('../../services/api');
const mockCustomerApi = customerApi as jest.Mocked<typeof customerApi>;

describe('useCustomers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch customers on mount', async () => {
    const mockCustomers = [
      { id: 1, name: 'John Doe', email: 'john@example.com' }
    ];
    
    mockCustomerApi.getAll.mockResolvedValue({
      data: { results: mockCustomers }
    });

    const { result } = renderHook(() => useCustomers());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.customers).toEqual(mockCustomers);
    expect(mockCustomerApi.getAll).toHaveBeenCalledTimes(1);
  });
});
```

### Backend Testing

```python
# customers/tests/test_views.py
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from customers.models import Customer
from customers.factories import CustomerFactory, UserFactory

User = get_user_model()

class CustomerViewSetTest(APITestCase):
    def setUp(self):
        self.admin_user = UserFactory(role='admin')
        self.technician_user = UserFactory(role='technician')
        self.customer = CustomerFactory()
    
    def test_admin_can_create_customer(self):
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'phone': '555-1234'
        }
        
        url = reverse('customer-list-create')
        response = self.client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Customer.objects.filter(email='jane@example.com').exists()
    
    def test_technician_cannot_create_customer(self):
        self.client.force_authenticate(user=self.technician_user)
        
        data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane@example.com',
            'phone': '555-1234'
        }
        
        url = reverse('customer-list-create')
        response = self.client.post(url, data)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.django_db
    def test_customer_search(self):
        CustomerFactory(first_name='John', last_name='Doe')
        CustomerFactory(first_name='Jane', last_name='Smith')
        
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('customer-list-create')
        response = self.client.get(url, {'search': 'John'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['first_name'] == 'John'
```

## Security Architecture

### Security Layers

1. **Network Security**: HTTPS, firewall rules, VPN access
2. **Authentication**: JWT tokens, multi-factor authentication
3. **Authorization**: Role-based access control (RBAC)
4. **Data Protection**: Encryption at rest and in transit
5. **Input Validation**: Comprehensive input sanitization
6. **Audit Logging**: Complete audit trail of all actions

### Implementation Details

```python
# Security middleware
class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response['Content-Security-Policy'] = self.get_csp_header()
        
        return response
    
    def get_csp_header(self):
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.ajlongelectric.com;"
        )
```

## Deployment Architecture

### Infrastructure Components

1. **Load Balancer**: Distributes traffic across multiple instances
2. **Application Servers**: Django application running on multiple containers
3. **Database**: Primary PostgreSQL with read replicas
4. **Cache Layer**: Redis for session storage and caching
5. **File Storage**: S3 for static files and user uploads
6. **Monitoring**: Application performance monitoring and logging

### Scalability Considerations

1. **Horizontal Scaling**: Multiple application instances behind load balancer
2. **Database Scaling**: Read replicas for read-heavy operations
3. **Caching Strategy**: Multi-level caching (Redis, CDN, browser cache)
4. **Asynchronous Processing**: Celery for background tasks
5. **Microservices Migration**: Future migration path to microservices

This architecture documentation provides a comprehensive overview of the system design, enabling developers to understand the codebase structure, make informed decisions, and contribute effectively to the project.