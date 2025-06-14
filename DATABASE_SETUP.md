# PostgreSQL Database Setup for AJ Long Electric FSM

## Production Database Configuration

### 1. Database Requirements

**Hardware Requirements:**
- Minimum 2GB RAM for database
- SSD storage for better performance
- Regular backup storage
- Network connectivity with low latency

**Software Requirements:**
- PostgreSQL 13+ (recommended 15+)
- Connection pooling (PgBouncer recommended)
- Backup solution (pg_dump, WAL-E, or platform backup)

### 2. Database Setup Options

#### Option A: Managed Database Service (Recommended)

**Railway PostgreSQL:**
```bash
# Add PostgreSQL plugin in Railway dashboard
# Connection details provided automatically
```

**Render PostgreSQL:**
```bash
# Create PostgreSQL database in Render dashboard
# Use provided connection string
```

**AWS RDS PostgreSQL:**
```bash
# Create RDS instance
# Configure security groups
# Use connection details in environment variables
```

#### Option B: Self-Hosted PostgreSQL

**Installation (Ubuntu/Debian):**
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Setup Database:**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE fsm_production;
CREATE USER fsm_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE fsm_production TO fsm_user;
ALTER USER fsm_user CREATEDB;

# Exit PostgreSQL
\q
```

### 3. Database Configuration

**Update settings.py for PostgreSQL:**
```python
# Already configured in settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='fsm_production'),
        'USER': config('DB_USER', default='fsm_user'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'sslmode': 'require',  # For production
        },
    }
}
```

**Environment Variables:**
```bash
DB_ENGINE=django.db.backends.postgresql
DB_NAME=fsm_production
DB_USER=fsm_user
DB_PASSWORD=your-secure-password
DB_HOST=your-db-host
DB_PORT=5432
```

### 4. Database Migration

**Install PostgreSQL Python Driver:**
```bash
pip install psycopg2-binary
```

**Run Migrations:**
```bash
# Create initial migrations (if not done)
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

**Data Migration from SQLite (if needed):**
```bash
# Export data from SQLite
python manage.py dumpdata > data.json

# Import data to PostgreSQL
python manage.py loaddata data.json
```

### 5. Database Performance Optimization

**PostgreSQL Configuration (postgresql.conf):**
```conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connection settings
max_connections = 100
superuser_reserved_connections = 3

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query planner settings
random_page_cost = 1.1
effective_io_concurrency = 200
```

**Django Database Optimization:**
```python
# Connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 60

# Database connection settings
DATABASES['default']['OPTIONS'] = {
    'sslmode': 'require',
    'connect_timeout': 10,
    'options': '-c default_transaction_isolation=read committed'
}
```

### 6. Database Indexing

**Critical Indexes (already in models):**
```sql
-- User lookups
CREATE INDEX idx_user_username ON fsm_users(username);
CREATE INDEX idx_user_email ON fsm_users(email);
CREATE INDEX idx_user_role ON fsm_users(role);

-- Job lookups
CREATE INDEX idx_job_status ON jobs_job(status);
CREATE INDEX idx_job_customer ON jobs_job(customer_id);
CREATE INDEX idx_job_technician ON jobs_job(technician_id);
CREATE INDEX idx_job_created ON jobs_job(created_at);

-- Customer lookups
CREATE INDEX idx_customer_email ON customers_customer(email);
CREATE INDEX idx_customer_phone ON customers_customer(phone_number);

-- Inventory lookups
CREATE INDEX idx_inventory_sku ON inventory_item(sku);
CREATE INDEX idx_inventory_category ON inventory_item(category);

-- Audit logs
CREATE INDEX idx_audit_user_time ON fsm_audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_action_time ON fsm_audit_logs(action, timestamp);
```

### 7. Backup Strategy

**Automated Backups:**
```bash
#!/bin/bash
# backup_database.sh

BACKUP_DIR="/var/backups/postgresql"
DB_NAME="fsm_production"
DB_USER="fsm_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/fsm_backup_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "fsm_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: fsm_backup_$TIMESTAMP.sql.gz"
```

**Restore from Backup:**
```bash
# Restore database
gunzip -c /path/to/backup.sql.gz | psql -U fsm_user -d fsm_production
```

### 8. Monitoring and Maintenance

**Database Monitoring:**
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('fsm_production'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Maintenance Tasks:**
```bash
# Analyze database statistics
python manage.py dbshell -c "ANALYZE;"

# Vacuum database
python manage.py dbshell -c "VACUUM ANALYZE;"

# Reindex database
python manage.py dbshell -c "REINDEX DATABASE fsm_production;"
```

### 9. Security Configuration

**Database Security:**
```conf
# postgresql.conf security settings
ssl = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_statement = 'mod'
```

**Network Security:**
```conf
# pg_hba.conf - restrict connections
# Allow connections only from application servers
host fsm_production fsm_user app-server-ip/32 scram-sha-256
```

### 10. Production Checklist

**Pre-Deployment:**
- [ ] PostgreSQL installed and configured
- [ ] Database and user created
- [ ] Connection tested from application
- [ ] SSL/TLS configured
- [ ] Backup strategy implemented
- [ ] Monitoring configured

**Post-Deployment:**
- [ ] Migrations applied successfully
- [ ] Sample data loaded (if needed)
- [ ] Performance testing completed
- [ ] Backup restoration tested
- [ ] Security audit completed

### 11. Troubleshooting

**Common Issues:**

**Connection Refused:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check port
sudo netstat -tulpn | grep 5432

# Check configuration
sudo -u postgres psql -c "SHOW config_file;"
```

**Permission Denied:**
```bash
# Grant permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE fsm_production TO fsm_user;
ALTER USER fsm_user CREATEDB;
```

**Performance Issues:**
```bash
# Check slow queries
sudo -u postgres psql -d fsm_production
SELECT * FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';
```

---

**Implementation Status:** ✅ CONFIGURED
The database configuration is ready. Update environment variables and run migrations to complete setup.