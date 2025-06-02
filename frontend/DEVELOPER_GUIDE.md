# AJ Long Electric FSM - Developer Guide

This guide helps developers get started with the Field Service Management system, understand the codebase, and contribute effectively.

## Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.11 or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher (optional, for caching)
- **Git**: Latest version

### Environment Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ajlongelectric/fsm-system.git
   cd fsm-system
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   
   # Load sample data (optional)
   python manage.py loaddata fixtures/sample_data.json
   
   # Start development server
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env.local
   # Edit .env.local with your API endpoint
   
   # Start development server
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

## Project Structure

```
fsm-system/
├── backend/                 # Django backend
│   ├── fsm_core/           # Main Django project
│   ├── apps/               # Django applications
│   │   ├── customers/      # Customer management
│   │   ├── jobs/          # Job scheduling
│   │   ├── inventory/     # Inventory management
│   │   ├── billing/       # Billing & invoicing
│   │   └── analytics/     # Analytics & reporting
│   ├── common/            # Shared utilities
│   ├── fixtures/          # Sample data
│   └── requirements/      # Dependencies
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── __tests__/     # Test files
│   ├── public/           # Static assets
│   └── package.json
├── docs/                 # Documentation
├── docker/              # Docker configurations
├── scripts/             # Build and deployment scripts
└── README.md
```

## Development Workflow

### Git Workflow

We use a feature branch workflow:

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/customer-property-management
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add property management to customer details"
   ```

3. **Push and Create Pull Request**
   ```bash
   git push origin feature/customer-property-management
   # Create PR through GitHub
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Code Standards

#### Frontend (TypeScript/React)

1. **Component Structure**
   ```typescript
   // components/CustomerCard.tsx
   import React from 'react';
   import { Card, CardContent, Typography } from '@mui/material';
   
   interface CustomerCardProps {
     customer: Customer;
     onClick: (customer: Customer) => void;
   }
   
   const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onClick }) => {
     return (
       <Card onClick={() => onClick(customer)}>
         <CardContent>
           <Typography variant="h6">
             {customer.first_name} {customer.last_name}
           </Typography>
           <Typography variant="body2" color="text.secondary">
             {customer.email}
           </Typography>
         </CardContent>
       </Card>
     );
   };
   
   export default CustomerCard;
   ```

2. **Custom Hooks**
   ```typescript
   // hooks/useCustomers.ts
   import { useState, useEffect } from 'react';
   import { customerApi } from '../services/api';
   
   export const useCustomers = () => {
     const [customers, setCustomers] = useState<Customer[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
   
     useEffect(() => {
       const fetchCustomers = async () => {
         try {
           setLoading(true);
           const response = await customerApi.getAll();
           setCustomers(response.data.results);
         } catch (err) {
           setError(err.message);
         } finally {
           setLoading(false);
         }
       };
   
       fetchCustomers();
     }, []);
   
     return { customers, loading, error };
   };
   ```

3. **Type Definitions**
   ```typescript
   // types/customer.ts
   export interface Customer {
     id: number;
     first_name: string;
     last_name: string;
     email: string;
     phone: string;
     address?: string;
     city?: string;
     state?: string;
     zip_code?: string;
     customer_type: 'residential' | 'commercial';
     created_at: string;
     updated_at: string;
   }
   
   export interface CreateCustomerData {
     first_name: string;
     last_name: string;
     email: string;
     phone: string;
     address?: string;
     city?: string;
     state?: string;
     zip_code?: string;
     customer_type: 'residential' | 'commercial';
   }
   ```

#### Backend (Python/Django)

1. **Model Definition**
   ```python
   # customers/models.py
   from django.db import models
   from common.models import TimestampedModel
   
   class Customer(TimestampedModel):
       class CustomerType(models.TextChoices):
           RESIDENTIAL = 'residential', 'Residential'
           COMMERCIAL = 'commercial', 'Commercial'
   
       first_name = models.CharField(max_length=100)
       last_name = models.CharField(max_length=100)
       email = models.EmailField(unique=True)
       phone = models.CharField(max_length=20)
       customer_type = models.CharField(
           max_length=20,
           choices=CustomerType.choices,
           default=CustomerType.RESIDENTIAL
       )
   
       class Meta:
           db_table = 'customers'
           indexes = [
               models.Index(fields=['email']),
               models.Index(fields=['last_name', 'first_name']),
           ]
   
       def __str__(self):
           return f"{self.first_name} {self.last_name}"
   ```

2. **API Views**
   ```python
   # customers/views.py
   from rest_framework import viewsets, status
   from rest_framework.decorators import action
   from rest_framework.response import Response
   from django_filters.rest_framework import DjangoFilterBackend
   
   from .models import Customer
   from .serializers import CustomerSerializer
   from .filters import CustomerFilter
   
   class CustomerViewSet(viewsets.ModelViewSet):
       queryset = Customer.objects.all()
       serializer_class = CustomerSerializer
       filter_backends = [DjangoFilterBackend]
       filterset_class = CustomerFilter
       search_fields = ['first_name', 'last_name', 'email']
       ordering = ['-created_at']
   
       @action(detail=True, methods=['post'])
       def add_note(self, request, pk=None):
           customer = self.get_object()
           # Add note logic
           return Response({'status': 'note added'})
   ```

3. **Serializers**
   ```python
   # customers/serializers.py
   from rest_framework import serializers
   from .models import Customer
   
   class CustomerSerializer(serializers.ModelSerializer):
       full_name = serializers.SerializerMethodField()
   
       class Meta:
           model = Customer
           fields = [
               'id', 'first_name', 'last_name', 'full_name',
               'email', 'phone', 'customer_type',
               'created_at', 'updated_at'
           ]
   
       def get_full_name(self, obj):
           return f"{obj.first_name} {obj.last_name}"
   
       def validate_email(self, value):
           if Customer.objects.filter(email=value).exists():
               raise serializers.ValidationError(
                   "Customer with this email already exists."
               )
           return value
   ```

### Testing Guidelines

#### Frontend Testing

1. **Component Tests**
   ```typescript
   // __tests__/components/CustomerCard.test.tsx
   import { render, screen, fireEvent } from '@testing-library/react';
   import CustomerCard from '../CustomerCard';
   
   const mockCustomer = {
     id: 1,
     first_name: 'John',
     last_name: 'Doe',
     email: 'john@example.com',
     phone: '555-1234'
   };
   
   describe('CustomerCard', () => {
     it('renders customer information', () => {
       const mockOnClick = jest.fn();
       
       render(
         <CustomerCard customer={mockCustomer} onClick={mockOnClick} />
       );
       
       expect(screen.getByText('John Doe')).toBeInTheDocument();
       expect(screen.getByText('john@example.com')).toBeInTheDocument();
     });
   
     it('calls onClick when card is clicked', () => {
       const mockOnClick = jest.fn();
       
       render(
         <CustomerCard customer={mockCustomer} onClick={mockOnClick} />
       );
       
       fireEvent.click(screen.getByText('John Doe'));
       expect(mockOnClick).toHaveBeenCalledWith(mockCustomer);
     });
   });
   ```

2. **Hook Tests**
   ```typescript
   // __tests__/hooks/useCustomers.test.ts
   import { renderHook, waitFor } from '@testing-library/react';
   import { useCustomers } from '../useCustomers';
   import { customerApi } from '../../services/api';
   
   jest.mock('../../services/api');
   
   describe('useCustomers', () => {
     it('fetches customers on mount', async () => {
       const mockCustomers = [mockCustomer];
       (customerApi.getAll as jest.Mock).mockResolvedValue({
         data: { results: mockCustomers }
       });
   
       const { result } = renderHook(() => useCustomers());
   
       expect(result.current.loading).toBe(true);
   
       await waitFor(() => {
         expect(result.current.loading).toBe(false);
         expect(result.current.customers).toEqual(mockCustomers);
       });
     });
   });
   ```

#### Backend Testing

1. **Model Tests**
   ```python
   # customers/tests/test_models.py
   import pytest
   from django.core.exceptions import ValidationError
   from customers.models import Customer
   
   @pytest.mark.django_db
   class TestCustomerModel:
       def test_create_customer(self):
           customer = Customer.objects.create(
               first_name='John',
               last_name='Doe',
               email='john@example.com',
               phone='555-1234'
           )
           assert customer.full_name == 'John Doe'
           assert str(customer) == 'John Doe'
   
       def test_email_uniqueness(self):
           Customer.objects.create(
               first_name='John',
               last_name='Doe',
               email='john@example.com',
               phone='555-1234'
           )
           
           with pytest.raises(ValidationError):
               Customer.objects.create(
                   first_name='Jane',
                   last_name='Smith',
                   email='john@example.com',  # Duplicate email
                   phone='555-5678'
               )
   ```

2. **API Tests**
   ```python
   # customers/tests/test_views.py
   import pytest
   from django.urls import reverse
   from rest_framework import status
   from rest_framework.test import APITestCase
   from customers.models import Customer
   
   class CustomerAPITest(APITestCase):
       def setUp(self):
           self.customer_data = {
               'first_name': 'John',
               'last_name': 'Doe',
               'email': 'john@example.com',
               'phone': '555-1234'
           }
   
       def test_create_customer(self):
           url = reverse('customer-list')
           response = self.client.post(url, self.customer_data)
           
           assert response.status_code == status.HTTP_201_CREATED
           assert Customer.objects.filter(email='john@example.com').exists()
   
       def test_list_customers(self):
           Customer.objects.create(**self.customer_data)
           
           url = reverse('customer-list')
           response = self.client.get(url)
           
           assert response.status_code == status.HTTP_200_OK
           assert len(response.data['results']) == 1
   ```

### Database Management

#### Migrations

1. **Creating Migrations**
   ```bash
   # After model changes
   python manage.py makemigrations
   
   # With descriptive name
   python manage.py makemigrations customers --name add_customer_type_field
   ```

2. **Custom Migrations**
   ```python
   # migrations/0003_populate_customer_types.py
   from django.db import migrations
   
   def populate_customer_types(apps, schema_editor):
       Customer = apps.get_model('customers', 'Customer')
       for customer in Customer.objects.all():
           if not customer.customer_type:
               customer.customer_type = 'residential'
               customer.save()
   
   class Migration(migrations.Migration):
       dependencies = [
           ('customers', '0002_add_customer_type'),
       ]
   
       operations = [
           migrations.RunPython(populate_customer_types),
       ]
   ```

3. **Running Migrations**
   ```bash
   # Apply migrations
   python manage.py migrate
   
   # Rollback to specific migration
   python manage.py migrate customers 0002
   
   # Show migration status
   python manage.py showmigrations
   ```

#### Database Queries

1. **Optimized Queries**
   ```python
   # Bad: N+1 query problem
   customers = Customer.objects.all()
   for customer in customers:
       print(customer.jobs.count())  # Queries database for each customer
   
   # Good: Use annotations
   customers = Customer.objects.annotate(
       jobs_count=Count('jobs')
   )
   for customer in customers:
       print(customer.jobs_count)  # No additional queries
   ```

2. **Select Related**
   ```python
   # Fetch related objects in single query
   jobs = Job.objects.select_related(
       'customer', 'property'
   ).prefetch_related(
       'assigned_technicians', 'materials'
   )
   ```

### API Development

#### Adding New Endpoints

1. **Define Model**
   ```python
   # models.py
   class JobNote(TimestampedModel):
       job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='notes')
       author = models.ForeignKey(User, on_delete=models.CASCADE)
       content = models.TextField()
       is_internal = models.BooleanField(default=False)
   ```

2. **Create Serializer**
   ```python
   # serializers.py
   class JobNoteSerializer(serializers.ModelSerializer):
       author_name = serializers.CharField(source='author.get_full_name', read_only=True)
   
       class Meta:
           model = JobNote
           fields = ['id', 'content', 'author', 'author_name', 'is_internal', 'created_at']
           read_only_fields = ['author']
   
       def create(self, validated_data):
           validated_data['author'] = self.context['request'].user
           return super().create(validated_data)
   ```

3. **Add to ViewSet**
   ```python
   # views.py
   class JobViewSet(viewsets.ModelViewSet):
       @action(detail=True, methods=['get', 'post'])
       def notes(self, request, pk=None):
           job = self.get_object()
           
           if request.method == 'GET':
               notes = job.notes.all()
               serializer = JobNoteSerializer(notes, many=True)
               return Response(serializer.data)
           
           elif request.method == 'POST':
               serializer = JobNoteSerializer(
                   data=request.data,
                   context={'request': request}
               )
               if serializer.is_valid():
                   serializer.save(job=job)
                   return Response(serializer.data, status=status.HTTP_201_CREATED)
               return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
   ```

4. **Frontend Integration**
   ```typescript
   // services/api.ts
   export const jobApi = {
     // ... existing methods
     
     getNotes: (jobId: number) =>
       api.get(`/jobs/${jobId}/notes/`),
     
     addNote: (jobId: number, noteData: CreateJobNoteData) =>
       api.post(`/jobs/${jobId}/notes/`, noteData),
   };
   ```

### Performance Optimization

#### Frontend Optimization

1. **Memoization**
   ```typescript
   import React, { useMemo, memo } from 'react';
   
   // Memoize expensive calculations
   const expensiveValue = useMemo(() => {
     return customers.reduce((total, customer) => {
       return total + customer.totalJobs;
     }, 0);
   }, [customers]);
   
   // Memoize components
   const CustomerCard = memo<CustomerCardProps>(({ customer, onClick }) => {
     return (
       <Card onClick={() => onClick(customer)}>
         {/* Component content */}
       </Card>
     );
   });
   ```

2. **Lazy Loading**
   ```typescript
   import { lazy, Suspense } from 'react';
   
   const CustomerDetail = lazy(() => import('./CustomerDetail'));
   
   // In router
   <Route
     path="/customers/:id"
     element={
       <Suspense fallback={<Loading />}>
         <CustomerDetail />
       </Suspense>
     }
   />
   ```

3. **Virtual Scrolling**
   ```typescript
   import { FixedSizeList as List } from 'react-window';
   
   const CustomerList = ({ customers }) => (
     <List
       height={600}
       itemCount={customers.length}
       itemSize={120}
       itemData={customers}
     >
       {({ index, style, data }) => (
         <div style={style}>
           <CustomerCard customer={data[index]} />
         </div>
       )}
     </List>
   );
   ```

#### Backend Optimization

1. **Database Optimization**
   ```python
   # Use database indexes
   class Customer(models.Model):
       class Meta:
           indexes = [
               models.Index(fields=['email']),
               models.Index(fields=['last_name', 'first_name']),
           ]
   
   # Use select_related for foreign keys
   jobs = Job.objects.select_related('customer', 'property')
   
   # Use prefetch_related for many-to-many
   jobs = Job.objects.prefetch_related('assigned_technicians')
   ```

2. **Caching**
   ```python
   from django.core.cache import cache
   
   def get_dashboard_stats(user):
       cache_key = f'dashboard_stats_{user.id}'
       stats = cache.get(cache_key)
       
       if stats is None:
           stats = calculate_dashboard_stats(user)
           cache.set(cache_key, stats, timeout=300)  # 5 minutes
       
       return stats
   ```

3. **Pagination**
   ```python
   # settings.py
   REST_FRAMEWORK = {
       'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
       'PAGE_SIZE': 20
   }
   
   # Custom pagination
   class CustomPagination(PageNumberPagination):
       page_size = 20
       page_size_query_param = 'page_size'
       max_page_size = 100
   ```

### Debugging

#### Frontend Debugging

1. **React Developer Tools**
   - Install browser extension
   - Inspect component state and props
   - Profile component performance

2. **Network Debugging**
   ```typescript
   // Add request/response interceptors
   api.interceptors.request.use(request => {
     console.log('API Request:', request);
     return request;
   });
   
   api.interceptors.response.use(
     response => {
       console.log('API Response:', response);
       return response;
     },
     error => {
       console.error('API Error:', error);
       return Promise.reject(error);
     }
   );
   ```

3. **Error Boundaries**
   ```typescript
   class ErrorBoundary extends Component {
     state = { hasError: false, error: null };
   
     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }
   
     componentDidCatch(error, errorInfo) {
       console.error('Error caught by boundary:', error, errorInfo);
       // Send to error reporting service
     }
   
     render() {
       if (this.state.hasError) {
         return <ErrorFallback error={this.state.error} />;
       }
       return this.props.children;
     }
   }
   ```

#### Backend Debugging

1. **Django Debug Toolbar**
   ```python
   # Install: pip install django-debug-toolbar
   
   # settings/development.py
   INSTALLED_APPS += ['debug_toolbar']
   MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
   
   # Show toolbar for all IPs in development
   INTERNAL_IPS = ['127.0.0.1', '::1']
   ```

2. **Logging**
   ```python
   import logging
   
   logger = logging.getLogger(__name__)
   
   def create_customer(request):
       logger.info(f'Creating customer: {request.data}')
       try:
           # Create customer logic
           logger.info(f'Customer created successfully: {customer.id}')
       except Exception as e:
           logger.error(f'Failed to create customer: {e}')
           raise
   ```

3. **Database Query Debugging**
   ```python
   from django.db import connection
   
   # Log all queries
   def log_queries():
       for query in connection.queries:
           print(f"Query: {query['sql']}")
           print(f"Time: {query['time']}")
   
   # Use in views for debugging
   customers = Customer.objects.all()
   log_queries()
   ```

### Security Best Practices

#### Authentication & Authorization

1. **JWT Token Handling**
   ```typescript
   // Store tokens securely
   const tokenStorage = {
     setTokens: (accessToken: string, refreshToken: string) => {
       localStorage.setItem('access_token', accessToken);
       localStorage.setItem('refresh_token', refreshToken);
     },
     
     getAccessToken: () => localStorage.getItem('access_token'),
     
     clearTokens: () => {
       localStorage.removeItem('access_token');
       localStorage.removeItem('refresh_token');
     }
   };
   ```

2. **Permission Checking**
   ```python
   # Custom permissions
   class CanManageJobs(BasePermission):
       def has_permission(self, request, view):
           return request.user.role in ['admin', 'manager']
       
       def has_object_permission(self, request, view, obj):
           if request.user.role == 'technician':
               return request.user in obj.assigned_technicians.all()
           return True
   ```

#### Input Validation

1. **Frontend Validation**
   ```typescript
   const validateCustomerData = (data: CreateCustomerData): ValidationErrors => {
     const errors: ValidationErrors = {};
     
     if (!data.first_name?.trim()) {
       errors.first_name = 'First name is required';
     }
     
     if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
       errors.email = 'Please enter a valid email address';
     }
     
     return errors;
   };
   ```

2. **Backend Validation**
   ```python
   class CustomerSerializer(serializers.ModelSerializer):
       def validate_email(self, value):
           if not value:
               raise serializers.ValidationError('Email is required')
           
           if Customer.objects.filter(email=value).exists():
               raise serializers.ValidationError('Email already exists')
           
           return value
       
       def validate_phone(self, value):
           # Remove all non-digit characters
           clean_phone = re.sub(r'\D', '', value)
           
           if len(clean_phone) != 10:
               raise serializers.ValidationError('Phone must be 10 digits')
           
           return value
   ```

### Deployment and DevOps

#### Environment Configuration

1. **Environment Variables**
   ```bash
   # .env.example
   DJANGO_SECRET_KEY=your-secret-key-here
   DATABASE_URL=postgresql://user:password@localhost:5432/fsm_db
   REDIS_URL=redis://localhost:6379/0
   EMAIL_HOST_USER=noreply@ajlongelectric.com
   EMAIL_HOST_PASSWORD=your-email-password
   ```

2. **Docker Configuration**
   ```dockerfile
   # Dockerfile.backend
   FROM python:3.11-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   
   COPY . .
   
   EXPOSE 8000
   CMD ["gunicorn", "--bind", "0.0.0.0:8000", "fsm_core.wsgi:application"]
   ```

3. **Docker Compose**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   
   services:
     db:
       image: postgres:14
       environment:
         POSTGRES_DB: fsm_db
         POSTGRES_USER: fsm_user
         POSTGRES_PASSWORD: fsm_password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     backend:
       build: ./backend
       ports:
         - "8000:8000"
       depends_on:
         - db
       environment:
         DATABASE_URL: postgresql://fsm_user:fsm_password@db:5432/fsm_db
   
     frontend:
       build: ./frontend
       ports:
         - "3000:3000"
       depends_on:
         - backend
   ```

#### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        python manage.py test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
```

## Troubleshooting

### Common Issues

1. **CORS Issues**
   ```python
   # backend/settings.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://127.0.0.1:3000",
   ]
   
   CORS_ALLOW_CREDENTIALS = True
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   python manage.py dbshell
   
   # Reset database
   python manage.py flush
   python manage.py migrate
   ```

3. **Node Modules Issues**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

### Performance Issues

1. **Slow Database Queries**
   ```python
   # Enable query logging
   LOGGING = {
       'loggers': {
           'django.db.backends': {
               'level': 'DEBUG',
               'handlers': ['console'],
           }
       }
   }
   ```

2. **Large Bundle Size**
   ```bash
   # Analyze bundle
   npm run build:analyze
   
   # Check for duplicate dependencies
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

### Getting Help

1. **Documentation**: Check this guide and API documentation
2. **Code Comments**: Look for inline comments in complex code sections
3. **Git History**: Use `git blame` and `git log` to understand changes
4. **Team Communication**: Reach out to team members for domain-specific questions
5. **Issue Tracking**: Create GitHub issues for bugs and feature requests

This developer guide provides a comprehensive foundation for working with the AJ Long Electric FSM system. Follow these guidelines to maintain code quality, security, and performance standards.