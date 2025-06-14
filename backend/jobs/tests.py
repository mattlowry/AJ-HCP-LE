"""
Comprehensive tests for Jobs app
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token
from rest_framework import status

from .models import Job, Technician, JobPhoto, JobStatusHistory
from customers.models import Customer, Property

User = get_user_model()


class TechnicianModelTest(TestCase):
    """Test Technician model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='tech_user',
            role='technician'
        )
    
    def test_create_technician(self):
        """Test technician creation"""
        technician = Technician.objects.create(
            user=self.user,
            employee_id='TECH001',
            phone='+12345678901',
            hourly_rate=Decimal('45.00')
        )
        
        self.assertEqual(technician.user, self.user)
        self.assertEqual(technician.employee_id, 'TECH001')
        self.assertEqual(technician.hourly_rate, Decimal('45.00'))
    
    def test_technician_str_representation(self):
        """Test technician string representation"""
        technician = Technician.objects.create(
            user=self.user,
            employee_id='TECH001',
            phone='+12345678901',
            hourly_rate=Decimal('25.00')
        )
        self.assertIn('TECH001', str(technician))


class JobModelTest(TestCase):
    """Test Job model"""
    
    def setUp(self):
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.user = User.objects.create_user(
            username='manager',
            role='manager'
        )
        
        self.technician_user = User.objects.create_user(
            username='tech',
            role='technician'
        )
        
        self.technician = Technician.objects.create(
            user=self.technician_user,
            employee_id='TECH001',
            phone='+12345678901',
            hourly_rate=Decimal('45.00')
        )
    
    def test_create_job(self):
        """Test job creation"""
        job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Electrical Repair',
            description='Fix outlet in kitchen',
            priority='high',
            created_by=self.user
        )
        
        self.assertEqual(job.customer, self.customer)
        self.assertEqual(job.property, self.property)
        self.assertEqual(job.title, 'Electrical Repair')
        self.assertEqual(job.status, 'pending')
        self.assertEqual(job.priority, 'high')
    
    def test_job_str_representation(self):
        """Test job string representation"""
        job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Electrical Repair',
            description='Test description',
            created_by=self.user
        )
        self.assertIn('Electrical Repair', str(job))
    
    def test_assign_technician(self):
        """Test assigning technician to job"""
        job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Electrical Repair',
            description='Test description',
            created_by=self.user
        )
        
        job.assigned_technician = self.technician
        job.save()
        
        self.assertEqual(job.assigned_technician, self.technician)
    
    def test_job_status_choices(self):
        """Test job status choices"""
        valid_statuses = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']
        
        for i, status in enumerate(valid_statuses):
            job = Job.objects.create(
                customer=self.customer,
                property=self.property,
                title=f'Job {status}',
                description='Test description',
                status=status,
                created_by=self.user
            )
            self.assertEqual(job.status, status)


class JobStatusHistoryModelTest(TestCase):
    """Test JobStatusHistory model"""
    
    def setUp(self):
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.user = User.objects.create_user(username='manager')
        
        self.job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Test Job',
            description='Test description',
            created_by=self.user
        )
    
    def test_create_status_history(self):
        """Test job status history creation"""
        history = JobStatusHistory.objects.create(
            job=self.job,
            previous_status='pending',
            new_status='scheduled',
            changed_by=self.user,
            notes='Scheduled for tomorrow'
        )
        
        self.assertEqual(history.job, self.job)
        self.assertEqual(history.previous_status, 'pending')
        self.assertEqual(history.new_status, 'scheduled')
        self.assertEqual(history.changed_by, self.user)


class JobValidationTest(TestCase):
    """Test job data validation"""
    
    def setUp(self):
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.user = User.objects.create_user(username='manager')
    
    def test_job_priority_choices(self):
        """Test job priority choices validation"""
        valid_priorities = ['low', 'normal', 'high', 'emergency']
        
        for priority in valid_priorities:
            job = Job.objects.create(
                customer=self.customer,
                property=self.property,
                title=f'Job {priority}',
                description='Test description',
                priority=priority,
                created_by=self.user
            )
            self.assertEqual(job.priority, priority)
    
    def test_required_fields(self):
        """Test required fields validation"""
        # Test that customer, property and title are required
        with self.assertRaises(Exception):
            Job.objects.create(
                title='Job without customer',
                description='Test description',
                created_by=self.user
                # Missing customer and property
            )


class TechnicianWorkflowTest(TestCase):
    """Test technician workflow scenarios"""
    
    def setUp(self):
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.manager = User.objects.create_user(
            username='manager',
            role='manager'
        )
        
        self.tech_user = User.objects.create_user(
            username='technician',
            role='technician'
        )
        
        self.technician = Technician.objects.create(
            user=self.tech_user,
            employee_id='TECH001',
            phone='+12345678901',
            hourly_rate=Decimal('45.00')
        )
    
    def test_job_assignment_workflow(self):
        """Test complete job assignment workflow"""
        # Create job
        job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Electrical Repair',
            description='Fix outlet',
            created_by=self.manager
        )
        
        # Initially no technician assigned
        self.assertIsNone(job.assigned_technician)
        self.assertEqual(job.status, 'pending')
        
        # Assign technician
        job.assigned_technician = self.technician
        job.status = 'scheduled'
        job.save()
        
        # Verify assignment
        self.assertEqual(job.assigned_technician, self.technician)
        self.assertEqual(job.status, 'scheduled')
        
        # Start work
        job.status = 'in_progress'
        job.save()
        
        # Complete work
        job.status = 'completed'
        job.save()
        
        self.assertEqual(job.status, 'completed')


class JobAPITest(APITestCase):
    """Test Job API endpoints (if they exist)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            role='manager'
        )
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Test Job',
            description='Test job description',
            created_by=self.user
        )
    
    def test_job_model_creation(self):
        """Test job model creation through API test setup"""
        self.assertEqual(self.job.title, 'Test Job')
        self.assertEqual(self.job.customer, self.customer)
        self.assertEqual(self.job.property, self.property)
        self.assertEqual(self.job.created_by, self.user)


class JobPhotoModelTest(TestCase):
    """Test JobPhoto model"""
    
    def setUp(self):
        self.customer = Customer.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='+12345678901',
            street_address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.property = Property.objects.create(
            customer=self.customer,
            name='Main Office',
            address='123 Main St',
            city='Anytown',
            state='CA',
            zip_code='90210'
        )
        
        self.user = User.objects.create_user(username='tech')
        
        self.job = Job.objects.create(
            customer=self.customer,
            property=self.property,
            title='Test Job',
            description='Test description',
            created_by=self.user
        )
    
    def test_create_job_photo(self):
        """Test job photo creation"""
        photo = JobPhoto.objects.create(
            job=self.job,
            uploaded_by=self.user,
            description='Before repair photo',
            is_before_photo=True
        )
        
        self.assertEqual(photo.job, self.job)
        self.assertEqual(photo.uploaded_by, self.user)
        self.assertTrue(photo.is_before_photo)