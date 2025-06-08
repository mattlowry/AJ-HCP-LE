#!/usr/bin/env python
"""
Create a default superuser for production deployment
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fsm_core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_superuser():
    """Create superuser if none exists"""
    try:
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@ajlongelectric.com',
                password='admin123'
            )
            print("✅ Superuser created:")
            print("   Username: admin")
            print("   Password: admin123")
            print("   Email: admin@ajlongelectric.com")
        else:
            print("ℹ️  Superuser already exists")
            # Show existing superusers
            superusers = User.objects.filter(is_superuser=True)
            for user in superusers:
                print(f"   Existing superuser: {user.username}")
    except Exception as e:
        print(f"❌ Error creating superuser: {e}")

if __name__ == '__main__':
    create_superuser()