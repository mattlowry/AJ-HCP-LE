"""
Password policy management and enforcement
"""

from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from .validators import PasswordStrengthChecker
from .models import AuditLog

User = get_user_model()


class PasswordPolicy:
    """
    Centralized password policy management
    """
    
    # Default policy settings
    DEFAULT_SETTINGS = {
        'min_length': 12,
        'max_length': 128,
        'require_uppercase': True,
        'require_lowercase': True,
        'require_digits': True,
        'require_special': True,
        'max_age_days': 90,  # Password expires after 90 days
        'min_age_hours': 24,  # Must wait 24 hours before changing again
        'history_count': 5,   # Cannot reuse last 5 passwords
        'lockout_attempts': 5,  # Account locks after 5 failed attempts
        'lockout_duration_minutes': 30,  # Account locked for 30 minutes
        'session_timeout_minutes': 480,  # 8 hours
        'force_change_on_first_login': True,
        'complexity_required': True,
    }
    
    def __init__(self, user_role='customer'):
        """
        Initialize password policy based on user role
        """
        self.user_role = user_role
        self.settings = self._get_role_settings(user_role)
    
    def _get_role_settings(self, role):
        """
        Get password settings based on user role
        Higher privilege roles have stricter requirements
        """
        base_settings = self.DEFAULT_SETTINGS.copy()
        
        role_overrides = {
            'admin': {
                'min_length': 16,
                'max_age_days': 60,  # Admins must change password more frequently
                'min_age_hours': 48,  # Admins must wait longer between changes
                'history_count': 10,  # Remember more passwords for admins
                'lockout_attempts': 3,  # Stricter lockout for admins
                'session_timeout_minutes': 240,  # 4 hours for admins
            },
            'manager': {
                'min_length': 14,
                'max_age_days': 75,
                'history_count': 7,
                'lockout_attempts': 4,
                'session_timeout_minutes': 360,  # 6 hours for managers
            },
            'technician': {
                'min_length': 12,
                'max_age_days': 90,
                'session_timeout_minutes': 480,  # 8 hours for technicians
            },
            'customer': {
                'min_length': 10,  # Slightly relaxed for customers
                'max_age_days': 180,  # Customers can keep passwords longer
                'require_special': False,  # Optional special chars for customers
                'session_timeout_minutes': 720,  # 12 hours for customers
            }
        }
        
        if role in role_overrides:
            base_settings.update(role_overrides[role])
        
        return base_settings
    
    def validate_password(self, password, user=None):
        """
        Validate password against policy
        """
        try:
            # Use Django's built-in validation first
            validate_password(password, user)
            
            # Additional policy checks
            self._check_password_age_policy(user)
            self._check_password_history(password, user)
            
            return True
            
        except ValidationError as e:
            return False, e.messages
    
    def _check_password_age_policy(self, user):
        """
        Check if user can change password based on minimum age policy
        """
        if not user or not hasattr(user, 'last_password_change'):
            return  # New user or no history
        
        min_age = timedelta(hours=self.settings['min_age_hours'])
        if user.last_password_change and datetime.now() - user.last_password_change < min_age:
            raise ValidationError(
                f"Password can only be changed once every {self.settings['min_age_hours']} hours."
            )
    
    def _check_password_history(self, password, user):
        """
        Check if password has been used recently
        Note: This is a simplified implementation
        """
        # In a real implementation, you would check against stored password hashes
        # For security, we don't store actual passwords, only hashes
        pass
    
    def get_password_requirements(self):
        """
        Get human-readable password requirements
        """
        requirements = []
        
        requirements.append(f"At least {self.settings['min_length']} characters long")
        
        if self.settings['require_uppercase']:
            requirements.append("Contains uppercase letters (A-Z)")
        
        if self.settings['require_lowercase']:
            requirements.append("Contains lowercase letters (a-z)")
        
        if self.settings['require_digits']:
            requirements.append("Contains numbers (0-9)")
        
        if self.settings['require_special']:
            requirements.append("Contains special characters (!@#$%^&*)")
        
        requirements.append("Not similar to your personal information")
        requirements.append("Not a commonly used or compromised password")
        
        return requirements
    
    def check_password_expiry(self, user):
        """
        Check if user's password has expired
        """
        if not hasattr(user, 'last_password_change') or not user.last_password_change:
            return True  # Force change if no history
        
        max_age = timedelta(days=self.settings['max_age_days'])
        return datetime.now() - user.last_password_change > max_age
    
    def get_password_strength_feedback(self, password):
        """
        Get password strength analysis and feedback
        """
        return PasswordStrengthChecker.calculate_strength(password)
    
    def log_password_event(self, user, event_type, details=None, ip_address=None):
        """
        Log password-related security events
        """
        AuditLog.objects.create(
            user=user,
            action=event_type,
            resource_type='password',
            details=details or {},
            ip_address=ip_address
        )
    
    def is_account_locked(self, user):
        """
        Check if account is locked due to failed login attempts
        """
        if not hasattr(user, 'failed_login_attempts') or not hasattr(user, 'lockout_time'):
            return False
        
        if user.failed_login_attempts >= self.settings['lockout_attempts']:
            if user.lockout_time:
                lockout_duration = timedelta(minutes=self.settings['lockout_duration_minutes'])
                if datetime.now() - user.lockout_time < lockout_duration:
                    return True
                else:
                    # Lockout period expired, reset counters
                    user.failed_login_attempts = 0
                    user.lockout_time = None
                    user.save()
        
        return False
    
    def handle_failed_login(self, user, ip_address=None):
        """
        Handle failed login attempt
        """
        if not hasattr(user, 'failed_login_attempts'):
            user.failed_login_attempts = 0
        
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= self.settings['lockout_attempts']:
            user.lockout_time = datetime.now()
            
            self.log_password_event(
                user, 
                'account_locked',
                {'attempts': user.failed_login_attempts},
                ip_address
            )
        
        user.save()
    
    def handle_successful_login(self, user, ip_address=None):
        """
        Handle successful login
        """
        # Reset failed login counters
        if hasattr(user, 'failed_login_attempts'):
            user.failed_login_attempts = 0
            user.lockout_time = None
        
        # Log successful login
        self.log_password_event(
            user,
            'successful_login',
            {'role': user.role},
            ip_address
        )
        
        user.save()


class PasswordPolicyMiddleware:
    """
    Middleware to enforce password policies
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if user needs to change password
        if request.user.is_authenticated:
            policy = PasswordPolicy(request.user.role)
            
            # Check password expiry
            if policy.check_password_expiry(request.user):
                # Force password change
                if request.path != '/change-password/':
                    # Redirect to password change page
                    pass
            
            # Check account lockout
            if policy.is_account_locked(request.user):
                # Handle locked account
                pass
        
        response = self.get_response(request)
        return response


def get_password_policy_for_user(user):
    """
    Get appropriate password policy for a user
    """
    role = getattr(user, 'role', 'customer')
    return PasswordPolicy(role)


def validate_user_password(user, password):
    """
    Validate password for a specific user
    """
    policy = get_password_policy_for_user(user)
    return policy.validate_password(password, user)


def get_password_requirements_for_role(role):
    """
    Get password requirements for a specific role
    """
    policy = PasswordPolicy(role)
    return policy.get_password_requirements()