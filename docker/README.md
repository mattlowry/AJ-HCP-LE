# Production Deployment Guide

This directory contains the production deployment configuration for AJ Long Electric FSM.

## Quick Start

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **SSL Certificates**
   - Place SSL certificates in `docker/ssl/`
   - Update paths in nginx configuration if needed

3. **Deploy**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml up -d
   ```

## Architecture

- **Load Balancer**: nginx with SSL termination and rate limiting
- **Backend**: 3 Django instances with Gunicorn
- **Frontend**: 2 React instances with nginx
- **Database**: PostgreSQL with optimized configuration
- **Cache**: Redis with persistence
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Backups**: Automated daily backups with cloud upload

## Monitoring

- **Grafana Dashboard**: http://your-domain:3001
- **Prometheus**: http://your-domain:9090
- **Kibana Logs**: http://your-domain:5601

## Backup & Restore

### Manual Backup
```bash
docker-compose -f docker/docker-compose.prod.yml run --rm backup
```

### Restore Database
```bash
docker exec -i postgres_container psql -U fsm_user -d fsm_db < backup.sql
```

## Security Features

- SSL/TLS encryption
- Rate limiting
- Security headers
- Admin access restrictions
- DDoS protection
- Automated security scanning

## Scaling

To scale backend instances:
```bash
docker-compose -f docker/docker-compose.prod.yml up -d --scale backend1=2 --scale backend2=2
```

## Health Checks

- Main app: https://your-domain/health
- nginx: https://your-domain:8080/nginx-health
- Individual services have built-in health checks

## Troubleshooting

1. **Check service status**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml ps
   ```

2. **View logs**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml logs -f service-name
   ```

3. **Database connection issues**
   ```bash
   docker-compose -f docker/docker-compose.prod.yml exec postgres pg_isready
   ```

## Performance Tuning

- Worker processes scale with CPU cores
- Database connection pooling configured
- Redis caching for sessions and data
- Static asset optimization with gzip
- Image compression and CDN ready

## Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose -f docker/docker-compose.prod.yml build
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Database Migrations
```bash
docker-compose -f docker/docker-compose.prod.yml exec backend1 python manage.py migrate
```

### Collect Static Files
```bash
docker-compose -f docker/docker-compose.prod.yml exec backend1 python manage.py collectstatic --noinput
```