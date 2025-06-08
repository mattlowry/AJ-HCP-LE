"""
Custom password validators for enhanced security
"""

import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.contrib.auth.password_validation import CommonPasswordValidator


class AdvancedPasswordValidator:
    """
    Advanced password validator with comprehensive requirements
    """
    
    def __init__(self, min_length=12, require_uppercase=True, require_lowercase=True,
                 require_digits=True, require_special=True, max_length=128):
        self.min_length = min_length
        self.max_length = max_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digits = require_digits
        self.require_special = require_special
    
    def validate(self, password, user=None):
        """
        Validate password against security requirements
        """
        errors = []
        
        # Length validation
        if len(password) < self.min_length:
            errors.append(_(f'Password must be at least {self.min_length} characters long.'))
        
        if len(password) > self.max_length:
            errors.append(_(f'Password must be no more than {self.max_length} characters long.'))
        
        # Character type validation
        if self.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append(_('Password must contain at least one uppercase letter.'))
        
        if self.require_lowercase and not re.search(r'[a-z]', password):
            errors.append(_('Password must contain at least one lowercase letter.'))
        
        if self.require_digits and not re.search(r'\d', password):
            errors.append(_('Password must contain at least one digit.'))
        
        if self.require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append(_('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>).'))
        
        # Check for user attribute similarity
        if user:
            self._check_user_similarity(password, user, errors)
        
        # Check for common patterns
        self._check_common_patterns(password, errors)
        
        if errors:
            raise ValidationError(errors)
    
    def _check_user_similarity(self, password, user, errors):
        """Check if password is too similar to user attributes"""
        user_attributes = [
            getattr(user, 'username', ''),
            getattr(user, 'first_name', ''),
            getattr(user, 'last_name', ''),
            getattr(user, 'email', '').split('@')[0],
        ]
        
        password_lower = password.lower()
        
        for attr in user_attributes:
            if attr and len(attr) >= 3:
                if attr.lower() in password_lower:
                    errors.append(_('Password is too similar to your personal information.'))
                    break
    
    def _check_common_patterns(self, password, errors):
        """Check for common weak patterns"""
        # Sequential characters
        sequential_patterns = [
            'abcdefghijklmnopqrstuvwxyz',
            'qwertyuiopasdfghjklzxcvbnm',
            '1234567890',
            '0987654321'
        ]
        
        password_lower = password.lower()
        
        for pattern in sequential_patterns:
            for i in range(len(pattern) - 3):
                if pattern[i:i+4] in password_lower:
                    errors.append(_('Password contains common sequential characters.'))
                    return
        
        # Repeated characters
        if re.search(r'(.)\1{3,}', password):
            errors.append(_('Password contains too many repeated characters.'))
        
        # Common weak patterns
        weak_patterns = [
            r'password',
            r'123456',
            r'qwerty',
            r'admin',
            r'welcome',
            r'login',
            r'user'
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password_lower):
                errors.append(_('Password contains common weak patterns.'))
                break
    
    def get_help_text(self):
        """Return help text for password requirements"""
        requirements = [
            f'Password must be at least {self.min_length} characters long'
        ]
        
        if self.require_uppercase:
            requirements.append('contain at least one uppercase letter')
        
        if self.require_lowercase:
            requirements.append('contain at least one lowercase letter')
        
        if self.require_digits:
            requirements.append('contain at least one digit')
        
        if self.require_special:
            requirements.append('contain at least one special character')
        
        return _('Your password must ') + ', '.join(requirements) + '.'


class NoPersonalInfoValidator:
    """
    Validate that password doesn't contain personal information
    """
    
    def validate(self, password, user=None):
        if not user:
            return
        
        password_lower = password.lower()
        
        # Check common user attributes
        personal_info = [
            getattr(user, 'username', ''),
            getattr(user, 'first_name', ''),
            getattr(user, 'last_name', ''),
            getattr(user, 'email', '').split('@')[0],
            getattr(user, 'employee_id', ''),
        ]
        
        for info in personal_info:
            if info and len(info) >= 3:
                if info.lower() in password_lower:
                    raise ValidationError(
                        _('Password cannot contain your personal information.'),
                        code='password_too_similar'
                    )
    
    def get_help_text(self):
        return _('Your password cannot contain your personal information such as name, username, or email.')


class RepeatedCharacterValidator:
    """
    Validate that password doesn't have too many repeated characters
    """
    
    def __init__(self, max_consecutive=3):
        self.max_consecutive = max_consecutive
    
    def validate(self, password, user=None):
        # Check for consecutive repeated characters
        if re.search(rf'(.)\1{{{self.max_consecutive},}}', password):
            raise ValidationError(
                _(f'Password cannot contain more than {self.max_consecutive} consecutive identical characters.'),
                code='password_too_many_repeated'
            )
    
    def get_help_text(self):
        return _(f'Your password cannot contain more than {self.max_consecutive} consecutive identical characters.')


class HistoricalPasswordValidator:
    """
    Validate that password hasn't been used recently
    Note: This would require storing password hashes in a separate model
    """
    
    def __init__(self, history_length=5):
        self.history_length = history_length
    
    def validate(self, password, user=None):
        # This would check against historical passwords
        # Implementation would require a PasswordHistory model
        pass
    
    def get_help_text(self):
        return _(f'Your password cannot be one of your last {self.history_length} passwords.')


class CompromisedPasswordValidator:
    """
    Check if password appears in known data breaches
    This uses a simple check against common compromised passwords
    """
    
    def __init__(self):
        # In a real implementation, you might use an API like HaveIBeenPwned
        self.compromised_passwords = {
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890', 'password1',
            'abc123', '111111', 'iloveyou', 'adobe123', 'sunshine'
        }
    
    def validate(self, password, user=None):
        if password.lower() in self.compromised_passwords:
            raise ValidationError(
                _('This password has appeared in data breaches and cannot be used.'),
                code='password_compromised'
            )
    
    def get_help_text(self):
        return _('Your password cannot be a commonly compromised password.')


class PasswordStrengthChecker:
    """
    Utility class to check password strength and provide feedback
    """
    
    @staticmethod
    def calculate_strength(password):
        """
        Calculate password strength score (0-100)
        """
        score = 0
        feedback = []
        
        # Length scoring
        if len(password) >= 12:
            score += 25
        elif len(password) >= 8:
            score += 15
            feedback.append("Consider using a longer password")
        else:
            feedback.append("Password is too short")
        
        # Character variety scoring
        if re.search(r'[a-z]', password):
            score += 10
        else:
            feedback.append("Add lowercase letters")
        
        if re.search(r'[A-Z]', password):
            score += 10
        else:
            feedback.append("Add uppercase letters")
        
        if re.search(r'\d', password):
            score += 10
        else:
            feedback.append("Add numbers")
        
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 15
        else:
            feedback.append("Add special characters")
        
        # Pattern analysis
        if not re.search(r'(.)\1{2,}', password):
            score += 10
        else:
            feedback.append("Avoid repeated characters")
        
        if not re.search(r'(abc|123|qwe)', password.lower()):
            score += 10
        else:
            feedback.append("Avoid sequential patterns")
        
        # Entropy bonus for longer passwords
        if len(password) >= 16:
            score += 10
        
        # Cap at 100
        score = min(score, 100)
        
        strength_level = "Very Weak"
        if score >= 80:
            strength_level = "Very Strong"
        elif score >= 60:
            strength_level = "Strong"
        elif score >= 40:
            strength_level = "Medium"
        elif score >= 20:
            strength_level = "Weak"
        
        return {
            'score': score,
            'level': strength_level,
            'feedback': feedback
        }