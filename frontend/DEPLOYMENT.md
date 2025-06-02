# AJ Long Electric FSM - Deployment Guide

This guide covers deployment strategies and configurations for the Field Service Management system.

## Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Static assets built and optimized
- [ ] SSL certificates installed
- [ ] Performance monitoring enabled
- [ ] Backup strategy implemented
- [ ] Error tracking configured

## Environment Configuration

### Frontend Environment Variables

```bash
# Production
REACT_APP_API_BASE_URL=https://api.ajlongelectric.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
REACT_APP_SENTRY_DSN=your_sentry_dsn_here
REACT_APP_GOOGLE_MAPS_API_KEY=your_maps_api_key

# Development
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true
```

### Backend Environment Variables

```bash
# Django Settings
DJANGO_SECRET_KEY=your_secret_key_here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=ajlongelectric.com,www.ajlongelectric.com
DATABASE_URL=postgresql://user:password@localhost:5432/fsm_db

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@ajlongelectric.com
EMAIL_HOST_PASSWORD=your_email_password
EMAIL_USE_TLS=True

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379/0

# File Storage
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=ajlong-fsm-media
AWS_S3_REGION_NAME=us-east-1
```

## Deployment Platforms

### Option 1: Railway (Recommended for MVP)

Railway provides simple deployment with automatic builds and database provisioning.

#### Frontend Deployment

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and connect
   railway login
   railway link
   ```

2. **Configure Build Settings**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Start Command: `npx serve -s build -l 3000`

3. **Environment Variables**
   Set in Railway dashboard under Variables tab

4. **Custom Domain**
   - Add custom domain in Railway settings
   - Update DNS records to point to Railway

#### Backend Deployment

1. **Database Setup**
   ```bash
   # Add PostgreSQL service
   railway add postgresql
   
   # Get database URL
   railway variables
   ```

2. **Configure Django Settings**
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python manage.py migrate && python manage.py collectstatic --noinput && gunicorn fsm_core.wsgi:application`

3. **Static Files**
   Configure WhiteNoise for static file serving:
   ```python
   # settings.py
   MIDDLEWARE = [
       'whitenoise.middleware.WhiteNoiseMiddleware',
       # ... other middleware
   ]
   
   STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
   ```

### Option 2: Vercel + PlanetScale

Ideal for scaling and performance optimization.

#### Frontend on Vercel

1. **Project Setup**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy
   cd frontend
   vercel --prod
   ```

2. **Build Configuration** (`vercel.json`)
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "build",
     "framework": "create-react-app",
     "functions": {
       "app/api/**/*.js": {
         "runtime": "nodejs18.x"
       }
     },
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://your-backend-url.com/api/$1"
       }
     ],
     "headers": [
       {
         "source": "/static/(.*)",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       }
     ]
   }
   ```

#### Backend on Railway with PlanetScale

1. **Database Setup**
   ```bash
   # Create PlanetScale database
   pscale database create ajlong-fsm --region us-east

   # Create connection string
   pscale connect ajlong-fsm main --port 3309
   ```

2. **Django Configuration**
   ```python
   # settings.py
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'ajlong-fsm',
           'USER': os.environ.get('DB_USER'),
           'PASSWORD': os.environ.get('DB_PASSWORD'),
           'HOST': os.environ.get('DB_HOST'),
           'PORT': '3306',
           'OPTIONS': {
               'sql_mode': 'traditional',
           }
       }
   }
   ```

### Option 3: AWS (Production Scale)

For enterprise deployment with full control.

#### Architecture Overview
```
Internet → CloudFront (CDN) → ALB → ECS/EC2
                           ↓
                        RDS (PostgreSQL)
                           ↓
                        ElastiCache (Redis)
                           ↓
                        S3 (Static Files)
```

#### Frontend Deployment

1. **S3 + CloudFront**
   ```bash
   # Build and upload
   npm run build
   aws s3 sync build/ s3://ajlong-fsm-frontend --delete
   
   # Invalidate CloudFront
   aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
   ```

2. **Infrastructure as Code** (`infrastructure/frontend.yml`)
   ```yaml
   AWSTemplateFormatVersion: '2010-09-09'
   Resources:
     S3Bucket:
       Type: AWS::S3::Bucket
       Properties:
         BucketName: ajlong-fsm-frontend
         WebsiteConfiguration:
           IndexDocument: index.html
           ErrorDocument: error.html
     
     CloudFrontDistribution:
       Type: AWS::CloudFront::Distribution
       Properties:
         DistributionConfig:
           Origins:
             - DomainName: !GetAtt S3Bucket.DomainName
               Id: S3Origin
               S3OriginConfig:
                 OriginAccessIdentity: !Ref OAI
           DefaultCacheBehavior:
             TargetOriginId: S3Origin
             ViewerProtocolPolicy: redirect-to-https
             CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
   ```

#### Backend Deployment

1. **ECS with Fargate**
   ```dockerfile
   # Dockerfile
   FROM python:3.11-slim
   
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   
   COPY . .
   
   EXPOSE 8000
   CMD ["gunicorn", "--bind", "0.0.0.0:8000", "fsm_core.wsgi:application"]
   ```

2. **ECS Task Definition**
   ```json
   {
     "family": "ajlong-fsm-backend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "django-app",
         "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/ajlong-fsm:latest",
         "portMappings": [
           {
             "containerPort": 8000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "DATABASE_URL",
             "value": "postgresql://user:pass@rds-endpoint:5432/fsm"
           }
         ]
       }
     ]
   }
   ```

## Database Migrations

### Initial Setup

```bash
# Backend directory
cd backend

# Create and run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata fixtures/sample_data.json
```

### Production Migration Strategy

```bash
# 1. Backup current database
pg_dump fsm_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migrations on staging
python manage.py migrate --dry-run

# 3. Run migrations with minimal downtime
python manage.py migrate --no-input

# 4. Verify data integrity
python manage.py check
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d ajlongelectric.com -d www.ajlongelectric.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name ajlongelectric.com www.ajlongelectric.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ajlongelectric.com www.ajlongelectric.com;
    
    ssl_certificate /etc/letsencrypt/live/ajlongelectric.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ajlongelectric.com/privkey.pem;
    
    # Frontend
    location / {
        root /var/www/ajlong-fsm/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /var/www/ajlong-fsm/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias /var/www/ajlong-fsm/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Performance Optimization

### Frontend Optimizations

1. **Build Optimization**
   ```bash
   # Analyze bundle size
   npm run build:analyze
   
   # Optimize images
   npm install -g imagemin-cli
   imagemin public/images/* --out-dir=public/images/optimized
   ```

2. **CDN Configuration**
   ```javascript
   // Upload static assets to CDN
   const ASSET_PREFIX = process.env.NODE_ENV === 'production' 
     ? 'https://cdn.ajlongelectric.com' 
     : '';
   ```

3. **Service Worker** (`public/sw.js`)
   ```javascript
   const CACHE_NAME = 'ajlong-fsm-v1';
   const urlsToCache = [
     '/',
     '/static/css/main.css',
     '/static/js/main.js'
   ];
   
   self.addEventListener('install', event => {
     event.waitUntil(
       caches.open(CACHE_NAME)
         .then(cache => cache.addAll(urlsToCache))
     );
   });
   ```

### Backend Optimizations

1. **Database Optimization**
   ```python
   # settings.py
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'OPTIONS': {
               'MAX_CONNS': 20,
               'conn_max_age': 600,
           }
       }
   }
   
   # Redis caching
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': 'redis://127.0.0.1:6379/1',
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
           }
       }
   }
   ```

2. **API Response Optimization**
   ```python
   # Pagination
   REST_FRAMEWORK = {
       'PAGE_SIZE': 20,
       'PAGE_SIZE_QUERY_PARAM': 'page_size',
       'MAX_PAGE_SIZE': 100,
   }
   
   # Compression
   MIDDLEWARE = [
       'django.middleware.gzip.GZipMiddleware',
       # ... other middleware
   ]
   ```

## Monitoring and Logging

### Application Performance Monitoring

1. **Sentry Integration**
   ```javascript
   // Frontend (src/index.tsx)
   import * as Sentry from '@sentry/react';
   
   if (process.env.NODE_ENV === 'production') {
     Sentry.init({
       dsn: process.env.REACT_APP_SENTRY_DSN,
       environment: process.env.REACT_APP_ENVIRONMENT,
     });
   }
   ```

   ```python
   # Backend (settings.py)
   import sentry_sdk
   from sentry_sdk.integrations.django import DjangoIntegration
   
   if not DEBUG:
       sentry_sdk.init(
           dsn=os.environ.get('SENTRY_DSN'),
           integrations=[DjangoIntegration()],
           traces_sample_rate=0.1,
       )
   ```

2. **Health Check Endpoints**
   ```python
   # backend/fsm_core/health.py
   from django.http import JsonResponse
   from django.db import connection
   
   def health_check(request):
       try:
           with connection.cursor() as cursor:
               cursor.execute("SELECT 1")
           return JsonResponse({'status': 'healthy'})
       except Exception as e:
           return JsonResponse({'status': 'unhealthy', 'error': str(e)}, status=500)
   ```

### Log Management

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

## Backup Strategy

### Database Backups

```bash
#!/bin/bash
# backup_db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="fsm_production"

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://ajlong-fsm-backups/database/

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Clean old S3 backups (keep 30 days)
aws s3 ls s3://ajlong-fsm-backups/database/ | while read -r line; do
    createDate=$(echo $line | awk {'print $1" "$2'})
    createDate=$(date -d"$createDate" +%s)
    olderThan=$(date -d"30 days ago" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk {'print $4'})
        aws s3 rm s3://ajlong-fsm-backups/database/$fileName
    fi
done
```

### Automated Backup Schedule

```bash
# Add to crontab (crontab -e)
# Daily database backup at 2 AM
0 2 * * * /path/to/backup_db.sh

# Weekly full system backup at 3 AM Sunday
0 3 * * 0 /path/to/full_backup.sh
```

## Security Checklist

### Application Security

- [ ] **HTTPS Enforced**: All traffic redirected to HTTPS
- [ ] **CSRF Protection**: Django CSRF middleware enabled
- [ ] **SQL Injection Prevention**: Using Django ORM, parameterized queries
- [ ] **XSS Protection**: Content Security Policy headers
- [ ] **Authentication**: Strong password requirements, session security
- [ ] **Authorization**: Role-based access control implemented
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **File Upload Security**: File type validation, virus scanning
- [ ] **Rate Limiting**: API rate limiting implemented
- [ ] **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options

### Infrastructure Security

- [ ] **Firewall Configuration**: Only necessary ports open
- [ ] **SSH Key Authentication**: Password authentication disabled
- [ ] **Regular Updates**: OS and dependency updates automated
- [ ] **Database Security**: Network isolation, encrypted connections
- [ ] **Secret Management**: Environment variables, no hardcoded secrets
- [ ] **Monitoring**: Intrusion detection, log monitoring
- [ ] **Backup Encryption**: All backups encrypted at rest

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Remove node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database Connection Issues**
   ```bash
   # Check database connectivity
   python manage.py dbshell
   
   # Verify environment variables
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.DATABASES)
   ```

3. **Static Files Not Loading**
   ```bash
   # Collect static files
   python manage.py collectstatic --clear --noinput
   
   # Check file permissions
   chmod -R 755 /var/www/ajlong-fsm/static/
   ```

4. **Memory Issues**
   ```bash
   # Monitor memory usage
   htop
   
   # Check for memory leaks
   python manage.py shell
   >>> import psutil
   >>> psutil.virtual_memory()
   ```

### Performance Issues

1. **Slow Database Queries**
   ```python
   # Enable query logging
   LOGGING['loggers']['django.db.backends'] = {
       'level': 'DEBUG',
       'handlers': ['console'],
   }
   ```

2. **High CPU Usage**
   ```bash
   # Profile Python code
   pip install py-spy
   py-spy top --pid $(pgrep -f gunicorn)
   ```

3. **Memory Leaks**
   ```bash
   # Monitor with New Relic or DataDog
   # Check for unclosed database connections
   # Review middleware for memory retention
   ```

## Deployment Commands Reference

```bash
# Frontend Deployment
npm run build
npm run build:analyze
npm run perf:lighthouse

# Backend Deployment
python manage.py collectstatic --noinput
python manage.py migrate --no-input
python manage.py check --deploy

# Docker Deployment
docker build -t ajlong-fsm-backend .
docker run -p 8000:8000 ajlong-fsm-backend

# Infrastructure
terraform plan
terraform apply
aws ecs update-service --cluster production --service ajlong-fsm --force-new-deployment
```

This deployment guide provides comprehensive instructions for deploying the AJ Long Electric FSM system across different platforms with proper security, monitoring, and backup strategies.