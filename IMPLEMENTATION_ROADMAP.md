# Implementation Roadmap - Technical Details

## Week 1: Security & Infrastructure Foundation

### Day 1-2: Two-Factor Authentication Implementation

#### Backend Tasks:
```python
# 1. Install required packages
pip install django-two-factor-auth qrcode

# 2. Update settings.py
INSTALLED_APPS += [
    'django_otp',
    'django_otp.plugins.otp_totp',
    'two_factor',
]

MIDDLEWARE += [
    'django_otp.middleware.OTPMiddleware',
]

# 3. Create 2FA setup view
from two_factor.views import SetupView

class Custom2FASetupView(SetupView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['company_name'] = 'AJ Long Electric'
        return context
```

#### Frontend Tasks:
```typescript
// 1. Create 2FA setup component
interface TwoFactorSetupProps {
  qrCodeUrl: string;
  secretKey: string;
  onVerify: (code: string) => Promise<void>;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ qrCodeUrl, secretKey, onVerify }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleVerify = async () => {
    setLoading(true);
    try {
      await onVerify(verificationCode);
      toast.success('2FA enabled successfully');
    } catch (error) {
      toast.error('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Setup Two-Factor Authentication</Typography>
        <img src={qrCodeUrl} alt="QR Code" />
        <TextField
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
        />
        <Button onClick={handleVerify} disabled={loading}>
          Verify
        </Button>
      </CardContent>
    </Card>
  );
};
```

### Day 3-4: Monitoring Infrastructure

#### Sentry Integration:
```python
# backend/fsm_core/settings/production.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
    environment='production',
    release=os.environ.get('RELEASE_VERSION', 'unknown'),
)

# Custom error handler
def custom_error_handler(exc, context):
    sentry_sdk.capture_exception(exc)
    return Response({'error': 'An unexpected error occurred'}, status=500)
```

#### Prometheus Metrics:
```python
# backend/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
job_created_counter = Counter('fsm_jobs_created_total', 'Total number of jobs created')
api_request_duration = Histogram('fsm_api_request_duration_seconds', 'API request duration')
active_users_gauge = Gauge('fsm_active_users', 'Number of active users')

# Middleware for metrics collection
class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        api_request_duration.observe(duration)
        return response
```

### Day 5: Load Balancer Configuration

#### NGINX Configuration:
```nginx
# /etc/nginx/sites-available/fsm-production
upstream fsm_backend {
    least_conn;
    server backend1:8000 max_fails=3 fail_timeout=30s;
    server backend2:8000 max_fails=3 fail_timeout=30s;
    server backend3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.aj-long-electric.com;
    
    ssl_certificate /etc/ssl/certs/aj-long-electric.crt;
    ssl_certificate_key /etc/ssl/private/aj-long-electric.key;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    location / {
        proxy_pass http://fsm_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /static/ {
        alias /var/www/fsm/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Week 2: Dashboard Refactoring & Mobile Development

### Day 6-7: Dashboard Component Refactoring

#### Step 1: Create Custom Hook for Data Management
```typescript
// frontend/src/hooks/useDashboardData.ts
interface DashboardData {
  stats: DashboardStats;
  recentJobs: Job[];
  upcomingSchedule: ScheduleItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useDashboardData = (): DashboardData => {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, jobsRes, scheduleRes] = await Promise.allSettled([
        api.getDashboardStats(),
        api.getRecentJobs({ limit: 10 }),
        api.getUpcomingSchedule({ days: 7 })
      ]);
      
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
      
      if (jobsRes.status === 'fulfilled') {
        setRecentJobs(jobsRes.value.data);
      }
      
      if (scheduleRes.status === 'fulfilled') {
        setUpcomingSchedule(scheduleRes.value.data);
      }
    } catch (err) {
      setError(err as Error);
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);
  
  return { stats, recentJobs, upcomingSchedule, loading, error, refresh: fetchData };
};
```

#### Step 2: Extract Stats Card Component
```typescript
// frontend/src/components/Dashboard/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = memo(({
  title,
  value,
  change,
  icon,
  gradient,
  onClick
}) => {
  const formattedChange = change ? `${change > 0 ? '+' : ''}${change}%` : null;
  
  return (
    <SoftCard 
      variant="elevated" 
      glow
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-4px) scale(1.02)',
        } : {}
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Avatar sx={{ background: gradient }}>
            {icon}
          </Avatar>
          {formattedChange && (
            <ChangeIndicator value={change} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </SoftCard>
  );
});
```

### Day 8-10: Mobile App Core Features

#### Offline Capability Implementation:
```typescript
// mobile/TechnicianApp/src/services/offlineManager.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineManager {
  private queue: OfflineRequest[] = [];
  private isOnline: boolean = true;
  
  constructor() {
    this.initializeNetworkListener();
    this.loadQueue();
  }
  
  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });
  }
  
  async addToQueue(request: OfflineRequest) {
    this.queue.push(request);
    await this.saveQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }
  
  private async processQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue.shift();
      if (request) {
        try {
          await this.executeRequest(request);
        } catch (error) {
          // Re-add to queue if failed
          this.queue.unshift(request);
          break;
        }
      }
    }
    await this.saveQueue();
  }
  
  private async executeRequest(request: OfflineRequest) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async saveQueue() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
  
  private async loadQueue() {
    const saved = await AsyncStorage.getItem('offline_queue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  }
}

export default new OfflineManager();
```

#### Push Notifications Setup:
```typescript
// mobile/TechnicianApp/src/services/notifications.ts
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

class NotificationService {
  async initialize() {
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;
    
    if (enabled) {
      // Get FCM token
      const token = await messaging().getToken();
      await this.registerToken(token);
      
      // Configure local notifications
      PushNotification.configure({
        onRegister: (token) => {
          console.log('TOKEN:', token);
        },
        onNotification: (notification) => {
          this.handleNotification(notification);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
      });
      
      // Listen for messages
      messaging().onMessage(async remoteMessage => {
        this.showLocalNotification(remoteMessage);
      });
    }
  }
  
  private async registerToken(token: string) {
    await api.post('/api/devices/register', { 
      token, 
      platform: Platform.OS 
    });
  }
  
  private showLocalNotification(message: any) {
    PushNotification.localNotification({
      title: message.notification?.title || 'New Job',
      message: message.notification?.body || 'You have a new job assignment',
      playSound: true,
      soundName: 'default',
      data: message.data,
    });
  }
  
  private handleNotification(notification: any) {
    if (notification.data?.type === 'job_assignment') {
      // Navigate to job detail
      NavigationService.navigate('JobDetail', { 
        jobId: notification.data.jobId 
      });
    }
  }
}

export default new NotificationService();
```

---

## Week 3: Performance Optimization & Testing

### Day 11-12: Frontend Bundle Optimization

#### Webpack Configuration:
```javascript
// frontend/webpack.production.config.js
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        mui: {
          test: /[\\/]node_modules[\\/]@mui/,
          name: 'mui',
          priority: 20,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

#### Route-based Code Splitting:
```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load route components
const Dashboard = lazy(() => import('./components/Dashboard'));
const CustomerList = lazy(() => import('./components/CustomerList'));
const JobList = lazy(() => import('./components/JobList'));
const BillingInvoices = lazy(() => import('./components/BillingInvoices'));
const InventoryManagement = lazy(() => import('./components/InventoryManagement'));
const SchedulingCalendar = lazy(() => import('./components/SchedulingCalendar'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/billing" element={<BillingInvoices />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="/scheduling" element={<SchedulingCalendar />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### Day 13-14: Database Query Optimization

#### Backend Optimizations:
```python
# backend/jobs/views.py
from django.db.models import Prefetch, Q, Count, Sum
from rest_framework.decorators import action
from django.core.cache import cache

class JobViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Job.objects.select_related(
            'customer',
            'technician',
            'created_by'
        ).prefetch_related(
            Prefetch('line_items', 
                     queryset=LineItem.objects.select_related('inventory_item')),
            'attachments',
            'notes'
        )
        
        # Add filtering
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Add search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(job_number__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        # Cache dashboard stats for 5 minutes
        cache_key = 'dashboard_stats'
        stats = cache.get(cache_key)
        
        if not stats:
            stats = {
                'total_jobs': Job.objects.count(),
                'active_jobs': Job.objects.filter(
                    status__in=['pending', 'scheduled', 'in_progress']
                ).count(),
                'completed_today': Job.objects.filter(
                    status='completed',
                    completed_at__date=timezone.now().date()
                ).count(),
                'revenue_this_month': Job.objects.filter(
                    status='completed',
                    completed_at__month=timezone.now().month
                ).aggregate(total=Sum('actual_cost'))['total'] or 0
            }
            cache.set(cache_key, stats, 300)  # Cache for 5 minutes
        
        return Response(stats)
```

#### Database Indexes:
```python
# backend/jobs/models.py
class Job(models.Model):
    # ... existing fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['technician', 'scheduled_start']),
            models.Index(fields=['job_number']),
            models.Index(fields=['-created_at']),
        ]
```

### Day 15-16: Comprehensive E2E Testing

#### Playwright E2E Tests:
```typescript
// frontend/e2e/critical-user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await login(page, 'admin@ajlongelectric.com', 'securepassword');
  });
  
  test('Complete job lifecycle', async ({ page }) => {
    // Create new customer
    await page.click('text=Customers');
    await page.click('text=Add Customer');
    await page.fill('[name="name"]', 'Test Customer');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="phone"]', '555-0100');
    await page.fill('[name="address"]', '123 Test St');
    await page.click('text=Save Customer');
    await expect(page.locator('text=Customer created successfully')).toBeVisible();
    
    // Create new job
    await page.click('text=Jobs');
    await page.click('text=New Job');
    await page.selectOption('[name="customer"]', 'Test Customer');
    await page.fill('[name="title"]', 'Electrical Panel Upgrade');
    await page.fill('[name="description"]', 'Upgrade main panel to 200A');
    await page.fill('[name="estimated_cost"]', '2500');
    await page.click('text=Create Job');
    await expect(page.locator('text=Job created successfully')).toBeVisible();
    
    // Schedule job
    await page.click('text=Schedule');
    await page.selectOption('[name="technician"]', 'John Smith');
    await page.fill('[name="scheduled_start"]', '2025-02-15T09:00');
    await page.fill('[name="scheduled_end"]', '2025-02-15T17:00');
    await page.click('text=Save Schedule');
    
    // Complete job
    await page.click('text=Mark as In Progress');
    await page.fill('[name="work_performed"]', 'Installed new 200A panel');
    await page.fill('[name="actual_cost"]', '2450');
    await page.click('text=Complete Job');
    
    // Generate invoice
    await page.click('text=Generate Invoice');
    await expect(page.locator('text=Invoice generated')).toBeVisible();
    
    // Verify dashboard updated
    await page.click('text=Dashboard');
    await expect(page.locator('text=Completed Jobs')).toContainText('1');
  });
  
  test('Mobile technician workflow', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await login(page, 'tech@ajlongelectric.com', 'techpassword');
    
    // View assigned jobs
    await page.click('[data-testid="mobile-menu"]');
    await page.click('text=My Jobs');
    await expect(page.locator('[data-testid="job-card"]')).toHaveCount(3);
    
    // Start job
    await page.click('[data-testid="job-card"]:first-child');
    await page.click('text=Start Job');
    await expect(page.locator('text=Timer Started')).toBeVisible();
    
    // Add photo
    await page.setInputFiles('[data-testid="photo-upload"]', 'test-assets/panel.jpg');
    await expect(page.locator('img[alt="Job photo"]')).toBeVisible();
    
    // Complete job
    await page.fill('[name="notes"]', 'Work completed successfully');
    await page.click('text=Complete Job');
    await expect(page.locator('text=Job completed')).toBeVisible();
  });
});
```

---

## Week 4: Deployment & Go-Live

### Day 17-18: Staging Environment Setup

#### Docker Compose for Staging:
```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fsm_staging
      POSTGRES_USER: fsm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fsm_network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - fsm_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      DJANGO_SETTINGS_MODULE: fsm_core.settings.production
      DATABASE_URL: postgresql://fsm_user:${DB_PASSWORD}@postgres:5432/fsm_staging
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ALLOWED_HOSTS: staging.aj-long-electric.com
    depends_on:
      - postgres
      - redis
    networks:
      - fsm_network
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      REACT_APP_API_URL: https://staging-api.aj-long-electric.com
      REACT_APP_ENVIRONMENT: staging
    networks:
      - fsm_network

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf
      - ./ssl/staging:/etc/ssl
    ports:
      - "443:443"
      - "80:80"
    depends_on:
      - backend
      - frontend
    networks:
      - fsm_network

networks:
  fsm_network:
    driver: bridge

volumes:
  postgres_data:
```

### Day 19: Data Migration Scripts

#### Migration Script:
```python
# scripts/migrate_production_data.py
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataMigrator:
    def __init__(self, source_conn, target_conn):
        self.source = source_conn
        self.target = target_conn
        self.errors = []
        
    def migrate_customers(self):
        """Migrate customer data with validation"""
        logger.info("Starting customer migration...")
        
        with self.source.cursor(cursor_factory=RealDictCursor) as source_cur:
            source_cur.execute("SELECT * FROM customers")
            customers = source_cur.fetchall()
            
        migrated = 0
        for customer in customers:
            try:
                # Validate data
                if not self.validate_customer(customer):
                    self.errors.append(f"Invalid customer: {customer['id']}")
                    continue
                
                # Transform data
                transformed = self.transform_customer(customer)
                
                # Insert into target
                with self.target.cursor() as target_cur:
                    target_cur.execute("""
                        INSERT INTO customers_customer 
                        (id, name, email, phone, address, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        email = EXCLUDED.email,
                        phone = EXCLUDED.phone,
                        address = EXCLUDED.address,
                        updated_at = EXCLUDED.updated_at
                    """, (
                        transformed['id'],
                        transformed['name'],
                        transformed['email'],
                        transformed['phone'],
                        transformed['address'],
                        transformed['created_at'],
                        transformed['updated_at']
                    ))
                    
                migrated += 1
                
            except Exception as e:
                logger.error(f"Error migrating customer {customer['id']}: {e}")
                self.errors.append(f"Customer {customer['id']}: {e}")
        
        self.target.commit()
        logger.info(f"Migrated {migrated}/{len(customers)} customers")
        
    def validate_customer(self, customer):
        """Validate customer data"""
        required_fields = ['name', 'email', 'phone']
        for field in required_fields:
            if not customer.get(field):
                return False
        
        # Validate email format
        import re
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', customer['email']):
            return False
            
        return True
    
    def transform_customer(self, customer):
        """Transform customer data for new schema"""
        return {
            'id': customer['id'],
            'name': customer['name'].strip(),
            'email': customer['email'].lower().strip(),
            'phone': self.format_phone(customer['phone']),
            'address': customer.get('address', ''),
            'created_at': customer.get('created_at', datetime.now()),
            'updated_at': datetime.now()
        }
    
    def format_phone(self, phone):
        """Format phone number to standard format"""
        import re
        digits = re.sub(r'\D', '', phone)
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        return phone
    
    def generate_report(self):
        """Generate migration report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'errors': self.errors,
            'error_count': len(self.errors)
        }
        
        with open('migration_report.json', 'w') as f:
            import json
            json.dump(report, f, indent=2)
        
        logger.info(f"Migration complete with {len(self.errors)} errors")

# Run migration
if __name__ == "__main__":
    source_conn = psycopg2.connect(
        "postgresql://old_user:password@old-db:5432/old_database"
    )
    target_conn = psycopg2.connect(
        "postgresql://fsm_user:password@new-db:5432/fsm_production"
    )
    
    migrator = DataMigrator(source_conn, target_conn)
    migrator.migrate_customers()
    migrator.migrate_jobs()
    migrator.migrate_invoices()
    migrator.generate_report()
```

### Day 20: Go-Live Checklist Automation

#### Deployment Script:
```bash
#!/bin/bash
# deploy_production.sh

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"

# Check environment variables
required_vars=("DATABASE_URL" "SECRET_KEY" "REDIS_URL" "SENTRY_DSN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Missing required environment variable: $var${NC}"
        exit 1
    fi
done
check_status "Environment variables verified"

# Run tests
echo -e "${YELLOW}Running test suite...${NC}"
cd backend && python manage.py test --parallel
check_status "Backend tests passed"

cd ../frontend && npm test -- --coverage --watchAll=false
check_status "Frontend tests passed"

# Database backup
echo -e "${YELLOW}Creating database backup...${NC}"
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
check_status "Database backed up"

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build
check_status "Docker images built"

# Database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py migrate
check_status "Migrations completed"

# Collect static files
echo -e "${YELLOW}Collecting static files...${NC}"
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput
check_status "Static files collected"

# Deploy with zero downtime
echo -e "${YELLOW}Deploying application...${NC}"
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
check_status "Application deployed"

# Health check
echo -e "${YELLOW}Running health checks...${NC}"
sleep 10  # Wait for services to start

for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" https://api.aj-long-electric.com/health)
    if [ "$response" = "200" ]; then
        check_status "Health check passed"
        break
    fi
    if [ $i -eq 5 ]; then
        echo -e "${RED}Health check failed after 5 attempts${NC}"
        exit 1
    fi
    sleep 5
done

# Smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
npm run test:smoke
check_status "Smoke tests passed"

# Clear cache
echo -e "${YELLOW}Clearing caches...${NC}"
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
check_status "Cache cleared"

# Send notification
echo -e "${YELLOW}Sending deployment notification...${NC}"
curl -X POST $SLACK_WEBHOOK_URL \
    -H 'Content-Type: application/json' \
    -d '{"text":"✅ Production deployment successful!"}'
check_status "Notification sent"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "Access the application at: https://app.aj-long-electric.com"
echo -e "Monitor metrics at: https://metrics.aj-long-electric.com"
```

---

## Post-Launch Monitoring Dashboard

### Grafana Dashboard Configuration:
```json
{
  "dashboard": {
    "title": "FSM Production Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, fsm_api_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "fsm_active_users"
          }
        ]
      },
      {
        "title": "Jobs Created",
        "targets": [
          {
            "expr": "rate(fsm_jobs_created_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(fsm_errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## Rollback Procedure

### Emergency Rollback Script:
```bash
#!/bin/bash
# rollback_production.sh

echo "⚠️  Initiating emergency rollback..."

# Store current version
CURRENT_VERSION=$(docker images --format "{{.Tag}}" fsm-backend | head -1)
echo "Current version: $CURRENT_VERSION"

# Get previous version
PREVIOUS_VERSION=$(docker images --format "{{.Tag}}" fsm-backend | sed -n '2p')
echo "Rolling back to: $PREVIOUS_VERSION"

# Scale down current deployment
docker-compose -f docker-compose.prod.yml down

# Restore database backup
echo "Restoring database backup..."
psql $DATABASE_URL < backup_latest.sql

# Deploy previous version
export DEPLOY_VERSION=$PREVIOUS_VERSION
docker-compose -f docker-compose.prod.yml up -d

# Verify rollback
sleep 10
curl -f https://api.aj-long-electric.com/health || exit 1

echo "✅ Rollback completed successfully"
```

---

This implementation roadmap provides specific, actionable technical details for each phase of the production deployment. Each section includes actual code that can be implemented, tested, and deployed following the timeline outlined in the production readiness plan.