import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateRequired,
  validateLength,
  validateNumeric,
  validateUrl,
  validateDate,
  sanitizeInput,
  formatPhoneNumber,
  formatCurrency,
  formatDate
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    test('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(validateEmail('user123@sub.domain.com')).toBe(true);
    });

    test('rejects invalid email addresses', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    test('handles edge cases', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('validates US phone numbers', () => {
      expect(validatePhone('(555) 123-4567')).toBe(true);
      expect(validatePhone('555-123-4567')).toBe(true);
      expect(validatePhone('555.123.4567')).toBe(true);
      expect(validatePhone('5551234567')).toBe(true);
      expect(validatePhone('+1 555 123 4567')).toBe(true);
    });

    test('validates international phone numbers', () => {
      expect(validatePhone('+44 20 7946 0958')).toBe(true);
      expect(validatePhone('+33 1 42 86 83 26')).toBe(true);
      expect(validatePhone('+81 3 1234 5678')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc-def-ghij')).toBe(false);
      expect(validatePhone('555-123')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('validates strong passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('MySecure@Pass2024')).toBe(true);
      expect(validatePassword('Complex#Password1')).toBe(true);
    });

    test('rejects weak passwords', () => {
      expect(validatePassword('password')).toBe(false); // No uppercase, numbers, special
      expect(validatePassword('PASSWORD')).toBe(false); // No lowercase, numbers, special
      expect(validatePassword('Password')).toBe(false); // No numbers, special
      expect(validatePassword('Pass123')).toBe(false); // Too short
      expect(validatePassword('')).toBe(false);
    });

    test('validates custom password requirements', () => {
      const options = {
        minLength: 6,
        requireUppercase: false,
        requireSpecialChar: false
      };
      
      expect(validatePassword('pass123', options)).toBe(true);
      expect(validatePassword('pass', options)).toBe(false);
    });
  });

  describe('validateRequired', () => {
    test('validates required fields', () => {
      expect(validateRequired('value')).toBe(true);
      expect(validateRequired('0')).toBe(true);
      expect(validateRequired(0)).toBe(true);
      expect(validateRequired(false)).toBe(true);
    });

    test('rejects empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe('validateLength', () => {
    test('validates string length constraints', () => {
      expect(validateLength('hello', { min: 3, max: 10 })).toBe(true);
      expect(validateLength('test', { min: 4 })).toBe(true);
      expect(validateLength('short', { max: 10 })).toBe(true);
    });

    test('rejects strings outside length constraints', () => {
      expect(validateLength('hi', { min: 3 })).toBe(false);
      expect(validateLength('this is too long', { max: 10 })).toBe(false);
      expect(validateLength('no', { min: 3, max: 10 })).toBe(false);
    });
  });

  describe('validateNumeric', () => {
    test('validates numeric values', () => {
      expect(validateNumeric('123')).toBe(true);
      expect(validateNumeric('123.45')).toBe(true);
      expect(validateNumeric('-123')).toBe(true);
      expect(validateNumeric('0')).toBe(true);
    });

    test('rejects non-numeric values', () => {
      expect(validateNumeric('abc')).toBe(false);
      expect(validateNumeric('123abc')).toBe(false);
      expect(validateNumeric('')).toBe(false);
      expect(validateNumeric('12.34.56')).toBe(false);
    });

    test('validates with constraints', () => {
      expect(validateNumeric('50', { min: 0, max: 100 })).toBe(true);
      expect(validateNumeric('-10', { min: 0 })).toBe(false);
      expect(validateNumeric('150', { max: 100 })).toBe(false);
    });
  });

  describe('validateUrl', () => {
    test('validates HTTP and HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://test.org')).toBe(true);
      expect(validateUrl('https://sub.domain.co.uk/path?query=1')).toBe(true);
    });

    test('rejects invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('https://')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('validateDate', () => {
    test('validates date formats', () => {
      expect(validateDate('2024-02-15')).toBe(true);
      expect(validateDate('12/31/2023')).toBe(true);
      expect(validateDate('2024-02-15T10:30:00Z')).toBe(true);
    });

    test('rejects invalid dates', () => {
      expect(validateDate('2024-13-01')).toBe(false);
      expect(validateDate('2024-02-30')).toBe(false);
      expect(validateDate('invalid-date')).toBe(false);
      expect(validateDate('')).toBe(false);
    });

    test('validates date ranges', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(validateDate(tomorrow.toISOString(), { 
        min: today.toISOString() 
      })).toBe(true);
      
      expect(validateDate(yesterday.toISOString(), { 
        min: today.toISOString() 
      })).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('sanitizeInput', () => {
    test('removes potentially dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello & World')).toBe('Hello &amp; World');
      expect(sanitizeInput('Test "quotes"')).toBe('Test &quot;quotes&quot;');
    });

    test('preserves safe content', () => {
      expect(sanitizeInput('Normal text')).toBe('Normal text');
      expect(sanitizeInput('123 Main St')).toBe('123 Main St');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com');
    });
  });

  describe('formatPhoneNumber', () => {
    test('formats US phone numbers', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
    });

    test('handles already formatted numbers', () => {
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('+1 555 123 4567')).toBe('+1 555 123 4567');
    });

    test('handles invalid input', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber(null as any)).toBe('');
    });
  });

  describe('formatCurrency', () => {
    test('formats currency values', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    test('handles different currencies', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00');
      expect(formatCurrency(100, 'GBP')).toBe('£100.00');
    });

    test('handles edge cases', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
      expect(formatCurrency(null as any)).toBe('$0.00');
      expect(formatCurrency(undefined as any)).toBe('$0.00');
    });
  });

  describe('formatDate', () => {
    test('formats dates in different formats', () => {
      const date = new Date('2024-02-15T10:30:00Z');
      
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('02/15/2024');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-02-15');
      expect(formatDate(date, 'MMM DD, YYYY')).toBe('Feb 15, 2024');
    });

    test('handles string input', () => {
      expect(formatDate('2024-02-15', 'MM/DD/YYYY')).toBe('02/15/2024');
      expect(formatDate('2024-02-15T10:30:00Z', 'MMM DD, YYYY')).toBe('Feb 15, 2024');
    });

    test('handles invalid dates', () => {
      expect(formatDate('invalid-date', 'MM/DD/YYYY')).toBe('Invalid Date');
      expect(formatDate(null as any, 'MM/DD/YYYY')).toBe('');
    });

    test('includes time formatting', () => {
      const date = new Date('2024-02-15T10:30:00Z');
      
      expect(formatDate(date, 'MM/DD/YYYY HH:mm')).toBe('02/15/2024 10:30');
      expect(formatDate(date, 'MMM DD, YYYY h:mm A')).toBe('Feb 15, 2024 10:30 AM');
    });
  });
});

describe('Integration Tests', () => {
  test('validates complete form data', () => {
    const formData = {
      email: 'user@example.com',
      phone: '(555) 123-4567',
      password: 'SecurePass123!',
      website: 'https://example.com',
      age: '25'
    };

    expect(validateEmail(formData.email)).toBe(true);
    expect(validatePhone(formData.phone)).toBe(true);
    expect(validatePassword(formData.password)).toBe(true);
    expect(validateUrl(formData.website)).toBe(true);
    expect(validateNumeric(formData.age, { min: 18, max: 120 })).toBe(true);
  });

  test('sanitizes and formats user input', () => {
    const userInput = {
      name: '<script>alert("xss")</script>John Doe',
      phone: '5551234567',
      amount: 1234.56
    };

    const sanitized = {
      name: sanitizeInput(userInput.name),
      phone: formatPhoneNumber(userInput.phone),
      amount: formatCurrency(userInput.amount)
    };

    expect(sanitized.name).toBe('scriptalert("xss")/scriptJohn Doe');
    expect(sanitized.phone).toBe('(555) 123-4567');
    expect(sanitized.amount).toBe('$1,234.56');
  });
});