#!/usr/bin/env python
import os
import django
import sys

# Add the backend directory to the Python path
sys.path.append('/Users/matthewlong/AJ-HCP-LE/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fsm_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from jobs.models import Technician, ServiceType, Job
from customers.models import Customer, Property

User = get_user_model()
from datetime import date, time, datetime

def create_sample_data():
    print("Creating sample data...")
    
    # Create users for technicians
    tech_user1, created = User.objects.get_or_create(
        username='john_smith',
        defaults={
            'first_name': 'John',
            'last_name': 'Smith',
            'email': 'john.smith@ajlongelectric.com'
        }
    )
    
    tech_user2, created = User.objects.get_or_create(
        username='mike_johnson', 
        defaults={
            'first_name': 'Mike',
            'last_name': 'Johnson',
            'email': 'mike.johnson@ajlongelectric.com'
        }
    )
    
    tech_user3, created = User.objects.get_or_create(
        username='sarah_williams',
        defaults={
            'first_name': 'Sarah', 
            'last_name': 'Williams',
            'email': 'sarah.williams@ajlongelectric.com'
        }
    )
    
    # Create technicians
    tech1, created = Technician.objects.get_or_create(
        user=tech_user1,
        defaults={
            'employee_id': 'EMP001',
            'phone': '+1-555-0201',
            'skill_level': 'master',
            'hourly_rate': 85.00,
            'is_available': True,
            'emergency_availability': True
        }
    )
    
    tech2, created = Technician.objects.get_or_create(
        user=tech_user2,
        defaults={
            'employee_id': 'EMP002',
            'phone': '+1-555-0202',
            'skill_level': 'journeyman',
            'hourly_rate': 65.00,
            'is_available': True,
            'emergency_availability': False
        }
    )
    
    tech3, created = Technician.objects.get_or_create(
        user=tech_user3,
        defaults={
            'employee_id': 'EMP003',
            'phone': '+1-555-0203',
            'skill_level': 'master',
            'hourly_rate': 80.00,
            'is_available': True,
            'emergency_availability': True
        }
    )
    
    # Create service types
    service1, created = ServiceType.objects.get_or_create(
        name='Electrical Repair',
        defaults={
            'description': 'General electrical repair services',
            'base_price': 150.00,
            'estimated_duration_hours': 2.0,
            'skill_level_required': 'journeyman'
        }
    )
    
    service2, created = ServiceType.objects.get_or_create(
        name='Panel Installation',
        defaults={
            'description': 'Electrical panel installation and upgrade',
            'base_price': 800.00,
            'estimated_duration_hours': 6.0,
            'skill_level_required': 'master'
        }
    )
    
    service3, created = ServiceType.objects.get_or_create(
        name='Outlet Installation',
        defaults={
            'description': 'New outlet installation',
            'base_price': 120.00,
            'estimated_duration_hours': 1.5,
            'skill_level_required': 'apprentice'
        }
    )
    
    # Create sample customers
    customer1, created = Customer.objects.get_or_create(
        email='john.doe@email.com',
        defaults={
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+1-555-0123',
            'customer_type': 'residential',
            'street_address': '123 Main St',
            'city': 'Philadelphia',
            'state': 'PA',
            'zip_code': '19101'
        }
    )
    
    customer2, created = Customer.objects.get_or_create(
        email='jane.smith@email.com',
        defaults={
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone': '+1-555-0124',
            'customer_type': 'commercial',
            'company_name': 'Smith Industries',
            'street_address': '456 Business Ave',
            'city': 'Philadelphia',
            'state': 'PA',
            'zip_code': '19102'
        }
    )
    
    # Create sample properties
    property1, created = Property.objects.get_or_create(
        customer=customer1,
        property_type='single_family',
        defaults={
            'street_address': '123 Main St',
            'city': 'Philadelphia',
            'state': 'PA',
            'zip_code': '19101',
            'square_footage': 1800,
            'year_built': 1995,
            'main_panel_brand': 'Square D',
            'main_panel_amperage': 200
        }
    )
    
    property2, created = Property.objects.get_or_create(
        customer=customer2,
        property_type='commercial',
        defaults={
            'street_address': '456 Business Ave',
            'city': 'Philadelphia', 
            'state': 'PA',
            'zip_code': '19102',
            'square_footage': 5000,
            'year_built': 2005,
            'main_panel_brand': 'GE',
            'main_panel_amperage': 400
        }
    )
    
    # Create sample jobs
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'first_name': 'Admin',
            'last_name': 'User',
            'email': 'admin@ajlongelectric.com',
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
    
    job1, created = Job.objects.get_or_create(
        job_number='JOB-2025-001',
        defaults={
            'title': 'Kitchen Outlet Repair',
            'description': 'Replace faulty GFCI outlet in kitchen',
            'customer': customer1,
            'property': property1,
            'service_type': service1,
            'status': 'pending',
            'priority': 'normal',
            'created_by': admin_user
        }
    )
    
    job2, created = Job.objects.get_or_create(
        job_number='JOB-2025-002',
        defaults={
            'title': 'Panel Upgrade',
            'description': 'Upgrade electrical panel to 200 amp',
            'customer': customer2,
            'property': property2,
            'service_type': service2,
            'status': 'pending',
            'priority': 'high',
            'created_by': admin_user
        }
    )
    
    job3, created = Job.objects.get_or_create(
        job_number='JOB-2025-003',
        defaults={
            'title': 'Emergency Power Outage',
            'description': 'Complete power outage in building',
            'customer': customer2,
            'property': property2,
            'service_type': service1,
            'status': 'pending',
            'priority': 'emergency',
            'created_by': admin_user
        }
    )
    
    job4, created = Job.objects.get_or_create(
        job_number='JOB-2025-004',
        defaults={
            'title': 'Scheduled Maintenance',
            'description': 'Routine electrical inspection',
            'customer': customer1,
            'property': property1,
            'service_type': service1,
            'status': 'scheduled',
            'priority': 'low',
            'assigned_technician': tech1,
            'scheduled_date': date.today(),
            'scheduled_start_time': time(9, 0),
            'scheduled_end_time': time(11, 0),
            'created_by': admin_user
        }
    )
    
    print("Sample data created successfully!")
    print(f"Created {Technician.objects.count()} technicians")
    print(f"Created {ServiceType.objects.count()} service types")
    print(f"Created {Customer.objects.count()} customers")
    print(f"Created {Job.objects.count()} jobs")

if __name__ == '__main__':
    create_sample_data()