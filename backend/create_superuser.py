#!/usr/bin/env python
"""
Create a default superuser for production deployment
"""
import os
import sys
import django

# Setup Django
sys.path.append('/opt/render/project/src/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fsm_core.settings')
django.setup()

from django.contrib.auth.models import User

def create_superuser():
    """Create superuser if none exists"""
    if not User.objects.filter(is_superuser=True).exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@ajlongelectric.com',
            password='AJLong2025!'
        )
        print("✅ Superuser created:")
        print("   Username: admin")
        print("   Password: AJLong2025!")
        print("   Email: admin@ajlongelectric.com")
    else:
        print("ℹ️  Superuser already exists")

if __name__ == '__main__':
    create_superuser()