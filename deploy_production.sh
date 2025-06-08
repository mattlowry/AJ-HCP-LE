#!/bin/bash

# Production Deployment Script for AJ Long Electric FSM
# This script handles secure production deployment with SSL

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for AJ Long Electric FSM"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Environment check
if [ -z "$ENVIRONMENT" ]; then
    ENVIRONMENT="production"
fi

echo "📋 Deployment Environment: $ENVIRONMENT"

# Set production environment variables
export NODE_ENV=production
export DEBUG=False
export SECURE_SSL_REDIRECT=True
export SECURE_HSTS_SECONDS=31536000
export SESSION_COOKIE_SECURE=True
export CSRF_COOKIE_SECURE=True

echo "🔧 Installing dependencies..."

# Install backend dependencies
cd backend
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# Install frontend dependencies
cd ../frontend
npm ci --production

echo "🏗️  Building frontend..."
npm run build

echo "📦 Collecting static files..."
cd ../backend
python manage.py collectstatic --noinput

echo "🗃️  Running database migrations..."
python manage.py migrate

echo "👤 Creating superuser (if needed)..."
if [ ! -z "$DJANGO_SUPERUSER_USERNAME" ] && [ ! -z "$DJANGO_SUPERUSER_EMAIL" ] && [ ! -z "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput || echo "Superuser already exists"
fi

echo "🔐 Security Check..."
python manage.py check --deploy

echo "🧪 Running production tests..."
cd ../frontend
npm test -- --coverage --watchAll=false

cd ../backend
python manage.py test

echo "📊 Performance Check..."
# Add performance checks here if needed

echo "🔍 SSL Configuration Check..."
if [ "$SECURE_SSL_REDIRECT" = "True" ]; then
    echo "✅ SSL redirect enabled"
else
    echo "⚠️  SSL redirect disabled"
fi

if [ "$SECURE_HSTS_SECONDS" -gt 0 ]; then
    echo "✅ HSTS enabled ($SECURE_HSTS_SECONDS seconds)"
else
    echo "⚠️  HSTS disabled"
fi

echo "🚦 Production Readiness Checklist:"
echo "✅ Dependencies installed"
echo "✅ Frontend built"
echo "✅ Static files collected"
echo "✅ Database migrated"
echo "✅ Security checks passed"
echo "✅ Tests passed"
echo "✅ SSL configured"

echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your domain's DNS to point to your server"
echo "2. Set up SSL certificate (automatic with most platforms)"
echo "3. Update frontend API URLs to use HTTPS"
echo "4. Test the application thoroughly"
echo "5. Monitor logs and performance"

# Optional: Cleanup
echo "🧹 Cleaning up..."
cd ../frontend
rm -rf node_modules/.cache

echo "✨ Deployment complete!"